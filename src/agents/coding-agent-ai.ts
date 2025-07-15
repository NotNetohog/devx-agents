import { generateText, stepCountIs } from 'ai';
import { CopilotMcpManager } from '../mcps/copilot';
import { createRunCommandTool } from '../tools/run-command';
import { SandboxManager } from '../utils/sandbox';

// Regex constants for performance
const GITHUB_REPO_REGEX = /github\.com\/([^/]+)\/([^/]+)/;
const PULL_REQUEST_URL_REGEX = /https:\/\/github\.com\/[^/]+\/[^/]+\/pull\/\d+/;

export interface CodingAgentRequest {
  prompt: string;
  repositoryUrl: string;
  baseBranch?: string;
  context?: string;
}

export interface CodingAgentResponse {
  success: boolean;
  pullRequestUrl?: string;
  branchName?: string;
  summary?: string;
  error?: string;
}

export async function codingAgent(
  request: CodingAgentRequest
): Promise<CodingAgentResponse> {
  const { prompt, repositoryUrl, baseBranch = 'main', context } = request;

  if (!repositoryUrl) {
    throw new Error('A repository URL is required to run the coding agent.');
  }

  const mcpClientManager = new CopilotMcpManager();
  const sandboxManager = new SandboxManager(repositoryUrl);

  const runCommand = createRunCommandTool(() => sandboxManager.getInstance());

  // Extract repository info for branch naming
  const repoMatch = repositoryUrl.match(GITHUB_REPO_REGEX);
  const repoName = repoMatch ? repoMatch[2] : 'repo';
  const timestamp = Date.now();
  const branchName = `coding-agent/${repoName}-${timestamp}`;

  const systemPrompt = `
    You are an AI coding agent that generates code from natural language prompts and creates pull requests.

    🎯 Goal: Analyze the repository, generate appropriate code, and create a pull request with the changes.

    📋 Your Task:
    User Request: "${prompt}"
    Repository: ${repositoryUrl}
    Base Branch: ${baseBranch}
    ${context ? `Additional Context: ${context}` : ''}

    🔧 Tools you'll use:
    - GitHub MCP tools to interact with the repository
    - runCommand to execute shell commands in the sandbox
    - File operations to read existing code and understand patterns

    📝 Step-by-Step Process:
    1. **Analyze Repository Structure**
       - Use list_files or get_file_contents to understand the project structure
       - Identify the programming language, framework, and existing patterns
       - Look for configuration files (package.json, tsconfig.json, etc.)
       - Understand naming conventions and code organization

    2. **Understand Existing Patterns**
       - Read similar files to understand the coding style
       - Identify common patterns for the type of code being requested
       - Check for existing error handling, validation, and architectural patterns
       - Look for test patterns if tests exist

    3. **Generate Code**
       - Create code that follows the existing project conventions
       - Use the same naming conventions, file structure, and patterns
       - Include proper TypeScript types if it's a TypeScript project
       - Add appropriate error handling and validation
       - Include JSDoc comments for functions and classes
       - Follow the existing import/export patterns

    4. **Create Branch and Commit**
       - Use create_branch to create a new branch: "${branchName}"
       - Use create_or_update_file to add/modify files with the generated code
       - Create descriptive commit messages that explain what was added/changed

    5. **Create Pull Request**
       - Use create_pull_request to create a PR from the new branch to ${baseBranch}
       - Write a comprehensive PR title and description
       - Include a summary of changes and implementation details
       - Add a checklist for review

    🎨 Code Quality Guidelines:
    - Follow existing project conventions and patterns
    - Use proper TypeScript types and interfaces
    - Include comprehensive error handling
    - Add meaningful comments and documentation
    - Ensure code is production-ready and well-tested
    - Follow the project's existing architectural patterns

    📁 File Organization:
    - Place files in appropriate directories based on existing structure
    - Follow the project's naming conventions
    - Create new directories only if necessary and following existing patterns
    - Update index files or exports if the project uses them

    🔍 Context Analysis:
    - Read AGENTS.md, README.md, or similar files for project-specific guidelines
    - Check package.json for dependencies and scripts
    - Look at existing similar files for patterns to follow
    - Understand the project's architecture and conventions

    ✅ Success Criteria:
    - Code compiles without errors (if applicable)
    - Follows existing project patterns and conventions
    - Includes proper error handling and validation
    - Has appropriate documentation and comments
    - Creates a well-structured pull request

    🚨 Important Notes:
    - Always create a new branch for changes
    - Never modify the main/master branch directly
    - Include comprehensive commit messages
    - Create detailed PR descriptions
    - Test your understanding by reading existing code first

    Start by analyzing the repository structure and existing patterns, then generate the requested code following those patterns.
  `;

  try {
    const mcpTools = await mcpClientManager.getTools();

    const result = await generateText({
      model: 'openai/gpt-4.1',
      prompt: `Please implement the following request: ${prompt}`,
      system: systemPrompt,
      stopWhen: stepCountIs(50),
      tools: {
        ...mcpTools,
        runCommand,
      },
    });

    // Parse the result to extract PR URL and other details
    const pullRequestUrlMatch = result.text.match(PULL_REQUEST_URL_REGEX);
    const pullRequestUrl = pullRequestUrlMatch
      ? pullRequestUrlMatch[0]
      : undefined;

    // Create summary from the result
    const summary = `Generated code based on prompt: "${prompt}". ${result.text.length > 200 ? `${result.text.substring(0, 200)}...` : result.text}`;

    return {
      success: true,
      pullRequestUrl,
      branchName,
      summary,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  } finally {
    await mcpClientManager.stop();
    await sandboxManager.stop();
  }
}
