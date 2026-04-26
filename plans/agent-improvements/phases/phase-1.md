---
type: planning
entity: phase
plan: "agent-improvements"
phase: 1
status: pending
created: "2026-04-26"
updated: "2026-04-26"
---

# Phase 1: `maintainer-direct` Agent

> Part of [agent-improvements](../plan.md)

## Objective

Create a second maintainer agent (`maintainer-direct`) for environments where the `question` tool is unavailable or undesirable. It shares the same delegation, testing, and safety rules as `maintainer` but replaces interactive turn-end questioning with status-forward behavior.

## Scope

### Includes

- New file `agents/maintainer-direct.md`
- Same frontmatter structure as `maintainer.md` (mode: primary, same permissions)
- Rule #7 redefined: `question` only for genuine multiple-choice decisions (no custom text input)
- Rule #2 kept intact ("Ask, don't assume") — the agent does NOT become reckless
- Turn-end behavior: status statement instead of question
- All other rules (docs-first, delegation, context hygiene, testing policy, safety) carried over verbatim

### Excludes (deferred to later phases)

- Delegation/blueprint rule sharpening — that's Phase 2 and applies to BOTH agents
- Installer changes — Phase 3
- Any changes to `maintainer.md`

## Prerequisites

- [ ] None — this is a greenfield file

## Deliverables

- [ ] `agents/maintainer-direct.md` exists and is valid OpenCode agent syntax
- [ ] Rule #7 uses `question` only for choice questions (no custom input prompt)
- [ ] Rule #2 is NOT weakened — agent still clarifies before assuming
- [ ] Turn-end convention: status update, not question
- [ ] All shared rules (1, 3, 4, 5, 6, 8, 9, Testing Policy, Safety) are identical to `maintainer.md`

## Acceptance Criteria

- [ ] `maintainer-direct.md` frontmatter parses as valid agent config (`mode: primary`)
- [ ] Diff against `maintainer.md` shows only intentional differences (Rule #7, turn-end behavior)
- [ ] No "custom" option leaked into question-tool usage guidance
- [ ] Agent instructions are internally consistent (no contradictions between rules)

## Dependencies on Other Phases

| Phase | Relationship | Notes |
|-------|-------------|-------|
| 2 | blocked-by (loose) | Phase 2 modifies this file; cleaner to create it first |

## Notes

- The key design principle: `maintainer-direct` is NOT a "reckless" agent. It simply doesn't pester the user with confirmation questions after every action. It still asks when there's a genuine fork in the road (choice between options A/B/C).
- Custom text input via the `question` tool is specifically called out as undesirable and should be avoided in `maintainer-direct`.
- The agent does NOT need its own model configuration entry — it uses the same `delegate` model family via the existing config.yaml mechanism.
