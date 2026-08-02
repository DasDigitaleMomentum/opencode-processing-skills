---
type: review
entity: implementation-plan-review
plan: "checkpoint-session-status-hardening"
phase: 6
review_mode: "single-phase"
batch_phases: ""
status: final
reviewer: "delegate"
created: "2026-08-02"
---

# Implementation Plan Review: Phase 6 - Watcher Usability and Native Packaging

> Reviewing [Phase 6 Implementation Plan](../implementation/phase-6-impl.md)
> Against [Phase 6 Scope](../phases/phase-6.md) and [Plan](../plan.md)

## Overall Assessment

**Verdict**: Needs Revision

The view-model, keyboard-cleanup, installer-isolation, fallback, and documentation work is mostly concrete and aligned with the gated phase. Two native-path gaps still make execution unsafe: the Reality Check treats `SC2002` as the only effective scriptc blocker even though the next native path fails after that rewrite, and the binary that becomes the default live launch is never smoke-tested in live mode. The width priority also needs one numeric ordinary-width contract so implementation and acceptance cannot choose different meanings of “ordinary.”

## Scope Alignment

### Findings

- The plan covers every Phase 6 deliverable and stays presentation-/packaging-only: the fixed cutoff never changes lifecycle reduction or JSONL, `v` is live-only and in-memory, scriptc remains optional for users, and project mode remains isolated from `$HOME/.local/bin`.
- The exact old-row semantics are correct and actionable. `ageMs >= 10_800_000` uses the latest physical event already selected by `analyzeCheckpointLog`; all age-qualified valid states are hidden initially in live and `--once`; malformed/unreadable `ERROR` rows remain visible because they have no trustworthy event age; and visible old `OPEN`/`UNKNOWN` rows form their own paragraph between current unclosed and the single closed paragraph.
- No ungated lifecycle state, stale/liveness inference, persisted preference, alternate key, required compiler dependency, PATH edit, or project-local global-bin mutation is introduced.

## Technical Feasibility

### Findings

- **Major — F-1:** Step 4 and the Reality Check understate the scriptc work as an exact-environment `SC2002` correction. A staged probe with the locally installed authoritative CLI (`scriptc 0.0.21`) reports `SC2002` at `parseArgs`, but also runtime-deferred sites in `positiveInteger`, `formatDashboard`, and live cleanup. After an equivalent throwaway rewrite passed only the two named environment fields, `SC2002` disappeared and an exact-name native `checkpoint-watch --help` immediately failed at `positiveInteger` with `SC2020` for `Number` (`checkpoint-watch.js:49-53`); `Math.max` in `contentWidth` (`:203-208`) and live-only constructs remain reported behind that first fence. This matters because `scriptc build` can still return success while emitting a binary that throws when a deferred site executes. “Make only source changes required by the smokes” supplies a stop condition, but it does not give the implementer a grounded edit plan for already-observable blockers and makes “Blocking Decisions: None” premature.
- The staged ESM topology itself is correct: `bin/checkpoint-watch.js` imports `../src/index.js`, and copying exactly `bin/` plus `src/` preserves that graph. Authoritative scriptc 0.0.21 documentation and the local CLI confirm JavaScript entries, `coverage`, `build -o`, and `--no-keep-c`; they also confirm exact-record `SC2002`, Node >=20/clang compiler prerequisites, self-contained output, and the experimental/platform qualifications recorded by the plan.
- **Major — F-2:** A successful build becomes the global printed `Launch command` without arguments (`phase-6-impl.md:25,92`), so its primary installed behavior is live mode. Yet both the installer branch and the final gate smoke only native `--help` and `--once` (`:84,92,111,120-121`). Those paths do not execute the timer/watcher/signal lifecycle or Phase 6's TTY stdin/raw-mode/`v` logic in `runLiveDashboard`; scriptc coverage already identifies live-only deferred sites such as `watcher?.close`. Node fake-stream tests prove the JavaScript design, not that scriptc's produced executable can run its preferred live entry path. The installer can therefore atomically prefer a binary that passes both listed smokes but fails on the exact command it prints.
- The Node live-control design is otherwise sound: only live TTY input with `setRawMode` becomes interactive; lowercase `v` alone toggles; raw Ctrl-C and `SIGINT`/`SIGTERM` converge on one idempotent finish request; and cleanup owns only this run's listener, raw/flow transition, signals, timer, watcher, render queue, and cursor. `--once` branches before live setup, while non-TTY live mode remains signal-driven.
- The optional installer sequence is feasible against the current `set -euo pipefail` script. It is global-only, sits after compatible core/watcher copies and before runtime/plugin writers, stages outside the repository, explicitly guards optional failures, commits via a same-directory temporary executable and rename, preserves a destination symlink, and retains the previous destination plus Node launch on failure. Existing isolated-HOME helpers and output-order assertions can be extended with controlled PATH/fake-scriptc fixtures; the proposed absent/failure/success and project sentinel cases are practical and preserve reader-first gates.

