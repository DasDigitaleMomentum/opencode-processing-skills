---
name: onboard-developer
description: Generates an onboarding guide for new team members. Covers development setup, workflow conventions, key modules, common tasks, and troubleshooting. Different from generate-docs (which documents what exists) — this documents how to work here.
license: MIT
compatibility: opencode
metadata:
  category: documentation
  phase: onboarding
---

# Skill: Onboard Developer

## What This Skill Does

Generates a **"How to work here" guide** for new team members. While `generate-docs` documents the codebase architecture, this skill documents the **developer experience**: setup steps, daily workflows, conventions, common tasks, and troubleshooting.

## When to Use

- When onboarding new developers to the project
- When the user says "how do I get started with this project?"
- After `generate-docs` has been run (this builds on top of it)

## Execution Model

- **Phase 1**: primary agent analyzes the project's setup, scripts, and conventions.
- **Phase 2**: spawn `doc-explorer` to write the onboarding guide to `docs/onboarding.md`.

## Workflow

### Step 1: Analyze Development Setup

Check for setup requirements:

```bash
# Language/runtime
node --version 2>/dev/null; python3 --version 2>/dev/null; go version 2>/dev/null
# Package manager
ls package-lock.json yarn.lock pnpm-lock.yaml 2>/dev/null
ls pyproject.toml requirements.txt 2>/dev/null
# Dev tools
cat Makefile 2>/dev/null | head -20
cat .tool-versions 2>/dev/null
cat .node-version 2>/dev/null
```

### Step 2: Identify Common Tasks

Extract from `package.json` scripts, `Makefile`, or CI:

- How to run the project locally
- How to run tests
- How to lint/format
- How to build
- How to deploy (if applicable)

### Step 3: Extract Conventions

From `AGENTS.md`, `.editorconfig`, linter configs, git hooks:

- Branch naming convention
- Commit message format
- Code style requirements
- PR process

### Step 4: Map Key Modules

From `generate-docs` output or direct analysis:

- Entry points (where does execution start?)
- Core modules (what should a new dev understand first?)
- Configuration (where are settings managed?)
- Tests (how to run, where they live)

### Step 5: Generate Onboarding Guide

Write to `docs/onboarding.md`:

```markdown
# Developer Onboarding

## Prerequisites
- <language> version <X>
- <package manager>

## Quick Start
1. Clone: `git clone <url>`
2. Install: `<install command>`
3. Run: `<dev command>`
4. Test: `<test command>`

## Project Structure
<brief module guide — what to look at first>

## Daily Workflow
1. Create branch: `git checkout -b feat/<name>`
2. Make changes
3. Run checks: `<check commands>`
4. Commit: conventional commits
5. Push and create PR

## Common Tasks
### Adding a new <feature/module/endpoint>
### Running specific tests
### Debugging locally

## Conventions
- <branch naming>
- <commit format>
- <code style>

## Troubleshooting
### <common issue 1>
### <common issue 2>

## Useful Links
- <CI dashboard>
- <documentation>
```

## Rules

1. **Actionable, not descriptive**: every section should tell the reader what to DO, not just what exists.
2. **Copy-pasteable commands**: all commands should be copy-paste ready, no placeholders.
3. **Quick Start is king**: a new dev should be able to go from zero to running in < 5 minutes.
4. **Common issues**: include gotchas and troubleshooting for known issues.
5. **No built-in explore agent**: do NOT use the built-in `explore` subagent type.
