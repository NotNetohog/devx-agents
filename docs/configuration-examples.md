# Configuration Examples

This document provides configuration examples for different use cases of the DevX Agents framework.

## Environment Variables

### Basic Configuration

```bash
# Required for both review and coding agents
GITHUB_TOKEN=ghp_your_github_personal_access_token
GITHUB_WEBHOOK_SECRET=your_webhook_secret_here
LANGUAGE_CODE=en-US

# Optional: Custom AI model (default: openai/gpt-4.1)
AI_MODEL=openai/gpt-4.1

# Optional: Request timeout (default: 5 minutes)
REQUEST_TIMEOUT=300000

# Optional: Max concurrent requests (default: 5)
MAX_CONCURRENT_REQUESTS=5
```

### Advanced Configuration

```bash
# GitHub token with specific permissions
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Webhook secret for HMAC verification
GITHUB_WEBHOOK_SECRET=super_secret_webhook_key_2024

# Language for agent responses
LANGUAGE_CODE=pt-BR  # Portuguese (Brazil)
# LANGUAGE_CODE=es-AR  # Spanish (Argentina)
# LANGUAGE_CODE=fr-FR  # French (France)

# AI model selection via Vercel Gateway
AI_MODEL=anthropic/claude-3-sonnet
# AI_MODEL=openai/gpt-4-turbo
# AI_MODEL=openai/gpt-3.5-turbo

# Performance tuning
REQUEST_TIMEOUT=600000  # 10 minutes for complex requests
MAX_CONCURRENT_REQUESTS=10
MAX_REQUESTS_PER_IP=3

# Logging level
LOG_LEVEL=info  # debug, info, warn, error
```

## Repository-Specific Configuration

### agents.md File

Create an `agents.md` file in your repository root to customize agent behavior:

#### Basic Example
```markdown
# Agent Configuration

## Review Agent
- Focus on security vulnerabilities and performance issues
- Ignore style nitpicks unless they affect readability
- Use a friendly, encouraging tone in comments

## Coding Agent
- Follow our TypeScript strict mode configuration
- Use our custom error handling patterns from src/utils/errors.ts
- Place new API endpoints in src/api/ directory
- Include comprehensive JSDoc comments
```

#### Advanced Example
```markdown
# DevX Agents Configuration

## Project Context
This is a Next.js application with TypeScript, using:
- Prisma for database operations
- NextAuth.js for authentication
- Tailwind CSS for styling
- Jest for testing

## Review Agent Rules

### Priority Issues
1. **Security**: Always flag potential security vulnerabilities
2. **Performance**: Highlight inefficient database queries or large bundle impacts
3. **Type Safety**: Ensure proper TypeScript usage

### Ignore Patterns
- Minor formatting issues (handled by Prettier)
- Import order (handled by ESLint)
- Console.log statements in development files

### Tone and Style
- Be constructive and educational
- Provide code examples when suggesting improvements
- Use emojis sparingly but appropriately

## Coding Agent Rules

### File Organization
- Components: `src/components/[category]/ComponentName.tsx`
- API routes: `src/pages/api/[version]/[resource].ts`
- Utilities: `src/utils/[category]/utilityName.ts`
- Types: `src/types/[domain].ts`

### Code Patterns
- Use our custom `ApiResponse<T>` type for all API responses
- Implement error boundaries for all page components
- Use the `useAsync` hook for data fetching
- Follow the repository pattern for database operations

### Testing Requirements
- Include unit tests for all utility functions
- Add integration tests for API endpoints
- Use MSW for mocking external API calls
- Maintain >80% code coverage

### Documentation
- Add JSDoc comments for all public functions
- Include usage examples in component documentation
- Update README.md if adding new features
```

## Webhook Configuration

### GitHub Repository Webhook

```json
{
  "name": "web",
  "active": true,
  "events": ["pull_request"],
  "config": {
    "url": "https://your-vercel-app.vercel.app/api/github-review",
    "content_type": "json",
    "secret": "your_webhook_secret_here",
    "insecure_ssl": "0"
  }
}
```

### GitHub Organization Webhook

```json
{
  "name": "web",
  "active": true,
  "events": ["pull_request"],
  "config": {
    "url": "https://your-vercel-app.vercel.app/api/github-review",
    "content_type": "json",
    "secret": "your_webhook_secret_here",
    "insecure_ssl": "0"
  }
}
```

## Vercel Deployment Configuration

### vercel.json

```json
{
  "functions": {
    "api/github-review.ts": {
      "maxDuration": 300
    },
    "api/github-coding.ts": {
      "maxDuration": 300
    }
  },
  "env": {
    "GITHUB_TOKEN": "@github-token",
    "GITHUB_WEBHOOK_SECRET": "@webhook-secret",
    "LANGUAGE_CODE": "en-US"
  }
}
```

### Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add the following variables:

| Name | Value | Environment |
|------|-------|-------------|
| `GITHUB_TOKEN` | `ghp_your_token` | Production, Preview, Development |
| `GITHUB_WEBHOOK_SECRET` | `your_secret` | Production, Preview, Development |
| `LANGUAGE_CODE` | `en-US` | Production, Preview, Development |

## Use Case Examples

### 1. Open Source Project

```bash
# Focus on code quality and documentation
LANGUAGE_CODE=en-US
AI_MODEL=openai/gpt-4.1

# Higher concurrency for active projects
MAX_CONCURRENT_REQUESTS=10
MAX_REQUESTS_PER_IP=5
```

**agents.md:**
```markdown
# Open Source Project Configuration

## Review Agent
- Welcome new contributors with encouraging feedback
- Provide detailed explanations for suggested changes
- Link to contributing guidelines when relevant
- Focus on maintainability and documentation

## Coding Agent
- Follow the project's coding standards strictly
- Include comprehensive tests for all new features
- Add detailed documentation and examples
- Consider backward compatibility
```

### 2. Enterprise Application

```bash
# Strict security and compliance
LANGUAGE_CODE=en-US
AI_MODEL=openai/gpt-4.1

# Conservative concurrency limits
MAX_CONCURRENT_REQUESTS=3
MAX_REQUESTS_PER_IP=1

# Extended timeout for complex analysis
REQUEST_TIMEOUT=900000  # 15 minutes
```

**agents.md:**
```markdown
# Enterprise Application Configuration

## Review Agent
- Prioritize security vulnerabilities and compliance issues
- Flag any potential data privacy concerns
- Ensure all database queries are optimized
- Verify proper error handling and logging

## Coding Agent
- Follow enterprise coding standards
- Include comprehensive error handling
- Add audit logging for all data operations
- Ensure proper input validation and sanitization
- Include security headers and CSRF protection
```

### 3. Startup MVP

```bash
# Fast iteration focus
LANGUAGE_CODE=en-US
AI_MODEL=openai/gpt-3.5-turbo  # Faster, cost-effective

# Higher concurrency for rapid development
MAX_CONCURRENT_REQUESTS=8
MAX_REQUESTS_PER_IP=3
```

**agents.md:**
```markdown
# Startup MVP Configuration

## Review Agent
- Focus on critical bugs and security issues
- Allow some technical debt for rapid iteration
- Prioritize functionality over perfect code style
- Flag performance issues that affect user experience

## Coding Agent
- Prioritize working functionality over perfect architecture
- Include basic error handling
- Focus on user-facing features
- Keep code simple and maintainable
```

### 4. Learning/Educational Project

```bash
# Educational focus
LANGUAGE_CODE=en-US
AI_MODEL=openai/gpt-4.1

# Standard limits
MAX_CONCURRENT_REQUESTS=5
MAX_REQUESTS_PER_IP=2
```

**agents.md:**
```markdown
# Educational Project Configuration

## Review Agent
- Provide detailed explanations for all suggestions
- Include links to documentation and best practices
- Explain the "why" behind recommendations
- Be patient and encouraging with learning developers

## Coding Agent
- Include extensive comments explaining the code
- Use clear, descriptive variable names
- Break complex operations into smaller, understandable steps
- Add examples and usage documentation
```

## Troubleshooting Configuration

### Common Issues

**Webhook not triggering:**
- Verify the webhook URL is correct
- Check that the secret matches your environment variable
- Ensure the webhook is active and configured for "pull_request" events

**Authentication errors:**
- Verify your GitHub token has the necessary permissions
- Check that the token hasn't expired
- Ensure the repository is accessible with the token

**Rate limiting issues:**
- Adjust `MAX_CONCURRENT_REQUESTS` and `MAX_REQUESTS_PER_IP`
- Implement request queuing for high-traffic scenarios
- Consider upgrading your Vercel plan for higher limits

**Timeout errors:**
- Increase `REQUEST_TIMEOUT` for complex repositories
- Optimize your `agents.md` configuration to focus on essential checks
- Consider breaking large requests into smaller parts

### Testing Configuration

Use the following curl commands to test your configuration:

```bash
# Test the review webhook endpoint
curl -X POST https://your-app.vercel.app/api/github-review \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: pull_request" \
  -H "X-Hub-Signature-256: sha256=your_signature" \
  -d @test-payload.json

# Test the coding agent endpoint
curl -X POST https://your-app.vercel.app/api/github-coding \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Create a simple hello world function",
    "repositoryUrl": "https://github.com/your-org/test-repo",
    "githubToken": "your_token"
  }'
```