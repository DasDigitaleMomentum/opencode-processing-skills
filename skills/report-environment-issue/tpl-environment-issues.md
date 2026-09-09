---
type: documentation
entity: environment-issues
version: 1.0
---

# Environment Issues

Append-only, deduplicated log of environment, harness, and tooling issues that block or degrade agent work. Managed via the `report-environment-issue` skill.

Status values: `open` | `mitigated` | `resolved`.

## Summary

| ID | Category | Symptom | First seen | Last seen | Count | Status |
|----|----------|---------|-----------|-----------|-------|--------|
| ENV-001 | tooling | <short symptom> | YYYY-MM-DD | YYYY-MM-DD | 1 | open |

## Entries

### ENV-001 — <short title>

- **Category**: tooling | permissions | sandbox | network | harness | installer | infra | mcp
- **First seen**: YYYY-MM-DD
- **Last seen**: YYYY-MM-DD
- **Occurrences**: 1
- **Status**: open | mitigated | resolved
- **Symptom**: exact observable failure or limitation
- **Impact**: what work was blocked or degraded
- **Workaround**: what was done instead, or `none`
- **Suggested improvement**: concrete environment or tooling change
- **Evidence**: command, path, or short error excerpt (no secrets)
- **History**: append-only updates, one per line (`YYYY-MM-DD: ...`)
