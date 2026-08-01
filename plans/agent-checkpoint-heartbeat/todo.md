---
type: planning
entity: todo
plan: "agent-checkpoint-heartbeat"
updated: "2026-08-01"
---

# Todo: agent-checkpoint-heartbeat

> Tracking [agent-checkpoint-heartbeat](plan.md)

## Active Phase: 6 - PydanticAI Adapter

### Phase Context

- **Scope**: [Phase 6](phases/phase-6.md) (pending)
- **Implementation**: [Phase 6 Plan](implementation/phase-6-impl.md)
- **Latest Handover**: Not created
- **Relevant Docs**:
  - [Project Overview](../../docs/overview.md)
  - [Checkpoint Concept](../../docs/agent-checkpoint-heartbeat.md)
  - [Installation and Configuration](../../docs/modules/installation-and-configuration.md)

### Pending

- [ ] Revalidate current PydanticAI APIs and execute Phase 6 without changing the completed adapter contract. <!-- added: 2026-08-01 -->

### In Progress

None.

### Completed

- [x] Create the persistent plan and phase structure. <!-- completed: 2026-07-26 -->
- [x] Review and approve the Phase 1 implementation plan. <!-- completed: 2026-07-26 -->
- [x] Implement the shared raw record contract and fixtures. <!-- completed: 2026-07-26 -->
- [x] Implement safe workspace-relative session path and append behavior. <!-- completed: 2026-07-26 -->
- [x] Implement external chain and three-word calculations. <!-- completed: 2026-07-26 -->
- [x] Run Phase 1 behavioral verification. <!-- completed: 2026-07-26 -->
- [x] Review and approve the Phase 2 execution Blueprint. <!-- completed: 2026-07-26 -->
- [x] Implement the OpenCode plugin and native tools. <!-- completed: 2026-07-26 -->
- [x] Add OpenCode parent and subagent checkpoint instructions. <!-- completed: 2026-07-26 -->
- [x] Extend global and project-local OpenCode installation. <!-- completed: 2026-07-26 -->
- [x] Run Phase 2 integration and installer verification. <!-- completed: 2026-07-26 -->
- [x] Review and approve the Phase 3 execution Blueprint. <!-- completed: 2026-07-26 -->
- [x] Implement read-only selected-log inspection. <!-- completed: 2026-07-26 -->
- [x] Add separated Canary and work-progress display. <!-- completed: 2026-07-26 -->
- [x] Add pilot scenarios and calculation coverage. <!-- completed: 2026-07-26 -->
- [x] Run Phase 3 behavioral verification and record the pilot gate. <!-- completed: 2026-07-26 -->
- [x] Remediate the accepted Phase 1–3 implementation review findings and repeat the real-host pilot gate. <!-- completed: 2026-07-26 -->
- [x] Replace unconditional-null OpenCode telemetry with the SDK-backed TUI-equivalent estimate and update plans/docs. <!-- completed: 2026-07-26 -->
- [x] Add and document the live `checkpoint-watch` terminal dashboard with global/project installation. <!-- completed: 2026-07-26 -->
- [x] Add agent/session-title identity, count-based metrics, and adaptive wide-terminal layout. <!-- completed: 2026-07-26 -->
- [x] Revalidate and deliver the Codex adapter through `checkpoint-harness-integration` Phase 2 with isolated host/configuration evidence. <!-- completed: 2026-07-27 -->
- [x] Revalidate and deliver the Claude Code adapter through `checkpoint-harness-integration` Phase 3 with pinned-host evidence. <!-- completed: 2026-07-27 -->
- [x] Reconcile completed Phase 1–5 prerequisites, deliverables, and acceptance criteria while retaining Phase 6 as pending. <!-- completed: 2026-08-01 -->

### Blocked

None.

## Changelog

### 2026-07-26

- Plan created; Phase 1 selected as the active starting phase.
- Phase 1 completed; Phase 2 selected as active.
- Phase 2 completed; Phase 3 selected as active.
- Phase 3 and the OpenCode pilot completed; Phase 4 remains pending for the macOS colleague.
- Accepted review findings fixed; isolated real-host OpenCode verification and the full Phase 1–3 gate passed.
- Corrected OpenCode telemetry after source-level SDK review; 18/18 tests and installer syntax verification passed.
- Added the live checkpoint dashboard; 24/24 tests passed and Phase 4 remains pending.
- Refined checkpoint identity and dashboard presentation with legacy compatibility; 29/29 tests passed.

### 2026-08-01

- Reconciled the stale Phase 4 next-step and Codex revalidation entries with completed Codex/Claude integration evidence.
- Selected Phase 6 PydanticAI as the sole pending phase; the plan remains active and no aggregate all-adapter item was marked complete.
