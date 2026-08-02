---
type: planning
entity: todo
plan: "checkpoint-session-status-hardening"
updated: "2026-08-02"
---

# Todo: checkpoint-session-status-hardening

> Tracking [checkpoint-session-status-hardening](plan.md)

## Active Phase: Plan Completed

### Phase Context

- **Scope**: [Phase 6](phases/phase-6.md)
- **Implementation**: [Phase 6 Plan](implementation/phase-6-impl.md)
- **Latest Handover**: Not created
- **Relevant Docs**:
  - [Agent Checkpoint / Heartbeat](../../docs/agent-checkpoint-heartbeat.md)
  - [Checkpoint Core](../../docs/modules/checkpoint-core.md)
  - [OpenCode Checkpoint Adapter](../../docs/modules/opencode-checkpoint-adapter.md)
  - [Installation and Configuration](../../docs/modules/installation-and-configuration.md)

### Pending

None.

### In Progress

None.

### Completed

- [x] Pull commits `8085bfa`, `3910451`, and `3cb3f84` and inspect the completed rollout. <!-- completed: 2026-07-31 -->
- [x] Independently review and reproduce the five adapter/installer findings. <!-- completed: 2026-07-31 -->
- [x] Confirm the JSONL `session_status` design and conservative `open`/`closed` vocabulary with the user. <!-- completed: 2026-07-31 -->
- [x] Create this persistent plan and phase structure. <!-- completed: 2026-07-31 -->
- [x] Review the plan independently and apply findings F-1–F-4. <!-- completed: 2026-07-31 -->
- [x] Author and verify implementation plans for phases 1–4 before execution. <!-- completed: 2026-08-01 -->
- [x] Complete the independent batch review of all four implementation plans. <!-- completed: 2026-08-01 -->
- [x] Remediate all accepted Phase 3/4 implementation-plan review findings; none remain unresolved. <!-- completed: 2026-08-01 -->
- [x] Fix Hermes multi-session binding and add parent/child/concurrency regressions. <!-- completed: 2026-08-01 -->
- [x] Deliver and verify the complete Hermes heartbeat instruction. <!-- completed: 2026-08-01 -->
- [x] Fix quoted Hermes disabled-entry handling without changing config bytes. <!-- completed: 2026-08-01 -->
- [x] Preserve a symlinked Codex adapter destination directory. <!-- completed: 2026-08-01 -->
- [x] Clamp Hermes remaining context headroom to zero. <!-- completed: 2026-08-01 -->
- [x] Pass locally runnable Phase 1 verification: 49 Hermes tests, 11 Codex tests, and `bash -n install.sh`. <!-- completed: 2026-08-01 -->
- [x] Complete Phase 1 and receive an independent implementation-review verdict of Accepted with no findings. <!-- completed: 2026-08-01 -->
- [x] Add the exact status contract, compatibility APIs, physical-order reduction, and mixed-log analysis. <!-- completed: 2026-08-01 -->
- [x] Update inspector and watcher for explicit lifecycle state, neutral status-only metrics, and isolated reader failures. <!-- completed: 2026-08-01 -->
- [x] Add Phase 2 fixtures, tests, and contract/reader documentation without enabling adapter writers. <!-- completed: 2026-08-01 -->
- [x] Pass all 35/35 focused Phase 2 core/reader tests. <!-- completed: 2026-08-01 -->
- [x] Complete Phase 2 and receive an independent implementation-review verdict of Accepted. <!-- completed: 2026-08-01 -->
- [x] Remove the sole Minor review finding: generated watcher `.scriptc` cache artifacts. <!-- completed: 2026-08-01 -->
- [x] Append OpenCode `open` only on verified `session.created`, preserving unsupported resume as `UNKNOWN` and emitting no `closed`. <!-- completed: 2026-08-01 -->
- [x] Append Codex `open` from pinned `SessionStart` sources through the shared core while preserving existing hook output and checkpoint behavior. <!-- completed: 2026-08-01 -->
- [x] Keep Codex `Stop` and unsupported terminal events write-free; test and document pinned open-without-close semantics. <!-- completed: 2026-08-01 -->
- [x] Preflight required reader/core symlinks and enforce compatible reader assets before OpenCode/Codex writer assets and profile activation. <!-- completed: 2026-08-01 -->
- [x] Add and test stop-before-install plus dashboard-first startup guidance across installer output and affected documentation. <!-- completed: 2026-08-01 -->
- [x] Resolve initial implementation-review Major F-1 in the same review-fix session; no findings remain unresolved. <!-- completed: 2026-08-01 -->
- [x] Pass targeted OpenCode verification 12/12 and the final Phase 3 gate 59/59 plus `bash -n install.sh`. <!-- completed: 2026-08-01 -->
- [x] Complete Phase 3 OpenCode and Codex Status Writers after review remediation. <!-- completed: 2026-08-01 -->
- [x] Add only observed Claude lifecycle writes: parent/subagent `open` and parent `SessionEnd` `closed`, preserving identity, workspace, hook output, and sidecar behavior. <!-- completed: 2026-08-01 -->
- [x] Add Hermes parent-owned `open` only on verified `on_session_start`; keep child hooks mapping-only and emit no fabricated `closed`. <!-- completed: 2026-08-01 -->
- [x] Prove cross-adapter mixed, status-only, legacy, and current-log reader parity with capability-appropriate `OPEN`, `CLOSED`, and `UNKNOWN`. <!-- completed: 2026-08-01 -->
- [x] Extend component-aware required-reader preflight and reader-before-writer rollout sequencing through Claude and Hermes while preserving configuration and symlinks. <!-- completed: 2026-08-01 -->
- [x] Update lifecycle, installation, adapter, and module documentation with final capability limits and quiesce/install/dashboard-first/harness-start guidance. <!-- completed: 2026-08-01 -->
- [x] Reconcile only the stale `agent-checkpoint-heartbeat` plan state, keeping Phase 6 PydanticAI pending. <!-- completed: 2026-08-01 -->
- [x] Resolve initial Phase 4 implementation-review F-1 Major and F-2/F-3 Minor in the same review-fix session; none remain unresolved. <!-- completed: 2026-08-01 -->
- [x] Pass focused Claude verification 3/3, current Node verification 81/82 except the missing exact Claude binary check, separate Hermes verification 53/54 except the missing exact Hermes binary check, `bash -n`, scoped diff checks, and source-anchor checks. <!-- completed: 2026-08-01 -->
- [x] Complete Phase 4 Claude, Hermes, and Rollout Closure implementation after review remediation. <!-- completed: 2026-08-01 -->
- [x] Author and independently review the Phase 5 implementation plan. <!-- completed: 2026-08-01 -->
- [x] Implement lazy open and optional final `close_session` across adapters. <!-- completed: 2026-08-01 -->
- [x] Update subagent checkpoint instructions for declared final closure. <!-- completed: 2026-08-01 -->
- [x] Implement compact dashboard columns, grouping, and age sorting. <!-- completed: 2026-08-01 -->
- [x] Add cross-adapter lifecycle and deterministic dashboard regressions. <!-- completed: 2026-08-01 -->
- [x] Complete independent Phase 5 review with verdict Accepted and no findings. <!-- completed: 2026-08-01 -->
- [x] Author the grounded Phase 6 implementation plan, independently review it, and remediate accepted F-1–F-3 with none unresolved. <!-- completed: 2026-08-02 -->
- [x] Prioritize complete agent identity and truncate `NAME` first at ordinary widths. <!-- completed: 2026-08-02 -->
- [x] Hide rows without an event update for three hours by default and toggle them with `v` in live mode. <!-- completed: 2026-08-02 -->
- [x] Separate visible old unclosed rows from current unclosed rows without changing lifecycle semantics. <!-- completed: 2026-08-02 -->
- [x] Make `checkpoint-watch.js` compile statically with scriptc and pass non-TTY plus 80/120-column PTY live smokes. <!-- completed: 2026-08-02 -->
- [x] Add opportunistic verified native installation to `~/.local/bin` for global installs while preserving Node fallback and project isolation. <!-- completed: 2026-08-02 -->
- [x] Update watcher/install documentation and focused cross-harness parity expectations. <!-- completed: 2026-08-02 -->
- [x] Complete independent Phase 6 implementation review and resolve Major F-1 plus Minor F-2/F-3 with none unresolved. <!-- completed: 2026-08-02 -->
- [x] Fix newer OpenCode workspace resolution so a root-valued `worktree` falls back to the actual project directory; pass OpenCode 19/19. <!-- completed: 2026-08-02 -->
- [x] Close the plan on explicit user direction without another phase; retain the unavailable exact pinned-host gate as an unpassed closure exception. <!-- completed: 2026-08-02 -->

