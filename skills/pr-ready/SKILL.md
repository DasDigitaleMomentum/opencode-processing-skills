---
name: pr-ready
description: Prepares a feature branch for pull request. Runs all checks, generates PR description, verifies documentation is updated, creates changelog entry, and suggests labels. One command to go from "code done" to "PR ready for review."
license: MIT
compatibility: opencode
metadata:
  category: workflow
  phase: review-prep
---

# Skill: PR Ready

## What This Skill Does

Automates the **"last mile"** before opening a PR. After coding is done, there are always the same repetitive steps: run checks, write PR description, update changelog, verify docs. This skill handles all of them in one pass.

## When to Use

- When the user says "ready for PR", "open a PR", or "prepare for review"
- After completing an `implement-phase` cycle
- Before running `diff-review`

Do NOT use this for the actual code review — use `diff-review` for that.

## Execution Model

- **Always**: the primary agent runs this skill directly.
- **Rationale**: PR preparation requires terminal access (git, CI), file editing (changelog), and user interaction (confirm PR title).
- **Output**: a PR opened (or ready to open) on GitHub.

## Workflow

### Step 1: Verify Branch State

```bash
# Ensure we're on a feature branch, not main
git branch --show-current

# Check for uncommitted changes
git status

# Check for unpushed commits
git log origin/$(git branch --show-current)..HEAD --oneline 2>/dev/null
```

If there are uncommitted changes, ask the user whether to commit them first.

### Step 2: Run All Checks

Run the project's CI checks locally:

1. Read `AGENTS.md` or `Makefile` for the check commands
2. Run them in order (lint → typecheck → test → build)
3. If any fail, ask the user whether to run `fix-ci` first or continue

### Step 3: Analyze the Diff

Get the diff against the target branch:

```bash
git diff main..HEAD --stat
git diff main..HEAD --shortstat
```

Categorize the changes (source, tests, docs, config, deps).

### Step 4: Check Documentation Impact

Run `validate-docs` patterns (lightweight, git-based):

- If source files changed → check if corresponding docs exist and are recent
- If public API changed → flag for doc update
- If new module/feature added → flag missing docs

Report findings but don't block — include in PR description as "Documentation Impact" section.

### Step 5: Update Changelog

If a `CHANGELOG.md` exists:

1. Read the `[Unreleased]` section
2. Add entry for this PR under the appropriate category (Added/Changed/Fixed/Removed)
3. Use the commit messages as source material

### Step 6: Generate PR Description

Build the PR description from:

- **Summary**: one paragraph from commit messages
- **Type of Change**: checkboxes (feature, fix, docs, etc.)
- **Changes**: bullet list of key changes
- **Documentation Impact**: from Step 4
- **Testing**: what tests were added/modified
- **Checklist**: CI status, docs updated, changelog updated

Use the project's PR template (`.github/pull_request_template.md`) if it exists.

### Step 7: Suggest Labels

Based on the diff analysis, suggest GitHub labels:

- File paths → category labels (e.g., `skills/` → `skill`, `agents/` → `agent`)
- Commit prefixes → type labels (`feat:` → `feature`, `fix:` → `bug`)
- Size → size labels (S/M/L based on lines changed)

### Step 8: Open or Preview PR

Ask the user:

- Confirm PR title
- Confirm target branch (default: `main`)
- Preview or directly open?

```bash
gh pr create --title "<title>" --body-file /tmp/pr-body.md --label "<labels>"
```

## Rules

1. **Never push to main**: this skill operates on feature branches only.
2. **Checks before PR**: always run local checks. Don't create a PR that will immediately fail CI.
3. **Use existing templates**: if the project has a PR template, use it. Don't override.
4. **Changelog is optional**: only update if the project has a CHANGELOG.md. Don't create one.
5. **Ask before opening**: always confirm with the user before creating the PR. They may want to review the description first.
6. **No built-in explore agent**: do NOT use the built-in `explore` subagent type.
