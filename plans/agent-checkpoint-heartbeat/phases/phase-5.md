---
type: planning
entity: phase
plan: "agent-checkpoint-heartbeat"
phase: 5
status: pending
created: "2026-07-26"
updated: "2026-07-26"
---

# Phase 5: Claude Code macOS Adapter

> Part of [agent-checkpoint-heartbeat](../plan.md)

## Objective

Implement the shared checkpoint contract for Claude Code on macOS using verified plugin, MCP, hook, and statusline capabilities.

## Contribution to Plan Goal

This phase transfers the OpenCode-proven behavior to Claude Code while using its native session, nullable metadata, and context signals without adding recovery machinery.

## Scope

### Includes

- Claude Code plugin/MCP tool integration.
- Session identity from supported hooks or plugin context.
- Context feedback from supported statusline/runtime data.
- macOS installation and isolated verification instructions.
- Claude Code parent/subagent instruction and path lookup behavior.

### Excludes (deferred to later phases)

- Execution during the OpenCode pilot; this phase is assigned to the later macOS colleague.
- Codex or PydanticAI integration.
- Background monitoring beyond explicit tool calls.

## Prerequisites

- [ ] Phase 3 authorizes later harness execution.
- [ ] The colleague revalidates Claude Code primary APIs and macOS paths immediately before implementation.

## Deliverables

- [ ] Claude Code adapter packaged through supported plugin facilities.
- [ ] Session/context bridge required by the callable tool.
- [ ] macOS-focused behavioral tests and documentation.

## Acceptance Criteria

- [ ] Claude Code produces contract-compatible raw records under the workspace-root checkpoint directory.
- [ ] Path lookup selects the expected Claude Code session file.
- [ ] Returned context values match documented statusline/runtime semantics or are unknown.
- [ ] Parent/subagent instruction behavior matches the pilot contract.
- [ ] An isolated macOS smoke test passes without modifying unrelated user configuration.

## Dependencies on Other Phases

| Phase | Relationship | Notes |
|-------|-------------|-------|
| 3 | blocked-by | Must incorporate pilot findings. |
| 4 | parallel | May be implemented independently after the common pilot gate, but plan execution remains sequential. |

## Notes

The implementation plan must already research current Claude Code MCP, plugin, hook, session, and statusline APIs, while marking volatile details for colleague revalidation.