## Step Quality Assessment

| Step | Title | Concrete? | Actionable? | Issue |
| ---- | ----- | --------- | ----------- | ----- |
| 1 | Add the fixed old-row view model and deterministic paragraphs | Yes | Yes | Exact boundary, hidden states, paragraph order, empty-view behavior, sorting, and stale-option independence are specified. |
| 2 | Prioritize complete agent identity in adaptive widths | Partly | Partly | Transfer priority is clear, but no numeric ordinary-width/default-width fixture or exact minimum allocation is pinned (F-3). |
| 3 | Add lowercase live toggling with total input and terminal cleanup | Yes | Yes | TTY eligibility, key semantics, signal convergence, owned resources, failure paths, and non-TTY/once exclusions are concrete. |
| 4 | Remove the scriptc environment-shape blocker and verify the staged ESM graph | Partly | No | The named `SC2002` rewrite exposes another help-path runtime fence and further coverage blockers that the plan has not grounded (F-1). |
| 5 | Add optional global native installation without weakening the Node path | Yes | Partly | Atomic/fallback/project behavior is detailed, but native eligibility omits the live behavior selected as the preferred launch (F-2). |
| 6 | Reconcile focused tests, launch guidance, and module inventories | Yes | Yes | Directly affected public and inventory documents, behavior claims, and pinned-host wording are enumerated. |

Every step cites a gated Phase 6 item, acceptance criterion, plan decision, or preserved invariant. No product decision is missing; F-1 and F-2 are unresolved technical proof/actionability gaps rather than requests for broader scope.

## Required Context Assessment

### Missing Context

- No additional repository file is missing. The listed current source, tests, installer, docs, prior Phase 5 artifacts, and authoritative scriptc pages are the right inputs, but the Reality Check needs a post-environment-narrowing staged coverage/native-smoke result rather than stopping at the first `SC2002` diagnostic.

### Unnecessary Context

- None. Prior Phase 5 review evidence is proportionate because this phase must preserve accepted grouping, stale-input, reader-first, and pinned-host invariants.

## Testing Plan Assessment

### Test Integrity Check

The plan retains exact record/parser/state semantics, stale-option parsing and byte-neutrality, deterministic sorting and hard width bounds, malformed-file isolation, installed reader ordering, symlink/config preservation, and all adapter suites. It explicitly forbids deleting, skipping, focusing out, or converting to success the Claude Code 2.1.170 and Hermes v0.19.0 checks. The current guards remain fail-clearly (`claude/test/checkpoint-claude.test.mjs:211-224`; `hermes/test/test_agent_checkpoint.py:54-76`), and both unchanged suites are present in the one final verification command.

### Test Gaps

