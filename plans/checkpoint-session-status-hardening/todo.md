---
type: planning
entity: todo
plan: "checkpoint-session-status-hardening"
updated: "2026-08-01"
---

# Todo: checkpoint-session-status-hardening

> Tracking [checkpoint-session-status-hardening](plan.md)

## Active Phase: None - Implementation Complete, Host Gate Blocked

### Phase Context

- **Scope**: [Phase 4](phases/phase-4.md)
- **Implementation**: [Phase 4 Plan](implementation/phase-4-impl.md)
- **Latest Handover**: Not created
- **Relevant Docs**:
  - [Agent Checkpoint / Heartbeat](../../docs/agent-checkpoint-heartbeat.md)
  - [Checkpoint Core](../../docs/modules/checkpoint-core.md)
  - [OpenCode Checkpoint Adapter](../../docs/modules/opencode-checkpoint-adapter.md)
  - [Installation and Configuration](../../docs/modules/installation-and-configuration.md)

### Pending

None. No implementation work remains.

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

### Blocked

- [ ] In a suitable environment, run the exact host gate with Claude Code 2.1.170 and Hermes v0.19.0, then evaluate overall plan completion. Until then, the fully implemented plan remains active and blocked; the full gate and final success are not claimed. <!-- blocked: 2026-07-31, reason: required host binaries unavailable -->

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
