---
type: review
entity: implementation-review
plan: "checkpoint-session-status-hardening"
phase: 3
status: final
reviewer: "delegate"
created: "2026-08-01"
---

# Implementation Review: Phase 3 - OpenCode and Codex Status Writers

> Reviewing implementation of [Phase 3](../phases/phase-3.md)
> Against the remediated [Implementation Plan](../implementation/phase-3-impl.md), [Implementation-Plan Review](impl-plan-review-phase-3.md), and [Plan](../plan.md)

## Overall Assessment

**Verdict**: Needs Rework

The lifecycle writers themselves are truthful: OpenCode maps only verified `session.created` to `open`, pinned Codex maps `SessionStart` to `open`, both await the shared exact append path, and neither fabricates `closed`. The approved gate passes 59/59 Node tests with no skips plus Bash syntax validation, but the Phase 3 reader-symlink preflight can be bypassed by symlinked ancestor directories; focused isolated runs followed those links, overwrote user-managed reader targets, and then installed the dependent status writer. That violates the explicit reader-first and symlink-preservation acceptance boundary and blocks acceptance.

## Acceptance Criteria Verification

| # | Criterion | Met? | Evidence | Gap |
| - | --------- | ---- | -------- | --- |
| 1 | Each emitted event carries the correct session ID, workspace log path, timestamp, discriminator, and status. | Yes | OpenCode takes `event.properties.info.id` plus the plugin worktree and awaits `appendSessionStatus` (`opencode/checkpoint-runtime.mjs:151-159`). Codex validates native `session_id`/`cwd` and awaits the same shared API (`codex/checkpoint-hook.mjs:34-51`). The shared core creates the timestamped exact record and performs one line append (`packages/checkpoint-core/src/index.js:224-227`, `packages/checkpoint-core/src/index.js:260-268`). Process/filesystem tests assert exact four-field records and selected workspace paths (`opencode/test/checkpoint-plugin.test.mjs:349-382`, `codex/test/checkpoint-codex.test.mjs:330-365`). | None. |
| 2 | No turn-level or checkpoint event is misreported as graceful session closure. | Yes | The OpenCode callback returns for every event except `session.created` (`opencode/checkpoint-runtime.mjs:151-154`); Codex dispatch handles only `SessionStart` and checkpoint `PreToolUse` (`codex/checkpoint-hook.mjs:81-89`). `Stop`, `SessionEnd`, activity/deletion events, and checkpoint writes are exercised as no-close paths (`opencode/test/checkpoint-plugin.test.mjs:384-424`, `codex/test/checkpoint-codex.test.mjs:496-556`). | None. |
| 3 | Unsupported close behavior leaves the latest state `OPEN` and is documented. | Yes | Mixed OpenCode and Codex logs remain `OPEN` with no `closed` record (`opencode/test/checkpoint-plugin.test.mjs:408-424`, `codex/test/checkpoint-codex.test.mjs:496-556`). The supported limits and non-liveness meaning are explicit in `docs/installation.md:33-44` and `codex/README.md:77-90`. | None. |
| 4 | Without a trustworthy OpenCode resume event, no status line is emitted and checkpoint-only logs remain `UNKNOWN`. | Yes | The resumed-session case writes a checkpoint, feeds unsupported activity/status/idle/deletion events, and verifies one checkpoint, no status, and `UNKNOWN` (`opencode/test/checkpoint-plugin.test.mjs:384-406`). | None. |
| 5 | Existing checkpoint writes and metrics remain unchanged. | Yes | OpenCode's mixed-log assertion retains one checkpoint and unchanged work metrics (`opencode/test/checkpoint-plugin.test.mjs:408-424`); Codex verifies duplicate opens plus an ordinary MCP checkpoint remain one checkpoint with unchanged metrics (`codex/test/checkpoint-codex.test.mjs:367-401`). Existing core, OpenCode, and Codex regressions all pass in the 59-test gate. | None. |
| 6 | Installed readers and writer assets are mutually compatible and symlink-safe. | Partial | Ordinary installs copy OpenCode core/watcher before runtime/plugin and Codex core before hook/profile (`install.sh:976-1008`, `install.sh:1050-1120`). Exact required-path and Codex whole-directory links stop before mutation (`install.sh:929-974`; tests at `opencode/test/checkpoint-plugin.test.mjs:670-760` and `codex/test/checkpoint-codex.test.mjs:669-743`). | **F-1:** symlinked ancestors such as `checkpoint-watch/bin` or `lib/opencode-processing-skills` are not detected, are followed during copy, and permit the dependent plugin installation. |
| 7 | Isolated tests prove reader-before-writer installation, and guidance requires dashboard-first startup. | Partial | Ordinary marker order, early quiescence, dashboard-before-harness output, and corresponding docs are asserted (`opencode/test/checkpoint-plugin.test.mjs:617-642`, `opencode/test/checkpoint-plugin.test.mjs:763-798`, `codex/test/checkpoint-codex.test.mjs:563-596`). Installer output itself is ordered at `install.sh:1403-1410` and `install.sh:1566-1585`. | The symlink suite tests leaf paths and selected whole trees but misses the ancestor-link bypass in F-1, so it does not prove the full preflight invariant. |

