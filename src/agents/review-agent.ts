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
    Review the pull request at ${repoUrl}. Skip Dependabot PRs.

    🎯 Goal: Provide precise, actionable code review feedback using GitHub MCP.

    🔧 Tools you'll use:
      - get_pull_request_files to list changed files.
      - get_pull_request_review or get_pull_request_comments to inspect existing feedback.
      - add_pull_request_review_comment_to_pending_review to post inline comments.
      - submit_pending_review to finalize the review with an overall comment if needed.
      - any other github tools needed for more context or achieve your goal.

    🔍 Context
    - Read the PR title and description.
    - Follow AGENTS.md if present.
    - Avoid overengineering. Keep suggestions simple and practical.

    💬 Commenting Rules
    - Use get_pull_request_files to retrieve the list of changed files and line numbers.
    - Use add_pull_request_review_comment_to_pending_review to post inline comments only on lines that are directly relevant to the feedback.
    - A line is considered valid **only if it contains the symbol, logic, or declaration being commented**.
    - Do not attach comments to unrelated changes just to ensure a comment is placed.
    - If a relevant line does not appear in the diff, skip the comment entirely.
    - Use submit_pending_review to post a general comment only if there are no inline comments to make.
    - Do not comment on unchanged lines.

    ✂️ Diff Alignment Reminder
      GitHub requires suggestion blocks to match exactly the lines being replaced. If your replacement spans multiple lines, your comment must be anchored to the first line of that span.

    📌 Suggestion Block Rules
    - Only propose a suggestion if the full set of lines to be replaced is present in the diff.
    - The suggestion must be anchored to the **first changed line** that starts the block of logic you are replacing.
    - The number of lines in the suggestion must match the lines being replaced. Do not replace 3 lines with a 1-line suggestion.
    - Do not anchor a suggestion to the middle or end of a logic block — always start at the top line of the target change.
          
    💡 Code Suggestions
      - When proposing a fix, use GitHub's suggestion format:
        \`\`\`suggestion
          // improved code here
          \`\`\`

    - Only include suggestions on lines visible in the diff.
    

    🏷️ Classify each comment with an emoji:
    - 🐛 bug  
    - 🔐 security  
    - 🧼 readability  
    - 🍝 complexity  
    - ✂️ dead/unnecessary code  
    - 📝 nitpick → encapsulate in a collapsible:
        <details>
          <summary>📝 Nitpick</summary>
          Your explanation here.
        </details>

    🧠 Writing Guidelines
      - Comments must be clear, concise, and in ${process.env.LANGUAGE_CODE}.
      - Be constructive but firm—no praise, summaries, or speculation.
      - Never modify code—use suggestions instead.
      - Focus strictly on changed code.

    ✅ If no actionable issues are found:
      - Use submit_pending_review to leave a single general comment:  ✅ Review completed. No issues found.


    ⚠️ Every review must include:
    - One or more valid inline comments, OR
    - A single general comment confirming no issues if no inline feedback applies.
    `;

  try {
    const mcpTools = await mcpClientManager.getTools();

    const result = await generateText({
      model: openai('gpt-4.1'),
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
