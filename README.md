# OpenCode Processing Skills

Agents, skills, and templates for **structured AI-assisted development** with [OpenCode](https://github.com/anomalyco/opencode). Workflows for documenting codebases, persisting plans across sessions, and delegating work to specialized subagents.

> **Note:** This project is not built by or affiliated with the OpenCode team ("anomalyco").

---

## How I got here

I started working with subagents and context management through [DCP](https://github.com/Opencode-DCP/opencode-dynamic-context-pruning) to make Opus and other frontier models useful within GitHub Copilot's restrictions. The next step was orchestration: capable Chinese models such as DeepSeek V4 Pro, Qwen 3.7 Max, and GLM 5.2 formed the bracket around a task, while expensive models such as GPT-5.5 could start each focused piece of work with a fresh context.

Now OpenAI has released the GPT-5.6 family. The same idea works within one model family: smaller models can steer the larger Sol model, while GPT-5.6 Sol at low or medium reasoning effort has proven itself as a very capable maintainer. Luna at high reasoning effort is also a cost-efficient option. Context discipline still matters, but DCP has moved from a requirement to an optional companion.

That evolution is what this repo captures: not just a collection of prompts, but a practical way to keep strong models focused, give expensive work a clean context, and preserve everything important outside the chat.

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
If Codex, Claude Code, or Cursor are installed locally, skills are synced to their config directories during install.

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

- `delegate` — one canonical skill-driven persona for exploration, research, reviews, review fixes, and implementation plans; model variants are aliases
- `doc-explorer` — writes `docs/` and selected skill-governed planning artifacts
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

**Delegate deliberately.** Context is a budget, but delegation also has setup cost. Routine analysis uses the canonical delegate with an explicit skill; independent reviews may use a stronger model alias. Bounded low-risk edits can stay local.

**Gated execution.** Subagents propose a blueprint (step list) before writing any code. The primary reviews and approves. Then execution happens. The blueprint acts as Chain-of-Thought — it forces structured thinking before implementation.

**Reuse review context.** Accepted related findings return to the same reviewer session through `review-fix`, including multi-file runtime fixes. A new implementation or authoring session is reserved for changed scope/objective, missing context, new primary decisions, or an explicit fresh perspective. Further reviews are optional and never loop automatically.

**Keep reviews disciplined.** No Gold-Plating. No Adversarial Reviewing. No Scope Creep. Report evidence-backed defects and required related changes, not gotchas or invented work.

**File-based persistence.** `docs/` and `plans/` are the interface. Readable by humans and AI. No hidden state. Your knowledge survives session boundaries.

→ [Full architecture rationale](AGENTS.md)

---

## Honest framing

This is not a magic bullet. It's not a full framework like BMAD or SpecKit. It's opinionated workflows for people who plan their work in a structured way — but want to stay hands-on. You drive the conversation, the model asks back, you decide the scope. The skills just make sure nothing falls through the cracks between sessions.

---

## Dynamic Context Pruning

[DCP](https://github.com/Opencode-DCP/opencode-dynamic-context-pruning) is an optional companion. It can still keep long sessions lean by pruning exploration output that is no longer needed, but the workflows do not depend on it: durable context lives in `docs/` and `plans/`, while focused work is delegated into fresh subagent sessions.

---

## Design rationale

Why phases are separate from implementation plans. Why the primary authors plans instead of delegating. Why one canonical skill-driven delegate works alongside workflow-owned writers.

→ [AGENTS.md](AGENTS.md)

---

## License

MIT — see [LICENSE](LICENSE).
