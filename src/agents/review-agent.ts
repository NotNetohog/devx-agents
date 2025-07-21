import { openai } from '@ai-sdk/openai';
import { generateText, stepCountIs } from 'ai';
import { CopilotMcpManager } from '../mcps/copilot';
import { createRunCommandTool } from '../tools/run-command';
import { SandboxManager } from '../utils/sandbox';

interface ReviewResult {
  response: string;
  success: boolean;
  error?: string;
}

export async function reviewAgent(
  prompt: string,
  repoUrl?: string
): Promise<ReviewResult> {
  // Input validation
  if (!repoUrl) {
    throw new Error('A repository URL is required to run the review agent.');
  }

  if (!repoUrl.match(/^https:\/\/github\.com\/[\w-]+\/[\w-]+/)) {
    throw new Error(
      'Invalid GitHub repository URL format. Must be a valid GitHub repository URL.'
    );
  }

  const mcpClientManager = new CopilotMcpManager();
  const sandboxManager = new SandboxManager(repoUrl);

  try {
    const runCommand = createRunCommandTool(() => sandboxManager.getInstance());
    const mcpTools = await mcpClientManager.getTools();

    const result = await generateText({
      model: openai('gpt-4o-mini'), // More cost-effective and sufficient for code review
      temperature: 0.1, // More deterministic for code analysis
      prompt,
      system: createSystemPrompt(repoUrl),
      stopWhen: stepCountIs(50),
      tools: {
        ...mcpTools,
        runCommand,
      },
    });

    console.log('Review completed for:', repoUrl);

    // Send notification with better error handling
    await sendSlackNotification(repoUrl, result.text);

    return {
      response: result.text,
      success: true,
    };
  } catch (error) {
    console.error('Review agent failed:', error);
    return {
      response: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  } finally {
    // Ensure cleanup happens
    await Promise.all([
      mcpClientManager.stop().catch(console.error),
      sandboxManager.stop().catch(console.error),
    ]);
  }
}

function createSystemPrompt(repoUrl: string): string {
  const languageCode = process.env.LANGUAGE_CODE || 'en';

  const noIssuesMessage = getNoIssuesMessage(languageCode);

  return `# Code Review Agent

## Role
You are a code review agent that analyzes pull requests for bugs and security issues. You provide feedback through GitHub tools and only approve PRs when explicitly authorized.

## Approval Rules
- **DEFAULT**: Use "COMMENT" event type for all reviews
- **APPROVAL**: Only use "APPROVE" if the repository's AGENTS.md file contains explicit approval text like "AUTO_APPROVE: enabled"
- **VERIFICATION**: You must check AGENTS.md before any approval decision

## Review Process
Execute these steps in order:

1. **Check Authorization**: Read AGENTS.md to verify approval permissions
2. **Get Files**: Use get_pull_request_files to list changed files
3. **Check Existing Reviews**: Use get_pull_request_review or get_pull_request_comments
4. **Analyze Changes**: Focus only on changed lines for bugs and security issues
5. **Check Context**: Before commenting, verify your understanding matches what the diff actually shows
6. **Add Comments**: Use add_pull_request_review_comment_to_pending_review for specific issues
7. **Submit Review**: Always end with submit_pending_review

## Comment Guidelines

### Line Targeting
- **Single Line**: Comment on the exact line containing the issue
- **Multi-Line**: Use start_line and end_line for the complete problematic block
- **Validation**: Double-check line numbers match the diff exactly
- **Skip**: If line numbers don't align perfectly, skip the comment

### Content Format
- Classify issues: 🐛 for bugs, 🔐 for security
- Write in ${languageCode}
- Be concise and actionable
- No praise or speculation

### Code Suggestions
Only provide suggestions when:
- The diff range matches exactly
- Replacement has same line count
- Anchored to first changed line

Format:
\`\`\`suggestion
// improved code here
\`\`\`

## Output Requirements

### Always Required
- End every review with submit_pending_review tool call
- If no issues found: Submit with message "${noIssuesMessage}"
- If issues found: Submit after adding inline comments
- When reviewing multi-file changes, consider how changes relate across all modified files

### Response Text
Keep minimal. Output only: "Review completed. [Action taken]"
- No file summaries
- No detailed analysis
- No duplicate information

## Focus Areas
- **Bugs**: Logic errors, crashes, incorrect implementations
- **Security**: Vulnerabilities, injection risks, unsafe operations
- **Scope**: Only analyze changed code, ignore style/docs
- **Skip**: Dependabot PRs and automated updates

## Repository Context
Reviewing: ${repoUrl}

Remember: Your primary role is to COMMENT with helpful feedback. Only APPROVE when explicitly authorized by AGENTS.md.`;
}

function getNoIssuesMessage(languageCode: string): string {
  const messages = {
    en: '✅ Review completed. No issues found.',
    'pt-BR': '✅ Revisão concluída. Sem problemas encontrados.',
    es: '✅ Revisión completada. No se encontraron problemas.',
    fr: '✅ Révision terminée. Aucun problème trouvé.',
    de: '✅ Überprüfung abgeschlossen. Keine Probleme gefunden.',
    ja: '✅ レビュー完了。問題は見つかりませんでした。',
    ko: '✅ 리뷰 완료. 문제가 발견되지 않았습니다.',
    zh: '✅ 审查完成。未发现问题。',
  };

  return messages[languageCode as keyof typeof messages] || messages.en;
}

async function sendSlackNotification(
  repoUrl: string,
  reviewText: string
): Promise<void> {
  const webhookUrl =
    process.env.SLACK_WEBHOOK_URL ||
    'https://hooks.slack.com/triggers/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';

  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repo: repoUrl,
          review: reviewText,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Slack webhook failed: ${response.status} ${response.statusText}`
        );
      }

      console.log('Slack notification sent successfully');
      return;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      console.warn(
        `Slack notification attempt ${attempt}/${maxRetries} failed:`,
        lastError.message
      );

      if (attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * Math.pow(2, attempt - 1))
        );
      }
    }
  }

  // Log final failure but don't throw - notification is not critical
  console.error(
    'Failed to send Slack notification after all retries:',
    lastError?.message
  );
}
