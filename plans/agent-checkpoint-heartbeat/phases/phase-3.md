---
type: planning
entity: phase
plan: "agent-checkpoint-heartbeat"
phase: 3
status: pending
created: "2026-07-26"
updated: "2026-07-26"
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
- Latest done/next/failed/context display per selected session.
- Derived chain and three-word percentages computed outside JSONL.
- Pilot scenarios for successful work, failed-and-fixing work, broken chain, word-count drift, and controlled context handoff.
- Evidence-backed go/no-go notes for later adapters.

### Excludes (deferred to later phases)

- Recovery schema or automatic resume prompt generation.
- Background watchdog or automatic session termination.
- Implementation of non-OpenCode adapters.

## Prerequisites

- [ ] Phase 2 OpenCode pilot is complete and produces real session logs.

## Deliverables

- [ ] Minimal read-only inspection command/script.
- [ ] Human-readable selected-session output.
- [ ] Automated calculation tests and pilot scenario results.
- [ ] Recorded decision that later harness execution may proceed or needs contract correction.

## Acceptance Criteria

- [ ] Given a checkpoint path, the inspection can report the last attempted step, next announced step, failed status, latest context use, chain percentage, and three-word percentage.
- [ ] `step_failed=true` does not lower Canary metrics.
- [ ] A deliberately broken link lowers chain percentage.
- [ ] A label with other than three words lowers only the word-compliance percentage.
- [ ] The tool never mutates session JSONL.
- [ ] A parent or retriever can answer “How far did session X get?” using the returned path and raw log.

## Dependencies on Other Phases

| Phase | Relationship | Notes |
|-------|-------------|-------|
| 2 | blocked-by | Requires real OpenCode records. |
| 4–6 | blocks | Provides the pilot gate and transferable findings. |

## Notes

This phase evaluates the Canary effect as instruction compliance, not correctness of the agent's code or decisions.