## Plan Adherence

| Step | Planned | Actual | Deviation? | Assessment |
| ---- | ------- | ------ | ---------- | ---------- |
| 1 | Append OpenCode `open` only on `session.created`. | Implemented with native event identity, plugin worktree, shared append API, ignored resume/activity/close candidates, and focused tests. | No | Complete. |
| 2 | Append Codex `open` from pinned `SessionStart` and await persistence before output. | Implemented for startup/resume/clear/compact; dispatch and process completion await the async append while preserving the output wire. | No | Complete. |
| 3 | Keep unsupported Codex closure explicit and write-free. | `Stop`, `SessionEnd`, and unknown events remain unregistered/write-free; tests and docs retain `OPEN` without claiming liveness. | No | Complete. |
| 4 | Preflight required reader links, preserve them, and install readers before writers. | Leaf/selected whole-tree preflight and ordinary copy order are implemented, but symlinked path components can bypass the gate and be overwritten. | Yes | Incomplete; F-1 blocks the required compatibility guarantee. |
| 5 | Print and document quiesce → install → dashboard → harness order. | Stable early and final output plus user/module documentation preserve the required sequence. | No | Complete. |

## Code Quality Assessment

### Findings

- **F-1 (Major) — OpenCode required-reader preflight ignores symlinked ancestor directories.** `preflight_required_checkpoint_reader` checks only whether each exact final path is a link (`install.sh:938-945`), while the dependency list omits path components such as the support root and watcher `bin`/`src` directories (`install.sh:947-963`). Copying later follows those directories (`install.sh:984-1008`). In disposable fixtures, a symlinked `checkpoint-watch/bin` and a symlinked `lib/opencode-processing-skills` both produced exit 0, changed protected target bytes, and still installed `plugins/checkpoint.ts`; this contradicts the loud-stop/untouched-target contract and makes the preflight incomplete.

## Testing Assessment

### Verify Command Result

- **Command**: `node --test packages/checkpoint-core/test/*.test.js opencode/test/*.test.mjs codex/test/*.test.mjs && bash -n install.sh`
- **Exit Code**: `0`
- **Result**: Pass — 59 tests, 59 passed, 0 failed, 0 cancelled, 0 skipped, 0 todo; `bash -n install.sh` also passed. Full output: `/tmp/opencode/cssh-phase3-impl-review-final-gate.log`.

### Test Quality

