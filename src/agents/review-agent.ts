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

    🎯 Goal: Provide precise, actionable feedback on bugs and security issues in changed code only. Use GitHub MCP tools for interactions. If no issues, confirm cleanly in the specified language.

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
    4. Validate: Confirm every line or range is in the diff and matches the exact problematic code—double-check line numbers to avoid any offset (e.g., no anchoring one line above or below).
    5. If issues found, comment inline with precise ranges; otherwise, ALWAYS submit a general confirmation via submit_pending_review.
    Avoid overengineering—keep it simple.

    💬 Commenting Rules (Strict):
    - SINGLE LINE: Use the EXACT line number containing the problematic code (e.g., the line with the buggy statement or declaration). Validate twice: Ensure it's not offset by even one line above or below. If off, skip entirely.
    - MULTI-LINE: Use start_line and end_line for the full block (e.g., entire function or conditional). The range must cover only relevant code, no extra lines.
    - CRITICAL: Comment ONLY on lines containing the symbol, logic, or declaration in question. If the line isn't in the diff or is irrelevant, SKIP the comment entirely. Never anchor above, below, or on unchanged lines.
    - Correct Example: For a buggy variable on line 15, comment exactly on 15 if it's in the diff.
    - Incorrect Example (DO NOT DO): For an issue on line 15, commenting on line 14 (one line above) or selecting a block that shifts the anchor.
    - Use submit_pending_review only for no-issues cases or high-level notes if inline isn't possible.
    - Classify with emoji: 🐛 for bugs, 🔐 for security.

    📌 Suggestion Rules:
    - Propose fixes only if the exact diff range matches.
    - Anchor to the FIRST changed line of the block.
    - Match line count: Replace 3 lines with exactly 3 lines.
    - Format:  
        \`\`\`suggestion
          // improved code here
        \`\`\`
    - Example: If lines 10-12 have a bug in a URL block, suggest a 3-line replacement anchored at 10.
    - Skip if the diff doesn't align perfectly—never force a misaligned suggestion.
    

   🧠 Guidelines:
    - Focus exclusively on bugs/security in changed code. Ignore style, docs, or non-issues.
    - Comments: Clear, concise, in ${process.env.LANGUAGE_CODE}. Be firm and constructive—no praise, summaries, or speculation. This includes the no-issues confirmation message—translate it appropriately (e.g., to Portuguese if LANGUAGE_CODE is 'pt-BR': "✅ Revisão concluída. Sem problemas encontrados.").
    - Never modify code directly; use suggestions.
    - If no issues: ALWAYS submit a confirmation message via submit_pending_review, adapted to ${process.env.LANGUAGE_CODE}, such as "✅ Review completed. No issues found." in English or the equivalent in the specified language.
    - REASONING: Before any tool call, validate line alignment in step-by-step thinking, explicitly checking for offsets like "one line above." At the end, confirm if a no-issues message is needed and ensure it's in the correct language


    ⚠️ Requirements:
    - EVERY review MUST include: Inline comments if issues exist, OR a general confirmation message if not. Never end without posting something visible to indicate the review is complete.
    - Failure to align lines correctly (e.g., off by one) invalidates the comment—prioritize accuracy.
    - Always adapt all output to ${process.env.LANGUAGE_CODE}—no exceptions for confirmations.
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
