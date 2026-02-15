# OpenCode Processing Skills - Agent Instructions

## Project Overview

This is a meta-project for creating agents, skills, tools, and templates that standardize documentation and planning workflows for AI-assisted software development using OpenCode.

## Language

- Code, Git commits, and technical documentation: **English**
- Communication with the user: **German** (unless otherwise requested)

## Critical: Context Cost Management

**IMPORTANT**: Due to GitHub's Premium Request billing model, every full response from the primary agent counts as a premium request. Therefore:

- **Always use the `question` tool** for follow-up questions, clarifications, and offering choices to the user. NEVER ask follow-up questions as plain text responses.
- **Use subagents (Task tool)** for exploration, research, and multi-step operations. Subagent usage is included and does not incur additional premium request costs.
- This rule applies to all primary agents created by this project. Subagents are exempt (their cost is included).

## Project Structure

```
.
├── AGENTS.md              # This file - agent instructions
├── README.md              # Project overview (English)
├── skills/                # Reusable skill definitions
├── agents/                # Agent configurations  
├── templates/             # Document and plan templates
└── docs/                  # Project documentation
```

## Core Entities

### Workspace Entities
- **Project**: The entire workspace/repository
- **Module**: Self-contained part (service, container, frontend)
- **File/Directory**: Filesystem manifestation
- **Symbol**: Referenceable language element with meaning

### Planning Entities
- **Plan**: Implementation plan for features (with DoD, tests, requirements)
- **Phase**: Subdivision when plan exceeds single-session capacity (defines scope: what and why)
- **Implementation Plan**: Per-phase technical approach, above code level (defines: how)
- **Persistent Todo List**: Items with status + changelog
- **Session Handover**: Context transfer for session continuity (created on demand, multiple per plan possible)

### Documentation Entities
- **Project Overview**: High-level architecture, modules, references
- **Module Documentation**: Overview + inventories (directories/files + symbols) with explanations for each entry
- **Feature Documentation**: How features work, with implementation references

## Architecture Principles

- **File-based interface**: Subagents write to the defined file structure (templates). The file structure IS the interface, not return values. Every subagent that produces artifacts writes them to disk; the primary agent receives only a short status summary.
- **One subagent per output domain**: Subagents are organized by what they WRITE, not by what they do. `doc-explorer` writes to `docs/` and `plans/`. There is no separate analysis agent -- analysis is an intermediate step within the writing agent's workflow.
- **Self-delegation for scale**: When a subagent's workload would exceed comfortable context limits (e.g., documenting a project with many modules), it spawns additional instances of itself, each scoped to a smaller unit of work.
- **Agent extension over commands**: Skills extend the primary agent's behavior. Subagents handle expensive exploration. No slash commands (each would be a separate premium request)
- **Stack-agnostic**: No assumptions about language or framework
- **Two-tier documentation**: Overview with references + detail docs, deliberately curated to manage complexity
- **Redundancy-free**: Templates reference each other instead of duplicating content
- **Session-resilient**: Everything persisted, handover on demand
- **Context-aware**: Documents structured for partial loading (not everything into context at once)

## Design Decisions

Key architectural decisions and their rationale. These explain WHY the framework works the way it does.

### Why separate Phase (What/Why) from Implementation Plan (How)?

Phases define scope and acceptance criteria independent of technical approach. The implementation plan may be revised (e.g., "we chose a different library") without changing what the phase delivers. This separation also allows a plan reviewer to evaluate scope without needing to understand the technical details.

### Why does the primary agent author plans, not doc-explorer?

Plans are conversation-anchored: requirements emerge from user dialogue, trade-offs are negotiated, DoD is agreed upon. This context lives in the primary agent's conversation. Delegating plan creation to a subagent would require serializing all this context into a prompt, risking loss of intent and nuance. Documentation, by contrast, is codebase-anchored -- it can be derived from files without conversation context.

### Why one subagent (doc-explorer) instead of separate analysis and writing agents?

Earlier iterations had a separate `code-analyzer` (read-only analysis) and `doc-explorer` (writing). This created problems: (1) code-analyzer could only return text, violating the file-based interface principle; (2) the delegation chain primary -> doc-explorer -> code-analyzer added indirection without value, since doc-explorer already has the same read capabilities; (3) the primary spawning code-analyzer directly for plan creation would dump the entire analysis into the primary's context, causing token bloat. The solution: doc-explorer handles both analysis and writing. For scale, it self-delegates (spawns additional doc-explorer instances per module) rather than delegating to a different agent type.

### Why does doc-explorer self-delegate instead of the primary spawning per-module instances?

The primary agent should not need to know the internal module structure of a project. Doc-explorer discovers modules during exploration and decides how to partition the work. This keeps the primary's prompt simple ("document this project") and avoids leaking implementation details of the documentation process into the primary's context.

### Why duplicate templates in each skill directory?

OpenCode skills are self-contained units. A skill loaded into an agent session must have all its resources available without depending on external paths. The `templates/` directory serves as the canonical reference for humans; the `tpl-*` files in each skill are the operational copies. This is a deliberate trade-off: we accept file-level redundancy to ensure skills work independently of the project directory structure after installation.

### Why use the question tool for all user interaction?

GitHub Copilot's Premium Request billing counts each full agent response. The `question` tool allows structured interaction (confirmations, choices, clarifications) within a single response turn, avoiding additional premium request charges. This is an economic constraint that shapes the interaction model.

### Why no "implementation" skill?

The framework deliberately stops at the boundary between planning and coding. Implementation is the domain of the coding agent (OpenCode's primary capability). The `resume-plan` skill bootstraps context so the agent can implement effectively, but the actual coding workflow is left to the agent's native capabilities. An "implement-phase" skill would either be too generic to be useful or too prescriptive for the variety of possible implementations.

## Target Project File Convention

When skills/agents create artifacts in a target project:

```
project-root/
├── AGENTS.md
├── docs/
│   ├── overview.md
│   ├── modules/<module-name>.md
│   ├── features/<feature-name>.md
│   └── handovers/session-YYYY-MM-DD.md  (standalone, without plan)
├── plans/
│   └── <plan-name>/
│       ├── plan.md
│       ├── phases/phase-N.md
│       ├── implementation/phase-N-impl.md
│       ├── todo.md
│       └── handovers/session-YYYY-MM-DD.md
```

## Development Guidelines

- When creating skills or agents, ensure they follow the entity model above
- Templates should be modular - avoid redundancy by referencing shared sections
- Documentation must be updatable (not just generatable)
- Plans must support multi-session workflows with clear phase boundaries
- Always consider the context window limitation when designing artifacts
- Skills define WHAT to create and HOW - the file structure defines WHERE

## File Conventions

- Templates use Markdown with YAML frontmatter where metadata is needed
- Plan files include a changelog section for tracking progress across sessions
- Todo lists are persisted as structured Markdown with checkbox syntax
