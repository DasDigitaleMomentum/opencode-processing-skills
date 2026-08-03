---
type: review
entity: implementation-review
plan: "claude-desktop-checkpoint"
phase: 2
status: final
reviewer: "delegate"
created: "2026-08-03"
---

# Implementation Review: Phase 2 - Real Desktop Installation and Model E2E

> Reviewing implementation of [Phase 2](../phases/phase-2.md)
> Against [Implementation Plan](../implementation/phase-2-impl.md) and [Plan](../plan.md)

## Overall Assessment

**Verdict**: Accepted

The complete Phase 2 state fulfills all nine acceptance criteria. The previous F-1 documentation gap is remediated only in the two authorized files, the exact final Primary gate passes from that final source/docs state, and this independent review reran the retained live verifier plus direct safe checks of the installed app, configuration, adapter bytes, startup log, UI evidence, persisted JSONL, inspector, and native watcher with no remaining correctness, scope, or delivery blocker.

## Acceptance Criteria Verification

| # | Criterion | Met? | Evidence | Gap |
| - | --------- | ---- | -------- | --- |
| 1 | Preflight safely confirms the pinned app target and configuration shape before mutation. | Yes | Direct bundle readback returns `CFBundleShortVersionString=1.24012.9` and `CFBundleVersion=1.24012.9`; `app.asar` contains `appVersion="1.24012.9"` and `commitHash="03c61d06f8e01a4db2273b9514e225f21d2ba62e"`. The retained mode-`0600` pre-install snapshot is an object with only the safe top-level key names `coworkUserFilesPath` and `preferences`, no prior MCP servers, and no printed values. | None. |
| 2 | Global installation preserves unrelated Desktop and Claude Code state and installs reviewed bytes. | Yes | The independently rerun live verifier proves the exact additive registration, compares the pre-install snapshot to current config after removing only `mcpServers.agent-checkpoint`, and permits only the separately recorded app-owned `preferences.sidebarMode` UI change. Direct `cmp` checks pass for shared core, runtime, server, and config helper. `install.log` is mode `0600`, records every auto-enabled target, and shows the unmodified global installer registration/restart output. Phase 1 isolation tests prove Claude Code state preservation. | None. |
| 3 | A fully restarted Desktop connects the server, exposes both tools, and has no relevant startup/protocol error. | Yes | Retained UI evidence reports `agent-checkpoint` as `Connected` with exactly `checkpoint` and `checkpoint_path`. The fresh restart log suffix contains successful connection, `initialize`, and `tools/list`; an independent scan of all 2,429 fresh bytes finds zero relevant error/fatal/failed/exception/protocol tokens. | None. |
| 4 | The real Desktop model invokes the exact requested final checkpoint. | Yes | The mode-`0600` UI evidence records the real Desktop conversation, exact literal workspace/session prompt boundary, expanded `checkpoint` call with `done="Desktop MCP verified"`, `next="Live validation complete"`, `step_failed=false`, and `close_session=true`, plus the successful tool and model responses. The resulting file timestamps and payload correlate with that call; no direct MCP substitute was used. | None. |
| 5 | The selected JSONL contains exactly one checkpoint between `open` and `closed`, with null Desktop metadata. | Yes | `/tmp/claude-desktop-checkpoint-e2e.mgN6PL/.agent-checkpoints/claude-desktop-live-20260803-1952-mgN6PL.jsonl` contains exactly three physical records in order: four-field `open`, one exact eight-field checkpoint, and four-field `closed`. The checkpoint has the requested payload and `context_used`, `agent`, and `session_title` all `null`. | None. |
| 6 | Inspector and unchanged native watcher correctly render the real record. | Yes | The independently rerun live verifier executes the source inspector and installed native watcher. Inspector reports `CLOSED`, the exact completed/next work, null-rendered metadata, `1/1`, and `2/2`; watcher matches `CLOSED`, `CP=1`, `n/a/100/100%`, expected `DONE`, and no current work. | None. |
| 7 | Installation guide and harness matrix document the verified Desktop target after live review. | Yes | The F-1 remediation changes only `docs/installation.md` and `docs/agent-checkpoint-heartbeat.md`. They now document independent/global-only installation, exact config/adapter/log locations, fail-closed and restart boundaries, explicit absolute `workspace_root`, stable `session_id`, null metadata/telemetry, lifecycle, pinned app/commit, real-model E2E, and prohibited substitutes without private paths, session IDs, or logs. | None. |
| 8 | Final parity/log checks, complete automated regression gate, documentation validation, and `git diff --check` pass. | Yes | Fresh direct parity/config/log checks and the retained live verifier pass. The immediately preceding exact Primary Verify Command passes 116/116 Node tests, 55/55 Hermes tests, `bash -n`, native scriptc coverage/build/help/once/live smoke, all focused documentation searches, and `git diff --check`. | None. |
| 9 | Fresh final implementation review has no findings before the single commit/push. | Yes | This fresh review examines the final source/docs diff and retained live state and reports zero findings. The branch/delivery step remains correctly Primary-owned and has not been performed during review. | None. |

