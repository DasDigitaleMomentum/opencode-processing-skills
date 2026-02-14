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
- **Module Documentation**: Two-tier: curated overview + optional deep-dive. Includes file and symbol descriptions, not mere listings
- **Feature Documentation**: How features work, with implementation references. May never be fully exhaustive

## Architecture Principles

- **File-based interface**: Subagents and skills write to the defined file structure (templates). The file structure IS the interface, not return values
- **Agent extension over commands**: Skills extend the primary agent's behavior. Subagents handle expensive exploration. No slash commands (each would be a separate premium request)
- **Stack-agnostic**: No assumptions about language or framework
- **Two-tier documentation**: Overview with references + detail docs, deliberately curated to manage complexity
- **Redundancy-free**: Templates reference each other instead of duplicating content
- **Session-resilient**: Everything persisted, handover on demand
- **Context-aware**: Documents structured for partial loading (not everything into context at once)

## Target Project File Convention

When skills/agents create artifacts in a target project:

```
project-root/
├── AGENTS.md
├── docs/
│   ├── overview.md
│   ├── modules/<module-name>.md
│   └── features/<feature-name>.md
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
