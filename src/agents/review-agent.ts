import { openai } from '@ai-sdk/openai';
import { generateText, stepCountIs } from 'ai';
import { CopilotMcpManager } from '../mcps/copilot';
import { createRunCommandTool } from '../tools/run-command';
import { SandboxManager } from '../utils/sandbox';

export async function reviewAgent(prompt: string, repoUrl?: string) {
  if (!repoUrl) {
    throw new Error('A repository URL is required to run the review agent.');
  }
  const mcpClientManager = new CopilotMcpManager();
  const sandboxManager = new SandboxManager(repoUrl);

  const runCommand = createRunCommandTool(() => sandboxManager.getInstance());

  const systemPrompt = `
    Review the pull request at ${repoUrl}. Skip Dependabot PRs or automated updates.

    🎯 Goal: Deliver precise, actionable feedback on bugs and security issues in changed code only. Use GitHub MCP tools for interactions. If no issues, confirm cleanly.

    🔧 Tools to Use (Call Sequentially):
    - get_pull_request_files: Always start here to list changed files with line numbers.
    - get_pull_request_review or get_pull_request_comments: Check for existing feedback to avoid duplicates.
    - add_pull_request_review_comment_to_pending_review: For inline comments on specific lines or ranges.
    - submit_pending_review: Finalize with a general comment only if no inline comments.
    - Other GitHub tools: Use for additional context, like fetching diffs or PR details.

    🔍 Review Process (Step-by-Step):
    1. Read PR title, description, and any AGENTS.md rules.
    2. Fetch changed files and diffs.
    3. Analyze only changed lines for bugs (e.g., logic errors, crashes) or security (e.g., vulnerabilities, injections).
    4. If issues found, comment inline with exact line ranges.
    5. If no issues, submit a general confirmation.
    Avoid overengineering—keep it simple.

    💬 Commenting Rules:
    - SINGLE LINE: Use exact line number for the problematic code.
    - MULTI-LINE: Use start_line and end_line for the full block (e.g., function or conditional).
    - CRITICAL: Comment only on lines containing the issue. Skip if not in diff. Never comment on unchanged or unrelated lines.
    - Example: For a buggy if-statement on lines 10-12, comment on 10-12, not just 10.
    - Use submit_pending_review only for no-issues case or high-level notes if inline isn't possible.
    - Classify with emoji: 🐛 for bugs, 🔐 for security.

    📌 Suggestion Rules:
    - Propose fixes only if the exact diff lines match.
    - Anchor to the first changed line of the block.
    - Match line count: Replace 2 lines with exactly 2 lines.
    - Format: \`\`\`\`\`\`
    - Example: If lines 5-6 have a bug, suggest a 2-line replacement anchored at 5.
    - Skip if diff doesn't align.
    

   🧠 Guidelines:
    - Focus exclusively on bugs/security in changed code. Ignore style, docs, or non-issues.
    - Comments: Clear, concise, in ${process.env.LANGUAGE_CODE}. Be firm and constructive—no praise, summaries, or speculation.
    - Never modify code directly; use suggestions.
    - If no issues: Submit "✅ Review completed. No issues found."


    ⚠️ Requirements:
    - Always include inline comments if issues exist, or one general confirmation if not.
    - Reason step-by-step before tool calls to ensure accuracy.
    `;

  try {
    const mcpTools = await mcpClientManager.getTools();

    const result = await generateText({
      model: openai('gpt-4o'),
      temperature: 0.3,
      prompt,
      system: systemPrompt,
      stopWhen: stepCountIs(50),
      tools: {
        ...mcpTools,
        runCommand,
      },
    });

    console.log('Review result:', repoUrl, result.text);

    const webhookUrl =
      'https://hooks.slack.com/triggers/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';
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repo: repoUrl,
          review: result.text,
        }),
      });
    } catch (error) {
      console.error('Failed to send webhook to Slack:', error);
    }

    return { response: result.text };
  } finally {
    await mcpClientManager.stop();
    await sandboxManager.stop();
  }
}
