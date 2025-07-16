# Agent's Guide to the `devx-agents` Codebase

Welcome, agent! This guide provides you with the essential information to understand and contribute to this project effectively. Please follow these guidelines to ensure your contributions are consistent and high-quality.

## Project Overview

DevX Agents is a framework for building AI agents that improve developer experience. The project includes:

1. **Review Agent**: Analyzes pull requests and provides intelligent feedback
2. **Framework**: Extensible architecture for building custom agents

## Project Structure

Here's an overview of the key directories you'll be working with:

- `/api`: Vercel serverless API endpoints
  - `github-review.ts`: Webhook handler for PR reviews
- `/src/agents`: Specialized AI agents 
  - `review-agent.ts`: PR review functionality
- `/src/mcps`: External model context protocols servers to be attached to agents
- `/src/tools`: Tools to be attached to agents
- `/src/utils`: Vercel Sandbox related and general utils files for the project
- `/docs`: Comprehensive documentation and examples


## Coding Conventions

To maintain code quality and consistency, please adhere to the following conventions.

### General

-   **TypeScript**: All new code must be written in TypeScript.
-   **Style Consistency**: Follow the existing coding style of the file you are editing.
-   **Naming**: Use clear and descriptive names for variables, functions, and components.
-   **Comments**: Add comments to explain complex logic, algorithms, or any non-obvious parts of the code.


## Agent-Specific Guidelines

### Review Agent
When reviewing a pull request, please ensure it meets the following criteria:

1.  **Clear Description**: Write in a clear and concise way.
2.  **Nitpicks**: Do not suggest Nitpicks. We hate them.
3.  **Tests**: We don't care about tests. Do not suggest or add any tests.
4.  **Single Responsibility**: PRs should be focused on a single feature, bug fix, or concern.

### General Development Guidelines

When contributing to the project, follow these guidelines:

1.  **Project Structure**: Follow the established directory structure
    - Place agents in `/src/agents/`
    - Place API endpoints in `/api/`
    - Place utilities in `/src/utils/`
    - Place tools in `/src/tools/`

2.  **Code Patterns**: Follow existing patterns in the codebase
    - Use the tool creation pattern: `export const createTool = (getDependency) => tool({ ... })`
    - Follow the agent class structure with proper error handling
    - Use Zod for input validation
    - Implement proper TypeScript types

3.  **Error Handling**: Use the established error handling patterns
    - Include actionable suggestions in error messages
    - Implement retry logic for transient failures
    - Use circuit breaker pattern for external services

4.  **Documentation**: Include comprehensive documentation
    - Add JSDoc comments for all public methods
    - Include usage examples in comments
    - Document error conditions and recovery strategies
    - Explain complex algorithms or business logic

5.  **File Naming**: Follow the project's naming conventions
    - Use kebab-case for files: `review-agent.ts`, `github-review.ts`
    - Use PascalCase for classes: `ReviewAgent`, `SandboxManager`
    - Use camelCase for functions and variables

6.  **Dependencies**: Use the project's established dependencies
    - Use `ai` SDK for AI model integration
    - Use `zod` for validation
    - Use `@vercel/node` types for API endpoints
    - Follow the MCP pattern for external integrations