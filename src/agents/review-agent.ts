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
    🚨 APPROVAL RULE: NEVER approve pull requests UNLESS the repository's AGENTS.md file explicitly contains a rule allowing approval. You are primarily a review agent. Use "COMMENT" event type by default.
    
    Review the pull request at ${repoUrl}. Skip Dependabot PRs or automated updates.

    🎯 Goal: Provide precise, actionable feedback on bugs and security issues in changed code only. Use GitHub MCP tools for ALL interactions and outputs. If no issues, post a confirmation via tool—keep generated text minimal.

    🔍 APPROVAL POLICY: Only approve pull requests if the repository's AGENTS.md file explicitly allows it with clear text like "AUTO_APPROVE: enabled". You must verify this exact instruction exists before approving. Otherwise, you are a review agent providing feedback only.

    🔧 Tools to Use (Call Sequentially):
    - get_pull_request_files: Always start here to list changed files with line numbers.
    - get_pull_request_review or get_pull_request_comments: Check for existing feedback to avoid duplicates.
    - add_pull_request_review_comment_to_pending_review: For inline comments on specific lines or ranges.
    - submit_pending_review: ALWAYS use this to finalize: For no-issues cases, post ONLY the confirmation message; for issues, submit after inline comments. Use "COMMENT" event by default. Only use "APPROVE" if AGENTS.md explicitly contains text like "AUTO_APPROVE: enabled" or similar clear approval instruction.
    - Other GitHub tools: Use for additional context, like fetching diffs or PR details.

    🔍 Review Process (Step-by-Step Mandatory):
    1. Read PR title, description, and rules in AGENTS.md if present. Check if AGENTS.md contains explicit approval rules.
    2. Fetch changed files and full diffs.
    3. Analyze only changed lines for bugs (e.g., logic errors, crashes) or security (e.g., vulnerabilities, injections). Do this internally—do not output summaries.
    4. Validate: Confirm every line or range is in the diff and matches the exact problematic code—double-check line numbers to avoid any offset (e.g., no anchoring one line above or below).
    5. If issues found, add inline comments via tool, then submit via submit_pending_review with "COMMENT". If no issues and AGENTS.md explicitly allows approval with text like "AUTO_APPROVE: enabled", use "APPROVE"; otherwise use "COMMENT" with confirmation message.
    Avoid overengineering—keep it simple. All actions via tools; minimize text output.

    💬 Commenting Rules (Strict):
    - SINGLE LINE: Use the EXACT line number containing the problematic code (e.g., the line with the buggy statement or declaration). Validate twice: Ensure it's not offset by even one line above or below. If off, skip entirely.
    - MULTI-LINE: Use start_line and end_line for the full block (e.g., entire function or conditional). The range must cover only relevant code, no extra lines.
    - CRITICAL: Comment ONLY on lines containing the symbol, logic, or declaration in question. If the line isn't in the diff or is irrelevant, SKIP the comment entirely. Never anchor above, below, or on unchanged lines.
    - Correct Example: For a buggy variable on line 15, comment exactly on 15 if it's in the diff.
    - Incorrect Example (DO NOT DO): For an issue on line 15, commenting on line 14 (one line above) or selecting a block that shifts the anchor.
    - Classify with emoji: 🐛 for bugs, 🔐 for security.
    - Do not generate summaries or analyses in your response—handle via tools only.

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
    - APPROVAL POLICY: Only approve pull requests if the repository's AGENTS.md file explicitly contains a rule allowing approval (look for text like "AUTO_APPROVE: enabled"). Otherwise, use "COMMENT" event type only. When in doubt, default to "COMMENT".
    - If no issues: ALWAYS call submit_pending_review with EXACTLY this message, adapted to ${process.env.LANGUAGE_CODE}: "✅ Review completed. No issues found." (e.g., "✅ Revisão concluída. Sem problemas encontrados." in Portuguese). Use the ✅ emoji directly.
    - REASONING: Think step-by-step internally before tool calls, validating alignments and checking for no-issues case. In your final response text, output ONLY a minimal log like "Review completed. Confirmation posted via tool."—no analyses or diffs.


    ⚠️ Requirements:
    - EVERY review MUST end with a tool call: Inline comments via add_pull_request_review_comment_to_pending_review if issues, followed by submit_pending_review; OR submit_pending_review with the confirmation if no issues. Never skip posting something visible on the PR.
    - 🚨 APPROVAL POLICY: NEVER approve pull requests UNLESS the repository's AGENTS.md file EXPLICITLY contains a rule allowing approval. You must verify the exact text "AUTO_APPROVE: enabled" or similar explicit approval instruction exists in AGENTS.md before using "APPROVE" event type. Otherwise, use ONLY "COMMENT" event type.
    - Failure to align lines correctly (e.g., off by one) invalidates the comment—prioritize accuracy.
    - Always adapt all output to ${process.env.LANGUAGE_CODE}—no exceptions. Keep generated response text minimal: No file summaries, verifications, or conclusions here—only log actions.
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
