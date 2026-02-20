---
name: retrospective
description: Reconstructs project documentation from git history. Analyzes commit logs, diffs, and merge patterns to generate Architecture Decision Records (ADRs), module chronologies, and contributor maps. Use this for existing projects that have no structured documentation but a rich git history.
license: MIT
compatibility: opencode
metadata:
  category: documentation
  phase: onboarding
---

# Skill: Retrospective

## What This Skill Does

Reconstructs **"why" documentation** from git history that `generate-docs` cannot produce. While `generate-docs` analyzes the current codebase (what exists now), `retrospective` analyzes the project's evolution (how it got here and why).

Produces:

- **Architecture Decision Records (ADRs)**: significant technical decisions detected from large refactors, dependency changes, or structural reorganizations
- **Module Chronology**: when each module was introduced, major changes, and growth patterns
- **Pattern Evolution**: how coding patterns changed over time (e.g., callback → promise → async/await migration)
- **Contributor Map**: who owns which areas of the codebase (based on commit concentration)

## When to Use

- When onboarding to an existing project with no documentation
- When the team asks "why was this built this way?"
- When preparing architecture documentation for a project with years of history
- After `generate-docs` has created the "what" docs, to add the "why" context

Do NOT use this for projects with fewer than ~50 commits — there isn't enough history to analyze meaningfully.

## Execution Model

- **Phase 1**: the primary agent gathers git metadata (lightweight, git commands only).
- **Phase 2**: the primary spawns `doc-explorer` to write the retrospective documents based on the gathered metadata.
- **Rationale**: Phase 1 is cheap (git log parsing). Phase 2 requires writing multiple documents, which is doc-explorer's domain.

## Workflow

### Step 1: Assess Git History Scope

Get a high-level picture of the project's history:

```bash
# Total commits and date range
git log --oneline | wc -l
git log --reverse --format="%ai" | head -1
git log --format="%ai" | head -1

# Contributors
git shortlog -sn --no-merges | head -10

# Most changed files (hotspots)
git log --format=format: --name-only | sort | uniq -c | sort -rn | head -20
```

If the project has fewer than 50 commits, inform the user and suggest `generate-docs` instead.

### Step 2: Detect Significant Events

Scan the git history for events that indicate architectural decisions:

1. **Large commits** (>20 files changed): likely refactors or structural changes

   ```bash
   git log --oneline --shortstat | awk '/files? changed/ {if ($1 > 20) print prev" "$0} {prev=$0}'
   ```

2. **Dependency changes**: additions/removals of major dependencies

   ```bash
   git log --oneline --all -- package.json pyproject.toml go.mod Cargo.toml
   ```

3. **New directories**: creation of new top-level or module directories

   ```bash
   git log --diff-filter=A --oneline --name-only -- '*/README.md' '*/index.*' '*/mod.*' '*/main.*'
   ```

4. **Renames/moves**: structural reorganization

   ```bash
   git log --diff-filter=R --summary --oneline | head -30
   ```

5. **Merge patterns**: feature branches, release branches

   ```bash
   git log --merges --oneline | head -20
   ```

### Step 3: Analyze Key Events

For each significant event detected in Step 2, gather context:

- Read the commit message (often contains rationale)
- Check the diff stats (which files/directories were affected)
- Look for related commits in the surrounding timeframe
- Check for PR/merge commit messages that may contain discussion summaries

**Do NOT read full diffs** — this would be extremely expensive. Use `--stat` and commit messages only.

### Step 4: Build Module Timeline

For each module (directory) in the project, construct a timeline:

```bash
# When was it created?
git log --reverse --oneline --diff-filter=A -- <module_path>/ | head -1

# Major milestones (commits with >5 files changed in this module)
git log --oneline --shortstat -- <module_path>/ | head -20
```

### Step 5: Detect Pattern Evolution

Look for patterns that changed over time:

- File extension changes (`.js` → `.ts`: TypeScript migration)
- Directory structure changes (flat → nested: modularization)
- Config file additions (ESLint, TypeScript, Docker: tooling adoption)
- Test framework changes

### Step 6: Generate Retrospective Documents

Delegate to `doc-explorer` with the gathered metadata. The subagent writes:

1. **`docs/retrospective.md`** — overview of the project's evolution with timeline
2. **`docs/adrs/`** — individual ADR files for each detected significant decision. You MUST use the exact same heading structure and order as `adr-create`:

```markdown
# ADR-NNN: <Title>

## Status

Accepted | Proposed | Superseded by ADR-NNN

## Date

<YYYY-MM-DD, inferred from commit date>

## Context
<what was happening in the project at the time, detected from git>

## Decision
<what was changed and why (inferred from commit messages and diff patterns)>

## Alternatives Considered

### Alternative A: <name>
- **Pros**: ...
- **Cons**: ...
- **Why rejected**: ...

### Alternative B: <name>
- **Pros**: ...
- **Cons**: ...
- **Why rejected**: ...

## Consequences

### Positive
- <expected benefit based on observed outcomes>

### Negative
- <expected downside or trade-off>

### Risks
- <what could go wrong>

## References

- Commit: <hash> — <message>
- Files affected: <count>
```

### Step 7: Present Summary

Present a summary of findings to the user and ask:

- Are the inferred decisions accurate?
- Should any be merged, split, or removed?
- Is there additional context the user can provide for ambiguous events?

## Rules

1. **Git metadata only**: use `git log`, `git shortlog`, `git diff --stat`. Never read full file contents from historical commits. The goal is to reconstruct context from metadata, not to re-analyze old code.
2. **Infer, don't fabricate**: clearly mark inferred decisions with language like "appears to be" or "likely motivated by". The git history provides evidence, not certainty.
3. **Commit messages are gold**: well-written commit messages are the primary source of "why" information. Poorly written messages ("fix", "update") provide less value — note this in the retrospective.
4. **Focus on decisions, not changes**: the goal is to document WHY things changed, not WHAT changed. Module docs already cover the "what".
5. **Chronological order**: present events in chronological order. This helps readers understand the project's evolution narrative.
6. **Reasonable scope**: for projects with >1000 commits, focus on the top 10-20 most significant events. Do not attempt to document every commit.
7. **No built-in explore agent**: do NOT use the built-in `explore` subagent type.
