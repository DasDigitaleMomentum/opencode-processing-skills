---
type: planning
entity: phase
plan: "checkpoint-session-status-hardening"
phase: 3
status: completed
created: "2026-07-31"
updated: "2026-08-01"
---

# Phase 3: OpenCode and Codex Status Writers

> Part of [checkpoint-session-status-hardening](../plan.md)

## Objective

Enable reader-compatible lifecycle status writing for OpenCode and Codex using only verified native events.

## Contribution to Plan Goal

This phase begins the adapter rollout without claiming lifecycle states that the two harnesses cannot observe.

## Scope

### Includes

- Revalidate the current OpenCode plugin event surface and pinned Codex lifecycle hooks before implementation.
- Append `open` on verified session start/resume events and `closed` only where a genuine graceful session-close event exists.
- Preserve current parent/subagent identity limits, metadata, checkpoint tools, and install behavior.
- Add focused hook/runtime/installer tests, enforce reader-asset-before-writer-asset copy order, and document unsupported terminal coverage plus the required dashboard/harness restart sequence.

### Excludes (deferred to later phases)

- Claude Code and Hermes writers.
- Mapping Codex turn-level `Stop` or old checkpoint age to session `closed`.
- New parent/subagent identity surfaces beyond documented harness support.

## Prerequisites

- [x] Phase 2 readers and shared event contract completed.
- [x] Current OpenCode and Codex lifecycle APIs revalidated against primary/local evidence.

## Deliverables

- [x] OpenCode status writer behavior matching verified plugin events, or an explicit no-writer result when no trustworthy start/resume event exists.
- [x] Codex status writer behavior matching verified hooks.
- [x] Adapter tests, installer coverage, and honest capability documentation.

## Acceptance Criteria

- [x] Each emitted event carries the correct session ID, workspace log path, timestamp, discriminator, and status.
- [x] No turn-level or checkpoint event is misreported as graceful session closure.
- [x] Unsupported close behavior leaves the latest state `OPEN` and is documented.
- [x] If OpenCode exposes no trustworthy start/resume event, it emits no status line and checkpoint-only logs remain `UNKNOWN`.
- [x] Existing checkpoint writes and metrics remain unchanged.
- [x] Installed readers and writer assets are mutually compatible and symlink-safe.
- [x] Isolated installer tests prove compatible reader assets are copied before status-capable hooks/plugins; installation guidance requires restarting a live dashboard before starting/restarting writer-enabled harness sessions.

## Dependencies on Other Phases

| Phase | Relationship | Notes |
|-------|-------------|-------|
| 2 | blocked-by | Reader-first contract must be complete. |
| 4 | blocks | Final cross-harness closure follows this rollout. |

## Notes

Repository evidence proved Codex `SessionStart` but not a reliable session-end hook. OpenCode revalidation proved `session.created` as the supported initial-open event, with no trustworthy resume or close event. The initial implementation review returned Needs Rework for Major F-1 (required-reader symlinked-ancestor bypass); the same-session review-fix resolved F-1 with no unresolved findings. Targeted OpenCode verification passed 12/12, and the final Phase 3 gate passed 59/59 plus `bash -n install.sh`.
