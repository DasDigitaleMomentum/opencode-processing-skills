---
name: generate-agents-md
description: Generates a project-specific AGENTS.md that captures conventions, build commands, module rules, and coding standards. This file is read at session start by coding agents and helps keep behavior consistent.
license: MIT
compatibility: opencode
metadata:
  category: documentation
  phase: setup
---

# Skill: Generate AGENTS.md

## What This Skill Does

Creates an `AGENTS.md` file in the project root that captures the conventions an agent needs before writing code. The file is read at the start of each agent session.

A well-written `AGENTS.md` eliminates the 2-5k tokens that agents otherwise spend re-discovering project conventions (build commands, test patterns, naming rules, directory layout) at every session start.

## When to Use

- When a project has no `AGENTS.md` yet
- When `smart-start` detects a missing `AGENTS.md`
- After significant project restructuring (new modules, changed build system)
- When onboarding a project to AI-assisted development for the first time

Use this skill to create or fully regenerate `AGENTS.md`. For small targeted edits, update `AGENTS.md` manually.

## Execution Model

- **Always**: the primary agent runs this skill directly.
- **Rationale**: generating `AGENTS.md` requires analyzing project files (package.json, Makefile, CI configs, lint configs) and synthesizing conventions. The primary agent has the conversation context to ask clarifying questions via the `question` tool.
- **Output**: `AGENTS.md` file in the project root.

## Workflow

### Step 1: Detect Project Stack

Identify the project's technology stack by checking for presence of key files:

- **Node.js**: `package.json`, `tsconfig.json`, `eslint.config.*`
- **Python**: `pyproject.toml`, `setup.py`, `requirements.txt`, `ruff.toml`
- **Go**: `go.mod`, `go.sum`
- **Rust**: `Cargo.toml`
- **Java/Kotlin**: `pom.xml`, `build.gradle`
- **Multi-language**: check for monorepo indicators (`packages/`, `apps/`, `services/`)

Read the detected config files to extract:

- Project name and description
- Dependencies and their versions
- Build commands (`scripts` in package.json, targets in Makefile)
- Test commands and frameworks

### Step 2: Analyze Project Structure

Map the directory layout:

- Top-level directories and their purpose
- Module/package boundaries
- Source vs. test directory conventions
- Configuration file locations

### Step 3: Extract Conventions

From config files and existing code, extract:

- **Code style**: linter config (ESLint, Ruff, golangci-lint), formatter config (Prettier, Black)
- **Naming conventions**: file naming patterns, export patterns
- **Testing patterns**: test file naming, test framework, test directory structure
- **Git conventions**: branch naming (from CI config), commit message format (from commitlint config or CONTRIBUTING.md)
- **CI/CD**: which checks must pass, deployment targets

### Step 4: Check for Existing Documentation

Read any existing documentation that informs conventions:

- `CONTRIBUTING.md`
- `README.md` (development section)
- `.editorconfig`
- Existing `AGENTS.md` (if updating)

### Step 5: Generate AGENTS.md

Write the `AGENTS.md` file with the following structure:

```markdown
# <Project Name> - Agent Instructions

## Project Overview
<one paragraph: what the project does, its purpose>

## Tech Stack
<language, framework, key dependencies>

## Project Structure
<directory tree with purpose annotations>

## Development Commands
| Command | Purpose |
|---------|---------|
| `<cmd>` | <what it does> |

## Code Conventions
- <naming rules>
- <import order>
- <error handling patterns>

## Testing
- Framework: <name>
- Run: `<command>`
- Naming: `<pattern>`
- Coverage: <requirements>

## Module Rules
<per-module constraints, e.g. "api/ must not import from cli/">

## Do NOT
<explicit list of things the agent should avoid>
```

### Step 6: Confirm with User

Use the `question` tool to present the generated `AGENTS.md` summary and ask:

- Are there project-specific conventions not captured?
- Are there modules with special rules?
- Any explicit "do not" instructions?

Incorporate feedback before finalizing.

## Rules

1. **Analyze, don't guess**: every statement in AGENTS.md must be derived from actual project files. Do not assume conventions that aren't evidenced in config files or code patterns.
2. **Concise over complete**: AGENTS.md should be ~50-150 lines. It's read at every session start, so brevity is critical. Link to detailed docs rather than duplicating them.
3. **Actionable instructions**: every section should tell the agent what TO DO or NOT TO DO. Avoid descriptive prose that doesn't guide behavior.
4. **Commands must work**: verify build/test commands by checking they exist in package.json/Makefile. Do not invent commands.
5. **Module rules are valuable**: if the project has clear module boundaries, document them. This prevents agents from creating unwanted cross-module dependencies.
6. **No built-in explore agent**: do NOT use the built-in `explore` subagent type.
