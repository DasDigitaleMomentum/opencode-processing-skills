---
name: validate-docs
description: Check whether existing project documentation is still in sync with the codebase. Uses git metadata (not source file reads) to detect staleness cheaply. Produces a targeted staleness report that enables focused update-docs runs. Use this skill before update-docs to avoid expensive full-scan updates, or at session start to assess documentation health.
license: MIT
compatibility: opencode
metadata:
  category: documentation
  phase: maintenance
---

# Skill: Validate Documentation

## What This Skill Does

Answers the question: **"Are my docs still accurate?"** — without reading a single source file.

Uses git metadata (timestamps, diff stats, file lists) to detect which documentation is stale and which is current. Produces a structured staleness report that tells `update-docs` exactly which modules to target.

This is the **CHECK** path between `generate-docs` (create) and `update-docs` (update). Without it, `update-docs` must perform an expensive full-scan of all docs and all source files to determine what changed.

## When to Use

- Before running `update-docs` — to scope the update to only stale modules
- At the start of a session — to understand documentation health before working
- When the user asks "are my docs up to date?" or "what's stale?"
- As part of `smart-start` — automatically invoked during session bootstrap
- After a series of commits — to check if documentation needs attention

Do NOT use this skill to actually update documentation — use `update-docs` with the staleness report as input.

## Execution Model

- **Always**: the primary agent runs this skill directly.
- **Rationale**: validate-docs is cheap (git commands + frontmatter reads, ~2-3k tokens total). Running it in a subagent would add delegation overhead that exceeds the skill's own cost.
- **No subagent needed**: this skill never reads source files and never writes to `docs/`.
- **Output**: chat-based report (not written to a file). The report is ephemeral — it reflects a point-in-time assessment.

## Why This Skill Exists

Without `validate-docs`, there are only two options:

1. **Run `update-docs` speculatively** — reads ALL docs + ALL source files to find what changed. Cost: 20-50k tokens for a medium project. Often 80% wasted because only 2 of 8 modules were stale.
2. **Skip updates** — docs drift out of sync. Future sessions work with incorrect context, leading to wrong implementation decisions.

`validate-docs` provides the missing middle ground: a ~2-3k token check that produces a targeted action list.

## Workflow

### Step 1: Discover Doc Inventory

List all documentation files under `docs/`:

1. List `docs/modules/` for module documentation files
2. List `docs/features/` for feature documentation files
3. Check for `docs/overview.md`

If `docs/` does not exist or is empty, report "No documentation found" and suggest `generate-docs`. Stop here.

### Step 2: Determine Doc Timestamps

For each documentation file, get its last modification date from git:

```bash
git log -1 --format=%aI -- docs/modules/<name>.md
```

This gives the ISO timestamp of the last commit that touched the doc file. This is more reliable than frontmatter `version` fields, which may not be updated consistently.

If a doc file has never been committed (new, untracked), treat it as "just created" (current timestamp).

### Step 3: Extract Source Mappings

For each module documentation file, read **only the `## Structure` section** (not the entire file). Extract the source paths listed in the Structure table.

```markdown
## Structure

| Path               | Type | Purpose        |
|--------------------|------|----------------|
| src/auth/          | dir  | Auth module    |
| src/auth/handler.ts| file | HTTP handlers  |
```

From this, derive the module's source scope: `src/auth/` in this example.

**Token optimization**: read only the lines between `## Structure` and the next `##` heading. Do not read the entire module doc. This typically costs ~50-100 tokens per module instead of ~300-600 for the full file.

If the Structure section is missing or unparseable, fall back to checking the module name against common directory patterns (`src/<module>/`, `lib/<module>/`, `packages/<module>/`, `<module>/`).

### Step 4: Check Source Changes

For each module's source scope, query git for changes since the doc was last updated:

```bash
git log --since="<doc_timestamp>" --oneline --stat -- <source_path>
```

Parse the output to determine:

- **Number of commits** since doc update
- **Files changed** with insertion/deletion counts
- **Authors** involved (optional, for context)

