---
type: planning
entity: phase
plan: "agent-checkpoint-heartbeat"
phase: 1
status: completed
created: "2026-07-26"
updated: "2026-07-26"
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

- [ ] The concept document and plan decisions are accepted.
- [ ] The implementation plan is verified against the current monorepo and installer structure.

## Deliverables

- [ ] Shared contract implementation and fixtures.
- [ ] Safe per-session append and path lookup behavior.
- [ ] External Chain/Work/Three-word calculation behavior that uses `step_failed` only for Work quality.
- [ ] Focused automated tests.

## Acceptance Criteria

- [ ] New writes contain exactly the eight current fields with nullable agent/title metadata, while strict legacy six-field records remain readable without rewriting.
- [ ] Repeated appends produce independently parseable JSONL lines without rewriting history.
- [ ] Unsafe session IDs cannot escape the root checkpoint directory.
- [ ] `checkpoint_path` resolves a workspace-relative path for a stable session ID.
- [ ] A failed step remains visible while chain and three-word calculations remain independent.
- [ ] Tests cover legacy/current/mixed records, nullable metadata, first/matching/broken chains, count metrics, compliant/non-compliant labels, failed steps, missing context, and unsafe IDs.

## Dependencies on Other Phases

| Phase | Relationship | Notes |
|-------|-------------|-------|
| 2 | blocks | OpenCode wraps this contract. |
| 3 | blocks | Inspection uses these raw records and calculations. |
| 4–6 | blocks | Future harness adapters must preserve this contract. |

## Notes

The implementation plan must choose the smallest structure compatible with this repository rather than introducing a general service or daemon.
