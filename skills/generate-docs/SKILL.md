---
name: generate-docs
description: Generate project documentation from an existing codebase. Creates a project overview, module documentation, and feature documentation following a standardized two-tier structure. Use this skill when onboarding a new project or creating initial documentation for an undocumented codebase.
license: MIT
compatibility: opencode
metadata:
  category: documentation
  phase: initial
---

# Skill: Generate Documentation

## What This Skill Does

Creates structured project documentation from an existing codebase. Produces three artifact types:

1. **Project Overview** (`docs/overview.md`) - High-level architecture, module listing, feature listing
2. **Module Documentation** (`docs/modules/<name>.md`) - Two-tier: curated overview + optional detail sections
3. **Feature Documentation** (`docs/features/<name>.md`) - How features work, with implementation references

## When to Use

- When a project has no structured documentation yet
- When onboarding to an unfamiliar codebase
- When the user asks to "document this project" or "create documentation"

Do NOT use this skill to update existing documentation - use `update-docs` instead.

## Workflow

### Step 1: Assess the Project

Use the Task tool with an `explore` subagent to gather information:

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

Use the Task tool for large codebases - delegate symbol analysis to subagents.

### Step 3: Create the Project Overview

Create `docs/overview.md` following the template structure:

- Fill in project purpose and architecture description
- List all identified modules with brief descriptions
- List key features with brief descriptions  
- Include development setup if discoverable (package.json, Makefile, etc.)
- Link to module and feature docs (even if not yet created)

### Step 4: Create Module Documentation

For each identified module, create `docs/modules/<module-name>.md`:

- **Overview section** (always): Responsibility, dependencies, structure
- **Key Symbols**: Document the most important exported symbols (functions, classes, types). Focus on what matters - not an exhaustive listing
- **Data Flow**: How data moves through this module
- For large modules: use the two-tier approach. Keep the overview concise, add Detail Sections only for complex subsystems

Use the Task tool to analyze large modules - delegate file reading and symbol extraction to `explore` subagents.

### Step 5: Create Feature Documentation

For each identified feature, create `docs/features/<feature-name>.md`:

- User flow: what the user experiences
- Technical flow: what happens under the hood
- Implementation references: which modules and symbols are involved
- Edge cases and limitations

Feature docs are inherently incomplete - document what is discoverable and note gaps.

### Step 6: Verify and Report

- Ensure all cross-references between documents are valid
- Present a summary of created documents to the user
- Use the `question` tool to ask if any modules or features were missed

## Rules

1. **File-based interface**: All output goes into `docs/` directory files. Do not return documentation as chat messages.
2. **Two-tier documentation**: Module docs must have a concise overview. Detail sections are optional and should only be added for complex subsystems.
3. **No redundancy**: Don't duplicate information between overview and module/feature docs. Use references.
4. **Stack-agnostic**: Do not assume any specific language or framework. Discover everything from the codebase.
5. **Curated, not exhaustive**: Document what matters. A symbol listing without explanation is useless.
6. **Use subagents for exploration**: Delegate large codebase analysis to Task tool with `explore` subagents. The primary agent should focus on writing and structuring.
7. **Ask, don't assume**: Use the `question` tool when uncertain about module boundaries, feature grouping, or scope.
8. **Create directories**: Ensure `docs/`, `docs/modules/`, and `docs/features/` exist before writing.

## Templates

This skill includes reference templates as bundled files. Use them as structural guides - adapt content to the actual project:

- `tpl-project-overview.md` - Structure for the project overview
- `tpl-module-documentation.md` - Structure for module documentation (two-tier)
- `tpl-feature-documentation.md` - Structure for feature documentation
