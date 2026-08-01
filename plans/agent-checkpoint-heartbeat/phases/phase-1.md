---
type: planning
entity: phase
plan: "agent-checkpoint-heartbeat"
phase: 1
status: completed
created: "2026-07-26"
updated: "2026-08-01"
---

# Phase 1: Shared Contract and Monorepo Foundation

> Part of [agent-checkpoint-heartbeat](../plan.md)

## Objective

Create the smallest shared, testable foundation for checkpoint records, workspace-relative session files, path lookup, and external compliance calculations.

## Contribution to Plan Goal

Every harness depends on identical raw semantics. Fixing the contract and fixtures first prevents later adapters from embedding incompatible interpretations of chain continuity, three-word compliance, failed steps, or context telemetry.

## Scope

### Includes

- Monorepo package/module boundary for the shared checkpoint behavior and fixtures.
- Raw JSONL record validation and append semantics.
- Safe `.agent-checkpoints/<session-id>.jsonl` resolution from workspace root.
- Shared definitions for `checkpoint` and `checkpoint_path`.
- Read-only count and percentage calculations for Chain, Work, and Three-word compliance.
- Git ignore and test-fixture handling for the root runtime directory.

### Excludes (deferred to later phases)

- OpenCode, Codex, Claude Code, or PydanticAI runtime integration.
- End-user display beyond testable analysis output.
- Recovery, watchdog, restart, or transcript behavior.

## Prerequisites

- [x] The concept document and plan decisions are accepted.
- [x] The implementation plan is verified against the current monorepo and installer structure.

## Deliverables

- [x] Shared contract implementation and fixtures.
- [x] Safe per-session append and path lookup behavior.
- [x] External Chain/Work/Three-word calculation behavior that uses `step_failed` only for Work quality.
- [x] Focused automated tests.

## Acceptance Criteria

- [x] New writes contain exactly the eight current fields with nullable agent/title metadata, while strict legacy six-field records remain readable without rewriting.
- [x] Repeated appends produce independently parseable JSONL lines without rewriting history.
- [x] Unsafe session IDs cannot escape the root checkpoint directory.
- [x] `checkpoint_path` resolves a workspace-relative path for a stable session ID.
- [x] A failed step remains visible while chain and three-word calculations remain independent.
- [x] Tests cover legacy/current/mixed records, nullable metadata, first/matching/broken chains, count metrics, compliant/non-compliant labels, failed steps, missing context, and unsafe IDs.

## Dependencies on Other Phases

| Phase | Relationship | Notes |
|-------|-------------|-------|
| 2 | blocks | OpenCode wraps this contract. |
| 3 | blocks | Inspection uses these raw records and calculations. |
| 4–6 | blocks | Completed Codex/Claude adapters preserve this contract; pending PydanticAI must do the same. |

## Notes

The implementation plan must choose the smallest structure compatible with this repository rather than introducing a general service or daemon.

Reconciled 2026-08-01 against the completed and reviewed shared-core rollout; no Phase 6 PydanticAI claim is implied.
