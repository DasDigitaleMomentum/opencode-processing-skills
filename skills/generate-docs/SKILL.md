---
name: generate-docs
description: Generate project documentation from an existing codebase. This documentation shall serve Agents and Humans. Creates a project overview, module documentation, and feature documentation with explicit inventories (files/dirs + symbols) for each module. Use this skill when onboarding a new project or creating initial documentation for an undocumented codebase.
license: MIT
compatibility: opencode
metadata:
  category: documentation
  phase: initial
---

# Skill: Generate Documentation

## What This Skill Does

Creates structured project documentation from an existing codebase. This documentation shall serve Agents and Humans when working in consecutive sessions with the project.

Produces three artifact types:

1. **Project Overview** (`docs/overview.md`) - High-level architecture, module listing, feature listing
2. **Module Documentation** (`docs/modules/<name>.md`) - Overview + exhaustive inventories (files/dirs + symbols)
3. **Feature Documentation** (`docs/features/<name>.md`) - How features work, with implementation references

## When to Use

- When a project has no structured documentation yet
- When onboarding to an unfamiliar codebase
- When the user asks to "document this project" or "create documentation"

Do NOT use this skill to update existing documentation - use `update-docs` instead.

## Execution Model

- The primary agent spawns `doc-explorer`. `doc-explorer` explores the repo and writes artifacts under `docs/`.
- Rationale: documentation is primarily anchored in the codebase (not in the conversation). Keeping exploration + writing in the same subagent session reduces context loss.
- For large codebases with multiple modules, `doc-explorer` self-delegates: it spawns additional `doc-explorer` instances scoped to individual modules (see Self-Delegation below).
- The primary agent should keep chat output minimal (paths changed + any open questions).

## Self-Delegation

For projects with 3+ modules or modules with 50+ files, doc-explorer SHOULD delegate per-module work to separate doc-explorer instances via the Task tool:

1. **Orchestrator instance**: Identifies modules, creates `docs/overview.md`, spawns per-module instances
2. **Per-module instance**: Receives scoped task ("document module X in directory Y"), explores only that module, writes `docs/modules/<name>.md`
3. **Orchestrator**: Collects status, writes cross-cutting feature docs

This prevents token bloat from accumulating the entire codebase analysis in a single context.

## Workflow

### Step 1: Assess the Project

Gather information using read/glob/grep and git history.

- Identify the project type, language, framework
- Find the entry points, main modules, key directories
- Identify major features from code, tests, or existing README
- Check if any documentation already exists (skip what exists, or ask user)

### Step 2: Identify Modules

A module is a self-contained part of the project. Criteria for module boundaries:

- Has its own directory/package structure
- Has a clear responsibility (e.g., "authentication", "API layer", "database")
- Could theoretically be replaced independently
- For single-module projects: the entire project is one module

For large codebases, self-delegate per-module analysis to separate doc-explorer instances.

### Step 3: Create the Project Overview

Create `docs/overview.md` following the template structure:

- Fill in project purpose and architecture description
- List all identified modules with brief descriptions
- List key features with brief descriptions  
- Include development setup if discoverable (package.json, Makefile, etc.)
- Link to module and feature docs (even if not yet created)

### Step 4: Create Module Documentation

For each identified module, create `docs/modules/<module-name>.md`:

- **Overview section** (always): Responsibility, dependencies, boundaries
- **Structure**: Exhaustive directory/file inventory for the module (each entry has a purpose)
- **Key Symbols**: Exhaustive symbol inventory for the module (each entry has a purpose + location)
- **Data Flow**: How data moves through this module

For large modules, self-delegate: spawn a separate doc-explorer instance scoped to that module's directory.

### Step 5: Create Feature Documentation

For each identified feature, create `docs/features/<feature-name>.md`:

- User flow: what the user experiences
- Technical flow: what happens under the hood
- Implementation references: which modules and symbols are involved
- Edge cases and limitations

Feature docs are inherently incomplete - document what is discoverable and note gaps.

### Step 6: Verify and Report

- Ensure all cross-references between documents are valid
- Present a summary of created documents
- Flag any gaps or areas that need manual enrichment

## Rules

1. **File-based interface**: All output goes into `docs/` directory files. Do not return documentation as chat messages.
2. **No redundancy**: Don't duplicate information between overview and module/feature docs. Use references.
3. **Stack-agnostic**: Do not assume any specific language or framework. Discover everything from the codebase.
4. **Inventories are explained**: File/dir and symbol listings MUST include a purpose; listings without explanation are not acceptable.
5. **No built-in explore agent**: Do NOT use the built-in `explore` subagent type. Self-delegate to `doc-explorer` instead.
6. **Self-delegate for scale**: For large codebases, spawn additional `doc-explorer` instances per module via the Task tool.
7. **Create directories**: Ensure `docs/`, `docs/modules/`, and `docs/features/` exist before writing.

## Templates

This skill includes normative templates as bundled files. Only read the templates when processing them. Output MUST follow the template headings and frontmatter keys:

- `tpl-project-overview.md` - Structure for the project overview
- `tpl-module-documentation.md` - Structure for module documentation
- `tpl-feature-documentation.md` - Structure for feature documentation
