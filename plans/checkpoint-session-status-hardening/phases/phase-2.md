---
type: planning
entity: phase
plan: "checkpoint-session-status-hardening"
phase: 2
status: completed
created: "2026-07-31"
updated: "2026-08-01"
---

# Phase 2: Status Contract and Readers

> Part of [checkpoint-session-status-hardening](../plan.md)

## Objective

Add strict `session_status` records to the shared JSONL contract and update readers to display explicit persisted state without enabling adapter writers yet.

## Contribution to Plan Goal

Reader-first compatibility prevents new status lines from breaking the repository's own inspector/dashboard and keeps existing checkpoint records and metrics unchanged.

## Scope

### Includes

- Exact four-field status-event validation, creation, append support, mixed parsing, checkpoint-only compatibility filtering, and session-state reduction.
- Fixtures and tests for legacy/current checkpoints, mixed/status-only logs, duplicate assignments, reopen, physical ordering, and malformed records.
- Inspector/dashboard separation of latest event, latest status, latest checkpoint, and checkpoint-only metrics.
- Lifecycle reduction states `OPEN`, `CLOSED`, and `UNKNOWN`; dashboard-only `ERROR` rows represent read/parse failures. Age remains informational and never changes explicit state.
- Contract and reader documentation.

### Excludes (deferred to later phases)

- Adapter lifecycle writers.
- Crash inference, external observation, tail repair, locking, `fsync`, or event IDs.
- Detailed lifecycle outcomes beyond `open` and `closed`.

## Prerequisites

- [x] Phase 1 completed with focused regressions green.

## Deliverables

- [x] Shared mixed-event contract and compatibility APIs.
- [x] Updated inspector and dashboard behavior.
- [x] Comprehensive fixtures/tests and updated core/concept documentation.

## Acceptance Criteria

- [x] Existing six- and eight-field checkpoint logs parse exactly as before and are never rewritten.
- [x] Exact status events parse in physical order; unknown/partial/extra event fields fail strictly.
- [x] Status events are excluded from chain, work, and three-word calculations.
- [x] `open`, `closed`, reopen, duplicate, status-only, checkpoint-only, and malformed cases render deterministically.
- [x] Old checkpoint-only logs show `UNKNOWN`, never inferred `ACTIVE` or `STALE` state.
- [x] Malformed/unreadable input keeps `checkpoint-inspect`'s nonzero/stderr behavior, while `checkpoint-watch` isolates only the affected file as an `ERROR` row; `ERROR` is never persisted or returned by lifecycle reduction.
- [x] No adapter emits status records in this phase.

## Dependencies on Other Phases

| Phase | Relationship | Notes |
|-------|-------------|-------|
| 1 | blocked-by | Requires the corrected adapter baseline. |
| 3, 4 | blocks | All writers depend on compatible readers. |

## Notes

The compatibility bridge keeps current checkpoint records discriminator-free. Only the new event variant carries `event: "session_status"`.

Completion was independently reviewed with verdict **Accepted**. The focused core/reader gate passed 35/35 tests, and the sole Minor finding—generated watcher `.scriptc` cache output—was cleaned up before the phase transition.
