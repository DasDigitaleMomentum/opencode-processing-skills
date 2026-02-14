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
| **Module Documentation** | Two-tier: curated overview + optional deep-dive per module |
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
│   └── features/
│       └── <feature-name>.md
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
User Request (1 Premium Request)
  -> Primary Agent (extended via Skills)
     -> Subagent: Doc-Explorer (inclusive)
     -> Subagent: Code-Analyzer (inclusive)
     -> question Tool for follow-ups (no extra request)
     -> Writes results to defined file structure
```

The primary agent is extended through skills from this project. Subagents handle large exploration and analysis tasks. All communication with the user goes through the `question` tool to avoid unnecessary premium requests.

### Design Principles

- **Stack-agnostic** - No assumptions about language or framework
- **Two-tier documentation** - Overview with references + detail docs, deliberately curated
- **Redundancy-free** - Templates reference each other instead of duplicating content
- **Session-resilient** - Everything persisted, handover on demand
- **Context-aware** - Documents structured for partial loading (not everything at once)
- **File-based interface** - Subagents write to the defined file structure, skills define what and how

## Project Structure

```
.
├── AGENTS.md              # OpenCode agent instructions for this project
├── README.md              # This file
├── skills/                # Reusable skill definitions (.md files)
├── agents/                # Agent configurations
├── templates/             # Document and plan templates
└── docs/                  # Project documentation
```

## Roadmap

| Phase | What |
|-------|------|
| 1 | **Templates** for all entities |
| 2 | **Skills** (Generate Docs, Update Docs, Create Plan, Update Plan, Handover) |
| 3 | **Subagents** (Doc-Explorer, Code-Analyzer) |
| 4 | **Integration** (AGENTS.md instructions, opencode.json config) |
| 5 | **Plugin** (optional convenience extension for the primary agent) |
| 6 | **Retrospective** (Git/log analysis for documentation reconstruction) |

## License

TBD
