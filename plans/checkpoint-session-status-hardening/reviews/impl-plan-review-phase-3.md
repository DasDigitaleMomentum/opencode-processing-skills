---
type: review
entity: implementation-plan-review
plan: "checkpoint-session-status-hardening"
phase: 3
review_mode: "batch"
batch_phases: "1, 2, 3, 4"
status: final
reviewer: "delegate"
created: "2026-08-01"
---

# Implementation Plan Review: Phase 3 - OpenCode and Codex Status Writers

> Reviewing [Phase 3 Implementation Plan](../implementation/phase-3-impl.md)
> Against [Phase 3 Scope](../phases/phase-3.md) and [Plan](../plan.md)

## Overall Assessment

**Verdict**: Needs Revision

The capability mapping is honest and technically grounded: OpenCode creation and pinned Codex `SessionStart` authorize `open`, while resume/close gaps and Codex `Stop` are not fabricated into lifecycle events. One installation gap remains: copy order alone cannot establish reader-before-writer compatibility when a required reader/core destination is a preserved stale symlink, yet the plan still permits the status-capable writer or activation profile to be installed.

## Scope Alignment

### Findings

- No scope expansion was found. The plan limits OpenCode to creation-only `open`, limits pinned Codex to `SessionStart` `open`, explicitly ignores turn-level `Stop`, and defers Claude/Hermes and every re-pin or new identity surface.

## Technical Feasibility

### Findings

- **F-1 (Major): preserved reader symlinks can defeat the required reader-before-writer guarantee.** `install_opencode_checkpoint_file` currently treats any destination symlink as a successful skip (`install.sh:916-927`). Reordering calls therefore does not make the installed system compatible if `checkpoint-core.mjs`, the watcher bin, or the watcher's private `src/index.js` remains linked to a pre-Phase-2 reader: the installer can continue and copy the new OpenCode runtime/plugin, which can emit four-field records that the preserved reader rejects. The same issue exists for a per-file symlinked Codex `checkpoint-core.mjs`: a newly copied hook imports that sibling and can fail because the preserved module lacks `appendSessionStatus`. Step 4 acknowledges that a skipped symlink is user-managed, but it does not define a stop/withhold path for dependent writers or profiles, so the global compatibility invariant is not met.
- Apart from F-1, the writer mechanics fit current code. `createOpenCodeCheckpointPlugin` has one return object that can add a generic `event` callback without changing the two tools, and the Codex hook already owns authoritative `session_id`/`cwd`, exact output wires, and a process-level failure boundary suitable for awaiting the shared append helper.
- The Reality Check accurately distinguishes OpenCode creation from resume/activity/deletion/disposal and pinned Codex `SessionStart` from turn-scoped `Stop` and post-pin `SessionEnd`. No unsupported close or process-liveness claim is planned.

## Step Quality Assessment

| Step | Title | Concrete? | Actionable? | Issue |
| ---- | ----- | --------- | ----------- | ----- |
| 1 | Append OpenCode open only on session creation | Yes | Yes | None |
| 2 | Append Codex open events from pinned SessionStart | Yes | Yes | None |
| 3 | Make unsupported Codex closure explicit and testable | Yes | Yes | None |
| 4 | Enforce reader assets before writer assets in installation | Partial | No | F-1: no dependent-writer policy when a required reader/core asset is skipped as a symlink |
| 5 | Operationalize dashboard-before-harness restart guidance | Yes | Yes | None |

All steps cite gated requirements or preserved invariants, and Phase 1/2 completion is correctly treated as an execution prerequisite. F-1 is the only point where an implementer must choose unplanned behavior with acceptance consequences.

## Required Context Assessment

### Missing Context

- None. The relevant installer helper and existing symlink tests are listed; the missing element is a plan decision for their status-writer dependency behavior, not another source reference.

### Unnecessary Context

- None.

## Testing Plan Assessment

### Test Integrity Check

The plan preserves the OpenCode two-tool, identity, metadata, telemetry, and exact checkpoint assertions; the Codex hook/MCP/profile wire assertions; Phase 1 symlink/config tests; and Phase 2 mixed-reader behavior. Intentional asynchronous `SessionStart` and watcher-state updates are narrowly justified, and no skip or weakened assertion is authorized.

### Test Gaps

- **F-1:** Marker ordering and ordinary installed-byte checks do not prove compatibility when reader files are preserved symlinks. Add isolated stale-symlink cases for OpenCode's core/watcher reader assets and Codex's bundled core, and assert the chosen safe behavior: fail/stop before a dependent writer is installed or activated, or withhold that writer/profile with explicit remediation guidance. An output sequence that says “Symlink (skipping)” before “Installed” is not a passing reader-first assertion.

### Real-World Testing

Relevant and proportionately planned through primary-source capability revalidation plus process-level hook/plugin behavior tests. The plan should not substitute activity, deletion, `Stop`, or process exit for unavailable lifecycle hooks. No additional host infrastructure is required for F-1; it is fully reproducible in isolated installer homes.

## Findings Summary

| ID | Severity | Area | Finding | Recommendation |
| --- | -------- | ---- | ------- | -------------- |
| F-1 | Major | Reader-first installation | Preserving a stale required reader/core symlink allows a new status writer or activation profile to be installed even though the reader/core was not refreshed; call order alone does not ensure compatibility. | Define dependency-aware installer behavior for skipped required reader assets, prevent dependent writer installation/activation in that case, emit explicit recovery guidance, and test stale-symlink paths rather than marker order alone. |

## Recommendations

1. Resolve F-1 before execution by specifying and testing a safe stop-or-withhold policy for status writers whenever a required reader/core asset is preserved rather than refreshed.
2. Retain the current creation/`SessionStart`-only capability mapping and the explicit no-close/no-resume claims; those parts are ready.
