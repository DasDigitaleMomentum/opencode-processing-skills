# OpenCode Processing Skills

A collection of agents, skills, and templates for standardizing project documentation and planning workflows when working with AI coding agents (OpenCode).

## Purpose

This project addresses key challenges when working with AI agents in software development:

1. **Standardized Documentation** - Consistent project and module documentation that can be generated, validated, and updated
2. **Structured Planning** - Plans with phases, implementation details, and persistent todo tracking across sessions
3. **Session Continuity** - Seamless handover between sessions despite limited context windows
4. **Quality Onboarding** - Fast, consistent onboarding of new agent sessions with the right context
5. **Token Efficiency** - Lightweight staleness detection and intelligent session bootstrap to minimize wasted context budget

## Core Concepts

### Entity Model

Three domains describe all relevant artifacts:

**Workspace Entities** (what exists)

| Entity | Description |
|--------|-------------|
| **Project** | The entire workspace, e.g. a repository |
| **Module** | Self-contained part of a project (service, container, frontend, etc.) |
| **File/Directory** | Filesystem manifestation |
| **Symbol** | Referenceable language element with semantic meaning |

**Planning Entities** (what needs to be done)

| Entity | Description |
|--------|-------------|
| **Plan** | Concrete implementation plan for one or more features, including DoD, tests, requirements |
| **Phase** | Subdivision of a plan when it exceeds a single session's capacity (scope definition: what and why) |
| **Implementation Plan** | Per-phase technical approach, above source-code level (how) |
| **Persistent Todo List** | Checkable items with status and changelog |
| **Session Handover** | Context transfer document for seamless session continuation (created on demand) |

**Documentation Entities** (how it works)

| Entity | Description |
|--------|-------------|
| **Project Overview** | High-level architecture, modules, references to detail docs |
| **Module Documentation** | Overview + exhaustive inventories (files/dirs + symbols) |
| **Feature Documentation** | How features work, with references to implementation |

### Target Project File Convention

When applied to a target project, artifacts are stored visibly in the project root:

```
project-root/
├── AGENTS.md
├── docs/
│   ├── overview.md
│   ├── modules/
│   │   └── <module-name>.md
│   ├── features/
│   │   └── <feature-name>.md
│   └── handovers/
│       └── session-YYYY-MM-DD.md
├── plans/
│   └── <plan-name>/
│       ├── plan.md
│       ├── phases/
│       │   ├── phase-1.md
│       │   └── phase-2.md
│       ├── implementation/
│       │   ├── phase-1-impl.md
│       │   └── phase-2-impl.md
│       ├── todo.md
│       └── handovers/
│           └── session-YYYY-MM-DD.md
```

## Architecture

### Integration Model

```
User Request
  -> Primary Agent (provider prompt)
      -> Subagent: Doc-Explorer (writes docs/ + plans/)
         -> Self-delegates per module for large codebases
      -> Subagent: general (read-only research/exploration when needed)
      -> question Tool for follow-ups
```

The primary agent is extended through skills from this project. Doc-explorer handles exploration, analysis, and artifact writing. For large codebases, doc-explorer self-delegates by spawning additional doc-explorer instances scoped to individual modules. All communication with the user goes through the `question` tool to avoid unnecessary premium requests.

### Design Principles

- **Stack-agnostic** - No assumptions about language or framework
- **Documentation as interface** - Docs and plans are the persistent interface between sessions
- **Redundancy-free** - Templates reference each other instead of duplicating content
- **Session-resilient** - Everything persisted, handover on demand
- **Context-aware** - Documents structured for partial loading (not everything at once)
- **File-based interface** - Subagents write to the defined file structure, skills define what and how
- **Three-path coverage** - Skills cover creating (write), checking (validate), and updating artifacts, plus bootstrapping context from them (read)
- **Git as source of truth for freshness** - Use git metadata (timestamps, diffs, log) to detect documentation staleness instead of re-reading source files
- **Token-conscious design** - Every skill is designed to minimize context consumption; validation and bootstrap skills use metadata over content reads

### Design Decisions

