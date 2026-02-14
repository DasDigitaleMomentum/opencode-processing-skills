---
name: update-docs
description: Update existing project documentation after code changes. Detects outdated sections, updates module and feature docs, and ensures cross-references remain valid. Use this skill after implementing features, refactoring, or when documentation is known to be stale.
license: MIT
compatibility: opencode
metadata:
  category: documentation
  phase: maintenance
---

# Skill: Update Documentation

## What This Skill Does

Updates existing project documentation to reflect code changes. Handles:

- Detecting which documentation is affected by recent changes
- Updating module documentation (symbols, structure, data flow)
- Updating feature documentation (new behavior, changed flows)
- Updating the project overview (new modules, changed architecture)
- Ensuring cross-references remain valid

## When to Use

- After implementing a feature or fixing a bug that changes behavior
- After refactoring that affects module structure or symbols
- When the user says documentation is "outdated" or asks to "update docs"
- After a plan phase is completed and code has changed

Do NOT use this skill to create documentation from scratch - use `generate-docs` instead.

## Workflow

### Step 1: Identify What Changed

Determine the scope of changes using one or more methods:

**If changes are recent (current session):**
- Review the files modified in the current session
- Check git diff for uncommitted changes

**If changes are from git history:**
- Use `git log --oneline -N` to see recent commits
- Use `git diff <commit>..HEAD --stat` to see affected files
- Delegate detailed analysis to a Task tool `explore` subagent

**If the user specifies what changed:**
- Focus on the modules/features the user mentions

### Step 2: Map Changes to Documentation

For each changed file, determine:

1. Which **module** does it belong to? → Update `docs/modules/<module>.md`
2. Which **features** does it affect? → Update `docs/features/<feature>.md`
3. Does it change the project structure? → Update `docs/overview.md`

Use the Task tool to analyze large change sets.

### Step 3: Read Existing Documentation

Read the affected documentation files. Compare against the current code state:

- Are symbols still accurately described?
- Has the module structure changed (new files, moved files)?
- Have dependencies changed?
- Are data flows still correct?
- Are feature behaviors still accurately described?

### Step 4: Apply Updates

Update each affected document:

**Module Documentation:**
- Update Key Symbols if exports changed
- Update Structure if files were added/removed/moved
- Update Dependencies if new dependencies were introduced
- Update Data Flow if processing logic changed
- Add/remove Detail Sections as complexity warrants

**Feature Documentation:**
- Update User Flow if user-facing behavior changed
- Update Technical Flow if implementation approach changed
- Update Implementation table with new/changed symbols
- Update Edge Cases if new limitations discovered

**Project Overview:**
- Update Modules table if modules were added/removed
- Update Features table if features were added/removed
- Update Architecture if high-level structure changed
- Update Tech Stack if new technologies introduced

### Step 5: Validate Cross-References

- Check that all module links in the overview point to existing files
- Check that feature docs reference the correct module docs
- If implementation plans exist, verify they still reference current module documentation
- Remove references to deleted modules/features

### Step 6: Report Changes

Present a summary to the user:
- Which documents were updated
- What sections changed
- Any gaps found (new code that has no documentation)

Use the `question` tool to ask if the updates are complete or if areas were missed.

## Rules

1. **Never overwrite without reading first**: Always read existing documentation before modifying.
2. **Preserve manual additions**: If a section was manually enriched beyond what auto-generation would produce, preserve those additions.
3. **Incremental updates**: Only update what changed. Don't regenerate entire documents.
4. **Track the update**: Update the frontmatter `version` or add a note if the template supports it.
5. **Use subagents for large diffs**: Delegate analysis of large change sets to `explore` subagents via the Task tool.
6. **Ask when unsure**: Use the `question` tool when the impact of a change on documentation is unclear.
7. **Flag gaps**: If new code lacks documentation, notify the user rather than silently ignoring it.
8. **File-based interface**: All updates are written to files in the `docs/` directory. Do not return updated content as chat messages.

## Templates

This skill includes reference templates as bundled files. Use them to understand the expected document structure when applying updates:

- `tpl-project-overview.md` - Expected structure for project overview
- `tpl-module-documentation.md` - Expected structure for module documentation (two-tier)
- `tpl-feature-documentation.md` - Expected structure for feature documentation
