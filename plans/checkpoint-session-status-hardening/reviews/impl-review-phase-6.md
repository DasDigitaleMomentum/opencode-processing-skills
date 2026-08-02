---
type: review
entity: implementation-review
plan: "checkpoint-session-status-hardening"
phase: 6
status: final
reviewer: "delegate"
created: "2026-08-02"
---

# Implementation Review: Phase 6 - Watcher Usability and Native Packaging

> Reviewing implementation of [Phase 6](../phases/phase-6.md)
> Against [Implementation Plan](../implementation/phase-6-impl.md) and [Plan](../plan.md)

## Overall Assessment

**Verdict**: Needs Rework

The Node watcher, exact three-hour filtering, live toggle/cleanup, real scriptc build and live paths, and installer isolation are substantially implemented and well tested. However, the native executable selected as the preferred global launch hard-codes a 120-column render and emits 120-character lines in an 80-column PTY, violating the phase's narrow-width contract and the updated documentation; this Major finding blocks acceptance. Two Minor gaps remain in native schema-parity coverage and directly affected module-inventory anchors.

## Acceptance Criteria Verification

| # | Criterion | Met? | Evidence | Gap |
| - | --------- | ---- | -------- | --- |
| 1 | Full known agent identities remain visible at ordinary widths, `NAME` truncates first, and narrow output is bounded. | Partial | `formatDashboardView` reserves full `AGENT` width (`packages/checkpoint-core/bin/checkpoint-watch.js:613-647`); the 120/64/63-column Node regression passes (`packages/checkpoint-core/test/checkpoint-watch.test.js:249-280`). | `renderNative` always passes `120` (`checkpoint-watch.js:878-881`). A reviewer PTY probe at 80 columns measured Node `max_line=80` but the current-source-matched native binary `max_line=120` (F-1). |
| 2 | Rows below three hours remain visible; rows at or above three hours hide initially. | Yes | `OLD_ROW_MS = 10_800_000` and `ageMs >= OLD_ROW_MS` are independent of stale inputs (`checkpoint-watch.js:9-11,668-675`); fixed-clock tests cover `10_799_999` and `10_800_000` ms plus hidden closed/open rows and visible errors (`checkpoint-watch.test.js:102-159`). | — |
| 3 | Lowercase `v` toggles all old rows in live mode and separates visible old unclosed rows without changing state/order/data. | Yes | The in-memory toggle queues redraws (`checkpoint-watch.js:736,782-795`), while grouping is current-unclosed → old-unclosed → closed → errors (`:664-692`). Node fake-stream tests and the real native PTY show/hide smoke both pass. | — |
| 4 | Live cleanup covers TTY/non-TTY, normal/signal/error exits; `--once` remains non-interactive. | Yes | The Node path uses one `finally` cleanup for input/signal listeners, raw/flow state, timer, watcher, render queue, and cursor (`checkpoint-watch.js:762-875`); deterministic tests cover Ctrl-C, SIGTERM, setup/watch failures, prior raw/flow state, and non-TTY (`checkpoint-watch.test.js:359-540`). Real native non-TTY SIGTERM and PTY raw-Ctrl-C/termios/cursor checks pass (`native-checkpoint-watch-smoke.py:93-193`). | — |
| 5 | Staged scriptc coverage/build and native `--help`, `--once`, non-TTY live, and PTY live paths succeed. | Yes | `/tmp/opencode/checkpoint-session-status-hardening-phase6/native-ready.status` is `0`; `scriptc-coverage-final-targeted.log` records 647/678 statically compiled statements with required paths exercised by runtime smokes; `native-live-ready.log` and both final-gate logs report `native checkpoint-watch live smokes passed`. | — |
| 6 | A usable global scriptc install atomically selects an executable native path; absent/failed compilation retains the Node fallback and previous destination. | Yes | `install_optional_native_checkpoint_watch` stages outside the repository, gates coverage/build/help/once/live, preserves a destination symlink, and commits through same-directory temporary file + `mv` (`install.sh:931-1084`). OpenCode tests cover ten failed gates, success, prior regular bytes, symlink preservation, launch text, and cleanup (`opencode/test/checkpoint-plugin.test.mjs:792-886`); the real installer evidence reports `install=0`, `native=0`. | — |
| 7 | Project installs do not touch the global bin and no compiler artifacts enter the repository. | Yes | The native function is called only when `PROJECT_MODE=false` (`install.sh:1183-1187`); the project sentinel/probe test passes (`checkpoint-plugin.test.mjs:1198-1228`). Reviewer globs found no repository `.scriptc` or `.ll` artifacts, and `git status` lists no generated compiler output. | — |
| 8 | Focused tests and all locally runnable broad checks pass without weakening pinned host gates. | Partial | Final evidence built and exercised the native binary, then passed 95/96 Node tests: all 43 core and all 18 OpenCode tests passed, with only absent Claude Code 2.1.170 failing clearly. The follow-up Hermes parity test passed 1/1; the full Hermes suite passed 54/55 with only absent Hermes v0.19.0. Reviewer rerun: watcher 17/17 and `bash -n install.sh` passed. | The current tests do not catch F-1 and do not exercise the native reader across the complete mixed-record contract (F-2). The two absent pinned binaries are the known environment blocker, not findings. |

