# OpenCode Processing Skills

Agents, skills, and templates for **structured AI-assisted development** with [OpenCode](https://github.com/opencode-ai/opencode). Workflows for documenting codebases, persisting plans across sessions, and delegating work to specialized subagents.

> **Note:** This project is not built by or affiliated with the OpenCode team ("anomalyco").

---

## Why this exists

I use GitHub Copilot as my provider. GHCP caps context at 128k — even for models that support more. The economics are simple: keep your primary session lean, delegate expensive exploration to subagents, and make sure nothing gets lost between sessions.

That's what this repo does. It gives OpenCode:

- **Structured documentation** — generated from code, with symbol inventories that both humans and AI can navigate
- **Multi-session planning** — plans with phases, implementation details, persistent todos, and handover docs
- **Gated implementation** — the primary reviews what a subagent proposes before execution happens
- **File-based persistence** — `docs/` and `plans/` are the interface, not chat history
- **Consistent templates** — every artifact (plan, phase, implementation plan, handover) uses the same structure, so information is always where you expect it
- **Blueprint verification** — before any code is written, the subagent proposes a step list that the primary reviews and approves, reducing misunderstandings

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

**Subagents where they help, not everywhere.** Codebase exploration? Subagent. Writing docs? Subagent. But planning stays with the primary — delegating a plan means serializing the entire conversation into a prompt.

**Delegate by default.** Context is a budget — every file read costs tokens better spent on judgment. The maintainer defaults to delegation: one trivial single-file edit is the only thing done locally. Everything else goes through subagents.

**Gated execution.** The subagent proposes a blueprint. The primary reviews and approves. Then execution happens. Same session, no context loss. The blueprint is a Chain-of-Thought equivalent — it forces structured thinking before any code is written.

**Everything persists to files.** `docs/` and `plans/` are the interface. Readable by humans and AI. No hidden state.

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
