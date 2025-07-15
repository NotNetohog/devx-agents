<div align="center">


✨ VERCEL AGENTS ✨
 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AI-Powered Code Reviews
That Actually Help


[![Version](https://img.shields.io/badge/version-0.0.1-blue.svg)](https://github.com/NotNetohog/vercel-agents)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Deploy](https://img.shields.io/badge/deploy-vercel-black.svg)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FNotNetohog%2Fvercel-agents)

**Transform your GitHub workflow with intelligent AI agents that review pull requests in real-time**

*Built with AI SDK 5 • Vercel Gateway • Vercel Sandbox*

---

### 🚀 **Deploy in 60 seconds** • 🧠 **Smart AI reviews** • 🔒 **Secure sandbox execution**

</div>

---

## ✨ What Makes This Special

| 🎯 **Smart Reviews** | 🚀 **Lightning Fast** | 🔒 **Secure by Design** |
|---------------------|----------------------|-------------------------|
| AI analyzes your PRs with context-aware insights | Deploy in under 60 seconds with one click | Runs in isolated Vercel Sandbox environment |
| Categorizes issues with helpful emoji classifications | Real-time webhook integration | HMAC signature verification |
| Learns from your codebase patterns | Powered by GPT-4.1 via Vercel Gateway | No code execution on your servers |

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

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FNotNetohog%2Fvercel-agents&project-name=vercel-agents&repository-name=vercel-agents)

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
git clone https://github.com/NotNetohog/vercel-agents
cd vercel-agents

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