## Plan Adherence

| Step | Planned | Actual | Deviation? | Assessment |
| ---- | ------- | ------ | ---------- | ---------- |
| 1 | Close prerequisites and perform read-only real-state preflight. | Phase 1 reviews/gate, pinned bundle and embedded revision, safe config shape, required tools, paths, and symlink boundaries were checked before mutation. | No material deviation. | Conforms. |
| 2 | Quiesce, install every resolved target, and prove preservation/parity. | The unmodified global installer ran once with normal resolution, installed every reported enabled target, retained protected before/install evidence, registered Desktop additively, and installed byte-identical assets. | No. | Conforms. |
| 3 | Fully restart Desktop and establish fresh connection evidence. | A fresh app/server start is evidenced by connection/initialize/tool-list log entries and the real UI's connected connector plus exact tool inventory. | No. | Conforms. |
| 4 | Execute and validate the real Desktop-model checkpoint. | The actual model issued the exact final tool call; raw JSONL, inspector, watcher, log, and byte parity independently validate it. | No. | Conforms. |
| 5 | Review live state, then update only the ordered Phase 2 docs. | The first review found no source/live defect and identified the two deferred docs as its sole Major gap; remediation changed only those two files and this fresh review validates the result. | Procedural review/remediation iteration only. | The final state conforms to the ordered scope and user-required zero-finding loop. |
| 6 | Run the single final gate and obtain final zero-finding review. | The exact final Primary command passed after documentation remediation; fresh parity/log/live checks and this independent review also pass. | No. | Conforms. |
| 7 | Clean external evidence and perform the single final delivery. | Not yet performed because retained evidence is required through this review and Git operations are explicitly Primary-owned afterward. | No premature execution. | Correctly deferred; this Accepted review releases the cleanup/delivery gate. |

## Code Quality Assessment

### Findings

- No material findings. The Desktop adapter remains dependency-free, validates every public input before writes, delegates persistence/path encoding to the shared core, serializes stdio work, and prevents diagnostics from corrupting JSON-RPC stdout.
- Configuration mutation remains exact, additive, idempotent, ownership-safe, and fail-closed. Installer integration is independent from Claude Code, global-only, preflighted before writer mutation, and byte-identical to the reviewed source.
- The documentation accurately distinguishes Claude Desktop from Claude Code and does not overstate direct MCP, synthetic JSONL, or configuration evidence as a real model E2E.

## Testing Assessment

### Verify Command Result

