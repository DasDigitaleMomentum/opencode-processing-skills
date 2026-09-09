---
name: report-environment-issue
description: Record environment, harness, or tooling issues that block or degrade agent work into an append-only, deduplicated log so the environment can be improved incrementally.
license: MIT
compatibility:
  opencode: ">=0.1"
metadata:
  category: maintenance
  phase: cross-cutting
---

# Skill: Report Environment Issue

Capture issues that are outside the current work package's control, so recurring environment friction becomes visible and can be improved over time.

## When to Use

Use when work is blocked or degraded by the environment rather than by the product code or gated scope, for example:

- missing tool, binary, permission, or credential
- sandbox, network, proxy, or filesystem restriction
- installer, path, symlink, or harness configuration problem
- tool, MCP, or browser provider failure or flakiness
- provider, model, or runtime constraint

Do **not** use for product bugs, review findings, plan changes, or user-owned decisions. Those keep their own workflows.

## Execution Model

- The Maintainer records issues it observed directly or that a subagent reported in its return or digest.
- `doc-explorer` may maintain the log when routed for bulk curation or deduplication cleanup.
- Subagents do not write the log; they surface a compact `Environment: <category>: <symptom>` note in their return.

## Workflow

1. Decide whether the issue is environmental (outside the work package's control) and whether it is fixable now.
   - Fixable within the current package and scope → fix it; do not log it.
   - Not fixable now → record it here.
2. Read `docs/environment-issues.md` if it exists; otherwise create it from `tpl-environment-issues.md`.
3. Match an existing entry by category plus normalized symptom.
   - Match → increment occurrences, update last seen, adjust status or workaround if changed, and append a history line.
   - No match → assign the next `ENV-NNN` ID and add both a summary row and an entry.
4. Keep entries short and evidence-based. Never invent a cause; record the exact symptom and the observed workaround.
5. Report the recorded ID back to the user or main loop.

## Output Contract

Return only:

- **Recorded**: `ENV-NNN` (new) | `ENV-NNN` (updated) | none
- **File**: `docs/environment-issues.md`
- **Summary**: one line: category + symptom
- **Next**: stop | primary decision required

## Write Boundary

- Writes: `docs/environment-issues.md` only.
- Does not write code, plans, or other docs.
- Append-only history: never delete an entry; mark it `mitigated` or `resolved` instead.
- No Git operations.

## Rules

- One issue per entry; do not bundle unrelated failures.
- Deduplicate aggressively; a recurring issue increases its count instead of creating a duplicate.
- Record a workaround even when the root cause is unknown.
- Do not log a problem that is fixable within the current package; fix it instead.
- Omit secrets, tokens, and personal data from evidence.
- Do not scaffold `docs/environment-issues.md` when no issue exists.

## Templates

- `tpl-environment-issues.md` — canonical log structure and entry format.
