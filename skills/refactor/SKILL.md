---
name: refactor
description: Structured refactoring workflow that ensures safety. Verifies tests pass before AND after refactoring, applies minimal diffs, checks for regressions, and updates documentation. Prevents the common problem of refactors that silently break things.
license: MIT
compatibility: opencode
metadata:
  category: implementation
  phase: maintenance
---

# Skill: Refactor

## What This Skill Does

Enforces **safe refactoring discipline**: tests green before → refactor with minimal diffs → tests green after → update docs. Prevents the common problem where refactoring introduces subtle regressions because tests weren't run at each step.

## When to Use

- When the user wants to restructure, rename, or reorganize code
- When `diff-review` recommends refactoring
- When tech debt needs to be addressed
- When extract/inline/rename operations span multiple files

Do NOT use this for new features — use `implement-phase` or `scaffold` for that.

## Execution Model

- **Always**: the primary agent runs this skill directly.
- **Rationale**: refactoring requires file edits, test runs, and iterative verification.
- **Token budget**: varies by scope. Simple renames: ~3k. Module extraction: ~10-15k.

## Workflow

### Step 1: Define Refactoring Scope

Use the `question` tool to clarify:

1. What to refactor? (specific function, module, pattern)
2. What's the goal? (readability, performance, modularity)
3. What's the constraint? (behavior must not change)

### Step 2: Pre-Refactor Baseline

**Run all relevant tests first:**

```bash
npm test        # or: pytest, go test, etc.
```

Record the test results. If tests are already failing, STOP — fix tests first before refactoring.

### Step 3: Identify Dependencies

Before changing anything, map what depends on the target:

```bash
# Find all files that import/reference the target
grep -r "import.*<target>" --include="*.ts" -l
grep -r "from.*<target>" --include="*.py" -l
```

This is the blast radius of the refactoring.

### Step 4: Apply Changes Incrementally

Refactor in small, verifiable steps:

1. **Step A**: make one atomic change (e.g., rename function)
2. **Run tests**: verify nothing broke
3. **Step B**: make the next atomic change
4. **Run tests**: verify again
5. **Repeat** until refactoring is complete

**Never make multiple unrelated changes before running tests.**

### Step 5: Post-Refactor Verification

After all changes:

1. Run the full test suite
2. Compare test results with Step 2 baseline — same tests should pass
3. Check for new warnings or deprecations
4. Run the linter/type checker

### Step 6: Update Documentation

If the refactoring changed:

- Module structure → update module docs
- Public API → update feature docs
- File locations → update AGENTS.md module rules
- Architecture → consider creating an ADR (`adr-create`)

### Step 7: Create Minimal Diff

Review the total changes:

```bash
git diff --stat
```

Ensure:

- No unrelated changes snuck in
- No formatting-only changes mixed with logic changes
- Commit message clearly describes the refactoring

## Rules

1. **Tests must pass before AND after**: never start refactoring with failing tests. Never leave with failing tests.
2. **Behavior preservation**: refactoring changes structure, not behavior. If behavior needs to change, that's a feature, not a refactor.
3. **Incremental changes**: make one change at a time, test, repeat. Never refactor multiple things in one big bang.
4. **Minimal diffs**: the diff should show only the refactoring. No formatting changes, no "while I'm here" improvements.
5. **Document the why**: if the refactoring isn't obvious, explain the motivation in the commit message or an ADR.
6. **No built-in explore agent**: do NOT use the built-in `explore` subagent type.
