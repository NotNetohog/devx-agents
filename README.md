# Vercel Agents

Starter project for Vercel Agents. This coding agent leverages AI SDK 5, Vercel AI Gateway, and Vercel Sandbox to help you review GitHub pull requests with ease.

The project also offers a structured approach for organizing your agents, mcps and custom tools.



## Quick Start

### Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FNotNetohog%2Fvercel-agents&project-name=vercel-agents&repository-name=vercel-agents)

### Add GitHub Webhook

You must add a webhook at the repository or organization level with the following settings:

- **Payload URL**: `<your-vercel-deployed-url>/api/github-review`
- **Content type**: `application/json`
- **Secret**: Create a secret value (must match the one added to your project)
- **Events**: Select individual events → Pull requests

### Create a GitHub Personal Access Token

1. Go to: https://github.com/settings/personal-access-tokens
2. Set repository access to **All repositories**
3. Grant the following permissions:
   - Pull requests: **Read and write**

### Set Environment Variables on Vercel

| Variable               | Description                              |
|------------------------|------------------------------------------|
| `GITHUB_TOKEN`         | Your GitHub personal access token        |
| `GITHUB_WEBHOOK_SECRET`| Your webhook secret                      |
| `LANGUAGE_CODE`        | Language your agent should use (e.g., `en-US`, `es-AR`) |


### Re-deploy

That’s it! Your agent should now be up and running.

---

## Configuration

### Per-Repository Rules

If you need specific rules for a repository, create an `agents.md` file in that repo with those rules.

> There’s an example `agents.md` file in this repo.

### AI Model

You can easily change the AI model used by editing the agent file.  
It currently defaults to:

```
openai/gpt-4.1
```

---

## Development

1. Clone the repo locally
2. Install the Vercel CLI:
   ```bash
   npm i -g vercel
   ```
3. Link to your Vercel project:
   ```bash
   vercel link
   ```
4. Pull environment variables:
   ```bash
   vercel env pull
   ```
5. Install dependencies:
   ```bash
   pnpm install
   ```
6. Start the development server:
   ```bash
   vercel dev
   ```

---

To create new agents and connect them to MCPs, follow the established project structure. Refer to the `run_command` tool in the `/tools` directory for a practical example of tool implementation.
