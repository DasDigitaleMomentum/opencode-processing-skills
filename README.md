# OpenCode Processing Skills

Agents, skills, and templates for **structured AI-assisted development** across [OpenCode](https://github.com/anomalyco/opencode), Codex, Claude Code, and other supported agent harnesses. Workflows cover codebase documentation, persistent multi-session planning, independent review, and gated implementation.

> **Note:** This project is not built by or affiliated with the OpenCode team ("anomalyco").

---

## Work with OpenCode, Codex, or Claude

One installer synchronizes the compatible workflow and checkpoint assets for each detected harness:

| Harness | What you get |
|---------|--------------|
| **OpenCode** | The full maintainer/subagent system, workflow skills, model aliases, and native checkpoint plugin. |
| **Codex** | The shared workflow skills plus a verified checkpoint profile with hook-owned session identity and input telemetry. |
| **Claude Code** | Workflow skills, agent definitions, and a native checkpoint plugin with parent/subagent lifecycle tracking and input telemetry. |
| **Claude Desktop** | A standalone checkpoint MCP adapter for workspace/conversation progress tracking; it is independent from the Claude Code workflow integration. |

Cursor and Hermes are supported as additional installation targets with host-specific boundaries. The installer auto-detects existing homes, and `config.yaml` can explicitly enable, disable, or redirect each target.

→ [Harness setup and activation](docs/installation.md)

## Checkpoint Canary

Most importantly, every checkpoint reports the latest available input usage, input K-tokens, and remaining input headroom back to the model. This lets the model stop expanding its work in time and produce an orderly digest or handoff. If the model still aborts, the persisted checkpoint log gives the parent a recovery trail for mapping completed work and continuing the remainder in a smaller fresh task.

The heartbeat is also a lightweight **instruction-following Canary**. Parents and subagents announce a three-word `next` step, then reuse it verbatim as the next checkpoint's three-word `done` value. The dashboard reports:

- **Chain compliance**: did the next `done` match the previously announced `next`?
- **Work status**: did the attempted unit complete or fail and enter correction?
- **Three-word compliance**: did both checkpoint labels follow the compact contract?

This separates workflow health from implementation success. A failed work unit can still have a healthy Canary when the agent records the failure correctly and announces the corrective step. The Canary does not prove code quality; it makes stalled, drifting, or interrupted agent work visible early.

→ [Canary behavior, telemetry, and JSONL contract](docs/agent-checkpoint-heartbeat.md)

---

## How I got here

I started working with subagents and context management through [DCP](https://github.com/Opencode-DCP/opencode-dynamic-context-pruning) to make Opus and other frontier models useful within GitHub Copilot's restrictions. The next step was orchestration: capable Chinese models such as DeepSeek V4 Pro, Qwen 3.7 Max, and GLM 5.2 formed the bracket around a task, while expensive models such as GPT-5.5 could start each focused piece of work with a fresh context.

Now OpenAI has released the GPT-5.6 family. GPT-5.6 Sol at medium or high reasoning effort has proven itself as a strong maintainer: it can hold the overall direction, make the important decisions, and distribute focused tasks cost-efficiently across models with different strengths and quality levels. Orchestration is no longer about putting one model above another, but about using each model where it fits best. Context discipline still matters, but DCP has moved from a requirement to an optional companion.

That evolution is what this repo captures: not just a collection of prompts, but a practical way to keep strong models focused, give expensive work a clean context, and preserve everything important outside the chat.

---

## Why this exists

AI-assisted development has a context problem. Every file you read, every search result you inspect — it all counts against a finite context window. When that window fills up, quality degrades. The most expensive thing you can do is rediscover what you already figured out yesterday.

This repo solves that. Across the supported harnesses, it provides:

- **Structured documentation** — generated from code, with symbol inventories that both humans and AI can navigate. Stop re-reading files you've already explored.
- **Multi-session planning** — plans with phases, persistent todos, and handover docs. Close your laptop, open it tomorrow, pick up exactly where you left off.
- **Gated implementation** — subagents propose a blueprint before writing code. The primary reviews and approves. Catches misunderstandings before they become bugs.
- **File-based persistence** — `docs/` and `plans/` are the interface, not chat history. Knowledge survives session boundaries.
- **Agent checkpoints** — parents and subagents log short done/next steps, failed attempts, and approximate input pressure to per-session JSONL files. A live terminal dashboard shows current workspace activity.
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
coverage, build, snapshot, non-TTY live, and Python PTY smokes. This is optional: the installed
Node watcher and its printed fallback command remain available, and project
installation never touches the global binary.
On OpenCode v1.18.2+, set `"subagent_depth": 2` for worker-to-retriever handoffs. Older versions do not support this setting and generally allow nested tasks through permissions alone.
If Codex, Claude Code, Cursor, or Hermes are installed locally, compatible skills and adapters are synced to their config directories during install. Start Codex with the generated `agent-checkpoint` profile; restart Claude Code with the generated opt-in statusline settings to enable checkpoint telemetry.
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

`checkpoint` returns input usage against the common 372k operational limit, input K-tokens, and remaining input K-tokens. OpenCode reports the previous completed model step; other adapters retain their documented snapshot lag. Unavailable input telemetry falls back to `unknown`. Failed work is recorded separately from Canary/instruction compliance.

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
input usage, done, and current work. Agent identity has priority over the mutable
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

**Generate the smallest complete plan.** Confirm scope and the minimum necessary phase set before writing artifacts. Plan and implementation-plan authors prefer direct changes and existing structures, justify new foundations or abstractions by present need, and perform one deletion pass before handoff.

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
