# OpenCode Processing Skills - Agent Instructions

## Project Overview

This is a meta-project for creating agents, skills, tools, and templates that standardize documentation and planning workflows for AI-assisted software development using OpenCode.

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
- **One subagent per output domain**: Subagents are organized by what they WRITE, not by what they do. `doc-explorer` primarily writes to `docs/`; plan artifacts are authored by the primary and only materialized by doc-explorer on explicit delegation. There is no separate analysis agent -- analysis is an intermediate step within the writing agent's workflow.
- **Self-delegation for scale**: When a subagent's workload would exceed comfortable context limits (e.g., documenting a project with many modules), it spawns additional instances of itself, each scoped to a smaller unit of work.
- **Agent extension over commands**: Skills extend the primary agent's behavior. Subagents handle expensive exploration.
- **Stack-agnostic**: No assumptions about language or framework
- **Two-tier documentation**: Overview with references + detail docs, deliberately curated to manage complexity
- **Redundancy-free**: Templates reference each other instead of duplicating content
- **Session-resilient**: Everything persisted, handover on demand
- **Context-aware**: Documents structured for partial loading (not everything into context at once)
- **Three-path coverage**: Skills cover creating (write-path), checking (validate-path), and updating artifacts, plus bootstrapping context from them (read-path). The validate-path is critical: without it, every update requires a full-scan to discover what changed.
- **Git as source of truth for freshness**: Use git metadata (timestamps, diffs, log) to detect documentation staleness instead of re-reading source files. This is the key optimization that makes validation cheap.
- **Token-conscious design**: Every skill is designed to minimize context consumption. Validation and bootstrap skills use metadata over content reads. Partial section reads (frontmatter, structure tables) are preferred over full file reads.

## Design Decisions

Key architectural decisions and their rationale. These explain WHY the framework works the way it does.

### Why separate Phase (What/Why) from Implementation Plan (How)?

Phases define scope and acceptance criteria independent of technical approach. The implementation plan may be revised (e.g., "we chose a different library") without changing what the phase delivers. This separation also allows a plan reviewer to evaluate scope without needing to understand the technical details.

### Why does the primary agent author plans, not doc-explorer?

Plans are conversation-anchored: requirements emerge from user dialogue, trade-offs are negotiated, DoD is agreed upon. This context lives in the primary agent's conversation. Delegating plan creation to a subagent would require serializing all this context into a prompt, risking loss of intent and nuance. Documentation, by contrast, is codebase-anchored -- it can be derived from files without conversation context.

### Why one subagent (doc-explorer) instead of separate analysis and writing agents?

Earlier iterations had a separate `code-analyzer` (read-only analysis) and `doc-explorer` (writing). This created problems: (1) code-analyzer could only return text, violating the file-based interface principle; (2) the delegation chain primary -> doc-explorer -> code-analyzer added indirection without value, since doc-explorer already has the same read capabilities; (3) the primary spawning code-analyzer directly for plan creation would dump the entire analysis into the primary's context, causing unnecessary context growth. The solution: doc-explorer handles both analysis and writing. For scale, it self-delegates (spawns additional doc-explorer instances per module) rather than delegating to a different agent type.

### Why does doc-explorer self-delegate instead of the primary spawning per-module instances?

The primary agent should not need to know the internal module structure of a project. Doc-explorer discovers modules during exploration and decides how to partition the work. This keeps the primary's prompt simple ("document this project") and avoids leaking implementation details of the documentation process into the primary's context.

### Why duplicate templates in each skill directory?

OpenCode skills are self-contained units. A skill loaded into an agent session must have all its resources available without depending on external paths. The `templates/` directory serves as the canonical reference for humans; the `tpl-*` files in each skill are the operational copies. This is a deliberate trade-off: we accept file-level redundancy to ensure skills work independently of the project directory structure after installation.

### Why have `implement-phase` if coding is already a primary-agent capability?

`implement-phase` is intentionally process-oriented, not a replacement for coding capability. The primary agent can already write code; this skill adds execution discipline across sessions: ordered step execution, test-after-change checkpoints, and explicit `update-plan` synchronization. The value is repeatability and traceability.

### How is execution handled then?

Instead of a generic "implementation" skill that tries to plan-and-code, this framework uses:

- A dedicated **execution protocol** (`execute-work-packet`) that is explicitly **gated** (step list -> primary approval -> execute -> digest)
- A dedicated execution-only **subagent** (`implementer`) that reduces primary context bloat by returning compact digests

This keeps planning and execution responsibilities separated while still standardizing implementation as a repeatable workflow.

### Why does validate-docs use git metadata instead of reading source files?

The naive approach to documentation validation is: read every doc, read every source file it describes, compare them. This is O(n×m) and costs 20-50k tokens for a medium project — often wasting 80% because most modules haven't changed. Git already tracks exactly which files changed and when. By comparing `git log -1 --format=%aI -- docs/modules/<name>.md` (when the doc was last updated) against `git log --since=<timestamp> -- <source_path>` (what changed since then), we get precise staleness detection for ~2-3k tokens total. The trade-off is reduced precision: a source file commit doesn't guarantee the doc is stale (the change might not affect documented behavior). We accept false positives over false negatives — it's better to flag a module for review than to miss a genuinely stale doc.

### Why does smart-start run in the primary agent, not a subagent?

`smart-start` is a context-building skill: its output (the state assessment and recommended action) must live in the primary agent's context to guide the rest of the session. Delegating to a subagent would build context in the wrong place — the subagent's findings would need to be serialized back, adding overhead that exceeds the skill's own cost (~3-5k tokens). This is the same rationale as `resume-plan`: session bootstrap is fundamentally a primary-agent activity.

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
