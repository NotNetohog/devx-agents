# Agent's Guide to the `vercel-agents` Codebase

Welcome, agent! This guide provides you with the essential information to understand and contribute to this project effectively. Please follow these guidelines to ensure your contributions are consistent and high-quality.

## Project Structure

Here's an overview of the key directories you'll be working with:

- `/agents`: Specialyzed ai agents 
- `/mcps`: External model context protocols servers to be attached to agents
- `/tools`: Tools to be attached to agents
- `/utils`: Vercel Sandbox related and general utils files for the project


## Coding Conventions

To maintain code quality and consistency, please adhere to the following conventions.

### General

-   **TypeScript**: All new code must be written in TypeScript.
-   **Style Consistency**: Follow the existing coding style of the file you are editing.
-   **Naming**: Use clear and descriptive names for variables, functions, and components.
-   **Comments**: Add comments to explain complex logic, algorithms, or any non-obvious parts of the code.


## Pull Request Review Guidelines

When reviewing a pull request, please ensure it meets the following criteria:

1.  **Clear Description**: Write in a clear and concise way.
2.  **Nitpicks**: Do not suggest Nitpicks. We hate them.
3.  **Tests**: We don't care about tests. Do not suggest or add any tests.
4.  **Single Responsibility**:PRs should be focused on a single feature, bug fix, or concern.