See [AGENTS.md](AGENTS.md#design-decisions) for detailed rationale behind key architectural decisions, including:

- Why Phase (What/Why) is separate from Implementation Plan (How)
- Why the primary agent authors plans, not doc-explorer
- Why one subagent (doc-explorer) instead of separate analysis and writing agents
- Why doc-explorer self-delegates instead of the primary spawning per-module instances
- Why templates are duplicated in each skill directory
- Why the question tool is used for all user interaction
- Why there is no "implementation" skill
- How execution is handled via a gated work-packet protocol
- Why validate-docs uses git metadata instead of source file reads
- Why smart-start runs in the primary agent, not a subagent

## Installation

### Quick Install (Global)

```bash
git clone git@github.com:DasDigitaleMomentum/opencode-processing-skills.git
cd opencode-processing-skills
./install.sh
```

### What the Installer Does

1. **Skills** (global) - Copies all skills to `~/.config/opencode/skills/`
2. **Agents** (global) - Copies all agent definitions to `~/.config/opencode/agents/`

### Manual Setup

If you prefer manual installation:

1. Copy `skills/*/` directories to `~/.config/opencode/skills/`
2. Copy `agents/*.md` to `~/.config/opencode/agents/`

### After Installation

In your project, open OpenCode and:

1. Select the `maintainer` agent for documentation/planning work
2. Load `smart-start` at the beginning of any session — it auto-detects project state and recommends the right next action
3. Load `generate-docs` to create initial documentation (or follow `smart-start`'s recommendation)
4. Load `validate-docs` to check if documentation is still in sync with code
5. Load `create-plan` / `update-plan` to manage multi-session workplans
6. Load `resume-plan` at the start of a new session to continue a plan
7. Load `update-docs` after code changes (use `validate-docs` first to target only stale modules)
8. Load `generate-handover` when you need a session handover

## Skill Lifecycle

The skills form two interconnected workflows — **documentation** and **planning** — with `smart-start` as the unified entry point.

### Session Entry

```
User opens project
    │
    ▼
smart-start
    ├── Checks docs/ → runs validate-docs internally
    ├── Checks plans/ → finds active plan + handover
    ├── Checks git log → recent activity
    │
    ▼
State assessment + recommended action
    │
    ├── No docs?          → recommend generate-docs
    ├── Active plan?      → recommend resume-plan
    ├── Stale docs?       → recommend update-docs (targeted)
    └── Everything current → ready for new work
```

### Documentation Workflow

```
generate-docs          validate-docs          update-docs
 (CREATE)        →       (CHECK)        →      (UPDATE)
  First time          Git-based, ~2-3k       Targeted to stale
  Full scan           tokens, no source      modules only
  20-50k tokens       file reads             5-10k tokens
```

**Without `validate-docs`**, `update-docs` must perform a full-scan of all docs and source files to discover what changed — typically 20-50k tokens, 80% wasted because only a few modules are stale. **With `validate-docs`**, `update-docs` receives a precise staleness report and targets only the affected modules.

### Planning Workflow

```
create-plan → analyze-impact → resume-plan → update-plan → generate-handover
 (CREATE)     (PRE-CHECK)     (BOOTSTRAP)    (TRACK)       (TRANSFER)
```

### Review Workflow

```
diff-review → update-docs (if doc impact detected)
 (REVIEW)      (UPDATE)
```

### Onboarding Workflow

```
generate-agents-md → generate-docs → retrospective (optional)
 (CONVENTIONS)        (CURRENT STATE)   (HISTORY / WHY)
```

## Available Skills

| Skill | Category | Description |
|-------|----------|-------------|
| `smart-start` | Workflow | Intelligent session bootstrap — auto-detects project state and recommends the right next action |
| `validate-docs` | Documentation | Checks documentation staleness using git metadata — no source file reads, ~2-3k tokens |
| `generate-docs` | Documentation | Generates project, module, and feature documentation from codebase analysis |
| `update-docs` | Documentation | Updates existing documentation after code changes |
| `generate-agents-md` | Documentation | Generates a project-specific AGENTS.md capturing conventions, build commands, and module rules |
| `retrospective` | Documentation | Reconstructs ADRs, module timelines, and pattern evolution from git history |
| `create-plan` | Planning | Creates structured implementation plans with phases, todos, and DoD |
| `update-plan` | Planning | Updates plan status, todos, and handles phase transitions |
| `resume-plan` | Planning | Bootstraps a new session to continue working on an existing plan |
| `generate-handover` | Planning | Creates session handover documents for continuity |
| `execute-work-packet` | Execution | Executes a gated implementation unit via step list -> gate -> digest (no new artifacts) |
| `analyze-impact` | Planning | Pre-implementation impact analysis — dependencies, breaking changes, test gaps |
| `cross-repo-plan` | Planning | ⚠️ Experimental — plans spanning multiple repositories with dependency tracking |
| `diff-review` | Review | Structured code review with impact assessment, risk matrix, and doc impact |

## Available Agents (Subagents)

| Agent | Mode | Description |
|-------|------|-------------|
| `maintainer` | primary | Uses provider prompt; allows Task only for `doc-explorer` + `general` (blocks built-in `explore`) |
| `doc-explorer` | subagent | Writes/updates `docs/` and `plans/`; self-delegates per module for large codebases |
| `implementer` | subagent | Execution-only: step list -> gate -> execute -> digest; no Git operations |

## Project Structure

```
.
├── AGENTS.md              # OpenCode agent instructions for this project
├── README.md              # This file
├── install.sh             # Global installer script
├── scripts/               # CI and maintenance scripts
│   └── check-template-sync.sh
├── skills/                # Skill definitions (SKILL.md + templates)
│   ├── smart-start/       # Intelligent session bootstrap
│   ├── validate-docs/     # Documentation staleness detection
│   ├── generate-docs/     # Generate project documentation
│   ├── update-docs/       # Update existing documentation
│   ├── generate-agents-md/ # Generate project-specific AGENTS.md
│   ├── retrospective/     # Reconstruct docs from git history
│   ├── create-plan/       # Create implementation plans
│   ├── update-plan/       # Update plan status and todos
│   ├── resume-plan/       # Bootstrap session for plan continuation
│   ├── generate-handover/ # Generate session handover documents
│   ├── execute-work-packet/ # Gated execution (steps -> gate -> digest)
│   ├── analyze-impact/    # Pre-implementation impact analysis
│   ├── diff-review/       # Structured code review
│   └── cross-repo-plan/   # Multi-repo plan coordination (experimental)
├── agents/                # Agent definitions (primary + subagents)
│   ├── maintainer.md      # Primary agent for docs/plans maintenance
│   ├── doc-explorer.md    # Writes docs/plans, self-delegates per module
│   └── implementer.md     # Execution-only subagent (no Git)
├── templates/             # All templates and config references
│   ├── project-overview.md
│   ├── module-documentation.md
│   ├── feature-documentation.md
│   ├── plan.md
│   ├── phase.md
│   ├── implementation-plan.md
│   ├── todo.md
│   └── session-handover.md
```

## Roadmap

### Foundation

| # | What | Status |
|---|------|--------|
| 1 | **Templates** — entity templates for all document types | ✅ Done |
| 2 | **Subagents** — Doc-Explorer for writing docs and plans | ✅ Done |
| 3 | **Integration** — global installer + agent definitions | ✅ Done |

### Documentation Skills

| # | Skill | Description | Status |
|---|-------|-------------|--------|
| 4 | `generate-docs` | Full project, module, and feature documentation | ✅ Done |
| 5 | `update-docs` | Targeted documentation updates after code changes | ✅ Done |
| 6 | `validate-docs` | Git-based staleness detection (CHECK path) | ✅ Done |
| 7 | `generate-agents-md` | Project-specific AGENTS.md from conventions | ✅ Done |
| 8 | `retrospective` | ADRs and module chronology from git history | ✅ Done |

### Planning Skills

| # | Skill | Description | Status |
|---|-------|-------------|--------|
| 9 | `create-plan` | Structured implementation plans with phases | ✅ Done |
| 10 | `update-plan` | Plan status tracking and phase transitions | ✅ Done |
| 11 | `resume-plan` | Session bootstrap for plan continuation | ✅ Done |
| 12 | `generate-handover` | Session handover documents for continuity | ✅ Done |
| 13 | `analyze-impact` | Pre-implementation impact analysis | ✅ Done |
| 14 | `cross-repo-plan` | Multi-repository plan coordination | ⚠️ Experimental |

### Workflow Skills

| # | Skill | Description | Status |
|---|-------|-------------|--------|
| 15 | `smart-start` | Intelligent session bootstrap with auto-detection | ✅ Done |
| 16 | `diff-review` | Structured PR/diff code review | ✅ Done |

### Execution Skills

| # | Skill | Description | Status |
|---|-------|-------------|--------|
| 17 | `execute-work-packet` | Gated execution protocol (steps -> gate -> execute -> digest) | ✅ Done |

### Infrastructure

| # | What | Status |
|---|------|--------|
| 18 | CI pipeline (Markdown Lint, Template Sync, ShellCheck) | ✅ Done |
| 19 | Enterprise readiness (LICENSE, CONTRIBUTING, SECURITY, CoC) | ✅ Done |
| 20 | Plugin (optional convenience extension for the primary agent) | 📋 Planned |

## License

MIT
