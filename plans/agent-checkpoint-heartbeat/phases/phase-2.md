---
type: planning
entity: phase
plan: "agent-checkpoint-heartbeat"
phase: 2
status: completed
created: "2026-07-26"
updated: "2026-08-01"
---

# Phase 2: OpenCode Pilot

> Part of [agent-checkpoint-heartbeat](../plan.md)

## Objective

Deliver an installable OpenCode pilot in which parent and subagent personas can write checkpoints, obtain their log path, and use context feedback for a controlled handoff.

## Contribution to Plan Goal

OpenCode provides the first real harness evidence for whether agent-driven segmentation, exact chain reuse, three-word instructions, failed-step reporting, and context-aware stopping work in practice.

## Scope

### Includes

- OpenCode custom tools/plugin for `checkpoint` and `checkpoint_path`.
- Native session identity and best available context telemetry.
- Active persona identity and a non-blocking point-in-time session-title snapshot.
- Agent instruction applied to maintainers and applicable subagent personas.
- Installer support for global and project-local OpenCode targets.
- Temporary-workspace integration and installer smoke tests.

### Excludes (deferred to later phases)

- User-facing aggregate evaluation/display.
- Codex, Claude Code, and PydanticAI adapters.
- Exact context claims unsupported by OpenCode.

## Prerequisites

- [x] Phase 1 is complete and its contract is stable.
- [x] Current OpenCode plugin/custom-tool APIs have been verified from primary sources and installed dependency versions.

## Deliverables

- [x] Installable OpenCode checkpoint plugin/tools.
- [x] Updated parent and subagent checkpoint instruction.
- [x] OpenCode context telemetry behavior with documented fallback.
- [x] OpenCode agent/session-title metadata behavior with documented null fallback.
- [x] Focused integration tests and isolated installer smoke test.

## Acceptance Criteria

- [x] A parent and a subagent can each create separate session logs under the project-root `.agent-checkpoints/` directory.
- [x] `checkpoint` writes the authorized fields and returns context utilization plus remaining K-tokens or honest unknown values.
- [x] `checkpoint_path` returns the correct relative path for an OpenCode session.
- [x] `step_failed=true` is recorded when instructed without being treated as Canary failure.
- [x] Parent and subagent records expose their active persona and current session title when OpenCode provides them.
- [x] Existing global and `--project` installation behavior remains backward compatible.
- [x] OpenCode restart/configuration requirements are documented.

## Dependencies on Other Phases

| Phase | Relationship | Notes |
|-------|-------------|-------|
| 1 | blocked-by | Uses the shared contract and fixtures. |
| 3 | blocks | Evaluation runs against the working pilot. |
| 4–6 | blocks | Pilot findings gate later adapter execution. |

## Notes

The pilot should favor an OpenCode-native wrapper. Portability is achieved through the contract, not by forcing MCP into the pilot when native tools provide better session context.

Reconciled 2026-08-01 against the completed and reviewed OpenCode pilot; no Phase 6 PydanticAI claim is implied.