- **Command**: `bash -c 'set -euo pipefail; node --test packages/checkpoint-core/test/*.test.js opencode/test/*.test.mjs codex/test/*.test.mjs claude/test/*.test.mjs claude-desktop/test/*.test.mjs; python3 -m unittest discover -s hermes/test; bash -n install.sh; ...; git diff --check'` (the exact Primary Verify Command from `phase-2-impl.md`)
- **Exit Code**: 0
- **Result**: Pass — 116 Node tests and 55 Hermes tests passed; shell syntax, scriptc coverage/build/help/once/live smoke, focused documentation checks, and whitespace validation completed.
- **Independent live command**: `/opt/homebrew/bin/node /tmp/opencode/claude-desktop-phase2-live/verify-live.mjs /tmp/opencode/claude-desktop-phase2-live/context.json`
- **Independent live result**: Exit 0 — exact model call/lifecycle, config preservation, installed parity, inspector, watcher, UI evidence, and relevant log assertions pass.

### Test Quality

| Test | What it Tests | Meaningful? | Issue |
| ---- | ------------- | ----------- | ----- |
| Desktop runtime/server suite | Initialization, exact schemas, strict validation/no-write paths, real-core lifecycle, filesystem failures, stdio framing/order, and honest-null metadata. | Yes | Behavioral persistence and protocol assertions would catch adapter regressions; no mock is used for the shared-core write path. |
| Config/installer suite | Semantic merge, idempotence, atomic replacement, temp-sibling ownership, malformed/conflicting/symlinked inputs, missing Node, isolated global install, project/disabled paths, and Claude Code byte isolation. | Yes | Tests assert bytes, inode/replacement behavior, external symlink preservation, and preflight-before-mutation, not only success text. |
| Complete repository gate | Existing shared core/adapters, Hermes, shell syntax, native watcher coverage/build/smokes, docs, and whitespace. | Yes | Broad final-state proof passed after the documentation remediation. |
| Retained live verifier and raw evidence | Real config delta, exact installed bytes, physical JSONL schema/order/payload, real UI tool call, inspector/watcher output, and fresh MCP startup/tool log. | Yes | It binds the non-substitutable real Desktop model boundary to persisted and independently readable state. |

### Real-World Testing

Performed. Claude Desktop 1.24012.9 with embedded commit `03c61d06f8e01a4db2273b9514e225f21d2ba62e` was fully restarted, exposed a connected local `agent-checkpoint` connector and both exact tools, and its real model issued the requested final checkpoint. This review independently reran the retained verifier and directly reread the bundle metadata, safe config shape, installed byte parity, complete fresh startup log, UI evidence, raw JSONL, inspector, and installed watcher evidence. No mock, direct MCP round trip, Claude Code call, or synthetic JSONL was accepted as a substitute.

## Scope Compliance

### Findings

- No material findings. Repository changes stay within the planned adapter, installer/config example, the two authorized Phase 2 documentation files, tests, and workflow artifacts. No live config, log, UI capture, disposable workspace, generated live JSONL, credential, or new dependency is present in the repository; no branch, commit, push, or pull request was created during the reviewed implementation/review steps.
- Retained live evidence remains outside the repository with mode-`0600` files and a mode-`0700` disposable workspace, as required until this final review completes.

## Regression Risk

### Test Integrity Check

- [x] No existing tests were deleted.
- [x] No existing tests were disabled.
- [x] No existing assertions were weakened.
- [x] All pre-existing tests still pass.

### Findings

- No material regression-risk finding. Existing tests were not edited; the new Desktop suite adds coverage. The complete cross-adapter/core/Hermes/installer/native-watcher gate passes, current installed Desktop bytes remain identical to source, and the two documentation changes do not alter runtime behavior.

## Findings Summary

| ID | Severity | Area | Finding | Recommendation |
| -- | -------- | ---- | ------- | -------------- |
| — | — | — | No material findings. | Proceed to Primary-owned evidence cleanup, plan-status update, single commit, and same-branch push. |

- Critical: 0
- Major: 0
- Minor: 0
- Note: 0

## Recommendations

1. Proceed with Step 7 exactly as planned: remove only the retained temporary live evidence, update durable plan status, confirm the reviewed repository scope, then create the single project-oriented commit and push the existing branch without creating a branch or pull request.

