# Product Overview

Vercel Agents is a starter kit for building AI agents that automatically review GitHub pull requests. The system integrates with GitHub webhooks to trigger real-time code reviews using AI models.

## Core Features

- **Automated PR Reviews**: AI agent analyzes pull requests and provides inline comments
- **GitHub Integration**: Webhook-based trigger system for new pull requests
- **Secure Execution**: Uses Vercel Sandbox for safe command execution
- **MCP Integration**: Leverages Model Context Protocol for GitHub Copilot tools
- **Multi-language Support**: Configurable language for agent responses

## Review Classifications

The agent categorizes issues with specific emojis:
- 🐛 Bugs
- 🔐 Security issues  
- 🧼 Readability suggestions
- 🍝 Complex/tangled code
- ✂️ Dead/unnecessary code
- 📝 Nitpicks

## Key Principles

- Concise, helpful feedback without overengineering suggestions
- Positive, encouraging tone when no issues are found
- Repository-specific behavior via `agents.md` configuration files