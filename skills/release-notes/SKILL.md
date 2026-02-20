---
name: release-notes
description: Generates structured release notes from git history between two references (tags, commits, branches). Groups changes by type (features, fixes, docs, breaking), extracts PR references, and produces a publish-ready document.
license: MIT
compatibility: opencode
metadata:
  category: release
  phase: publish
---

# Skill: Release Notes

## What This Skill Does

Generates **publish-ready release notes** from git log. Parses conventional commits, groups by type, extracts PR numbers, highlights breaking changes, and produces a document ready for GitHub Releases, CHANGELOG, or team communication.

## When to Use

- Before creating a GitHub Release
- When the user says "what changed since last release?"
- After merging a release branch
- When updating CHANGELOG.md for a new version

## Execution Model

- **Always**: the primary agent runs this skill directly.
- **Token budget**: ~2-4k tokens.
- **Output**: chat-based release notes + optional write to `CHANGELOG.md` or GitHub Release.

## Workflow

### Step 1: Determine Range

Identify the git range to analyze:

```bash
# Find latest tag
git describe --tags --abbrev=0

# List recent tags
git tag --sort=-version:refname | head -5
```

Range options:

- **Tag to HEAD**: `git log v1.0.0..HEAD`
- **Between tags**: `git log v1.0.0..v1.1.0`
- **Custom range**: user-specified

### Step 2: Collect Commits

```bash
git log <range> --oneline --no-merges
```

For each commit, extract:

- **Type**: from conventional commit prefix (feat, fix, docs, ci, chore)
- **Scope**: from conventional commit scope (if present)
- **Description**: the commit message
- **PR number**: from merge commit or commit body

### Step 3: Group by Category

| Category | Prefix | Description |
|----------|--------|-------------|
| Features | feat | New functionality |
| Bug Fixes | fix | Fixed issues |
| Documentation | docs | Documentation changes |
| Maintenance | chore, ci, build | Internal improvements |
| Breaking Changes | ! or BREAKING CHANGE | Require migration |

### Step 4: Detect Breaking Changes

Scan for breaking change indicators:

- `feat!:` or `fix!:` prefix
- `BREAKING CHANGE:` in commit body
- Removed exports or changed public APIs (if detectable from commits)

### Step 5: Generate Release Notes

```markdown
# <version> — YYYY-MM-DD

## Breaking Changes

- <description> (#PR)

## Features

- <description> (#PR)
- <description> (#PR)

## Bug Fixes

- <description> (#PR)

## Documentation

- <description> (#PR)

## Maintenance

- <description> (#PR)

---

**Full Changelog**: <compare-url>
```

### Step 6: Publish Options

Ask the user:

1. **GitHub Release**: `gh release create <tag> --notes-file /tmp/release-notes.md`
2. **CHANGELOG.md**: prepend to the changelog file
3. **Chat only**: just show the notes

## Rules

1. **Conventional commits are the source**: if the project doesn't use conventional commits, fall back to grouping by changed files (source vs tests vs docs).
2. **Breaking changes are prominent**: always list breaking changes first with clear migration guidance.
3. **PR references where possible**: link to PRs for traceability.
4. **Concise entries**: one line per change. Details belong in the PR, not in release notes.
5. **No built-in explore agent**: do NOT use the built-in `explore` subagent type.
