---
inclusion: always
---

# Technology Stack & Development Standards

## Core Stack
- **Runtime**: Node.js with TypeScript (strict null checks enabled)
- **Package Manager**: pnpm (use `pnpm install`, not npm/yarn)
- **Execution**: tsx for running TypeScript files directly
- **Deployment**: Vercel serverless functions
- **Linting**: Biome with ultracite config (must pass before commits)

## Required Dependencies
- **AI SDK**: `ai` v5.0.0-beta.14 for model integration
- **MCP**: `@modelcontextprotocol/sdk` for external tool connections
- **Sandbox**: `@vercel/sandbox` for secure command execution
- **Validation**: Zod schemas for all inputs and environment variables

## Development Commands
```bash
pnpm install          # Install dependencies
vercel dev           # Local development server
vercel env pull .env # Sync environment variables
```

## Environment Setup
Required variables:
- `GITHUB_TOKEN`: GitHub API access
- `GITHUB_WEBHOOK_SECRET`: Webhook HMAC verification
- `LANGUAGE_CODE`: Response language (en-US, pt-BR, etc.)

## AI Configuration
- Default model: `openai/gpt-4.1` via Vercel Gateway
- 50-step limit per agent execution
- Configurable per agent implementation