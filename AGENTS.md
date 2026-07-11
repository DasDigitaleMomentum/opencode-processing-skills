# OpenCode Processing Skills - Agent Instructions

## Project Overview

This is a meta-project for creating agents, skills, tools, and templates that standardize documentation and planning workflows for AI-assisted software development using OpenCode.

## Project Structure

```
.
├── AGENTS.md              # This file - agent instructions
├── README.md              # Project overview (English)
├── config.yaml.example    # Model configuration template
├── skills/                # Reusable skill definitions
├── agents/                # Agent configurations  
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

- **File-based interface**: Subagents write skill-/workflow-defined artifacts to the defined file structure (templates). The file structure IS the interface, not return values. Every subagent that produces artifacts writes them to disk; the primary agent receives only a short status summary.
- **Skill-driven delegate**: `agents/delegate.md` is the single canonical analysis/review persona. Generated `delegate-*` variants are model aliases; loaded skills own expertise, write boundaries, and output contracts.
- **Workflow-owned writers**: `doc-explorer` is docs-focused, the canonical delegate handles skill-governed analysis/reviews and explicit artifacts, and `implementer` performs gated code execution.
- **Self-delegation for scale**: When a subagent's workload would exceed comfortable context limits (e.g., documenting a project with many modules), it spawns additional instances of itself, each scoped to a smaller unit of work.
- **Agent extension over commands**: Skills extend the primary agent's behavior. Subagents handle expensive exploration.
- **Stack-agnostic**: No assumptions about language or framework
- **Two-tier documentation**: Overview with references + detail docs, deliberately curated to manage complexity
- **Redundancy-free**: Templates reference each other instead of duplicating content
- **Session-resilient**: Everything persisted, handover on demand
- **Context-aware**: Documents structured for partial loading (not everything into context at once)
- **Policy-light**: Routing rules are defaults, not self-imposed blockers; preserve valid context and avoid automatic review/fix loops
- **Scope-disciplined**: No Gold-Plating, No Adversarial Reviewing, No Scope Creep; pursue evidence-backed defects and required related changes without inventing extra work

## Design Decisions

Key architectural decisions and their rationale. These explain WHY the framework works the way it does.

### Why separate Phase (What/Why) from Implementation Plan (How)?

Phases define scope and acceptance criteria independent of technical approach. The implementation plan may be revised (e.g., "we chose a different library") without changing what the phase delivers. This separation also allows a plan reviewer to evaluate scope without needing to understand the technical details.

### Why does the primary agent author plans, not doc-explorer?

Plans are conversation-anchored: requirements emerge from user dialogue, trade-offs are negotiated, DoD is agreed upon. This context lives in the primary agent's conversation. Delegating plan creation to a subagent would require serializing all this context into a prompt, risking loss of intent and nuance. Documentation, by contrast, is codebase-anchored -- it can be derived from files without conversation context.

### Why keep exploration and writing within workflow agents?

Earlier iterations had a separate `code-analyzer` (read-only analysis) and writer agents. This created problems: (1) code-analyzer could only return text, weakening the file-based interface; (2) extra delegation chains added indirection without value; (3) the primary spawning analyzers directly for large tasks could dump excessive analysis into the primary's context. The solution: the workflow agent that owns an artifact performs the necessary exploration and writes the artifact directly. For documentation scale, `doc-explorer` self-delegates per module; for review and implementation-plan artifacts, `delegate-*` writes the explicit output path defined by the skill.

### Why one canonical delegate persona?

Task expertise changes more often than generic delegate behavior. Keeping exploration, review, remediation, and artifact contracts in skills avoids persona drift and lets the same `task_id` move from review to remediation without rebuilding context. Model variants copy the canonical persona and differ only in configured model/options, so stronger models can be selected for independent reviews without duplicating workflow rules.

### Why review fixes stay in the reviewer session?

The reviewer already has the relevant code, findings, assumptions, and verification context. Starting a new implementer for every finding forces context reconstruction and can introduce a weaker or conflicting policy layer. Same-session remediation is therefore the default, including related multi-file fixes. A new work package is reserved for changed scope, unavailable context, an explicit fresh perspective, or a new primary decision. Review loops are never started automatically.

### Why does doc-explorer self-delegate instead of the primary spawning per-module instances?

The primary agent should not need to know the internal module structure of a project. Doc-explorer discovers modules during exploration and decides how to partition the work. This keeps the primary's prompt simple ("document this project") and avoids leaking implementation details of the documentation process into the primary's context.

### Why bundle templates in each skill directory?

OpenCode skills are self-contained units. A skill loaded into an agent session must have all its resources available without depending on external paths. Therefore, `tpl-*` files live alongside each skill as the operational (and canonical) templates. This avoids drift between a separate "human reference" template set and the templates agents actually follow.

### Why no "implementation" skill?

The framework deliberately stops at the boundary between planning and coding. Implementation is the domain of the coding agent (OpenCode's primary capability). The `resume-plan` skill bootstraps context so the agent can implement effectively, but the actual coding workflow is left to the agent's native capabilities. An "implement-phase" skill would either be too generic to be useful or too prescriptive for the variety of possible implementations.

### How is execution handled then?

Instead of a generic "implementation" skill that tries to plan-and-code, this framework uses:

- A dedicated **execution protocol** (`execute-work-package`) that is explicitly **gated** (step list -> primary approval -> execute -> digest)
- A dedicated execution-only **subagent** (`implementer`) that reduces primary context bloat by returning compact digests

This keeps planning and execution responsibilities separated while still standardizing implementation as a repeatable workflow.

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
│       ├── reviews/
│       │   ├── plan-review.md
│       │   ├── impl-plan-review-phase-N.md
│       │   └── impl-review-phase-N.md
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
