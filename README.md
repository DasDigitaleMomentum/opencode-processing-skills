# OpenCode Processing Skills

A collection of agents, skills, and templates for standardizing project documentation and planning workflows when working with AI coding agents (OpenCode).

## Purpose

This project addresses key challenges when working with AI agents in software development:

1. **Standardized Documentation** - Consistent project and module documentation that can be generated and updated
2. **Structured Planning** - Plans with phases, implementation details, and persistent todo tracking across sessions
3. **Session Continuity** - Seamless handover between sessions despite limited context windows
4. **Quality Onboarding** - Fast, consistent onboarding of new agent sessions with the right context

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
- **Write-path AND read-path** - Skills cover both creating/updating artifacts and bootstrapping context from them

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
2. Load `generate-docs` to create initial documentation
3. Load `create-plan` / `update-plan` to manage multi-session workplans
4. Load `resume-plan` at the start of a new session to continue a plan
5. Load `update-docs` after code changes
6. Load `generate-handover` when you need a session handover

## Available Skills

| Skill | Description |
|-------|-------------|
| `generate-docs` | Generates project, module, and feature documentation from codebase analysis |
| `update-docs` | Updates existing documentation after code changes |
| `create-plan` | Creates structured implementation plans with phases, todos, and DoD |
| `update-plan` | Updates plan status, todos, and handles phase transitions |
| `resume-plan` | Bootstraps a new session to continue working on an existing plan |
| `generate-handover` | Creates session handover documents for continuity |
| `execute-work-packet` | Executes a gated implementation unit via step list -> gate -> digest (no new artifacts) |

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
├── skills/                # Skill definitions (SKILL.md + templates)
│   ├── generate-docs/     # Generate project documentation
│   ├── update-docs/       # Update existing documentation
│   ├── create-plan/       # Create implementation plans
│   ├── update-plan/       # Update plan status and todos
│   ├── resume-plan/       # Bootstrap session for plan continuation
│   ├── generate-handover/ # Generate session handover documents
│   └── execute-work-packet/ # Gated execution (steps -> gate -> digest)
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
│   ├── session-handover.md
└── docs/                  # Documentation for this project
```

## Roadmap

| Phase | What | Status |
|-------|------|--------|
| 1 | **Templates** for all entities | Done |
| 2 | **Skills** (Generate Docs, Update Docs, Create Plan, Update Plan, Resume Plan, Generate Handover) | Done |
| 3 | **Subagents** (Doc-Explorer) | Done |
| 4 | **Integration** (global installer + agents) | Done |
| 5 | **Plugin** (optional convenience extension for the primary agent) | Planned |
| 6 | **Retrospective** (Git/log analysis for documentation reconstruction) | Planned |
| 7 | **Execution Layer** (work-packet protocol + implementer subagent) | Done |

## License

MIT
