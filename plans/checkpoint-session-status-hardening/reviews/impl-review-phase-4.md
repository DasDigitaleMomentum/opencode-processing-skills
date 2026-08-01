---
type: review
entity: implementation-review
plan: "checkpoint-session-status-hardening"
phase: 4
status: final
reviewer: "delegate"
created: "2026-08-01"
---

# Implementation Review: Phase 4 - Claude, Hermes, and Rollout Closure

> Reviewing implementation of [Phase 4](../phases/phase-4.md)
> Against [Implementation Plan](../implementation/phase-4-impl.md), [Implementation Plan Review](impl-plan-review-phase-4.md), and [Plan](../plan.md)

## Overall Assessment

**Initial Verdict**: Needs Rework

The implementation otherwise follows the remediated design: it emits only evidenced lifecycle transitions, gives Hermes parent-owned identity, preserves the strict mixed-record contract, preflights required readers before installation mutation, and documents the complete quiesce/install/dashboard/harness sequence. One Major identity defect blocks acceptance: a Claude `SubagentStart` without `agent_id` is accepted as a parent start and writes `open` to the parent log instead of failing without a guessed write; two bounded documentation/reconciliation issues should be corrected alongside it. The absent pinned Claude 2.1.170 and Hermes v0.19.0 binaries remain the explicitly recorded final host-gate blocker, not a code finding.

**Same-session review-fix disposition**: F-1 (Major) and F-2/F-3 (Minor) were resolved; none remain unresolved. Phase 4 implementation is accepted as complete, while overall plan completion remains blocked on the exact pinned-host gate.

## Acceptance Criteria Verification

| # | Criterion | Met? | Evidence | Gap |
| - | --------- | ---- | -------- | --- |
| 1 | Claude and Hermes append only observed transitions with correct parent/subagent identity. | Partial | Claude gates dispatch to `SessionStart`, `SubagentStart`, and parent `SessionEnd` in `claude/agent-checkpoint/scripts/checkpoint-hook.mjs:190-202`; Hermes writes only parent-owned `open` in `hermes/agent-checkpoint/agent_checkpoint.py:352-375`. | F-1: Claude accepts `SubagentStart` without the required `agent_id` and writes against the parent identity. |
| 2 | Missing graceful-end hooks leave sessions unclosed rather than synthesizing status. | Yes | Claude has no child-close path and closes only on `SessionEnd` (`checkpoint-hook.mjs:154-187`); Hermes registers no close hook (`hermes/agent-checkpoint/plugin.yaml:9-14`) and continued/child mapping paths are write-free. | None. |
| 3 | Inspector/dashboard preserve legacy, current, status-only, and mixed behavior across adapters. | Yes | `hermes/test/test_agent_checkpoint.py:985-1163` drives all four adapters' writers through inspector and watcher, including `OPEN`, `CLOSED`, `UNKNOWN`, status-only neutrality, mixed logs, and legacy-only input. The supplied parity checks pass. | None. |
| 4 | Installation remains additive, opt-in, idempotent, and symlink/config preserving. | Yes | Claude base settings and symlinks are exercised at `claude/test/checkpoint-claude.test.mjs:975-1134`; Hermes additive config, disabled forms, idempotency, and plugin symlinks are exercised at `hermes/test/test_agent_checkpoint.py:700-952`. No Phase 4 regression was found. | None. |
| 5 | Reader assets precede writers, and the upgrade sequence prevents old-reader/new-writer overlap. | Yes | Component-walking preflight is at `install.sh:929-999` and runs before Step 1 at `install.sh:1430-1437`; installed readers/cores precede hooks and enablement at `install.sh:1001-1427`; final output orders dashboard before harnesses at `install.sh:1593-1633`. Focused preflight/order tests pass. | None. |
| 6 | Related plan artifacts no longer present completed phases as pending. | Partial | `plans/agent-checkpoint-heartbeat/plan.md:105-114` and `todo.md:12-30` correctly leave only Phase 6 active/pending, and completed Phase 1-5 checklists are checked. | F-2: Phase 6 still leaves its already-satisfied Phase 3 authorization prerequisite unchecked, and two completed dependency notes remain future-tense. |
| 7 | Final tests pass, or unavailable pinned binaries are an explicit blocker. | Yes, blocked | Supplied evidence records 80/81 Node tests, with only the fail-clear Claude 2.1.170 requirement unavailable; 20 Claude non-host tests, 53 Hermes non-host tests, parity/installer/docs checks, and `bash -n` pass. The Hermes v0.19.0 host check fails clearly because the binary is absent. | The exact two-pin host gate remains required before Phase 4 can be declared complete; this is the known environment blocker, not a code defect. |

## Plan Adherence

