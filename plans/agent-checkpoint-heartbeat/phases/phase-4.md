---
type: planning
entity: phase
plan: "agent-checkpoint-heartbeat"
phase: 4
status: pending
created: "2026-07-26"
updated: "2026-07-26"
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

- Execution during the OpenCode pilot; this phase is assigned to the later macOS colleague.
- Claude Code or PydanticAI integration.
- Fabricating exact context occupancy from accumulated usage.

## Prerequisites

- [ ] Phase 3 authorizes later harness execution.
- [ ] The colleague revalidates Codex primary APIs and macOS paths immediately before implementation.

## Deliverables

- [ ] Codex adapter and configuration/install integration.
- [ ] Session identity and telemetry bridge where required.
- [ ] macOS-focused behavioral tests and documentation.

## Acceptance Criteria

- [ ] Codex produces contract-compatible raw records under the workspace-root checkpoint directory.
- [ ] Path lookup selects the expected Codex session file.
- [ ] Context feedback is labeled and handled according to actual Codex semantics.
- [ ] Parent/subagent instruction behavior matches the pilot contract.
- [ ] An isolated macOS smoke test passes without modifying unrelated user configuration.

## Dependencies on Other Phases

| Phase | Relationship | Notes |
|-------|-------------|-------|
| 3 | blocked-by | Must incorporate pilot findings. |
| 5 | parallel | May be implemented independently after the common pilot gate, but plan execution remains sequential. |

## Notes

The implementation plan must already research current Codex MCP, hooks, plugin/configuration, and app-server token/session APIs, while marking volatile details for colleague revalidation.
