---
type: planning
entity: phase
plan: "agent-checkpoint-heartbeat"
phase: 3
status: completed
created: "2026-07-26"
updated: "2026-08-01"
---

# Phase 3: Pilot Evaluation and Inspection

> Part of [agent-checkpoint-heartbeat](../plan.md)

## Objective

Make OpenCode pilot logs cheaply inspectable and validate the separate Canary-compliance and work-progress signals before later harnesses are executed.

## Contribution to Plan Goal

The pilot is useful only if a parent, user, or retriever can answer how far a session got and distinguish instruction drift from an honestly reported failed step.

## Scope

### Includes

- Read-only script or CLI over a path returned by `checkpoint_path`.
- Latest agent/title/done/next/failed/context display per selected session.
- Derived Chain, Work, and Three-word success/count/percent metrics computed outside JSONL.
- Live workspace dashboard with explicit lifecycle state, informational age, and adaptive terminal-width use (the lifecycle reduction replaced the original age-derived presentation in the later hardening rollout).
- Pilot scenarios for successful work, failed-and-fixing work, broken chain, word-count drift, and controlled context handoff.
- Evidence-backed go/no-go notes for later adapters.

### Excludes (deferred to later phases)

- Recovery schema or automatic resume prompt generation.
- Background watchdog or automatic session termination.
- Implementation of non-OpenCode adapters.

## Prerequisites

- [x] Phase 2 OpenCode pilot is complete and produces real session logs.

## Deliverables

- [x] Minimal read-only inspection command/script.
- [x] Human-readable selected-session output.
- [x] Automated calculation tests and pilot scenario results.
- [x] Recorded decision that later harness execution may proceed or needs contract correction.

## Acceptance Criteria

- [x] Given a checkpoint path, inspection reports latest agent/title, attempted and announced steps, failed status, context, and count-based Chain/Work/Three-word metrics.
- [x] The live dashboard identifies current sessions by ID, persona, and title when available and expands title/done/next columns on wider terminals.
- [x] `step_failed=true` does not lower Canary metrics.
- [x] A deliberately broken link lowers chain percentage.
- [x] A label with other than three words lowers only the word-compliance percentage.
- [x] The tool never mutates session JSONL.
- [x] A parent or retriever can answer “How far did session X get?” using the returned path and raw log.

## Dependencies on Other Phases

| Phase | Relationship | Notes |
|-------|-------------|-------|
| 2 | blocked-by | Requires real OpenCode records. |
| 4–6 | blocks | Provides the pilot gate and transferable findings. |

## Notes

This phase evaluates the Canary effect as instruction compliance, not correctness of the agent's code or decisions.

Reconciled 2026-08-01 against the completed and reviewed inspector/dashboard pilot; explicit lifecycle status was added later without changing this completion evidence.