If the output is empty → module docs are **current**.
If the output has commits → module docs are **stale**. Capture the commit subjects and changed files for the report.

**This is the core optimization**: we never read source files. Git already knows what changed.

### Step 5: Check Overview Staleness

Check if the project overview needs updating:

1. **New modules**: Compare the module list in `docs/overview.md` (from the `## Modules` table) against actual directories in the project. Any directory that looks like a module but isn't documented → overview is stale.

2. **Removed modules**: Any module referenced in the overview that no longer exists in the filesystem → overview is stale.

3. **Structural changes**: Check for significant project-level changes since the overview was last updated:

   ```bash
   git log --since="<overview_timestamp>" --oneline -- package.json pyproject.toml go.mod Cargo.toml pom.xml Makefile docker-compose*.yml
   ```

### Step 6: Assess Feature Doc Staleness

Feature docs reference modules. Use the module staleness results from Step 4 to infer feature staleness:

1. Read only the `## Implementation` section of each feature doc (the table that maps modules to symbols).
2. If any referenced module is stale → mark the feature as **"check recommended"** (not definitively stale, since the module change may not affect the feature).

This avoids any source file reads for feature validation.

### Step 7: Present the Report

Present the staleness report in chat using the format defined below. Do NOT write the report to a file — it is ephemeral session context.

If `smart-start` invoked this skill, return the report data for integration into the smart-start assessment.

## Report Format

The report follows this structure:

```markdown
## Documentation Validation Report

Generated: <timestamp>

### Summary

| Status | Count |
|--------|-------|
| ✅ Current | N |
| ⚠️ Stale   | N |
| ❌ Missing  | N |

### Module Documentation

| Module | Status | Commits Since Update | Key Changes |
|--------|--------|----------------------|-------------|
| <name> | ✅ current | – | – |
| <name> | ⚠️ stale | N commits, M files | `file1` (X+/Y-), `file2` (X+/Y-) |
| <name> | ❌ missing | new module | `<path>` (N files) |

### Feature Documentation

| Feature | Status | Reason |
|---------|--------|--------|
| <name> | ✅ current | all referenced modules current |
| <name> | ⚠️ check | depends on stale module: <module> |

### Overview

| Check | Status | Detail |
|-------|--------|--------|
| Module list | ✅/⚠️ | <detail> |
| Tech stack | ✅/⚠️ | <detail> |

### Recommended Actions

1. <prioritized action, e.g. "Run update-docs targeting modules: auth, notifications">
2. <next action>
```

## Integration with Other Skills

| Skill | Relationship |
|-------|-------------|
| `update-docs` | validate-docs BEFORE update-docs. Pass the staleness report as input so update-docs targets only stale modules. |
| `generate-docs` | If validate-docs finds no `docs/` directory, suggest generate-docs instead. |
| `smart-start` | smart-start invokes validate-docs as part of its session assessment. |
| `resume-plan` | validate-docs can run alongside resume-plan to add documentation health to the session briefing. |

## Rules

1. **Never read source files**: This skill uses git metadata only. If you find yourself reading `.ts`, `.py`, `.go` or similar source files, you are doing it wrong. The entire point is to avoid source file reads.
2. **Minimal doc reads**: Read only frontmatter and specific sections (Structure, Implementation tables). Never read full documentation files.
3. **Git is the source of truth**: Use `git log`, `git diff --stat`, and `git ls-files` for change detection. Do not rely on filesystem timestamps or frontmatter version fields.
4. **Report is ephemeral**: Do NOT write the report to a file. It is presented in chat and used by the primary agent to decide next actions.
5. **No false positives over false negatives**: It is better to flag a module as "stale" when it might be current (a commit touched the source path but didn't change documented behavior) than to miss a genuinely stale module.
6. **Suggest, don't execute**: This skill produces a report and recommendations. It does NOT update any documentation files. That is `update-docs`'s job.
7. **Fast execution**: The entire skill should complete in under 10 tool calls. If you're making more calls than that, you're over-engineering the check.
8. **No built-in explore agent**: Do NOT use the built-in `explore` subagent type.
