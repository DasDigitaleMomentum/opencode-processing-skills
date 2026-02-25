# OpenCode Processing Skills

Agents, skills, and templates for **documentation**, **planning**, and **implementation** workflows with [OpenCode](https://github.com/opencode-ai/opencode).

## Why I built this

I switched to GitHub Copilot as my provider a while back. GHCP caps context at 128k for most models – even those that technically support much more. On the upside, it charges per request, and tool calls plus subagent spawns are included in that request. So the economics are clear: keep your primary session lean, delegate expensive exploration to subagents, and make sure nothing gets lost between sessions.

That's what this repo does. It's a set of skills and agents that give OpenCode a structured workflow for docs, planning, and implementation – with controlled subagent usage and file-based persistence.

A few principles that came out of this:

- **Subagents where they help, not everywhere.** Heavy codebase exploration? Subagent. Writing docs? Subagent. But planning stays with the primary – because delegating a plan to a subagent means serializing the entire conversation context into a prompt, and at that point you're writing just as much as if you did it yourself. No information saved, just indirection added.
- **Gated execution.** The primary controls implementation through a blueprint → approve → execute → digest loop. The primary reviews the blueprint to verify the subagent understood the task, then releases the same session to execute. Same session means no context loss. The user doesn't see the gating – it's the primary keeping focus.
- **Everything persists to files.** `docs/` and `plans/` are the interface – no obscure memory plugins, no MCP bloat. The docs and plans are readable by both humans and AI, down to the level of important symbols. New session? Read the files and continue.

### Dynamic Context Pruning (DCP)

The primary reads a lot of files during exploration – file contents, search results, tool outputs – most of which aren't needed long-term. DCP lets the model actively clean up its own context: distill key findings, prune noise, keep the session usable for much longer than it otherwise would be. Without it, the 128k cap becomes a real bottleneck after a few rounds of exploration.

## What you get

- **Structured documentation** – project overview, module docs with symbol inventories, feature docs. Generated from code, not written by hand.
- **Multi-session planning** – features aren't planned with a one-liner. You discuss requirements with the model over multiple prompts, it asks clarifying questions (via the question tool – no extra premium requests), you iterate until the scope is right. Then phases, implementation plans, persistent todos, and handover docs.
- **Grounded implementation plans** – before execution, detailed implementation plans are authored and cross-checked against the actual codebase. The subagent uses these plans to understand its task. No guessing from vague instructions.
- **Gated implementation** – every phase goes through the blueprint → gate → execute → digest cycle. The primary verifies understanding before any code gets written.
- **Legacy repo prep** – archive scattered docs before generating new ones.

## Honest framing

This is not a magic bullet. It's not a full framework like BMAD or SpecKit either. It's a set of opinionated workflows for people who like to plan their work in a structured way – but want to stay hands-on. You drive the conversation, the model asks back, you decide the scope. The skills just make sure nothing falls through the cracks between sessions.

## Workflows

Skills are loaded automatically by the agent when they match what you're asking for. You don't manually trigger them – just describe what you need.

### Documenting a project

Good starting point for any repo you want to work with. The agent explores the codebase and creates structured docs in `docs/`.

```
> Document this project

> Update the docs – I refactored the auth module
```

For legacy repos with scattered docs (random READMEs, outdated wikis in the tree), clean up first:

```
> Archive the existing docs before generating new ones
```

### Planning work

For features, refactorings, or migrations that won't fit in a single session. You explain what you want, the model asks questions to clarify scope, and together you arrive at a plan with phases and definition of done. This is a conversation, not a one-shot prompt.

```
> I want to add multi-tenant support. Let's think about what that involves.
  ... (back and forth, model asks questions, you refine scope) ...

> Good, create the plan based on what we discussed.
```

Continuing in a new session:

```
> Let's continue with the multi-tenant plan
```

Before execution, grounded implementation plans are authored and verified against the actual codebase:

```
> Write the implementation plans and verify them against the codebase
```

**Tip:** Consider reviewing your plans and implementation plans in a fresh session – same or different model. A second pair of eyes catches assumptions you've stopped seeing. This works just as well for reviewing the implementation itself.

### Implementing

The gated protocol: the primary proposes a step list (blueprint) to the subagent, verifies it understood the task, then releases execution. The subagent implements, verifies, and returns a digest. Git operations (commit, PR) stay with you.

```
> Implement the next phase of the auth-refactor plan

> Create a handover for today's session
```

## Installation

```bash
git clone git@github.com:DasDigitaleMomentum/opencode-processing-skills.git
cd opencode-processing-skills
./install.sh
```

This copies skills to `~/.config/opencode/skills/` and agents to `~/.config/opencode/agents/`.

After installation, select the `@maintainer` agent in OpenCode. It knows when to load which skill and how to delegate to the right subagent.

## Skills

| Skill | What it does |
|-------|-------------|
| `generate-docs` | Creates `docs/` with project overview, module docs (with inventories), and feature docs |
| `update-docs` | Updates existing docs after code changes |
| `create-plan` | Creates `plans/<name>/` with plan, phases, and todo |
| `author-and-verify-implementation-plan` | Authors per-phase implementation plans, cross-checked against current code |
| `resume-plan` | Bootstraps a new session to continue an existing plan |
| `update-plan` | Updates plan status, todos, and phase transitions |
| `generate-handover` | Creates session handover docs for context transfer |
| `execute-work-packet` | Gated execution: blueprint → approve → execute → digest |
| `archive-legacy-docs` | Moves scattered legacy docs to `docs-legacy/` with a summary |

## Agents

| Agent | Role | What it does |
|-------|------|-------------|
| `maintainer` | primary | Orchestrates everything – planning, delegation, Git operations |
| `doc-explorer` | subagent | Explores code, writes/updates `docs/` and `plans/` |
| `implementer` | subagent | Executes code changes (no Git), returns compact digests |
| `legacy-curator` | subagent | Git-aware moves to `docs-legacy/`, no commits |

## How it fits together

```
You ──prompt──▸ @maintainer ──delegates──▸ subagents
                    │                         │
                    │  skills loaded           │  writes to disk
                    │  automatically           │  returns digest
                    ▼                         ▼
               docs/ & plans/           code changes
               (persistent)             (maintainer commits
                                         when you ask)
```

The file structure IS the interface. Subagents write to `docs/` and `plans/`, the primary agent reads from them. No magic state, no hidden context – just files.

## Design details

The full rationale lives in [AGENTS.md](AGENTS.md): why phases are separate from implementation plans, why the primary authors plans instead of delegating, why there's one `doc-explorer` instead of separate analysis and writing agents.

## License

MIT – see [LICENSE](LICENSE).
