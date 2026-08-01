---
type: planning
entity: plan
plan: "checkpoint-session-status-hardening"
status: active
created: "2026-07-31"
updated: "2026-08-01"
---

# Plan: checkpoint-session-status-hardening

## Problem / Context

The checkpoint rollout added Codex, Claude Code, and Hermes adapters, but an independent review of commits `bc98bd5..3cb3f84` found five correctness and installation defects. The dashboard also derives `ACTIVE`/`STALE` from the age of the latest checkpoint, which is explicitly not session liveness and makes the state after the last write misleading. The current raw contract accepts only legacy six-field and current eight-field checkpoint records, so lifecycle state cannot yet be persisted honestly in the same JSONL stream.

Relevant architecture is documented in [Agent Checkpoint / Heartbeat](../../docs/agent-checkpoint-heartbeat.md), [Checkpoint Core](../../docs/modules/checkpoint-core.md), and [OpenCode Checkpoint Adapter](../../docs/modules/opencode-checkpoint-adapter.md).

## Target Outcome

Known adapter defects are corrected, and each session log can contain strict `session_status` events alongside unchanged checkpoint records. Updated readers display explicit `OPEN`, `CLOSED`, or `UNKNOWN` state instead of inferring process liveness from checkpoint age. Harness adapters append only lifecycle events their documented hooks can observe; unsupported close events and crashes remain honestly unreported.

## Guiding Decisions & Constraints

- User decision (2026-07-31): persist status events in the same append-only JSONL file rather than filesystem metadata or a sidecar.
- User decision (2026-07-31): use the conservative `open`/`closed` status vocabulary. `open` means that an open/start/resume event was observed with no later close event; it does not prove current process liveness. `closed` means a graceful close hook was observed; it does not prove successful work.
- Add a third exact JSONL variant with exactly `timestamp`, `session_id`, `event: "session_status"`, and `status: "open" | "closed"`. Existing six- and eight-field checkpoint records remain byte- and behavior-compatible.
- Roll out readers before writers so newly emitted status events are never introduced ahead of compatible inspection/dashboard code in this source distribution.
- Status events never contribute to chain, work, or three-word metrics. `step_failed` remains a checkpoint outcome, not a session terminal state.
- Reduce status by physical JSONL order. Duplicate identical status events are semantically idempotent; `closed` followed by `open` represents a resumed session.
- A crash, `SIGKILL`, host loss, or harness without a close hook cannot append `closed`; the log remains `OPEN` or `UNKNOWN`. Do not fabricate terminal events from age.
- Keep changes additive, preserve append-only logs, keep adapter activation opt-in, preserve user configuration and symlinks, and do not weaken tests.
- Fix only the five accepted review findings and planning inconsistencies required to make the shipped work truthful; no unrelated adapter redesign.
- Preserve Hermes session-level logging: each parent session owns one log; native child-session IDs map internally to that parent's log and never become separate persisted attribution. Adopt `subagent_start` only as required to establish that mapping. Parent, child, resumed-parent, and interleaved-session invocations retain separate binding/telemetry state while child checkpoints intentionally append to the parent log.
- `ERROR` is reader failure presentation only. It is never persisted, never a `session_status` value, and never a valid lifecycle reduction result.
- Reader-first rollout applies inside installation as well as between phases: compatible core/parser/inspector/watch assets are installed before status-capable hook/plugin assets. Operators must restart a running dashboard before starting/restarting status-writing harness sessions after an upgrade.
- User decision (2026-08-01): leave the fully implemented plan active and explicitly blocked until the exact Claude Code 2.1.170 and Hermes v0.19.0 host gate can run in a suitable environment; do not claim final success before that gate passes.

### Scope-Bounding Assumptions

- Harness lifecycle capabilities remain unequal. A harness that can observe start but not graceful session end may emit `open` without ever emitting `closed`.
- Pinned Claude Code and Hermes host-smoke tests require their binaries; absence from the current Linux environment is an environment limitation, not permission to skip or weaken those gates.

## Requirements

### Functional

- [x] The shared parser validates mixed legacy checkpoint, current checkpoint, and exact `session_status` records while retaining a checkpoint-only compatibility API.
- [x] Inspector and dashboard derive state only from explicit status events and display `OPEN`, `CLOSED`, `UNKNOWN`, or `ERROR` with age kept as separate informational data.
- [x] Status-only logs are readable; checkpoint metrics remain `0/0 (n/a)` and checkpoint detail fields remain empty/neutral.
- [x] Every harness appends `open` and `closed` only where supported by verified lifecycle hooks; unsupported transitions remain absent and documented.
- [x] Hermes preserves concurrent parent/subagent session bindings instead of overwriting one process-global session.
- [x] Hermes sessions receive the complete heartbeat instruction covering cadence, chaining, failed-step correction, and context-pressure handoff.
- [x] Quoted and unquoted Hermes `plugins.disabled` entries stop installation loudly without changing the config.
- [x] The Codex installer preserves a symlinked whole adapter destination directory.
- [x] Hermes remaining context-window headroom never reports below zero.
- [x] Superseded checkpoint-plan status, todo, phase checkbox, and completion wording is reconciled with actual completed work and the remaining PydanticAI phase.