### Blocked

None. The exact Claude Code 2.1.170/Hermes v0.19.0 host gate was not run and remains recorded as a user-accepted closure exception.

## Changelog

### 2026-07-31

- Plan created after branch review; user selected strict JSONL `session_status` events with `open`/`closed` semantics.
- Independent plan review returned Needs Revision (0 Critical/2 Major/2 Minor); all findings were applied before implementation-plan authoring.

### 2026-08-01

- Authored all four implementation plans and completed their independent batch review.
- Remediated every accepted Phase 3/4 review finding; none remain unresolved.
- Started Phase 1 Adapter Correctness Hardening; no Phase 1 deliverable is marked complete.
- Completed Phase 1 Adapter Correctness Hardening; independent implementation review returned Accepted with no findings.
- Recorded passing local verification (49 Hermes tests, 11 Codex tests, and `bash -n install.sh`) while preserving the final pinned Claude Code/Hermes host-smoke blocker.
- Activated Phase 2 Status Contract and Readers and populated its pending work from the gated scope and implementation plan.
- Completed Phase 2 Status Contract and Readers; independent implementation review returned Accepted and all 35 focused core/reader tests passed.
- Cleaned up the sole Minor generated `.scriptc` cache finding.
- Activated Phase 3 OpenCode and Codex Status Writers and populated pending work from its scope and implementation plan; preserved the final pinned Claude Code/Hermes host-smoke blocker.
- Completed Phase 3 implementation; its initial implementation review returned Needs Rework with one Major F-1, then the same-session review-fix resolved F-1 with no unresolved findings.
- Recorded targeted OpenCode 12/12 and final Phase 3 gate 59/59 plus `bash -n install.sh` passing.
- Activated Phase 4 Claude, Hermes, and Rollout Closure and populated its pending work; preserved the final pinned Claude Code 2.1.170/Hermes v0.19.0 host-smoke blocker.
- Completed all Phase 4 implementation work. The initial implementation review returned Needs Rework with Major F-1 and Minor F-2/F-3; the same-session review-fix resolved all three with none unresolved.
- Recorded focused Claude 3/3, current Node 81/82 with only the exact Claude Code 2.1.170 binary check unavailable, separate Hermes 53/54 with only the exact Hermes v0.19.0 binary check unavailable, plus passing `bash -n`, scoped diff checks, and source-anchor checks.
- Marked Phase 4 completed and cleared pending/in-progress implementation work. Overall plan completion remains blocked solely on the exact pinned-host gate; the full gate is not claimed as passed.
- Recorded the user's decision to keep the fully implemented plan active and blocked until a suitable environment can run the exact Claude Code 2.1.170 and Hermes v0.19.0 host gate; final success remains unclaimed.
- Added and activated Phase 5 for lazy checkpoint-open, explicit final subagent closure, and a compact dashboard after live usage feedback. The exact pinned-host gate remains independently blocked.
- Completed Phase 5 implementation and cleared all Phase 5 implementation todos; the independent implementation review returned Accepted with no findings.
- Recorded local evidence: Node 87/88 with only the exact Claude Code 2.1.170 binary unavailable, Hermes 54/55 with only the exact Hermes v0.19.0 binary unavailable, reviewer-focused Node 40/40 and Hermes 22/22, plus passing `bash -n` and diff checks.
- Returned the plan to active/blocked solely on the existing exact pinned-host gate. The broad gate is not claimed as passed.

### 2026-08-02

- Activated Phase 6 for dashboard identity width, three-hour visibility toggling, and optional scriptc-native installation. The exact pinned-host gate remains a separate blocker for overall plan completion.
- Authored and independently reviewed the Phase 6 implementation plan. Accepted findings F-1–F-3 were remediated in the reviewer session; implementation is now in progress.
- Completed Phase 6 and its review remediation. Watcher 17/17, native non-TTY and 80/120-column PTY smokes, focused installer 4/4, and documentation anchors pass; only the unchanged exact Claude/Hermes host checks remain unavailable.
- Returned the plan to active/blocked solely on the exact pinned-host gate. No broad-gate success or overall plan completion is claimed.
- Fixed the newer OpenCode root-worktree regression and passed all 19 OpenCode tests.
- Closed the plan on explicit user direction without another phase. The exact pinned-host gate remains documented as unavailable and unpassed.
