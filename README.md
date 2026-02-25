# OpenCode Processing Skills

Agents + skills (with bundled `tpl-*` templates) to standardize **documentation**, **planning**, and **implementation** workflows with OpenCode.

## What you get

- Repeatable, file-based workflows (`docs/`, `plans/`) that survive context limits.
- Gated implementation protocol (blueprint → execute → digest) without Git in subagents.
- Legacy repo prep: archive scattered docs into `docs-legacy/` before generating new docs/plans.

## Workflows (recommended)

### 0) Legacy repo prep (optional but recommended)

If the repo has scattered / historical documentation:

1. Load `archive-legacy-docs`
2. Delegate to `legacy-curator`
   - moves legacy docs to `docs-legacy/` (git-aware)
   - writes `docs-legacy/summary.md`

### 1) Generate documentation

1. Load `generate-docs` → creates/updates `docs/` inventories (`overview`, `modules`, `features`).
2. After code changes: load `update-docs`.

### 2) Create plans

1. Load `create-plan` → creates `plans/<plan>/plan.md`, `phases/*`, `todo.md`.
2. Start a new session: load `resume-plan`.
3. During execution: load `update-plan` to keep phase/todo state in sync.
4. When needed: load `generate-handover`.

### 3) Author + verify implementation plans (2-pass default)

Before executing a phase:

1. Load `author-and-verify-implementation-plan`
2. Delegate to `doc-explorer` → writes `plans/<plan>/implementation/phase-N-impl.md` grounded against current code.

### 4) Implement (gated execution)

1. Load `execute-work-packet`
2. Delegate to `implementer`:
   - **MODE: BLUEPRINT** → Execution Blueprint (step list)
3. Primary gates internally (e.g. `APPROVE-WP1`).
4. Resume same `task_id`:
   - **MODE: EXECUTE** → applies changes + runs verify command → returns digest

The primary owns Git operations (commit/PR) and asks the user only for real product/scope decisions.

## Installation (global)

```bash
git clone git@github.com:DasDigitaleMomentum/opencode-processing-skills.git
cd opencode-processing-skills
./install.sh
```

Installs:

- skills → `~/.config/opencode/skills/`
- agents → `~/.config/opencode/agents/`

## Skills

| Skill | Description |
|-------|-------------|
| `archive-legacy-docs` | Archives scattered legacy docs into `docs-legacy/` and writes `docs-legacy/summary.md` |
| `generate-docs` | Generates project/module/feature documentation |
| `update-docs` | Updates documentation after code changes |
| `create-plan` | Creates structured plans with phases, todos, and DoD |
| `author-and-verify-implementation-plan` | Authors/refines phase implementation plans by cross-checking against current code |
| `resume-plan` | Bootstraps a new session to continue an existing plan |
| `update-plan` | Updates plan status, todos, and handles phase transitions |
| `generate-handover` | Creates session handover documents |
| `execute-work-packet` | Executes a gated implementation unit via blueprint → execute → digest |

## Agents

| Agent | Mode | Description |
|-------|------|-------------|
| `maintainer` | primary | Primary planning+implementation; delegates to subagents |
| `doc-explorer` | subagent | Writes/updates `docs/` and `plans/` |
| `implementer` | subagent | Execution-only (no Git), returns digests |
| `legacy-curator` | subagent | Legacy hygiene: git-aware moves to `docs-legacy/` + summary; no commits |

## Details

See [AGENTS.md](AGENTS.md) for rationale and deeper design notes.

## License

MIT (see [LICENSE](LICENSE)).
