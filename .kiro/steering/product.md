---
inclusion: always
---

# Product Guidelines

DevX Agents is a framework for building AI agents that improve developer experience. The platform supports developer-focused automation and tooling, with GitHub PR review as the primary use case.

## Agent Behavior Standards

### Review Quality
- Provide concise, actionable feedback without overengineering suggestions
- Use positive, encouraging tone when no issues are found
- Focus on meaningful improvements over nitpicks
- Respect repository-specific behavior defined in `agents.md` files

### Issue Classification
Always categorize findings with these specific emojis:
- 🐛 Bugs and logical errors
- 🔐 Security vulnerabilities and concerns
- 🧼 Readability and maintainability improvements
- 🍝 Complex or tangled code that needs refactoring
- ✂️ Dead, unused, or unnecessary code
- 📝 Minor nitpicks and style suggestions

### Response Guidelines
- Keep feedback concise and developer-friendly
- Provide specific examples when suggesting changes
- Avoid overwhelming PRs with too many minor suggestions
- Prioritize security and bug fixes over style issues

## Architecture Patterns

### Agent Integration
- Use webhook-based triggers for GitHub events
- Implement secure command execution via Vercel Sandbox
- Leverage MCP (Model Context Protocol) for external tool integration
- Support multi-language responses via `LANGUAGE_CODE` environment variable

### Code Organization
- Agents define system prompts and orchestrate tools
- Tools provide reusable functionality across agents
- MCPs handle external service integrations
- Utils contain shared business logic