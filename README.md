<div align="center">


DEVX AGENTS ✨
Agent framework designed to improve DX @ Bornlogic

---

</div>


### 🔍 **PR Review Agent**

When a pull request is opened, Review Agent kicks in and starts the review process.

The agent posts inline comments with clear classifications:

| Emoji  | Type                  |
|--------|------------------------|
| 🐛     | Bug                    |
| 🔐     | Security issue         |
| 🍝     | Complex or tangled code|
| ✂️     | Dead/unnecessary code  |
| 📝     | Nitpick                |

Comments are meant to be concise, helpful, and never overengineered.

---

## ⚙️ Configuration

### 🧠 Per-Repo Rules

Want repo-specific behavior?  
Just add an `AGENTS.md` file to the repo with custom instructions for the agent.

> 📝 A sample `AGENTS.md` is included in this repo.

### 🧠 AI Model Selection

The default AI model is:

```
openai/gpt-4.1
```
---

## 🧩 Extending with Agents & Tools

You can build new agents and link them to MCPs and custom tools following the structured project layout.

---

Made with 🧉 by [@netohog](https://x.com/netohog)
