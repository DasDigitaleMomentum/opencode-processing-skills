---
type: planning
entity: phase
plan: "checkpoint-session-status-hardening"
phase: 5
status: completed
created: "2026-08-01"
updated: "2026-08-01"
---

# Phase 5: Declared Closure and Compact Dashboard

> Part of [checkpoint-session-status-hardening](../plan.md)

## Objective

Make lifecycle state useful for resumed Maintainer sessions and normally completed subagents, then present that state in a compact dashboard centered on agent, title, age, context, and current work.

## Contribution to Plan Goal

The first rollout persisted only host-observed lifecycle events. OpenCode has no reliable generic completion event, so resumed sessions can remain `UNKNOWN` and completed subagents can remain `OPEN`. This phase adds a conservative agent-declared fallback and removes redundant dashboard columns without fabricating crash or liveness state.

## Scope

### Includes

- Lazily append/confirm `open` whenever a checkpoint is successfully written, including sessions whose creation event was not observed.
- Add optional `close_session=false` to checkpoint tools and adapter contracts; when true, append the checkpoint first and `closed` immediately afterward.
- Instruct subagents to use `close_session=true` only on their final checkpoint before returning a digest, summary, or handoff; Maintainers leave it false unless intentionally ending their whole session.
- Keep crashes, interrupted work, and missing final calls unclosed; closure remains independent from `step_failed` and work-quality metrics.
- Compact dashboard columns to `AGENT | NAME | AGE | STATE | CP | C/W/3 % | CONTEXT | DONE | CURRENT`.
- Hide session ID in the dashboard while retaining it in JSONL, paths, row identity, and the detailed inspector.
- Sort open/unknown sessions newest-first, visually separate closed sessions below them, sort closed sessions newest-first, and keep error rows last.
- Display raw `next` as `CURRENT` for unclosed rows and `—` for closed rows; retain raw `next` and inspector wording unchanged.
- Remove recent/stale presentation and its threshold from the dashboard because age plus sorting already communicates recency.

### Excludes (deferred to later phases)

- Host-heuristic closure from OpenCode `session.idle`, `session.status`, or `session.deleted`.
- Parent/child relationship fields, hierarchy persistence, nested dashboard rows, automatic stale closure, log migration, or log deletion.
- Treating `close_session=true` as proof that work succeeded.
- Resolving the existing exact Claude Code 2.1.170/Hermes v0.19.0 host-gate blocker.

## Prerequisites

- [x] Phases 1–4 completed with all implementation-review findings remediated.
- [x] Shared exact status-event contract and cross-adapter reader parity are implemented.
- [x] User approved lazy open, explicit final closure, and compact dashboard behavior.

## Deliverables

- [x] Backward-compatible checkpoint API extension across shared core and all installed adapters.
- [x] Updated checkpoint instructions for final subagent closure.
- [x] Compact dashboard layout, grouping, sorting, and documentation.
- [x] Focused cross-adapter and dashboard regression coverage.

## Acceptance Criteria

- [x] A checkpoint-only resumed session transitions from `UNKNOWN` to `OPEN` when it next calls `checkpoint`.
- [x] Default checkpoint calls remain compatible and leave the session open; `close_session=true` writes checkpoint then `closed` in physical order.
- [x] A normally finishing subagent is instructed to declare closure on its final checkpoint; omission or crash leaves it open rather than fabricating closure.
- [x] Every adapter exposes the same optional argument and preserves existing identity, metadata, telemetry, path, and checkpoint semantics.
- [x] Dashboard output contains no session-ID or freshness column, retains age sorting and important work/context fields, and compacts metrics as checkpoint count plus `C/W/3 %`.
- [x] Closed rows are visually separated below open/unknown rows, errors remain last, and closed rows show no `CURRENT` work.
- [x] Existing logs remain readable without migration and the detailed inspector retains session identity and raw next-announcement information.

## Dependencies on Other Phases

| Phase | Relationship | Notes |
|-------|-------------|-------|
| 1–4 | blocked-by | Extends the implemented status contract, adapters, and dashboard without changing their lifecycle evidence. |

## Notes

OpenCode `session.idle` is turn idleness for parent and child sessions, and `session.deleted` is deletion rather than normal completion. Neither is used as a close signal; the fallback is explicitly agent-declared through the final checkpoint.