### Non-Functional

- [x] Existing six- and eight-field logs remain readable without migration or rewriting.
- [x] Existing checkpoint metrics and raw checkpoint bytes remain unchanged by lifecycle events.
- [x] Installer runs remain idempotent, additive, and isolated from unrelated user configuration.
- [x] Status writes use one append operation per line and never infer success, failure, or liveness beyond observed hook semantics.
- [x] `checkpoint-inspect` retains nonzero/stderr failure behavior for malformed/unreadable logs; `checkpoint-watch` isolates those files as `ERROR` rows without treating `ERROR` as lifecycle state.
- [ ] Focused regressions and the broad repository gate pass; host-specific pinned CLI smokes are recorded separately when the binaries are available.

## Scope

### In Scope

- The five evidence-backed review fixes in Hermes and Codex code, installer behavior, instructions, and tests.
- Shared status-event validation, creation, append support, parsing, reduction, fixtures, inspection, and dashboard display.
- Reader-first lifecycle-event rollout for OpenCode, Codex, Claude Code, and Hermes according to verified hook capabilities.
- Cross-adapter mixed-log compatibility tests and user-facing documentation.
- Reconciliation of stale planning metadata directly related to the completed checkpoint adapter rollout.

### Out of Scope

- Treating `OPEN` as proof of a running process or adding timeout-derived terminal states.
- External watchdogs, crash observers, daemons, file extended attributes, sidecar status files, tail repair, `fsync`, locking protocols, event IDs, or centralized telemetry.
- Detailed `running`, `waiting`, `completed`, `failed`, or `interrupted` lifecycle vocabulary.
- PydanticAI adapter implementation, Hermes start-time subagent attribution beyond what is required to fix session binding, and unrelated harness adapters.
- Changing checkpoint cadence, the three-word rule, or Canary/work-quality semantics.

## Definition of Done

- [x] All five review findings have focused regression tests and are fixed without configuration or symlink regressions.
- [x] Mixed JSONL logs strictly support exact six-field checkpoints, eight-field checkpoints, and four-field `session_status` events.
- [x] Inspector/dashboard report explicit status correctly for open, closed, reopened, status-only, legacy-only, duplicate-event, and malformed logs.
- [x] All four adapters have documented and tested event behavior matching their verified lifecycle capabilities; no adapter fabricates a close event.
- [x] Reader-first installation copies compatible readers before any installed adapter can emit status events.
- [x] Existing metrics exclude status events and existing checkpoint-only consumers retain their API behavior.
- [x] Relevant docs and plans match the final code and honest lifecycle limitations.
- [ ] Targeted suites and the approved broad gate pass, with any unavailable pinned-host smoke explicitly recorded rather than silently skipped.

## Testing Strategy

- [x] Add focused core fixtures/tests for strict event validation, mixed parsing, checkpoint-only filtering, reduction order, duplicates, reopen, status-only logs, and malformed records.
- [x] Add inspector/watch tests for `OPEN`, `CLOSED`, `UNKNOWN`, `ERROR`, event age, and unchanged checkpoint metrics/details.
- [x] Add exact regressions for Hermes multi-session binding, full instruction delivery, quoted disabled forms, and non-negative headroom; add Codex whole-directory symlink preservation.
- [x] Add per-adapter lifecycle-hook tests and cross-adapter mixed-log inspection parity without inventing unsupported close hooks.
- [x] Add isolated installation-order assertions and document/test the upgrade sequence: install reader assets first, restart live readers, then start/restart status-writing harness sessions.
- [ ] Run focused tests during implementation, then once ready run `node --test packages/checkpoint-core/test/*.test.js opencode/test/*.test.mjs codex/test/*.test.mjs claude/test/*.test.mjs`, `python3 -m unittest discover -s hermes/test`, and `bash -n install.sh` as the final gate.
- [ ] Run pinned Claude Code and Hermes CLI smokes in an environment containing the required binaries, or record the explicit environment blocker before completion.

## Phases