| Step | Planned | Actual | Deviation? | Assessment |
| ---- | ------- | ------ | ---------- | ---------- |
| 1 | Add only observed Claude lifecycle writes with exact native/composite identity. | Parent start/end and valid composite child start are implemented through the shared core. | Yes | F-1 violates the planned fail-visible/no-guessed-write rule for a malformed `SubagentStart`. |
| 2 | Add conservative Hermes parent-log lifecycle writing. | Exact four-field validation/creation is mirrored; only `on_session_start` writes parent `open`; child/continuation hooks remain mapping-only. | No | Conforms. |
| 3 | Prove cross-adapter mixed-log reader parity. | Actual adapter writers are exercised through inspector and watcher with capability-specific states and neutral status-only metrics. | No | Conforms; tests are behaviorally meaningful. |
| 4 | Complete component-aware reader preflight and safe rollout ordering. | All required OpenCode/Codex/Claude reader components are checked before mutation; shared-reader success gates Hermes; quiescence and dashboard-first startup are explicit. | No | Conforms to the remediated implementation plan. |
| 5 | Reconcile lifecycle docs and inventories. | Contract, capability matrix, rollout instructions, and adapter READMEs are accurate. | Yes | F-3: the two updated module inventories retain stale source-line anchors. |
| 6 | Reconcile only stale checkpoint-plan state while retaining Phase 6. | Main plan/todo and completed phase checklists are corrected; Phase 6 remains pending. | Yes | F-2 leaves a small but real state contradiction/future-tense residue. |
| 7 | Enforce exact pinned-host completion gate. | Both tests fail clearly on missing/wrong pinned binaries; local evidence does not claim to replace them. | No | Correctly implemented; execution remains externally blocked by absent binaries. |

## Code Quality Assessment

### Findings

- **F-1 (Major) — Claude can misattribute a malformed subagent start to the parent.** `compositeCheckpointId` deliberately returns the native parent ID whenever `agent_id` is absent (`claude/agent-checkpoint/scripts/checkpoint-hook.mjs:65-72`), and `handleSubagentStart` uses that result without requiring a child identity (`:94-106`). A focused process reproduction with `{hook_event_name:"SubagentStart", session_id:"parent"}` exited 0, emitted `Session checkpoint ID: parent`, and created `.agent-checkpoints/parent.jsonl` containing parent `open`. This contradicts the implementation plan's requirement that missing identity fail visibly without writing a guessed record and can spuriously reopen or create the parent's lifecycle state.
- Apart from F-1, the implementation reuses the shared append primitive, keeps lifecycle and checkpoint schemas separate, makes failures visible, introduces no dependency, and preserves the existing adapter patterns.

## Testing Assessment

### Verify Command Result

- **Phase command**: `node --test packages/checkpoint-core/test/*.test.js opencode/test/*.test.mjs codex/test/*.test.mjs claude/test/*.test.mjs && python3 -m unittest discover -s hermes/test && bash -n install.sh`
- **Exit Code**: Nonzero on this host.
- **Result**: Expected environment-blocked result: 80/81 Node tests pass and the sole Node failure is the explicit missing Claude 2.1.170 binary requirement; the Hermes v0.19.0 host check likewise fails clearly because `hermes` is absent. Supplied host-excluded evidence passes 20 Claude and 53 Hermes tests plus parity/installer/docs checks and shell syntax.
- **Reviewer-focused checks**: 6/6 selected Claude lifecycle/preflight tests passed; 5/5 selected Hermes lifecycle/preflight/parity tests passed; `bash -n install.sh` and scoped `git diff --check` passed. The focused malformed-`SubagentStart` reproduction exposed F-1.

### Test Quality

| Test | What it Tests | Meaningful? | Issue |
| ---- | ------------- | ----------- | ----- |
| Claude lifecycle/process tests | Exact parent open/close, composite child open, installed sibling-core loading, status key shape, sidecar isolation, and missing parent/workspace errors. | Yes | No negative test requires `agent_id` on `SubagentStart`, so F-1 escaped. |
| Hermes lifecycle/binding tests | Exact status shape, parent ownership, mapping-only children, continued-session `UNKNOWN`, interleaved binding, and no close registration. | Yes | None found. |
| Cross-adapter parity | Real adapter writers feeding common inspector/watcher paths and capability-specific state/metric output. | Yes | None found. |
| Installer tests | Mutation-free required-reader failures, component symlinks, config-byte preservation, opt-in behavior, idempotency, and printed ordering. | Yes | None found in the Phase 4 deltas. |
| Pinned-host checks | Exact Claude 2.1.170 strict plugin validation and Hermes v0.19.0 plugin enable/disable behavior. | Yes | Not runnable on this host; remains the explicit completion blocker. |

### Real-World Testing

**Status: Not performed for the exact pinned-host portion; local process/integration testing was performed.** The local suites execute real Node hook processes, installed-layout copies, Python plugin callbacks, isolated installer homes, and inspector/watcher subprocesses rather than relying only on mocks. They cannot validate host-owned Claude payload/plugin loading or Hermes plugin loading against the required binaries because neither pin is installed; the implementation and plan report that limitation explicitly and do not convert it into a skip or a green final gate.

