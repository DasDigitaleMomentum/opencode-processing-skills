---
type: planning
entity: phase
plan: "checkpoint-session-status-hardening"
phase: 4
status: completed
created: "2026-07-31"
updated: "2026-08-01"
---

# Phase 4: Claude, Hermes, and Rollout Closure

> Part of [checkpoint-session-status-hardening](../plan.md)

## Objective

Complete capability-gated lifecycle writing for Claude Code and Hermes, verify mixed logs across all harnesses, and reconcile related documentation/planning state.

## Contribution to Plan Goal

This phase closes the cross-harness rollout and ensures persisted state, operational docs, installer behavior, and prior plan claims agree.

## Scope

### Includes

- Append Claude parent/subagent `open` and supported graceful `closed` events using verified start/end hooks.
- Append Hermes events only for verified lifecycle hooks, using the corrected per-session binding from Phase 1.
- Cross-adapter mixed/status-only/legacy inspection and dashboard parity.
- User-facing docs, reader-restart/adapter-restart installation guidance, module inventories, and relevant stale plan/todo/phase metadata reconciliation.
- Final targeted, broad, and available pinned-host verification.

### Excludes (deferred to later phases)

- Fabricated Hermes main-session closure where no hook exists.
- External crash detection or richer lifecycle outcomes.
- PydanticAI implementation and unrelated plan cleanup.

## Prerequisites

- [x] Phase 3 completed with reader/writer compatibility verified.
- [x] Claude Code and Hermes lifecycle hooks revalidated against their pinned supported surfaces.

## Deliverables

- [x] Claude Code and Hermes status writer behavior with exact capability limits.
- [x] Cross-harness fixtures/tests and final verification evidence.
- [x] Updated docs and reconciled checkpoint plan artifacts.

## Acceptance Criteria

- [x] Claude and Hermes append only observed `open`/`closed` transitions with correct parent/subagent identity semantics.
- [x] Missing graceful-end hooks leave sessions explicitly unclosed rather than synthesizing status.
- [x] Inspector/dashboard read legacy, current, status-only, and mixed logs from every adapter unchanged.
- [x] Installation remains additive, opt-in, idempotent, and symlink/config preserving.
- [x] Claude/Hermes installer paths preserve reader-asset-before-writer-asset ordering, and the documented upgrade sequence prevents a live old reader from encountering new status lines.
- [x] Related plan artifacts no longer claim completed phases are pending or leave their completed criteria unchecked.
- [x] Final tests pass, or any unavailable pinned-host binary remains an explicit blocker rather than an unreported skip.

## Dependencies on Other Phases

| Phase | Relationship | Notes |
|-------|-------------|-------|
| 3 | blocked-by | Final adapters and parity follow the first writer rollout. |

## Notes

Claude currently has the strongest evidenced graceful end event (`SessionEnd`). Hermes has start and subagent hooks but no adopted trustworthy main-session end event in the current repository evidence.

Implementation and same-session review remediation are complete. The initial review returned Needs Rework with Major F-1 and Minor F-2/F-3; all three were resolved with none unresolved. Focused Claude tests passed 3/3; the current Node gate passed 81/82 with only the exact Claude Code 2.1.170 binary check unavailable; the separate Hermes gate passed 53/54 with only the exact Hermes v0.19.0 binary check unavailable. `bash -n install.sh`, scoped diff checks, and source-anchor checks passed. The full exact pinned-host gate has not passed, so overall plan completion remains blocked.
