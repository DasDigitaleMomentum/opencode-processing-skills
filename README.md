# OpenCode Processing Skills

A collection of agents, skills, and templates for standardizing project documentation and planning workflows when working with AI coding agents ([OpenCode](https://github.com/sst/opencode)).

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
      -> Subagent: Doc-Explorer (writes docs/; plan files only on explicit delegation)
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
- Why `implement-phase` is process-oriented (not autonomous coding)
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

1. **Skills** (global) - Installs/updates managed skills in `~/.config/opencode/skills/` using ownership markers
2. **Agents** (global) - Installs/updates managed agents in `~/.config/opencode/agents/` using ownership markers
3. **Safety guard** - Skips unmanaged name collisions by default (use `--force` to override)

### Manual Setup

If you prefer manual installation:

1. Copy `skills/*/` directories to `~/.config/opencode/skills/`
2. Copy `agents/*.md` to `~/.config/opencode/agents/`

### After Installation

In your project, open OpenCode and:

1. Select the `engineer` agent as your primary agent
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

### Work Packet Execution Workflow

```
execute-work-packet (preflight) → approval gate → execute-work-packet (execute)
          (STEPS)                    (PRIMARY)               (DIGEST)
```

### Implementation Workflow

```
create-plan → analyze-impact → implement-phase → add-tests → pr-ready → diff-review
 (PLAN)        (PRE-CHECK)      (BUILD)          (TEST)      (PREP)     (REVIEW)
```

### Testing Workflow

```
coverage-check → test-strategy → add-tests → implement (run tests)
 (CHECK)          (PLAN)          (GENERATE)   (VERIFY)
```

### Review & Release Workflow

```
pr-ready → diff-review → release-notes
 (PREP)     (REVIEW)      (PUBLISH)
```

### Debugging Workflow

```
debug-assist → fix-ci (if CI) → add-tests (regression test)
 (DIAGNOSE)     (FIX)            (PREVENT)
```

### Onboarding Workflow

```
generate-agents-md → generate-docs → retrospective → onboard-developer
 (CONVENTIONS)        (CURRENT STATE)   (HISTORY)      (GETTING STARTED)
```

## Available Skills (29)

### Documentation (6)

| Skill | Description |
|-------|-------------|
| `generate-docs` | Generates project, module, and feature documentation from codebase analysis |
| `update-docs` | Updates existing documentation after code changes |
| `validate-docs` | Checks documentation staleness using git metadata (~2-3k tokens) |
| `generate-agents-md` | Generates a project-specific AGENTS.md from conventions and config |
| `retrospective` | Reconstructs ADRs, module timelines, and pattern evolution from git history |
| `onboard-developer` | Generates developer onboarding guide (setup, workflows, conventions) |

### Planning (6)

| Skill | Description |
|-------|-------------|
| `create-plan` | Creates structured implementation plans with phases, todos, and DoD |
| `update-plan` | Updates plan status, todos, and handles phase transitions |
| `resume-plan` | Bootstraps a new session to continue working on an existing plan |
| `generate-handover` | Creates session handover documents for continuity |
| `analyze-impact` | Pre-implementation impact analysis — dependencies, breaking changes, test gaps |
| `cross-repo-plan` | Plans spanning multiple repositories with dependency tracking |

### Execution (1)

| Skill | Description |
|-------|-------------|
| `execute-work-packet` | Gated execution protocol using an `implementer` subagent (preflight steps -> approval -> execution digest) |

### Implementation (4)

| Skill | Description |
|-------|-------------|
| `implement-phase` | Executes plan phases step by step with test verification and auto status updates |
| `scaffold` | Generates convention-aware boilerplate for new modules/features |
| `refactor` | Safe refactoring — tests before, incremental changes, tests after |
| `fix-ci` | Diagnoses and fixes CI failures with structured root cause analysis |

### Testing (3)

| Skill | Description |
|-------|-------------|
| `add-tests` | Generates tests matching project conventions (framework, patterns, style) |
| `test-strategy` | Generates test strategy with coverage gap analysis and priority matrix |
| `coverage-check` | Lightweight test coverage heuristic via file matching (no execution) |

### Review & Release (3)

| Skill | Description |
|-------|-------------|
| `diff-review` | Structured code review with impact assessment, risk matrix, and doc impact |
| `pr-ready` | Prepares branch for PR — checks, description, changelog, labels |
| `release-notes` | Generates structured release notes from git log between tags |

### Architecture (1)

| Skill | Description |
|-------|-------------|
| `adr-create` | Creates Architecture Decision Records with context, alternatives, consequences |

### DevOps & Quality (3)

| Skill | Description |
|-------|-------------|
| `ci-setup` | Generates CI pipeline (GitHub Actions) tailored to project stack |
| `dependency-audit` | Audits dependencies for staleness, vulnerabilities, and license issues |
| `debug-assist` | Structured debugging with hypothesis logging (Reproduce → Isolate → Fix) |

### Session (2)

| Skill | Description |
|-------|-------------|
| `smart-start` | Intelligent session bootstrap — auto-detects state and recommends next action |
| `context-compress` | Mid-session context compression to save tokens in long conversations |

## Available Agents (Subagents)

> **Important:** For a detailed breakdown of which agent is authorized to execute which skill and why, please refer to the [**Skill Matrix**](SKILL_MATRIX.md).

| Agent | Mode | Description |
|-------|------|-------------|
| `engineer` | primary | Uses provider prompt; allows Task only for `doc-explorer` + `general` (blocks built-in `explore`) |
| `doc-explorer` | subagent | Writes/updates `docs/`; may materialize `plans/` files only when explicitly delegated |
| `implementer` | subagent | Execution-only subagent for approved work packets (no Git operations) |

## Project Structure

```
.
├── opencode.json              # Plugin manifest (29 skills, 3 agents, 12 templates)
├── Makefile                   # Developer commands (make check, list, stats, ...)
├── install.sh                 # Global installer (--uninstall supported)
├── scripts/                   # CI and maintenance scripts
├── skills/                    # 29 skill definitions
│   ├── smart-start/           # Session: bootstrap
│   ├── context-compress/      # Session: mid-session compression
│   ├── generate-docs/         # Documentation: generate
│   ├── update-docs/           # Documentation: update
│   ├── validate-docs/         # Documentation: check staleness
│   ├── generate-agents-md/    # Documentation: AGENTS.md
│   ├── retrospective/         # Documentation: git history
│   ├── onboard-developer/     # Documentation: onboarding guide
│   ├── create-plan/           # Planning: create
│   ├── update-plan/           # Planning: update
│   ├── resume-plan/           # Planning: resume session
│   ├── generate-handover/     # Planning: handover
│   ├── analyze-impact/        # Planning: impact analysis
│   ├── cross-repo-plan/       # Planning: multi-repo coordination
│   ├── execute-work-packet/   # Execution: gated packet execution protocol
│   ├── implement-phase/       # Implementation: execute plan phase
│   ├── scaffold/              # Implementation: generate boilerplate
│   ├── refactor/              # Implementation: safe refactoring
│   ├── fix-ci/                # Implementation: fix CI failures
│   ├── add-tests/             # Testing: generate tests
│   ├── test-strategy/         # Testing: strategy document
│   ├── coverage-check/        # Testing: coverage heuristic
│   ├── diff-review/           # Review: structured code review
│   ├── pr-ready/              # Review: prepare PR
│   ├── release-notes/         # Release: generate notes
│   ├── adr-create/            # Architecture: decision records
│   ├── ci-setup/              # DevOps: generate CI pipeline
│   ├── dependency-audit/      # Quality: audit dependencies
│   └── debug-assist/          # Workflow: structured debugging
├── agents/
│   ├── engineer.md            # Primary agent
│   ├── doc-explorer.md        # Subagent for docs (plan materialization by explicit delegation)
│   └── implementer.md         # Subagent for execution-only work packets
├── templates/                 # 12 canonical templates
```

## Roadmap

All phases are **Done**. See [CHANGELOG.md](CHANGELOG.md) for detailed release history.

| Phase | Category | Skills | Status |
|-------|----------|--------|--------|
| 1 | Foundation | Templates, Subagents, Integration, Plugin | Done |
| 2 | Documentation | `generate-docs`, `update-docs`, `validate-docs`, `generate-agents-md`, `retrospective`, `onboard-developer` | Done |
| 3 | Planning | `create-plan`, `update-plan`, `resume-plan`, `generate-handover`, `analyze-impact`, `cross-repo-plan` | Done |
| 4 | Implementation & Execution | `execute-work-packet`, `implement-phase`, `scaffold`, `refactor`, `fix-ci` | Done |
| 5 | Testing | `add-tests`, `test-strategy`, `coverage-check` | Done |
| 6 | Review & Release | `diff-review`, `pr-ready`, `release-notes` | Done |
| 7 | Architecture | `adr-create` | Done |
| 8 | DevOps & Quality | `ci-setup`, `dependency-audit`, `debug-assist` | Done |
| 9 | Session | `smart-start`, `context-compress` | Done |
| 10 | Infrastructure | CI pipeline, Enterprise readiness, GitHub templates | Done |

## License

MIT — see [LICENSE](LICENSE) for details.