| Phase | Title | Contribution | Detail | Status |
|-------|-------|--------------|--------|--------|
| 1 | Adapter Correctness Hardening | Fixes the five known defects and restores a trustworthy baseline before changing the contract. | [Phase](phases/phase-1.md) | completed |
| 2 | Status Contract and Readers | Adds the strict mixed-event contract and replaces age-inferred dashboard state with explicit status reduction. | [Phase](phases/phase-2.md) | completed |
| 3 | OpenCode and Codex Status Writers | Adds only lifecycle events supported by verified OpenCode and Codex hooks after readers are compatible. | [Phase](phases/phase-3.md) | completed |
| 4 | Claude, Hermes, and Rollout Closure | Adds supported Claude/Hermes events, verifies cross-harness behavior, updates docs, and reconciles stale plan state. | [Phase](phases/phase-4.md) | completed |

## Risks & Open Questions

| Risk/Question | Impact | Mitigation/Answer |
|---------------|--------|-------------------|
| Existing deployed strict readers reject new event lines. | High | Reader-first source/install rollout; document that installations must be refreshed before writers are enabled. |
| Some harnesses expose start but no trustworthy session-end hook. | Medium | Emit only observed transitions; leave those sessions `OPEN` and document the limitation. |
| Hard crashes cannot write a final event. | High | Define `OPEN` as unclosed, never as live; do not infer closure from age. |
| Hermes currently stores one process-global session. | High | Correct binding/concurrency in Phase 1 before Hermes lifecycle writing. |
| Pinned Claude/Hermes binaries are absent in the current environment. | Medium | Keep host-smoke gates explicit; use contract/hook tests locally and run host smokes where binaries exist before final completion. |
| Multiple processes may append to one file without stronger ordering guarantees. | Medium | Treat resulting physical line order as authoritative and promise no stronger cross-process ordering. |
| OpenCode revalidation may find no trustworthy lifecycle start/resume event. | Medium | Emit no OpenCode status event in that case; checkpoint-only logs remain `UNKNOWN` rather than fabricating `OPEN`. |

## Changelog

### 2026-07-31

- Plan created from the independent branch review and the user-approved JSONL `open`/`closed` status-event decision.
- Independent plan review findings F-1–F-4 applied: fixed Hermes parent-log mapping semantics, operationalized reader-first install/restart ordering, added the valid OpenCode no-hook/`UNKNOWN` result, and restricted `ERROR` to reader failure presentation.

### 2026-08-01

- All four implementation plans were authored and independently reviewed as one batch. Accepted Phase 3/4 findings were remediated with none unresolved.
- Phase 1 Adapter Correctness Hardening moved to in progress; its deliverables remain incomplete.
- Phase 1 Adapter Correctness Hardening completed and its independent implementation review returned Accepted with no findings.
- Local verification passed: 49 Hermes tests, 11 Codex tests, and `bash -n install.sh`. The final pinned Claude Code 2.1.170/Hermes v0.19.0 host-smoke blocker remains open.
- Phase 2 Status Contract and Readers moved to in progress; the overall plan remains active.
- Phase 2 Status Contract and Readers completed; independent implementation review returned Accepted, with 35/35 focused core/reader tests passing.
- Removed the sole Minor review finding, generated watcher `.scriptc` cache artifacts, without adding them to the Phase 2 deliverables.
- Phase 3 OpenCode and Codex Status Writers moved to in progress; the final pinned Claude Code 2.1.170/Hermes v0.19.0 host-smoke blocker remains open.
- Phase 3 implementation completed. Its initial implementation review returned Needs Rework with one Major finding, F-1; the same-session review-fix made required-reader preflight component-aware and resolved F-1 with no unresolved findings.
- Phase 3 verification passed: targeted OpenCode 12/12, then the final Phase 3 gate 59/59 plus `bash -n install.sh`.
- Phase 3 moved to completed and Phase 4 Claude, Hermes, and Rollout Closure moved to in progress. The final pinned Claude Code 2.1.170/Hermes v0.19.0 host-smoke blocker remains open.
- Phase 4 implementation completed. Its initial implementation review returned Needs Rework with Major F-1 and Minor F-2/F-3; the same-session review-fix resolved all three findings with none unresolved.
- Phase 4 verification passed for focused Claude 3/3, the current Node gate 81/82 with only the exact Claude Code 2.1.170 binary check unavailable, and the separate Hermes gate 53/54 with only the exact Hermes v0.19.0 binary check unavailable. `bash -n install.sh`, scoped diff checks, and source-anchor checks also passed.
- Phase 4 moved to completed. The overall plan remains active and blocked pending exact pinned-host verification; the full gate has not passed and plan completion is not claimed.
- User confirmed that the fully implemented plan must remain active and explicitly blocked until a suitable environment can run the exact Claude Code 2.1.170 and Hermes v0.19.0 host gate.
