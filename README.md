# OpenCode Processing Skills

Agents, skills, and templates for **structured AI-assisted development** with [OpenCode](https://github.com/anomalyco/opencode). Workflows for documenting codebases, persisting plans across sessions, and delegating work to specialized subagents.

> **Note:** This project is not built by or affiliated with the OpenCode team ("anomalyco").

---

## Why this exists

AI-assisted development has a context problem. Every file you read, every search result you inspect — it all counts against a finite context window. When that window fills up, quality degrades. The most expensive thing you can do is rediscover what you already figured out yesterday.

This repo solves that. It gives OpenCode:

- **Structured documentation** — generated from code, with symbol inventories that both humans and AI can navigate. Stop re-reading files you've already explored.
- **Multi-session planning** — plans with phases, persistent todos, and handover docs. Close your laptop, open it tomorrow, pick up exactly where you left off.
- **Gated implementation** — subagents propose a blueprint before writing code. The primary reviews and approves. Catches misunderstandings before they become bugs.
- **File-based persistence** — `docs/` and `plans/` are the interface, not chat history. Knowledge survives session boundaries.
- **Consistent templates** — every artifact uses the same structure. Information is always where you expect it.
- **Provider-agnostic** — works with any model you configure: OpenAI, Anthropic, DeepSeek, Alibaba, and more. The architecture doesn't depend on any single provider's pricing or behavior.

---

## Quick Start

```bash
git clone git@github.com:DasDigitaleMomentum/opencode-processing-skills.git
cd opencode-processing-skills
cp config.yaml.example config.yaml   # optional: set models
./install.sh                         # global install
# OR: ./install.sh --project         # local install into ./.opencode/
```

Then restart OpenCode and select `@maintainer`.
If Codex or Claude Code are installed locally, skills are synced to their config directories during install.

→ [Full installation guide](docs/installation.md)

---

## How it works

Skills load automatically when you describe what you need:

```
> Document this project
> I want to add multi-tenant support. Let's plan it.
> Implement the next phase of the auth-refactor plan
```

The maintainer delegates to specialized subagents:

- `delegate` — exploration, research, commands
- `doc-explorer` — writes `docs/` and `plans/`
- `implementer` — code changes with gated execution
- `legacy-curator` — archive cleanup

Two maintainer variants are available:
- `@maintainer` — interactive: asks for confirmation at decision points
- `@maintainer-direct` — non-interactive: acts and reports, asks only for genuine choices

Everything persists to files. New session? Read the plan and continue.

→ [Skills reference](docs/skills.md)
→ [Agents reference](docs/agents.md)

---

## Principles

**Delegate by default.** Context is a budget — every file read costs tokens better spent on judgment. The maintainer delegates by default: one trivial single-file edit is the only thing done locally. Everything else goes through specialized subagents.

**Gated execution.** Subagents propose a blueprint (step list) before writing any code. The primary reviews and approves. Then execution happens. The blueprint acts as Chain-of-Thought — it forces structured thinking before implementation.

**File-based persistence.** `docs/` and `plans/` are the interface. Readable by humans and AI. No hidden state. Your knowledge survives session boundaries.

→ [Full architecture rationale](AGENTS.md)

---

## Honest framing

This is not a magic bullet. It's not a full framework like BMAD or SpecKit. It's opinionated workflows for people who plan their work in a structured way — but want to stay hands-on. You drive the conversation, the model asks back, you decide the scope. The skills just make sure nothing falls through the cracks between sessions.

---

## Dynamic Context Pruning

This project works well with the [DCP plugin](https://github.com/Opencode-DCP/opencode-dynamic-context-pruning). The primary reads a lot of files during exploration — most of which aren't needed long-term. DCP lets the model clean up its own context, keeping the session usable longer.

---

## Design rationale

Why phases are separate from implementation plans. Why the primary authors plans instead of delegating. Why there's one `doc-explorer` instead of separate analysis and writing agents.

→ [AGENTS.md](AGENTS.md)

---

## License

MIT — see [LICENSE](LICENSE).
