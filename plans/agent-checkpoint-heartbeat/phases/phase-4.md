---
type: planning
entity: phase
plan: "agent-checkpoint-heartbeat"
phase: 4
status: completed
created: "2026-07-26"
updated: "2026-08-01"
---

# Phase 4: Codex macOS Adapter

> Part of [agent-checkpoint-heartbeat](../plan.md)

## Objective

Implement the shared checkpoint contract for Codex on macOS using a pre-researched, current API path that preserves session identity and context honesty.

## Contribution to Plan Goal

This phase tests whether the OpenCode-proven contract transfers to Codex without weakening the simple JSONL or agent-instruction model.

## Scope

### Includes

- Codex MCP/dynamic-tool integration selected from verified current APIs.
- Session or thread identity bridge where standard MCP lacks host identity.
- Best available Codex context/usage feedback with documented semantics.
- macOS installation and isolated verification instructions.
- Codex agent instruction and path lookup behavior.

### Excludes (deferred to later phases)

- Execution during the original OpenCode pilot; the adapter was subsequently completed through `checkpoint-harness-integration` Phase 2.
- Claude Code or PydanticAI integration.
- Fabricating exact context occupancy from accumulated usage.

## Prerequisites

- [x] Phase 3 authorizes later harness execution.
- [x] Codex primary APIs and host paths were revalidated immediately before implementation.

## Deliverables

- [x] Codex adapter and configuration/install integration.
- [x] Session identity and telemetry bridge where required.
- [x] macOS-focused behavioral tests and documentation.

## Acceptance Criteria

- [x] Codex produces contract-compatible raw records under the workspace-root checkpoint directory.
- [x] Path lookup selects the expected Codex session file.
- [x] Context feedback is labeled and handled according to actual Codex semantics.
- [x] Parent/subagent instruction behavior matches the pilot contract.
- [x] An isolated macOS smoke test passes without modifying unrelated user configuration.

## Dependencies on Other Phases

| Phase | Relationship | Notes |
|-------|-------------|-------|
| 3 | blocked-by | Must incorporate pilot findings. |
| 5 | parallel | Was implemented independently after the common pilot gate; plan execution remained sequential. |

## Notes

The implementation plan researched current Codex MCP, hooks, plugin/configuration, and app-server token/session APIs; execution and review evidence is recorded in `plans/checkpoint-harness-integration/`.

Reconciled 2026-08-01 from that completed Phase 2 evidence. Phase 6 PydanticAI remains pending.
