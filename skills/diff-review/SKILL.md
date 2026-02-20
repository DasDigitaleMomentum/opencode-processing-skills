---
name: diff-review
description: Structured code review of git diffs or pull requests. Analyzes changes for impact, risk, documentation staleness, and test coverage gaps. Produces a review report that can guide both human reviewers and automated follow-up actions.
license: MIT
compatibility: opencode
metadata:
  category: workflow
  phase: review
---

# Skill: Diff Review

## What This Skill Does

Performs a **structured code review** of a git diff, commit range, or pull request. Instead of unstructured "looks good" or scattered comments, this skill produces a systematic review covering impact assessment, risk identification, documentation implications, and test coverage analysis.

This makes the AI agent an effective **code review partner** that catches things humans often miss: documentation that needs updating, edge cases in error handling, and cross-module impact.

## When to Use

- When the user asks "review my changes" or "review this PR"
- Before merging a feature branch
- After a significant refactoring to validate nothing was missed
- When preparing a PR description

Do NOT use this skill for reviewing external/upstream code or for security audits (those require specialized tools).

## Execution Model

- **Always**: the primary agent runs this skill directly.
- **Rationale**: the review needs conversation context (user can explain intent, answer questions about design choices). Running in a subagent would lose this dialogue capability.
- **Output**: chat-based review report. Optionally written to `docs/reviews/` if the user requests a persistent record.

## Workflow

### Step 1: Identify the Diff Scope

Determine what to review:

- **Uncommitted changes**: `git diff` + `git diff --staged`
- **Branch diff**: `git diff main..HEAD` (or the appropriate base branch)
- **Specific commits**: `git diff <commit1>..<commit2>`
- **PR**: `git diff $(git merge-base main HEAD)..HEAD`

Use the `question` tool if the scope is ambiguous.

Get the diff stats first for an overview:

```bash
git diff <scope> --stat
```

### Step 2: Categorize Changes

Group the changed files by type:

- **Source code**: implementation changes
- **Tests**: new or modified tests
- **Configuration**: build, CI, lint, deploy configs
- **Documentation**: README, docs/, comments
- **Dependencies**: package.json, go.mod, requirements.txt

For each category, note the volume of changes (files changed, lines added/removed).

### Step 3: Analyze Impact

For source code changes, assess:

1. **Scope**: Is this a localized change or does it touch multiple modules?
2. **Public API changes**: Are any exported functions, types, or interfaces modified?
3. **Breaking changes**: Could this break existing consumers (renamed exports, changed signatures, removed functionality)?
4. **Data model changes**: Are database schemas, config formats, or serialization formats affected?
5. **Error handling**: Are new error cases handled? Are existing error paths preserved?

### Step 4: Assess Risk

Evaluate risk factors:

| Risk Factor | Check |
|-------------|-------|
| Complexity | Large diffs (>500 lines) are higher risk |
| Cross-module | Changes spanning multiple modules increase integration risk |
| Concurrency | Changes to async/parallel code need careful review |
| Security | Auth, crypto, input validation changes are high-risk |
| Data loss | Delete operations, migrations, schema changes |
| Rollback | Can this change be easily reverted? |

### Step 5: Check Documentation Impact

Cross-reference the changed files against existing documentation:

- If module source files changed → is the module doc still accurate?
- If public API changed → does the feature doc reflect this?
- If build/deploy changed → is the README still accurate?
- If new module/feature added → is there documentation for it?

This is a lightweight version of `validate-docs` scoped to only the changed files.

### Step 6: Check Test Coverage

Analyze whether the changes are adequately tested:

- New functions/methods → are there corresponding tests?
- Changed behavior → are existing tests updated?
- Error paths → are error cases tested?
- Edge cases → are boundary conditions covered?

Note: this is a heuristic check, not a coverage tool. Flag obvious gaps.

### Step 7: Present the Review

Present the review using the format below. Use the `question` tool to discuss findings with the user.

## Review Format

```markdown
## Diff Review

### Overview

| Metric | Value |
|--------|-------|
| Files Changed | N |
| Lines Added | +N |
| Lines Removed | -N |
| Modules Affected | <list> |

### Impact Assessment

**Scope**: <localized | cross-module | system-wide>
**Breaking Changes**: <none | list>
**Public API Changes**: <none | list>

### Risk Matrix

| Area | Risk | Detail |
|------|------|--------|
| <area> | Low/Medium/High | <explanation> |

### Documentation Impact

| Doc | Status | Action Needed |
|-----|--------|---------------|
| <doc> | needs update | <what changed> |
| <doc> | still accurate | – |

### Test Coverage

| Change | Test Status |
|--------|------------|
| <change> | Covered / Gap / Missing |

### Recommendations

1. <prioritized recommendation>
2. <next recommendation>
```

## Rules

1. **Review the diff, not the entire codebase**: focus on what changed and its immediate impact. Do not do a full codebase audit.
2. **Be specific**: reference file names, line numbers, and function names. Vague feedback is useless.
3. **Separate concerns**: distinguish between "must fix" issues (bugs, breaking changes) and "consider" suggestions (style, optimization).
4. **Acknowledge intent**: if the user explained why they made a change, factor that into the review. Don't flag intentional trade-offs as issues.
5. **Documentation impact is mandatory**: always check whether the diff affects existing documentation. This is the unique value-add over generic code review.
6. **No built-in explore agent**: do NOT use the built-in `explore` subagent type.
