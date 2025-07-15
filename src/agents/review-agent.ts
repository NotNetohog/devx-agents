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
    Review the pull request at ${repoUrl}, analyzing only the files and changes included in the PR.
    Read the title and description to understand the context of the changes.
    Follow the instructions contained in the AGENTS.md file if it exists.
    Do not suggest improvements that would lead to overengineering.
    Use the necessary tools to comment in the appropriate places in the code, using inline comments for specific issues and general comments for broader topics.
    For each issue found, comment in a concise and friendly manner in ${process.env.LANGUAGE_CODE}, and classify it with an appropriate emoji:

    🐛 for bugs
    🔐 for security issues
    🧼 for readability
    🍝 for high complexity code
    ✂️ for dead or unnecessary code
    📝 for nitpicks
    
    If no issues are found, leave a positive and encouraging general comment on the pull request.
    Remember, you should always use your GitHub tools to comment at least once per pull request.
    Never modify the code.
    `;

  try {
    const mcpTools = await mcpClientManager.getTools();

    const result = await generateText({
      model: 'openai/gpt-4.1',
      prompt,
      system: systemPrompt,
      stopWhen: stepCountIs(50),
      tools: {
        ...mcpTools,
        runCommand,
      },
    });

    console.log('Review result:', result.text);

    return { response: result.text };
  } finally {
    await mcpClientManager.stop();
    await sandboxManager.stop();
  }
}