| Test | What it Tests | Meaningful? | Issue |
| ---- | ------------- | ----------- | ----- |
| OpenCode lifecycle test | Real shared-core writes for parent/subagent creation, exact record shape, ignored activity/deletion, unsupported resume `UNKNOWN`, and unchanged checkpoint metrics. | Yes | None. |
| Codex `SessionStart` process tests | All four pinned sources, exact output keys, actual JSONL writes, duplicate opens, mixed logs, invalid inputs, and append failure propagation. | Yes | None. |
| Codex unsupported-close test | Process-level `Stop`/`SessionEnd`/unknown-event no-output and byte-for-byte no-write behavior, retaining `OPEN`. | Yes | None. |
| Installer ordering and preservation tests | Isolated homes, emitted copy/startup order, base-config byte preservation, ordinary links, required leaf links, and Codex whole-directory/core links. | Partial | Does not exercise symlinked ancestors of required OpenCode reader files; F-1 passes through the preflight and mutates their targets. |
| Documentation ordering test | Capability wording and ordered quiesce/install/dashboard/harness instructions across user docs. | Yes | Behavioral runtime ordering is separately covered by installer integration tests. |

### Real-World Testing

Performed at process/filesystem integration level: the real Node hook, shared core, MCP path, and installer were exercised in isolated homes and workspaces. A live pinned Codex/OpenCode host session was not run in this review; the phase relies on the gated primary-source/pin revalidation recorded by the implementation plan, and the user-approved Phase 3 gate does not require the later host-smoke closure. This remains an environment/integration limitation, not an additional finding.

## Scope Compliance

### Findings

- Review evidence and findings were limited to the Phase 3 OpenCode/Codex writers, installer behavior, their focused tests, and directly affected documentation. Phase 1–2 implementation changes and unrelated framework-role edits in the mixed working tree were excluded.

## Regression Risk

### Test Integrity Check

- [x] No existing tests were deleted.
- [x] No existing tests were disabled (`skip`, `todo`, or focused-only markers are absent).
- [x] No existing assertions were weakened to make the implementation pass. The former successful watcher-link preservation case was intentionally replaced by stricter required-reader abort-and-preserve cases because Phase 3 changes that path's required behavior.
- [x] All pre-existing tests still pass within the 59-test gate.

### Findings

- The remaining regression risk is F-1: installations with symlinked reader ancestors can overwrite user-managed targets and activate a writer despite the promised preflight. Ordinary paths and the currently tested leaf-link cases are covered well.

## Findings Summary

| ID | Severity | Area | Finding | Recommendation |
| --- | -------- | ---- | ------- | -------------- |
| F-1 | Major | Installer / reader-first symlink safety | OpenCode preflight checks only exact leaf/selected tree paths, so symlinked required-reader ancestors are followed and overwritten before the dependent status writer is installed. | Before any target mutation, reject any user-managed symlink component that can redirect a required OpenCode core/watcher destination (including the support root and watcher `bin`/`src` directories), preserve link and target bytes, emit path-specific recovery guidance, and add global/project isolated regressions proving nonzero-before-writer behavior. |

## Recommendations

1. **Blocks acceptance:** close F-1 by making required-reader preflight component-aware (or otherwise preventing all copy-through-link cases), while retaining the existing ordinary reader-first order and unrelated symlink guarantees.
2. Add focused installer tests for symlinked `lib/opencode-processing-skills`, `checkpoint-watch/bin`, and `checkpoint-watch/src`; assert nonzero exit before Step 1/writer changes, unchanged links and targets, and the existing recovery message.
3. Rerun the affected OpenCode installer tests, then the approved 59-test plus `bash -n install.sh` gate once the fix is ready.

## Same-Session Review-Fix Addendum — 2026-08-01

**Final disposition after remediation**: Accepted — no unresolved findings.

- F-1 was resolved by making required-reader preflight component-aware so symlinked ancestors cannot redirect protected OpenCode reader destinations before dependent writer installation.
- Focused targeted OpenCode verification passed 12/12.
- The final Phase 3 gate passed 59/59, and `bash -n install.sh` passed.
- The original **Needs Rework** verdict and Major F-1 above are retained as the initial-review history; this addendum records the same-session review-fix closure.
