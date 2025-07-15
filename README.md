<div align="center">


✨ DEVX AGENTS ✨
 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AI Agent Framework for
Developer Experience


[![Version](https://img.shields.io/badge/version-0.0.1-blue.svg)](https://github.com/NotNetohog/devx-agents)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Deploy](https://img.shields.io/badge/deploy-vercel-black.svg)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FNotNetohog%2Fdevx-agents)

**Build AI agents that improve developer experience - featuring intelligent PR reviews and automated code generation**

*Built with AI SDK 5 • Vercel Gateway • Vercel Sandbox*

---

### 🚀 **Deploy in 60 seconds** • 🧠 **Smart AI reviews** • 🤖 **Automated coding** • 🔒 **Secure sandbox execution**

</div>

---

## ✨ What Makes This Special

| 🎯 **Smart Reviews** | 🤖 **Code Generation** | 🚀 **Lightning Fast** | 🔒 **Secure by Design** |
|---------------------|------------------------|----------------------|-------------------------|
| AI analyzes your PRs with context-aware insights | Generate code from natural language prompts | Deploy in under 60 seconds with one click | Runs in isolated Vercel Sandbox environment |
| Categorizes issues with helpful emoji classifications | Automatically creates PRs with generated code | Real-time webhook integration | HMAC signature verification |
| Learns from your codebase patterns | Follows your project's conventions and patterns | Powered by GPT-4.1 via Vercel Gateway | No code execution on your servers |

### 🎨 **Review Classifications That Actually Help**

Your AI agent doesn't just find problems—it categorizes them intelligently:

| Classification | What It Catches | Example |
|---------------|-----------------|---------|
| 🐛 **Bugs** | Logic errors, null pointer risks, edge cases | `if (user.name = "admin")` → should be `==` |
| 🔐 **Security** | Vulnerabilities, exposed secrets, unsafe patterns | Hardcoded API keys, SQL injection risks |
| 🧼 **Readability** | Complex expressions, unclear naming | `const x = getData().filter(y => y.z)` |
| 🍝 **Complexity** | Nested loops, long functions, tangled logic | 50-line functions with 5 levels of nesting |
| ✂️ **Dead Code** | Unused imports, unreachable code, redundant logic | Imported libraries never used |
| 📝 **Nitpicks** | Style preferences, minor improvements | Missing trailing commas, spacing |

---

## 🚀 Quick Start

### 1. Deploy to Vercel

Click below to deploy instantly:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FNotNetohog%2Fdevx-agents&project-name=devx-agents&repository-name=devx-agents)

### 2. Add a GitHub Webhook

Add a webhook to your **repo** or **organization**:

- **Payload URL**:  
  `https://<your-vercel-deployed-url>/api/github-review`
- **Content type**:  
  `application/json`
- **Secret**:  
  Any value you choose (must match your Vercel env var)
- **Events**:  
  Select → **Individual events** → **Pull requests**

### 3. Create a GitHub Personal Access Token

1. Go to: https://github.com/settings/personal-access-tokens
2. Select **All repositories**
3. Enable:
   - `Contents`: Read-only
   - `Pull requests`: Read and write

### 4. Set Vercel Environment Variables

| Variable                 | Description                                      |
|--------------------------|--------------------------------------------------|
| `GITHUB_TOKEN`           | Your GitHub personal access token                |
| `GITHUB_WEBHOOK_SECRET`  | Your webhook secret                              |
| `LANGUAGE_CODE`          | Agent's language (e.g. `en-US`, `pt-BR`, `es-AR`)|

Then re-deploy your project.

---

## 🤖 How It Works

### 🔍 **PR Review Agent**

When a pull request is opened, your Vercel Agent kicks in and starts the review process.

The agent posts inline comments with clear classifications:

| Emoji  | Type                  |
|--------|------------------------|
| 🐛     | Bug                    |
| 🔐     | Security issue         |
| 🧼     | Readability suggestion |
| 🍝     | Complex or tangled code|
| ✂️     | Dead/unnecessary code  |
| 📝     | Nitpick                |

Comments are meant to be concise, helpful, and never overengineered.

### 🤖 **Coding Agent**

The coding agent transforms natural language prompts into working code and automatically creates pull requests:

#### **Workflow:**
1. **Analyze** → Understands your codebase structure and patterns
2. **Generate** → Creates code following your project conventions  
3. **Commit** → Creates a new branch with descriptive commit messages
4. **PR** → Opens a pull request with detailed change summary

#### **API Usage:**

```bash
curl -X POST https://your-vercel-url/api/github-coding \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Add a user authentication middleware with JWT validation",
    "repositoryUrl": "https://github.com/your-org/your-repo",
    "baseBranch": "main"
  }'
```

#### **Response:**
```json
{
  "success": true,
  "data": {
    "pullRequestUrl": "https://github.com/your-org/your-repo/pull/123",
    "branchName": "coding-agent/feat-auth-middleware-1234567890",
    "summary": "Generated 3 files: middleware, types, and tests"
  }
}
```

#### **Smart Features:**
- 🧠 **Context-Aware**: Analyzes existing code patterns and follows them
- 🎯 **Convention Following**: Respects your naming conventions and project structure  
- 🔄 **Conflict Resolution**: Automatically handles branch name conflicts
- 🛡️ **Error Recovery**: Retry logic and fallback strategies for reliability
- 📝 **Detailed PRs**: Comprehensive PR descriptions with change summaries

---

## ⚙️ Configuration

### 🧠 Per-Repo Rules

Want repo-specific behavior?  
Just add an `agents.md` file to the repo with custom instructions for the agent.

> 📝 A sample `agents.md` is included in this repo.

### 🧠 AI Model Selection

The default AI model is:

```
openai/gpt-4.1
```

Thanks to **Vercel Gateway**, you can easily change it by editing the agent file directly.

---

## 🛠️ Development

To run locally:

```bash
git clone https://github.com/NotNetohog/devx-agents
cd devx-agents

npm i -g vercel          # Install Vercel CLI
vercel link              # Link to your Vercel project
vercel env pull .env     # Pull env vars into local .env
pnpm install             # Install dependencies
vercel dev               # Start dev server
```

---

## 🧩 Extending with Agents & Tools

You can build new agents and link them to MCPs and custom tools following the structured project layout.

Check out the [`/tools/run-command`](./src/tools) folder for an example of how to create a tool that runs secure commands in **Vercel Sandbox**.

---

Made with 🧉 by [@netohog](https://x.com/netohog)
