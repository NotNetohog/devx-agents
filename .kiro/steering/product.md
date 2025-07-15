# Product Overview

DevX Agents is a framework for building AI agents that improve developer experience. While it ships with a GitHub PR review agent as the primary example, the platform is designed to support any kind of developer-focused automation and tooling.

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