---
type: planning
entity: phase
plan: "agent-improvements"
phase: 2
status: pending
created: "2026-04-26"
updated: "2026-04-26"
---

# Phase 2: Delegation & Blueprint Emphasis

> Part of [agent-improvements](../plan.md)

## Objective

Sharpen the delegation culture in both maintainer agents. The Blueprint mechanism (`implementer` proposes a step list, maintainer reviews, then executes) is used when behavior, risk, uncertainty, or scope requires a gate. Bounded, reversible, low-risk edits in known files may remain local.

## Scope

### Includes

- **`agents/maintainer.md`** — Operating Rules refined:
  - Rule #3 (Delegate over self-execute): strengthened to "default to delegation"
  - Rule #8 (Right-size delegation): threshold based on risk, uncertainty, and scope rather than file count alone
  - New: Anti-pattern table with concrete "wrong → right" examples
  - New: Operating Rule "Context is a budget" (or fold into existing rules)
- **`agents/maintainer-direct.md`** — Apply identical delegation rules (shared DNA)
- Both agents receive the same changes to keep behavior consistent across variants

### Excludes (deferred to later phases)

- Installer changes — Phase 3
- Review remediation and canonical delegate changes — handled by Phase 4

## Prerequisites

- [ ] Phase 1 completed (`maintainer-direct.md` exists)
- [ ] `maintainer.md` current content reviewed and understood

## Deliverables

- [ ] `maintainer.md` Rule #3 reworded for "default to delegation"
- [ ] `maintainer.md` Rule #8 threshold: bounded low-risk known-file changes may remain local; behavior, uncertainty, or risk → delegated workflow
- [ ] Anti-pattern table added near Rule #8 with concrete examples:
  - Understanding code structure → delegate code-exploration, don't read 5 files yourself
  - Small multi-file edits → delegate to implementer, don't DIY
  - Bug investigation → delegate deep-dive, don't grep 8 files
  - Research → delegate targeted-reading + web-research
- [ ] New or enhanced rule: "Context is a budget" — every file read costs judgment tokens
- [ ] `maintainer-direct.md` receives identical delegation rules

## Acceptance Criteria

- [ ] `maintainer.md` Rule #8 clearly distinguishes low-risk local work from gated behavioral or uncertain work
- [ ] Anti-pattern table is present and contains at least 4 concrete examples
- [ ] Rules are internally consistent — nothing contradicts the new delegation threshold
- [ ] `maintainer-direct.md` delegation rules match `maintainer.md` exactly (same text or minor variant)
- [ ] No existing rules (Testing Policy, Safety, etc.) are weakened

## Dependencies on Other Phases

| Phase | Relationship | Notes |
|-------|-------------|-------|
| 1 | blocked-by | `maintainer-direct.md` must exist for Phase 2 to modify it |

## Notes

- The key insight from the user: Blueprint is a **Chain-of-Thought equivalent** — it forces the implementer to think through the plan and the maintainer to review it. This improves quality even for small changes.
- Low-risk threshold examples: mechanical edits in known files with an obvious verify step. Behavioral changes, uncertain debugging, and architectural work use the appropriate delegated workflow.
- The anti-pattern table should be placed near Rule #8 for immediate reference, not buried elsewhere.
