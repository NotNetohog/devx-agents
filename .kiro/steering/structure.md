---
inclusion: always
---

# Project Structure & Conventions

## Architecture Overview

### Core Components
- **Agents** (`src/agents/`): AI logic with system prompts and tool orchestration
- **Tools** (`src/tools/`): Reusable functions for agents (command execution, file operations)
- **MCPs** (`src/mcps/`): Model Context Protocol integrations for external services
- **API Routes** (`api/`): Vercel serverless functions for webhooks and external integrations
- **Utils** (`src/utils/`): Shared business logic (sandbox, review utilities)

### Key Files
- `AGENTS.md`: Repository-specific agent behavior and guidelines
- `api/github-review.ts`: GitHub webhook handler with HMAC verification
- `src/agents/review-agent.ts`: Main PR review agent implementation

## Coding Standards

### File Naming & Structure
- Use kebab-case for files: `review-agent.ts`, `run-command.ts`
- Use PascalCase for classes: `CopilotMcpManager`, `SandboxManager`
- All code must be TypeScript with strict null checks
- Use Zod for input validation in tools and API endpoints

### Required Patterns

#### Tool Creation
```typescript
export const createToolName = (getDependency: () => Promise<Dependency>) => {
  return tool({
    description: 'Clear, actionable description',
    inputSchema: z.object({ /* validation schema */ }),
    execute: async ({ input }) => { /* implementation */ }
  });
};
```

#### Manager Classes
- Implement `getInstance()`, `getTools()`, and `stop()` methods
- Handle connection lifecycle and cleanup properly
- Use singleton pattern for external service connections

#### Error Handling
- Always use try/catch for async operations
- Provide meaningful error messages
- Handle webhook timeouts (5-minute max for background processing)

### Security Requirements
- HMAC signature verification for all GitHub webhooks
- Secure command execution via Vercel Sandbox
- Environment variable validation using Zod schemas
- No direct shell access - use sandbox utilities

### Development Workflow
- Use pnpm for package management
- Run `vercel dev` for local development
- Use `tsx` for TypeScript execution
- Follow Biome linting rules (ultracite config)