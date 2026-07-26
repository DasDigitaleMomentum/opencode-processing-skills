---
type: planning
entity: phase
plan: "agent-checkpoint-heartbeat"
phase: 6
status: pending
created: "2026-07-26"
updated: "2026-07-26"
---

# Phase 6: PydanticAI Adapter

> Part of [agent-checkpoint-heartbeat](../plan.md)

## Objective

Implement the common checkpoint behavior as a PydanticAI-native Python tool and verify parity with the pilot contract.

## Contribution to Plan Goal

PydanticAI validates that the simple contract is usable outside CLI coding harnesses and across the repository's TypeScript/Python boundary.

## Scope

### Includes

- Native PydanticAI function tool for checkpoint and path lookup.
- `run_id`/`conversation_id` identity mapping.
- Honest use of PydanticAI usage and model metadata for context feedback.
- Python package/test integration in this monorepo.
- Agent instruction example for PydanticAI applications.

### Excludes (deferred to later phases)

- Hosted service, web UI, or framework-independent daemon.
- Claims that aggregate run usage equals exact current prompt occupancy.
- Changes to the shared raw contract.

## Prerequisites

- [ ] Phase 3 authorizes later harness execution.
- [ ] PydanticAI primary tool and usage APIs are revalidated before implementation.

## Deliverables

- [ ] PydanticAI adapter and focused Python tests.
- [ ] Identity/context mapping documentation.
- [ ] Example configuration and instruction.

## Acceptance Criteria

- [ ] A PydanticAI run writes contract-compatible records under the workspace-root checkpoint directory.
- [ ] Path lookup maps the documented run/conversation identifier to the correct file.
- [ ] Context feedback is accurate to the available usage semantics or returned as unknown.
- [ ] Failed-step and Canary-compliance behavior matches the OpenCode pilot.
- [ ] Focused Python behavioral tests pass in an isolated environment.

## Dependencies on Other Phases

| Phase | Relationship | Notes |
|-------|-------------|-------|
| 3 | blocked-by | Uses the stable, evaluated contract. |
| 4–5 | parallel | Technically independent after Phase 3; execution remains sequential. |

## Notes

Language-level code reuse is optional. Contract fixtures and observable behavior are authoritative.
