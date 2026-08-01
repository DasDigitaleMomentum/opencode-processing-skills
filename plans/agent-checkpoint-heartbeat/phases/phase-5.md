---
type: planning
entity: phase
plan: "agent-checkpoint-heartbeat"
phase: 5
status: completed
created: "2026-07-26"
updated: "2026-08-01"
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

- Execution during the original OpenCode pilot; the adapter was subsequently completed through `checkpoint-harness-integration` Phase 3.
- Codex or PydanticAI integration.
- Background monitoring beyond explicit tool calls.

## Prerequisites

- [x] Phase 3 authorizes later harness execution.
- [x] Claude Code primary APIs and host paths were revalidated immediately before implementation.

## Deliverables

- [x] Claude Code adapter packaged through supported plugin facilities.
- [x] Session/context bridge required by the callable tool.
- [x] macOS-focused behavioral tests and documentation.

## Acceptance Criteria

- [x] Claude Code produces contract-compatible raw records under the workspace-root checkpoint directory.
- [x] Path lookup selects the expected Claude Code session file.
- [x] Returned context values match documented statusline/runtime semantics or are unknown.
- [x] Parent/subagent instruction behavior matches the pilot contract.
- [x] An isolated macOS smoke test passes without modifying unrelated user configuration.

## Dependencies on Other Phases

| Phase | Relationship | Notes |
|-------|-------------|-------|
| 3 | blocked-by | Must incorporate pilot findings. |
| 4 | parallel | May be implemented independently after the common pilot gate, but plan execution remains sequential. |

## Notes

The implementation plan researched current Claude Code MCP, plugin, hook, session, and statusline APIs; execution and review evidence is recorded in `plans/checkpoint-harness-integration/`.

Reconciled 2026-08-01 from that completed Phase 3 evidence. Phase 6 PydanticAI remains pending.
