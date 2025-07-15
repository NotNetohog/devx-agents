# Coding Agent API Documentation

## Overview

The Coding Agent API allows you to generate code from natural language prompts and automatically create pull requests. The agent analyzes your existing codebase, follows your project conventions, and creates well-structured code that integrates seamlessly with your project.

## Endpoint

```
POST /api/github-coding
```

## Authentication

The API requires a GitHub Personal Access Token with the following permissions:
- `Contents`: Read and Write
- `Pull requests`: Read and Write
- `Metadata`: Read

## Request Format

### Headers
```
Content-Type: application/json
```

### Body Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `prompt` | string | Yes | Natural language description of the code to generate (min 10 characters) |
| `repositoryUrl` | string | Yes | Full GitHub repository URL (e.g., `https://github.com/owner/repo`) |
| `baseBranch` | string | No | Base branch for the PR (default: `main`) |
| `context` | string | No | Additional context or requirements |

**Note:** The GitHub token is now configured server-side via the `GITHUB_TOKEN` environment variable for enhanced security.

### Example Request

```bash
curl -X POST https://your-vercel-url/api/github-coding \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Create a user authentication middleware that validates JWT tokens and handles refresh tokens",
    "repositoryUrl": "https://github.com/myorg/myapp",
    "baseBranch": "develop",
    "context": "Use the existing User model and follow the current error handling patterns"
  }'
```

## Response Format

### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "pullRequestUrl": "https://github.com/myorg/myapp/pull/123",
    "branchName": "coding-agent/feat-auth-middleware-1234567890",
    "summary": "Generated 3 files: authentication middleware, JWT utilities, and comprehensive tests"
  },
  "meta": {
    "duration": 15420,
    "timestamp": "2024-01-15T10:30:45.123Z"
  }
}
```

### Error Response (4xx/5xx)

```json
{
  "success": false,
  "error": "Invalid request format",
  "code": "VALIDATION_ERROR",
  "details": [
    {
      "field": "prompt",
      "message": "Prompt must be at least 10 characters"
    }
  ],
  "suggestions": [
    "Check that all required fields are provided",
    "Ensure prompt is at least 10 characters",
    "Verify repository URL is valid"
  ],
  "meta": {
    "duration": 150,
    "timestamp": "2024-01-15T10:30:45.123Z"
  }
}
```

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `METHOD_NOT_ALLOWED` | 405 | Only POST requests are allowed |
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `AUTHENTICATION_FAILED` | 401 | Invalid or missing GitHub token |
| `TOO_MANY_REQUESTS` | 429 | Rate limit exceeded |
| `CODING_REQUEST_FAILED` | 400 | Code generation or PR creation failed |
| `INTERNAL_ERROR` | 500 | Server error |

## Rate Limits

- **Global**: Maximum 5 concurrent requests
- **Per IP**: Maximum 2 concurrent requests per IP address
- **Timeout**: 5 minutes per request

When rate limits are exceeded, you'll receive a `429` response with details about current usage.

## Code Generation Features

### Context Analysis
The agent automatically analyzes your repository to understand:
- Project structure and organization
- Naming conventions (camelCase, PascalCase, kebab-case)
- Existing code patterns and architectural decisions
- Dependencies and framework usage
- TypeScript configuration and type patterns

### Code Generation
Generated code includes:
- **Type Safety**: Full TypeScript support with proper type definitions
- **Error Handling**: Comprehensive error handling following your project patterns
- **Documentation**: JSDoc comments and inline documentation
- **Testing**: Unit tests when appropriate
- **Validation**: Input validation using your preferred validation library

### File Operations
The agent can:
- **Create new files** in appropriate directories
- **Modify existing files** while preserving functionality
- **Follow conventions** for file naming and organization
- **Resolve conflicts** by generating unique branch names

## Example Use Cases

### 1. API Endpoint Creation
```json
{
  "prompt": "Create a REST API endpoint for user profile management with CRUD operations",
  "repositoryUrl": "https://github.com/myorg/api-server",
  "context": "Use the existing database models and follow the current API response format"
}
```

### 2. Utility Function
```json
{
  "prompt": "Add a utility function for date formatting that supports multiple locales",
  "repositoryUrl": "https://github.com/myorg/frontend-app",
  "context": "Place in the utils directory and export from the main utils index"
}
```

### 3. Component Creation
```json
{
  "prompt": "Create a reusable modal component with customizable content and actions",
  "repositoryUrl": "https://github.com/myorg/react-components",
  "context": "Follow the existing component structure and use our design system tokens"
}
```

### 4. Database Migration
```json
{
  "prompt": "Add a database migration to create a user_preferences table with JSON column",
  "repositoryUrl": "https://github.com/myorg/backend",
  "context": "Use the existing migration format and include rollback functionality"
}
```

## Best Practices

### Writing Effective Prompts
1. **Be Specific**: Include details about functionality, inputs, outputs, and behavior
2. **Provide Context**: Mention existing patterns, dependencies, or constraints
3. **Specify Location**: Indicate where files should be created or modified
4. **Include Examples**: Reference existing code or patterns to follow

### Good Prompt Examples
✅ "Create a user authentication middleware that validates JWT tokens, handles token refresh, and integrates with our existing User model in src/models/User.ts"

✅ "Add a utility function in src/utils/validation.ts that validates email addresses using regex and returns detailed error messages"

### Poor Prompt Examples
❌ "Make a function"
❌ "Add authentication"
❌ "Fix the code"

### Repository Requirements
- Repository must be accessible with the provided GitHub token
- Base branch must exist
- Repository should have a clear structure for the agent to analyze

### Security Considerations
- Never include sensitive information in prompts
- Use environment variables for configuration
- Review generated code before merging
- Ensure your GitHub token has minimal necessary permissions

## Troubleshooting

### Common Issues

**"Authentication Failed"**
- Verify your GitHub token is valid and not expired
- Check that the token has necessary permissions for the repository
- Ensure the repository URL is correct and accessible

**"Too Many Requests"**
- Wait for existing requests to complete
- Reduce concurrent request volume
- Check if multiple clients are using the same IP

**"Code Generation Failed"**
- Simplify your prompt and try again
- Check if the repository structure is accessible
- Ensure the base branch exists
- Try breaking complex requests into smaller parts

**"PR Creation Failed"**
- Verify the branch has commits to create a PR
- Check if a similar PR already exists
- Ensure you have write permissions to create PRs
- Confirm the base branch exists

### Getting Help

If you encounter issues not covered here:
1. Check the error message and suggestions in the API response
2. Review the repository structure and permissions
3. Try with a simpler prompt to isolate the issue
4. Check the API logs for detailed error information

## Changelog

### v1.0.0
- Initial release with code generation and PR creation
- Support for TypeScript projects
- Context-aware code analysis
- Automatic branch conflict resolution
- Comprehensive error handling and recovery