---
name: analyze-impact
description: Pre-implementation impact analysis for a plan phase. Analyzes dependencies, test coverage, breaking change risk, and affected modules before coding begins. Produces an impact report that prevents surprises during implementation.
license: MIT
compatibility: opencode
metadata:
  category: planning
  phase: pre-implementation
---

# Skill: Analyze Impact

## What This Skill Does

Answers the question: **"What will break if I implement this phase?"** — before writing any code.

Performs a structured impact analysis by cross-referencing a phase's implementation plan against the current codebase. Identifies:

- **Affected modules** and their dependencies
- **Test coverage** of the areas to be changed
- **Breaking change risk** (public API modifications, data model changes)
- **Missing prerequisites** (dependencies not yet installed, config not yet set up)
- **Cross-module ripple effects** (changes that cascade through imports/references)

## When to Use

- Before starting implementation of a plan phase
- As an extension of `resume-plan` — run analyze-impact after the briefing, before coding
- When a phase feels risky and you want a structured pre-check
- When the implementation plan references modules you haven't read yet

Do NOT use this for general codebase exploration — use `generate-docs` for that.

## Execution Model

- **Always**: the primary agent runs this skill directly.
- **Rationale**: impact analysis feeds directly into implementation decisions. The primary agent needs this context to guide coding. Delegating would build context in the wrong place.
- **Output**: `plans/<name>/implementation/phase-N-impact.md` (persistent, referenced by the implementation plan).

## Workflow

### Step 1: Identify the Phase

Determine which plan and phase to analyze:

1. Check `plans/` for active plans
2. Read the active plan's `todo.md` to find the current phase
3. Read the phase document (`phases/phase-N.md`) for scope and deliverables
4. Read the implementation plan (`implementation/phase-N-impl.md`) for technical approach

If no active plan exists, use the `question` tool to ask what the user is planning to implement.

### Step 2: Map Affected Files

From the implementation plan's "Affected Modules" and "Implementation Steps" sections, identify which files will be changed:

1. List the modules mentioned in the implementation plan
2. For each module, read the module documentation's Structure section (if docs exist) to get the file inventory
3. If no docs exist, use `find` or `ls` to map the module's file structure

Produce a list of files likely to be modified, created, or deleted.

### Step 3: Analyze Dependencies

For each affected file, check what depends on it:

```bash
# Find files that import/reference the affected module
grep -r "import.*from.*<module>" --include="*.ts" --include="*.py" -l
grep -r "require.*<module>" --include="*.js" -l
```

Build a dependency graph scoped to the affected files:

- **Upstream dependencies**: what the affected files import (will they still work?)
- **Downstream dependents**: what imports the affected files (will THEY still work?)

### Step 4: Assess Breaking Change Risk

For each affected file, check if the planned changes touch public interfaces:

- **Exported functions/classes**: signature changes, renamed exports, removed exports
- **API endpoints**: changed routes, modified request/response schemas
- **Data models**: schema changes, migration requirements
- **Configuration**: changed config keys, new required config values

Rate the risk: 🟢 (internal only) / 🟡 (public API, backward compatible) / 🔴 (breaking change)

### Step 5: Check Test Coverage

Assess whether the areas to be changed have existing test coverage:

```bash
# Find tests related to affected modules
find . -path "*/test*" -name "*<module>*" -o -path "*/spec*" -name "*<module>*"
```

For each affected area:

- Are there existing tests? (covered / uncovered)
- Will the planned changes break existing tests? (likely / unlikely)
- Are new tests needed? (yes / no, with rationale)

### Step 6: Check Prerequisites

Verify that the implementation plan's prerequisites are met:

- **Dependencies**: are required packages installed?
- **Configuration**: are required config values set?
- **Infrastructure**: are required services available?
- **Prior phases**: are previous phases actually completed?

Cross-reference against `todo.md` completed items.

### Step 7: Generate Impact Report

Write the impact report to `plans/<name>/implementation/phase-N-impact.md`:

```markdown
# Phase N Impact Analysis

## Summary

| Metric | Value |
|--------|-------|
| Affected Modules | N |
| Files to Modify | N |
| Files to Create | N |
| Downstream Dependents | N |
| Breaking Change Risk | 🟢/🟡/🔴 |
| Test Coverage | N% estimated |

## Affected Modules

| Module | Changes | Risk | Dependents |
|--------|---------|------|------------|
| <name> | <summary> | 🟢/🟡/🔴 | N files |

## Dependency Analysis

### Upstream (what we import)
<list of dependencies that must remain stable>

### Downstream (what imports us)
<list of files/modules that will be affected by our changes>

## Breaking Change Assessment

| Change | Type | Risk | Mitigation |
|--------|------|------|------------|
| <change> | API/Schema/Config | 🟢/🟡/🔴 | <how to mitigate> |

## Test Impact

| Area | Current Coverage | Action Needed |
|------|-----------------|---------------|
| <area> | ✅/⚠️/❌ | <action> |

## Prerequisites Check

| Prerequisite | Status |
|--------------|--------|
| <item> | ✅ met / ❌ missing |

## Recommendations

1. <prioritized recommendation for safe implementation>
2. <next recommendation>
```

### Step 8: Present and Discuss

Present the key findings to the user. Highlight:

- Any 🔴 breaking changes that need careful handling
- Missing prerequisites that must be resolved first
- Modules with no test coverage that should be tested before changing

## Rules

1. **Analysis, not implementation**: this skill analyzes and reports. It does NOT make any code changes.
2. **Scope to the phase**: only analyze the impact of the specific phase being assessed. Do not analyze the entire plan.
3. **Concrete evidence**: every risk assessment must reference specific files, functions, or dependencies. No vague "this might be risky" statements.
4. **Dependency analysis is the core value**: the most important output is knowing what else breaks when you change the target files.
5. **Persist the report**: unlike `validate-docs` (ephemeral), the impact report is written to a file because it remains relevant throughout the phase's implementation.
6. **Don't over-read**: use `grep` for dependency tracing, not full file reads. Read only the import/export sections of files, not entire implementations.
7. **No built-in explore agent**: do NOT use the built-in `explore` subagent type.
