---
name: fix-ci
description: Diagnoses and fixes CI pipeline failures. Reads CI logs, identifies root cause, applies targeted fixes, and verifies locally before pushing. Structured approach prevents the common cycle of blind fix attempts.
license: MIT
compatibility: opencode
metadata:
  category: implementation
  phase: maintenance
---

# Skill: Fix CI

## What This Skill Does

Provides a **structured debugging workflow for CI failures**. Instead of the common pattern of "read error → guess fix → push → wait → repeat", this skill enforces: analyze logs → identify root cause → reproduce locally → fix → verify locally → push once.

## When to Use

- When CI checks fail on a PR or push
- When the user says "CI is red" or "fix the pipeline"
- After `pr-ready` detects CI failures

Do NOT use this for writing new CI pipelines — use `ci-setup` for that.

## Execution Model

- **Always**: the primary agent runs this skill directly.
- **Rationale**: CI fixes require terminal access (running tests locally), file edits, and iterative debugging — all primary agent capabilities.
- **Token budget**: ~3-8k tokens depending on failure complexity.

## Workflow

### Step 1: Get CI Status

Determine which CI checks failed:

```bash
# For GitHub Actions
gh run list --limit 5
gh run view <run-id> --log-failed
```

If the user provides a run ID or URL, use that directly.

### Step 2: Categorize the Failure

CI failures fall into predictable categories:

| Category | Indicators | Typical Fix |
|----------|-----------|-------------|
| **Lint/Format** | eslint, ruff, prettier, markdownlint errors | Auto-fix or targeted code change |
| **Type Check** | tsc, mypy, pyright errors | Fix type annotations |
| **Test Failure** | pytest, jest, vitest failures | Fix test or implementation |
| **Build Failure** | compile errors, missing dependencies | Fix imports, install deps |
| **Config Error** | YAML syntax, invalid action version | Fix config file |
| **Environment** | missing secrets, wrong runner, timeout | Fix workflow config |
| **Dependency** | lockfile conflict, version mismatch | Update lockfile |

### Step 3: Extract Root Cause

Read the failed job's logs and identify:

1. **Which job failed** (name, step)
2. **The actual error message** (not just the summary)
3. **The file and line** (if applicable)
4. **Whether it's a flaky failure** (check if the same test passed on the previous run)

```bash
gh run view <run-id> --log-failed 2>&1 | tail -50
```

### Step 4: Reproduce Locally

Before fixing, verify the failure reproduces locally:

- **Lint**: run the same linter locally
- **Tests**: run the specific failing test
- **Build**: run the build command
- **Type check**: run the type checker

If it doesn't reproduce locally, the issue is environment-specific (secrets, runner version, caching).

### Step 5: Apply Fix

Apply the minimal fix for the identified root cause:

- **One fix per failure category**: don't mix lint fixes with test fixes
- **Smallest possible change**: avoid refactoring while fixing CI
- **Run the same check locally** after applying the fix

### Step 6: Verify Locally

Run the exact same commands that CI runs:

```bash
# Example for a typical project
npm run lint        # or: ruff check .
npm test            # or: pytest
npm run build       # or: python -m build
npm run typecheck   # or: mypy .
```

All must pass before pushing.

### Step 7: Push and Monitor

```bash
git add -A
git commit -m "fix: <category> — <what was wrong>"
git push
```

Then monitor the CI run:

```bash
gh run watch
```

## Rules

1. **Read logs first**: never guess at CI fixes. Always read the actual error output.
2. **Reproduce locally**: verify the failure before fixing. Pushing blind fixes wastes CI minutes and time.
3. **One category at a time**: fix lint issues separately from test failures. This makes the fix commit clear and revertable.
4. **Minimal fix**: do not refactor, optimize, or "improve" code while fixing CI. Fix only the failure.
5. **Verify before push**: run the same checks locally. Never push and hope.
6. **No built-in explore agent**: do NOT use the built-in `explore` subagent type.
