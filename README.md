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
- **Agent checkpoints** — parents and subagents log short done/next steps, failed attempts, and approximate context pressure to per-session JSONL files. A live terminal dashboard shows current workspace activity.
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

For an upgrade, first stop the live checkpoint dashboard and every running
OpenCode, Codex, Claude Code, or Hermes session using the checkpoint adapter.
After installation, run the exact `checkpoint-watch` command printed by the
installer, then restart the enabled harnesses and select `@maintainer` in
OpenCode.
Global installation opportunistically compiles a native
`$HOME/.local/bin/checkpoint-watch` when an already-installed `scriptc` passes
coverage, build, snapshot, and live smokes. This is optional: the installed
Node watcher and its printed fallback command remain available, and project
installation never touches the global binary.
On OpenCode v1.18.2+, set `"subagent_depth": 2` for worker-to-retriever handoffs. Older versions do not support this setting and generally allow nested tasks through permissions alone.
If Codex, Claude Code, Cursor, or Hermes are installed locally, skills are synced to their config directories during install.
Hermes support includes the native checkpoint plugin and conservative
parent-session `open` events; it does not port OpenCode-specific delegate
personas, `Task` calls, or `task_id` continuation contracts.

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
- `retriever` — scoped files, tool output, commands, and known-URL crawling for maintainers, delegates, and implementers
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

## Live agent checkpoints

The adapters add `checkpoint` and `checkpoint_path` tools to parents and
subagents. Logs below the active project accept exact legacy six-field and
current eight-field checkpoints plus four-field `session_status` events:

```text
.agent-checkpoints/<session-id>.jsonl
```

`checkpoint` returns a TUI-equivalent estimate of the previous completed model step's context use and remaining context-window K-tokens. It falls back to `unknown` when OpenCode cannot provide defensible data. Failed work is recorded separately from Canary/instruction compliance.

Watch all direct session logs in a second terminal:

```bash
# From this source checkout
node packages/checkpoint-core/bin/checkpoint-watch.js

# One non-interactive snapshot
node packages/checkpoint-core/bin/checkpoint-watch.js --once
```

For global or project-local installations, use the exact `Launch command:`
printed by `./install.sh` or `./install.sh --project`; a successful optional
global native build also prints the exact `Node fallback:`. The dashboard
refreshes live and shows informational age, explicit
`OPEN`/`CLOSED`/`UNKNOWN` state, chain and three-word compliance, work status,
context, done, and current work. Agent identity has priority over the mutable
session name at the normal 120-column width. Rows whose latest physical event
is at least three hours old are hidden initially in both live and `--once`
output; lowercase `v` toggles all old rows in live mode and places old
unclosed rows in a separate paragraph. This cutoff changes presentation only:
state still comes solely from observed lifecycle events and never infers
process liveness from age.

→ [Checkpoint installation and dashboard quickstart](docs/installation.md#checkpoint-dashboard-quickstart)

→ [Checkpoint behavior and JSONL contract](docs/agent-checkpoint-heartbeat.md)

---

## Principles

**Delegate deliberately.** Context is a budget, but delegation also has setup cost. Routine analysis uses the canonical delegate with an explicit skill; independent reviews may use a stronger model alias. Bounded low-risk edits can stay local.

**Retrieve before you absorb.** Use a focused read-only script when results can be filtered in one operation, native parallel calls for compact independent results, and the retriever for broad, large, or exploratory evidence. Keep only authoritative scope and decisive evidence in the parent context.

**Gated execution.** Subagents propose a blueprint (step list) before writing any code. The primary reviews and approves. Then execution happens. The blueprint acts as Chain-of-Thought — it forces structured thinking before implementation.

**Reuse review context conditionally.** Accepted related findings may return to the same reviewer through `review-fix` when retained reasoning materially helps, including multi-file runtime fixes. This does not carry authoring or implementation sessions across phases/work packages; further reviews are optional and never loop automatically.

**Generate the smallest sufficient plan.** Confirm scope and the minimum necessary phase set before writing artifacts. Plan and implementation-plan authors prefer direct changes and existing structures, justify new foundations or abstractions by present need, and perform one deletion pass before handoff.

**Keep reviews disciplined.** No Gold-Plating. No Adversarial Reviewing. No Scope Creep. Reviewers check for gaps and unnecessary work but write only evidence-backed exceptions, not coverage matrices or clean-item certifications. Reduction findings remove concrete work; they do not invent replacement architecture or requirements.

**Make an invoked review consequential.** `Reduction Required: Yes` or unresolved Critical/Major findings block progression until the primary applies or explicitly rejects them. Plan reduction runs once through `update-plan`; implementation-plan reduction runs once through `review-fix`; neither starts an automatic re-review loop.

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