## Plan Adherence

| Step | Planned | Actual | Deviation? | Assessment |
| ---- | ------- | ------ | ---------- | ---------- |
| 1 | Fixed old-row classification and paragraphs | Implemented at the exact boundary with default filtering and four-group visible layout. | No | Complete. |
| 2 | Agent-first adaptive widths | Implemented for the Node/shared formatter and the exact 120-column fixture. | Yes | The native entry bypasses terminal-width detection and fixes rendering at 120 columns (F-1). |
| 3 | Lowercase live toggle and total cleanup | Implemented with injectable Node controls and real native non-TTY/PTY paths. | No material deviation | Complete for tested normal, signal, and injected Node failure paths. |
| 4 | Iterative static scriptc compatibility | Implemented through a bounded native-specific entry/read/render path; final staged coverage/build and all required native executions pass. | Justified structural deviation | The native duplicate reader needs direct contract-parity regressions (F-2). |
| 5 | Optional isolated global native installation | Implemented after portable readers and before writer assets, with atomic commit, symlink preservation, fallback, and project guard. | No | Complete. |
| 6 | Tests, launch guidance, and inventories | Behavior docs and installer tests were updated; the Hermes parity expectation was corrected for the approved hidden old row. | Yes | Several numeric symbol locations were not reconciled after large source shifts (F-3). |

## Code Quality Assessment

### Findings

- **Major — F-1:** The preferred native path does not preserve adaptive terminal width. `renderNative()` calls `formatDashboardView(rows, 120, showOldRows)` unconditionally (`packages/checkpoint-core/bin/checkpoint-watch.js:878-881`). The staged binary was byte-source matched with the current watcher/core before a focused 80-column PTY probe; Node capped lines at 80, while native emitted 120-character header/rule/data widths. This causes wrapping in a common narrow terminal and contradicts both Phase 6 Acceptance Criterion 1 and the public “caps every line at terminal width” claim.
- **Minor — F-2:** The native binary bypasses canonical `analyzeCheckpointLog` and carries a separate validator/parser/reducer (`checkpoint-watch.js:246-449,557-568`), but native smokes create only current eight-field checkpoints (`native-checkpoint-watch-smoke.py:30-47,114,132-133,159`). The 43 core tests validate the Node parser, so a native regression in legacy six-field, status-only, mixed physical-order/reopen, metrics, or malformed-log handling would not be caught.
- The remaining changes are scoped and preserve repository patterns: no new package dependency, no required compiler, stale inputs remain validated no-ops, JSONL writes/core schema are unchanged, and optional installer failures are visible rather than silent.

## Testing Assessment

### Verify Command Result

- **Command**: The single Phase 6 command in `implementation/phase-6-impl.md:114-116` (staged coverage/build/help/once/live/PTTY, Node broad suite, Hermes suite, and Bash syntax).
- **Exit Code**: `1`
- **Result**: Native build/live/PTTY passed, then the Node gate stopped only at the explicit absence of pinned Claude Code 2.1.170 (`/tmp/opencode/checkpoint-session-status-hardening-phase6-fix/phase6-final-gate.log:1-127`). Because `set -e` stops there, Hermes was run separately: 54/55 passed and only absent pinned Hermes v0.19.0 failed (`hermes-suite-rerun.log:1-18`). These are the pre-existing environment blocker, not implementation failures.
- **Reviewer-focused checks**: `node --test packages/checkpoint-core/test/checkpoint-watch.test.js` passed 17/17; `bash -n install.sh` passed. A separate 80-column PTY comparison exposed F-1.

### Test Quality

| Test | What it Tests | Meaningful? | Issue |
| ---- | ------------- | ----------- | ----- |
| `checkpoint-watch.test.js` | Exact cutoff, default filtering, grouping, 120/narrow Node widths, stale neutrality, TTY/non-TTY controls, signals, and failure cleanup. | Yes | Strong behavioral assertions, but they execute only the Node entry and cannot catch native width divergence. |
| `native-checkpoint-watch-smoke.py` | Real native filesystem refresh, non-TTY SIGTERM, 120-column PTY `v` show/hide, raw Ctrl-C, termios, and cursor restoration. | Yes | Real integration coverage is valuable, but fixed 120 columns masks F-1 and record fixtures cover only the current checkpoint variant (F-2). |
| OpenCode installer tests | Absence plus ten failure gates, success, executable/launch/fallback, symlink safety, reader order, and project/global isolation. | Yes | Fake scriptc makes failure branches deterministic; separate real-install evidence validates the actual toolchain path. |
| Core/adapter broad suites | Schema, lifecycle order, metrics, installed readers/writers, and cross-adapter behavior. | Yes | All locally runnable assertions pass; these do not execute the native duplicate parser. |
| Hermes focused parity correction | Approved default-hidden old pilot row while preserving detailed inspection parity. | Yes | The expectation change from one visible `UNKNOWN` row to zero is requirement-driven, and the bounded test passes. |