## Scope Compliance

### Findings

- Review and findings are restricted to Phase 4 Claude/Hermes lifecycle, rollout installer, parity, documentation/inventory, and bounded legacy-plan reconciliation changes. Prior-phase core/OpenCode/Codex implementation and unrelated framework-role edits were excluded.
- Hermes remains parent-log-only, no close mechanism or PydanticAI implementation was added, and Phase 6 stays pending.

## Regression Risk

### Test Integrity Check

- [x] No existing phase-scoped tests were deleted without equivalent or stronger replacement coverage.
- [x] No existing tests were disabled or focused out.
- [x] No existing assertions were weakened to silence failures; lifecycle expectation changes correspond to the authorized status contract.
- [x] All locally runnable pre-existing phase-scoped tests pass; the two exact host checks are unavailable and fail clearly rather than being skipped.

### Findings

- F-1 is a regression risk for parent lifecycle state because malformed or changed host payloads can write a parent `open` from a subagent hook. Requiring both native parent and child identity before append keeps that risk fail-closed.

## Documentation & Cleanup

### Findings

- **F-2 (Minor) — bounded legacy-plan reconciliation is not fully internally consistent.** `plans/agent-checkpoint-heartbeat/phases/phase-6.md:41` leaves “Phase 3 authorizes later harness execution” unchecked even though Phase 3 records that decision complete at `phases/phase-3.md:49`. In addition, Phase 1 still labels Phases 4-6 “Future harness adapters” (`phase-1.md:67`), and Phase 4 says completed Phase 5 “may be implemented” (`phase-4.md:63`). These are within the expressly authorized reconciliation boundary; checking only the proven Phase 3 prerequisite and making the two dependency notes present-tense would retain all PydanticAI implementation/API/test items as pending.
- **F-3 (Minor) — updated module inventories point to stale source locations.** Examples: `docs/modules/checkpoint-core.md` documents `validateCheckpointRecord` at line 59 (actual 61), inspector `main` at 39 (actual 55), and watcher `main` at 270 (actual 318); `docs/modules/installation-and-configuration.md` documents `install_opencode_checkpoint_instruction` at 959 (actual 1037) and top-level workflows around 984-1106 although they now begin at 1438 and later. The inventories otherwise describe the new symbols and behavior correctly, but their navigation anchors do not meet the implementation plan's “current symbols/locations” requirement.

## Findings Summary

| ID | Severity | Area | Finding | Recommendation |
| --- | -------- | ---- | ------- | -------------- |
| F-1 | Major | Claude lifecycle identity | `SubagentStart` without `agent_id` falls back to the parent ID and persists a parent `open` instead of failing without a write. | Require a non-empty native `session_id` and `agent_id` specifically in `handleSubagentStart` before composing/appending; add a process-level negative test asserting nonzero/stderr and no parent or child JSONL file. |
| F-2 | Minor | Legacy-plan reconciliation | One already-satisfied Phase 6 prerequisite remains unchecked and two dependency notes still describe completed adapters as future work. | Check only the proven Phase 3 prerequisite and rewrite the two stale dependency notes; keep Phase 6 status and all PydanticAI implementation/API/test criteria pending. |
| F-3 | Minor | Documentation inventories | Source-line anchors in the checkpoint-core and installation inventories were not refreshed after the rollout changes. | Reconcile the affected symbol/workflow anchors against current source while leaving the behavioral text and inventory scope unchanged. |

## Recommendations

1. **Blocks acceptance:** fix F-1 and add the missing malformed-subagent identity regression test.
2. **Before closing the rollout:** apply the bounded F-2 plan-state correction and F-3 inventory-anchor refresh.
3. Repeat the focused Claude lifecycle test and locally runnable gate after remediation. Keep the single exact Claude 2.1.170/Hermes v0.19.0 host gate visibly blocked until both binaries are available; do not weaken or split it into a completion claim.

## Same-Session Review-Fix Resolution

- **F-1 resolved**: malformed Claude `SubagentStart` input now requires the child identity and fails without writing a guessed parent lifecycle event; focused Claude verification passed 3/3.
- **F-2 resolved**: the bounded legacy-plan prerequisite and stale dependency wording were reconciled without marking PydanticAI complete.
- **F-3 resolved**: affected module inventory source anchors were refreshed and anchor checks passed.
- **Verification after fixes**: the current Node gate passed 81/82, with only the exact Claude Code 2.1.170 binary check unavailable. The separate Hermes gate passed 53/54, with only the exact Hermes v0.19.0 binary check unavailable. `bash -n install.sh`, scoped diff checks, and source-anchor checks passed.
- **Final finding state**: no review findings remain unresolved. The full exact pinned-host gate did not pass on this host and remains the sole blocker to overall plan completion.
