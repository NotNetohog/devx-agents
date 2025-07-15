# Project Structure

## Directory Organization

```
├── api/                    # Vercel API routes
│   └── github-review.ts   # GitHub webhook handler
├── src/                   # Source code
│   ├── agents/           # AI agent implementations
│   ├── mcps/             # Model Context Protocol integrations
│   ├── tools/            # Agent tools and utilities
│   └── utils/            # General utilities (sandbox, etc.)
└── .kiro/                # Kiro configuration and steering
```

## Key Patterns

### Agent Architecture
- **Agents** (`src/agents/`): Main AI logic with system prompts and tool orchestration
- **Tools** (`src/tools/`): Reusable functions that agents can call (e.g., command execution)
- **MCPs** (`src/mcps/`): External service integrations via Model Context Protocol

### API Structure
- **Webhook Handlers** (`api/`): Vercel serverless functions for external integrations
- **Security**: HMAC signature verification for GitHub webhooks
- **Timeout**: 5-minute max duration for background processing

### Configuration Files
- `agents.md`: Repository-specific agent instructions and guidelines
- `package.json`: Dependencies and scripts
- `vercel.json`: Deployment configuration
- `biome.jsonc`: Code quality and formatting rules

## Coding Conventions

### File Naming
- Use kebab-case for files: `review-agent.ts`, `run-command.ts`
- Use PascalCase for classes: `CopilotMcpManager`, `SandboxManager`

### TypeScript Patterns
- All code must be TypeScript
- Use Zod for input validation in tools
- Implement proper error handling with try/catch
- Use async/await for asynchronous operations

### Tool Creation Pattern
```typescript
export const createToolName = (getDependency: () => Promise<Dependency>) => {
  return tool({
    description: 'Clear description of what the tool does',
    inputSchema: z.object({ /* validation schema */ }),
    execute: async ({ input }) => { /* implementation */ }
  });
};
```

### Manager Pattern
- Use manager classes for external service connections
- Implement `getInstance()`, `getTools()`, and `stop()` methods
- Handle connection lifecycle properly