### Real-World Testing

**Performed.** The supplied evidence includes a real scriptc 0.0.21 staged coverage/build, native `--help`/`--once`, non-TTY filesystem refresh + SIGTERM, a real PTY refresh + lowercase-`v` + raw-Ctrl-C + termios/cursor smoke, and a real isolated global installer run that selected and executed the native binary. The review additionally exercised the current-source-matched binary in an 80-column PTY. Exact Claude Code 2.1.170 and Hermes v0.19.0 host checks remain unavailable on this machine as explicitly planned.

## Scope Compliance

### Findings

- Changes stay within watcher presentation/input/static compatibility, optional installer packaging, focused tests, directly affected docs, and planning status. The three-line Hermes test adjustment is a required cross-adapter parity correction for the newly approved default-hidden old row.
- `packages/checkpoint-core/src/index.js` and all adapter lifecycle writers are unchanged, so Phase 6 introduces no persisted field, lifecycle state, or write-order change.
- Untracked local configuration files are outside the reviewed Phase 6 diff and were neither treated as implementation nor modified by this review.

## Regression Risk

### Test Integrity Check

- [x] No existing tests were deleted.
- [x] No existing tests were disabled; the pre-existing platform-conditional symlink skip was not added or broadened.
- [x] No existing assertions were weakened. The Hermes `UNKNOWN` count change is the exact authorized default-visibility behavior, and the replaced width assertion is stricter at 120/64/63 columns.
- [x] All locally runnable pre-existing tests pass. The exact pinned Claude/Hermes checks remain enabled and fail clearly only because their required binaries are absent.

### Findings

- Canonical lifecycle/schema code is untouched and the core suite remains green, so ordinary Node/adapter regression risk is low.
- Native behavior has higher residual risk because it uses a separate reader path without the canonical mixed-contract fixture matrix (F-2).

## Documentation & Cleanup

### Findings

- **Minor — F-3:** Directly affected inventories retain stale numeric locations after the large insertions. For example, `docs/modules/checkpoint-core.md:63-69` points `parseArgs`, `listSessionFiles`, `loadSessionRows`, and dashboard `main` to watcher lines 60/90/120/320, while they now begin at 165/195/540/981. Similarly, `docs/modules/installation-and-configuration.md:127-140` keeps pre-insertion installer locations such as `install_opencode_checkpoint_instruction` at 1037 although it is now at 1199, and later workflow anchors are shifted as well. These inaccurate navigation anchors conflict with the module inventory's agent-facing purpose.
- User-facing behavior, cutoff/lifecycle wording, optional experimental toolchain limits, Node fallback, reader-first ordering, project isolation, and pinned-host limitations otherwise match the implementation.
- No repository `.scriptc` or LLVM artifacts were found.

## Findings Summary

| ID | Severity | Area | Finding | Recommendation |
| -- | -------- | ---- | ------- | -------------- |
| F-1 | Major | Native dashboard width | The preferred scriptc binary hard-codes 120 columns and emits 120-character lines in an 80-column PTY, unlike the adaptive Node path and documented contract. | Feed actual native terminal columns into rendering with a 120 fallback and add real 80/120-column native PTY assertions; if scriptc cannot support this safely, do not select the native binary as preferred until it can. |
| F-2 | Minor | Native test quality | A separate native parser/reducer is tested only with current eight-field checkpoints, so native mixed-schema/lifecycle parity is not regression-catching. | Exercise the real binary against legacy, current, status-only, mixed/reopen/physical-order, metrics, and malformed fixtures, comparing essential rows/state to the Node path. |
| F-3 | Minor | Documentation | Numeric symbol/workflow anchors in the changed module inventories are stale after watcher/installer insertions. | Reconcile the affected line locations (or deliberately use stable symbol-only locations) before finalizing the docs. |

## Recommendations

1. **Blocking:** Resolve F-1 and rerun focused Node width tests plus real native 80- and 120-column PTY checks; keep the Node path preferred if adaptive native output cannot be verified.
2. Add the bounded native contract-parity matrix from F-2 while touching the native smoke surface.
3. Correct the directly shifted inventory anchors from F-3, then rerun the focused watcher/installer/docs checks. Do not duplicate the blocked broad host gate until the exact pinned binaries are available.
