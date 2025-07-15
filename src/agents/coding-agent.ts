import { generateText, stepCountIs } from 'ai';
import { CopilotMcpManager } from '../mcps/copilot';
import { createRunCommandTool } from '../tools/run-command';
import { SandboxManager } from '../utils/sandbox';
import { openai } from '@ai-sdk/openai';

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

    🎯 CRITICAL GOAL: You MUST create a pull request with your changes. Never make changes directly to the main branch.

    📋 Your Task:
    User Request: "${prompt}"
    Repository: ${repositoryUrl}
    Base Branch: ${baseBranch}
    Target Branch: ${branchName}
    ${context ? `Additional Context: ${context}` : ''}

    🚨 MANDATORY WORKFLOW - FOLLOW EXACTLY:
    
    STEP 1: CREATE BRANCH FIRST (REQUIRED)
    - BEFORE making ANY changes, you MUST use create_branch to create: "${branchName}"
    - This branch will be created from ${baseBranch}
    - NEVER skip this step - all changes must be on a separate branch

    STEP 2: ANALYZE REPOSITORY
    - Use list_files to understand the project structure
    - Use get_file_contents to read existing files and understand patterns
    - Identify programming language, framework, and conventions
    - Look for configuration files (package.json, tsconfig.json, etc.)

    STEP 3: MAKE CHANGES ON THE BRANCH
    - Use create_or_update_file to modify files ON THE BRANCH "${branchName}"
    - Follow existing project conventions and patterns
    - Include proper error handling and validation
    - Add meaningful comments and documentation

    STEP 4: CREATE PULL REQUEST (REQUIRED)
    - Use create_pull_request to create a PR from "${branchName}" to ${baseBranch}
    - Write a comprehensive PR title and description
    - Include summary of changes and implementation details
    - The PR URL is REQUIRED for success

    🔧 Available Tools:
    - create_branch: Creates a new branch (USE FIRST)
    - list_files: Lists repository files
    - get_file_contents: Reads file contents
    - create_or_update_file: Creates or updates files ON THE BRANCH
    - delete_file: Deletes files ON THE BRANCH
    - create_pull_request: Creates PR (USE LAST)
    - runCommand: Execute shell commands in sandbox

    🚨 CRITICAL RULES - NEVER VIOLATE:
    1. ALWAYS create branch "${branchName}" BEFORE any file operations
    2. NEVER make changes directly to ${baseBranch} branch
    3. ALL file operations must target the branch "${branchName}"
    4. ALWAYS end by creating a pull request
    5. If you cannot create a PR, the task has FAILED

    🎨 Code Quality Guidelines:
    - Follow existing project conventions and patterns
    - Use proper TypeScript types if it's a TypeScript project
    - Include comprehensive error handling
    - Add meaningful comments and documentation
    - Ensure code is production-ready

    📁 File Organization:
    - Place files in appropriate directories based on existing structure
    - Follow the project's naming conventions
    - Create new directories only if necessary
    - Update index files or exports if the project uses them

    ✅ Success Criteria (ALL REQUIRED):
    1. Branch "${branchName}" is created successfully
    2. Changes are made on the branch (not main)
    3. Code follows existing project patterns
    4. Pull request is created successfully
    5. PR URL is returned in the response

    ❌ FAILURE CONDITIONS:
    - Making changes directly to ${baseBranch}
    - Not creating the required branch first
    - Not creating a pull request at the end
    - Any file operations on the wrong branch

    START BY CREATING THE BRANCH "${branchName}" - THIS IS MANDATORY!
  `;

  try {
    const mcpTools = await mcpClientManager.getTools();

    const result = await generateText({
      model: openai('gpt-4.1'),
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