- **F-2:** Add a bounded real-scriptc native live smoke before native installation is considered verified/preferred. At minimum, launch the exact staged binary without `--once` in a disposable workspace, observe a dashboard render, deliver a signal, and assert clean exit/cursor restoration; the final suitable-toolchain gate should also exercise the TTY `v`/raw-Ctrl-C path (for example through a disposable PTY) or the native binary must not become the preferred live command.
- **Minor — F-3:** The width tests say only “ordinary widths” and “representative” names (`phase-6-impl.md:68-72,118`). Current source has a default of 120 columns (`checkpoint-watch.js:203-204`), but the plan does not require that width—or any named width—to retain a complete known agent while truncating `NAME` first. An implementation could test only an overly wide terminal and still claim the criterion. Pin at least the default 120-column case, concrete current agent identities, the long-name fixture, and one narrow fallback boundary/minimum allocation.

The final verification block is exactly one command. Its staged source graph, cleanup trap, explicit `SC2002` assertion, real build, executable check, native `--help`/`--once`, full Node suites, full Hermes suite, and `bash -n install.sh` are syntactically and structurally appropriate once F-1/F-2 are corrected. The command does not weaken either pinned host gate; their known absence remains a nonzero external blocker.

### Real-World Testing

Relevant and only partially planned. Isolated real filesystem/installer tests, a real scriptc staged build, and native `--help`/`--once` are appropriate; fake scriptc is also the right way to deterministically cover optional shell failure branches. Real native live behavior is the missing integration boundary because that binary becomes the user's preferred live command. As a baseline, the current watcher suite passes 13/13 and `bash -n install.sh` passes; those results do not validate the proposed native path.

## Reality Check Validation

### Findings

- The code, installer, test, and documentation anchors exist and otherwise match the plan: `AGENT` is currently fixed at 8; flexible cells are equally distributed; latest-event age and lifecycle are separate; stale inputs are no-ops; live mode currently owns timer/watcher/cursor but no stdin; watcher source/core copy before runtime/plugin; and global/project installer tests use disposable homes.
- **F-1:** The statement that the “current blocker is `SC2002`” is only the first-runtime-fence observation, not a complete compatibility result. The staged 0.0.21 coverage report already exposes additional deferred sites, and executing the exact binary after environment narrowing proves the next `--help` blocker. The Mismatches/Notes and Step 4 must record the subsequent concrete rewrites or a bounded investigation/stop-and-revise step before downstream installer planning treats the binary as buildable.
- “Blocking Decisions: None” is accurate for product choices but not yet for technical execution. Native source compatibility and preferred-live proof must be resolved before Step 5 can safely select the binary; dependent native-success behavior should remain explicitly contingent on that proof.

## Findings Summary

| ID | Severity | Area | Finding | Recommendation |
| -- | -------- | ---- | ------- | -------------- |
| F-1 | Major | Scriptc / Reality Check | Exact environment narrowing removes the first `SC2002` fence but native `--help` then fails at an already-reported `SC2020` site, with additional once/live deferred sites still unplanned. | Re-run staged coverage and exact-name smokes after narrowing; enumerate and plan the concrete source rewrites for every executed help/once/live blocker, and update Reality Check/step dependencies before installer work. |
| F-2 | Major | Native testing / installation | The installer prefers the native no-argument live command after testing only `--help` and `--once`, neither of which executes live timer/watcher/signal/raw-input behavior. | Require a bounded real native live smoke (and a suitable-toolchain PTY `v`/cleanup check) before atomic commit/preferred launch; otherwise keep Node as the printed live launch. |
| F-3 | Minor | Width allocation / tests | “Ordinary width” and the minimum transfer boundary are not numerically pinned, so the full-agent acceptance test can be satisfied only at an arbitrarily wide width. | Pin default 120 columns, concrete known agent fixtures, `NAME`-first truncation, and one exact narrow fallback/minimum case. |

## Recommendations

1. Resolve F-1 by grounding the complete staged scriptc execution path, not only the first `SC2002` diagnostic.
2. Resolve F-2 before allowing installer success to select the native binary as the live `Launch command`.
3. Tighten Step 2 and its tests with the default 120-column ordinary-width contract from F-3; retain the current exact cutoff/grouping and installer fallback design unchanged.