## Post-Rebase Delta Review

**Reviewed**: 2026-08-03
**Final verdict after rebase**: Accepted

The branch was rebased onto remote commit `6bed67a` (`fix: correct cached input telemetry`), producing the reviewed implementation commit `fb9cafa` before this addendum is incorporated. The rebase does not invalidate the preceding Accepted verdict: the Desktop runtime, server, configuration helper, installer integration, configuration example, plans, and focused Desktop documentation semantics are unchanged, while the one overlapping harness document preserves both the remote telemetry correction and the previously reviewed Desktop content.

### Delta Evidence

| Area | Evidence | Assessment |
| ---- | -------- | ---------- |
| Commit structure | `6bed67a` is an ancestor of `HEAD`; the branch contains exactly three commits above it: patch-equivalent design `8133ca7`, patch-equivalent plan `bc3d468`, and implementation `fb9cafa`. `git range-diff ed87955..bd92609 6bed67a..fb9cafa` maps all three pre-/post-rebase commits and shows the implementation delta only in the two documentation files also changed by `6bed67a`. | Clean linear rebase; no duplicate implementation commit, merge commit, branch change, or prohibited prefix. |
| Non-overlapping remote files | `CHANGELOG.md`, Claude Code source/tests/README, OpenCode source/tests, and the OpenCode module documentation are byte-identical between `6bed67a` and `HEAD`. | The remote cached-input fix is retained exactly outside the overlapping docs. |
| Desktop implementation | Direct tree comparison between pre-rebase `bd92609` and post-rebase `fb9cafa` is empty for `claude-desktop/`, `config.yaml.example`, `install.sh`, all `plans/claude-desktop-checkpoint/` artifacts, and the two pre-existing design/navigation files. | No Desktop source, installer, configuration, test, plan, or prior review semantic drift. |
| Conflict resolution | In `docs/agent-checkpoint-heartbeat.md`, the Claude Code matrix row exactly retains `6bed67a`'s cache-inclusive `context_window.total_input_tokens` wording and the adjacent Claude Desktop row exactly retains `bd92609`'s explicit `workspace_root`/stable `session_id` and null-metadata wording. The surrounding OpenCode cache-input corrections and Desktop lifecycle/E2E paragraphs are both present. | The sole conflict is correctly resolved without dropping either side's behavior. |
| Installation guide | Current `docs/installation.md` retains `6bed67a`'s Claude Code `context_window.total_input_tokens` and OpenCode cache-component explanations alongside the previously accepted Desktop installation/restart/config/log/E2E section. | Remote and Desktop documentation remain mutually consistent. |
| Repository state | No unmerged paths or conflict markers remain. The post-rebase Primary gate passed with 116/116 Node tests, 55/55 Hermes tests, shell syntax, scriptc coverage/build/native smokes, focused documentation searches, and `git diff --check`. | Automated final-state evidence remains green after the rebase. |

### Live-Evidence Boundary

The real Desktop E2E evidence described in the original review was directly inspected and independently verified before the rebase. Its protected temporary files were then deleted only after that zero-finding review, as Step 7 required, and are absent now. This delta review does not rerun or newly claim live Desktop evidence; it determines that the prior proof remains applicable because the rebase changed no Desktop executable, installer, configuration, test, plan, or Desktop-specific documentation semantics. The post-rebase full automated gate is additional regression evidence, not a substitute for or repetition of that historical live run.

### Post-Rebase Findings Summary

| ID | Severity | Area | Finding | Recommendation |
| -- | -------- | ---- | ------- | -------------- |
| — | — | — | No material post-rebase findings. | Incorporate this review-only addendum into the existing local implementation delivery without creating a second implementation commit, then push the same branch. |

- Critical: 0
- Major: 0
- Minor: 0
- Note: 0

The final Phase 2 verdict remains **Accepted**.
