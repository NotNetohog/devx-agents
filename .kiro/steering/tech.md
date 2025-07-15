# Technology Stack

## Core Technologies

- **Runtime**: Node.js with TypeScript
- **Package Manager**: pnpm (v10.13.1+)
- **Build Tool**: tsx for TypeScript execution
- **Deployment**: Vercel platform
- **Code Quality**: Biome linter with ultracite config

## Key Dependencies

- **AI SDK**: `ai` v5.0.0-beta.14 for AI model integration
- **MCP**: `@modelcontextprotocol/sdk` for GitHub Copilot integration
- **Vercel Sandbox**: `@vercel/sandbox` for secure command execution
- **Validation**: Zod for schema validation
- **Utilities**: ms for time parsing

## Development Tools

- **TypeScript**: v5.8.3+ with strict null checks enabled
- **Biome**: v2.0.6 for linting and formatting
- **tsx**: v4.19.3+ for running TypeScript files

## Common Commands

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Development with Vercel
vercel dev

# Link to Vercel project
vercel link

# Pull environment variables
vercel env pull .env
```

## Environment Variables

Required for deployment:
- `GITHUB_TOKEN`: GitHub personal access token
- `GITHUB_WEBHOOK_SECRET`: Webhook verification secret
- `LANGUAGE_CODE`: Agent response language (e.g., en-US, pt-BR)

## AI Model Configuration

- Default model: `openai/gpt-4.1` via Vercel Gateway
- Configurable through agent files
- Step limit: 50 steps per review session