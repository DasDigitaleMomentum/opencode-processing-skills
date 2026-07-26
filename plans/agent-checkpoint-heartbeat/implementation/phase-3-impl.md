---
type: planning
entity: implementation-plan
plan: "agent-checkpoint-heartbeat"
phase: 3
status: revised
created: "2026-07-26"
updated: "2026-07-26"
---

# Implementation Plan: Phase 3 - Pilot Evaluation and Inspection

> Implements [Phase 3](../phases/phase-3.md) of [agent-checkpoint-heartbeat](../plan.md)

## Approach

Refine the two dependency-free read-only commands in the Phase 1 `packages/checkpoint-core/` package. `packages/checkpoint-core/bin/checkpoint-inspect.js` continues to accept exactly one selected JSONL path—the workspace-root-relative value returned by `checkpoint_path`—resolve it from the active workspace root, read it once, and delegate strict legacy/current parsing and analysis to `parseCheckpointJsonl` and `analyzeCheckpoints`. Its deterministic summary now includes the latest nullable agent/session title metadata and renders Chain, Work, and Three-word analysis uniformly as `success/count (percent)`.

The bounded live extension, `packages/checkpoint-core/bin/checkpoint-watch.js`, continues to discover only direct regular `.agent-checkpoints/*.jsonl` files below the current workspace and derive a row per file from the latest validated record plus `analyzeCheckpoints`. Healthy rows include agent, name/title, all three count-based metrics, context, done, and next. Its terminal layout reserves the established fixed status/metric columns and distributes all remaining terminal width across `NAME/TITLE`, `DONE`, and `NEXT`, with deterministic ellipsis truncation and a hard per-line width bound. Default foreground refresh, deterministic non-ANSI `--once`, age-only `ACTIVE`/`STALE`, isolated `ERROR` rows, resource cleanup, and installer delivery remain unchanged. Both commands stay read-only and built-in-Node-only: they write no derived state, rewrite no logs, generate no resume prompt, and introduce no daemon, watchdog, automatic termination, or CLI framework.

The selected summary reports file/session, latest nullable `Agent` and `Name/title` (`-` when absent), timestamp, last attempted `done`, announced `next`, latest `COMPLETED`/`FAILED` status, stored context (`unknown` for `null`), and Chain/Work/Three-word `success/count (percent)` values. For real OpenCode records, non-null context remains a TUI-equivalent estimate from the previous completed assistant step, not live occupancy for the active tool-calling turn. `step_failed` controls latest status and Work success only; it is never an input to either Canary metric. Existing scenarios, telemetry confidence wording, evaluation evidence, and ignored-runtime-log policy remain intact.

Phase 2 returns remaining K-tokens only in checkpoint feedback as context-window headroom (`model context limit - previous completed step token total`). That value is not persisted in either accepted JSONL schema and therefore is not displayed or reconstructed by Phase 3. It must not be described as active-turn headroom, because the current assistant turn is unfinished, or as compaction headroom, because OpenCode's compaction threshold/reservations are a separate concern not calculated by this adapter or inspector.

## Affected Modules

| Module | Change Type | Description |
|--------|-------------|-------------|
| Checkpoint Core (`packages/checkpoint-core/`) | modify | Refine the selected-log formatter and tests for latest metadata and count-based Chain/Work/Three-word output while reusing the Phase 1 parser/calculations. |
| Checkpoint Watch (`packages/checkpoint-core/bin/checkpoint-watch.js`) | modify | Refine dashboard metadata, count-based metrics, and adaptive title/done/next width allocation while preserving foreground live/`--once`, age, error, and cleanup behavior. |
| OpenCode Checkpoint Adapter (`opencode/`) | verify | Exercise Phase 2-produced paths/eight-field logs as inspection inputs; preserve tool persistence, metadata snapshot, and telemetry behavior. |
| OpenCode installer (`install.sh`) | modify | Install the watcher and its colocated core import under the selected OpenCode home and print the exact quoted Node launch command. |
| Checkpoint concept/evaluation documentation | modify | Document command usage, scenario evidence, telemetry limitations, and the evidence-backed gate for later adapters. |

## Required Context

| File | Why |
|------|-----|
| `plans/agent-checkpoint-heartbeat/plan.md` | Defines external calculation, raw-log selection, no-recovery boundaries, and the later-adapter gate. |
| `plans/agent-checkpoint-heartbeat/phases/phase-3.md` | Supplies the inspection/evaluation scope, scenarios, deliverables, and acceptance criteria. |
| `plans/agent-checkpoint-heartbeat/implementation/phase-1-impl.md` | Defines `parseCheckpointJsonl`, `analyzeCheckpoints`, exact metric semantics, fixture authority, and package/test locations. |
| `plans/agent-checkpoint-heartbeat/implementation/phase-2-impl.md` | Defines the OpenCode `checkpoint_path` output, project-root logs, previous-completed-step TUI-equivalent estimates, context-window headroom feedback, null fallback, and adapter test targets. |
| `docs/agent-checkpoint-heartbeat.md` | Defines expected selected-session output, chain/word formulas, work-versus-Canary separation, and controlled handoff behavior. |
| `docs/overview.md` | Confirms the dependency-light repository, no build step, direct Node commands, and current focused test suite without a general CLI framework. |
| `README.md` | Establishes the repository's direct-command usage style and file-based persistence principle. |
| `packages/checkpoint-core/src/index.js` | Provides strict legacy/current parsing, nullable metadata normalization, append behavior, and authoritative count-based calculations the commands call rather than duplicate. |
| `packages/checkpoint-core/bin/checkpoint-inspect.js` | Implements the selected-path read, latest metadata/status display, shared metric formatting, and `unknown` rendering for null telemetry. |
| `packages/checkpoint-core/bin/checkpoint-watch.js` | Implements argument handling, direct-file discovery, metadata/metric row derivation, live/once rendering, adaptive terminal-width distribution, truncation, and live-resource cleanup. |
| `packages/checkpoint-core/package.json` | Exposes both `checkpoint-inspect` and `checkpoint-watch` package bin entries without adding dependencies. |
| `packages/checkpoint-core/fixtures/checkpoint-cases.json` | Supplies common record/metric expectations, including valid null and non-null context values. |
| `packages/checkpoint-core/fixtures/pilot/*.jsonl` | Captures the five implemented Phase 3 scenarios, including the synthetic 92% controlled-handoff case. |
| `packages/checkpoint-core/test/checkpoint-inspect.test.js` | Verifies scenario isolation, exact displays, failure behavior, and byte-for-byte read-only inspection. |
| `packages/checkpoint-core/test/checkpoint-watch.test.js` | Verifies direct-file filtering, derived/sorted rows, ACTIVE/STALE semantics, malformed-file isolation, width bounds, ANSI-free once mode, options, and live cleanup. |
| `opencode/checkpoint-runtime.mjs` | Produces real session logs and selected paths; derives previous-completed-step TUI-equivalent context-window estimates and feedback headroom with null fallback. |
| `opencode/test/checkpoint-plugin.test.mjs` | Verifies the OpenCode/inspector boundary plus completed-step selection, token/model calculation, context-window headroom, clamping, and fallback behavior. |
| `install.sh` | Installs the watcher plus its relative `../src/index.js` dependency and prints its installed path and launch command in global and project modes. |
| `plans/agent-checkpoint-heartbeat/phases/phase-4.md` | Shows the go/no-go evidence that later adapter execution requires from this phase. |

## Implementation Steps

### Step 1: Add the selected-log inspection entry point

- **What**: Create `packages/checkpoint-core/bin/checkpoint-inspect.js` with a `main(args, io)` entry point that requires one path argument, resolves a relative path from the caller's current workspace, reads the selected file as UTF-8, calls `parseCheckpointJsonl` and `analyzeCheckpoints`, prints one summary, and returns a non-zero exit status with a concise error for a missing argument, unreadable file, empty log, malformed JSONL, or invalid record. Add a package-local `bin`/script reference only if it does not require installing dependencies; direct `node <path> <checkpoint-path>` remains the canonical invocation.
- **Where**: `packages/checkpoint-core/bin/checkpoint-inspect.js`; `packages/checkpoint-core/package.json` (entry/script metadata only)
- **Authorized By**: Phase 3 Scope → Includes a read-only script/CLI over a path returned by `checkpoint_path`; Deliverables “Minimal read-only inspection command/script” and “Human-readable selected-session output”; Plan Functional Requirement that parent, retriever, Bash, and Python workflows can read a selected session log.
- **Why**: A single explicit path keeps inspection cheap and predictable while avoiding session discovery, background services, or another persistent representation.
- **Considerations**: Do not scan `.agent-checkpoints/`, select a newest file, accept a directory, write caches, update access metadata intentionally, or add recovery/resume behavior. Reading a user-supplied path is the command's only filesystem action.

### Step 2: Format metadata and count-based progress signals

- **What**: Keep pure helpers in the command module and add/use `formatMetric({ success, count, percent })` so Chain, Work, and Three-word compliance share the exact `success/count (percent)` presentation; a `null` chain percentage renders `0/0 (n/a)`. Use only the final normalized record for session, `Agent`, `Name/title`, timestamp, done, next, failure, and context fields. Render nullable metadata as `-`, `step_failed=true` as `FAILED`, false as `COMPLETED`, and null context as `unknown`. Do not recompute metrics in the formatter: consume the Phase 1 `analysis.chain`, `analysis.work`, and `analysis.threeWord` objects.
- **Where**: `packages/checkpoint-core/bin/checkpoint-inspect.js` (`formatCheckpointSummary`, `formatContext`, `formatPercent`, `formatMetric`)
- **Authorized By**: Phase 3 Scope → Includes latest done/next/failed/context display and externally derived percentages; Acceptance Criteria for all displayed answers; Phase 3 Notes defining Canary as instruction compliance rather than work correctness; Plan Guiding Decision that `step_failed` is independent of Canary quality; requested inspector metadata and `success/count (percent)` refinement.
- **Why**: Metadata makes the selected session recognizable, and explicit numerators/denominators make the three signals auditable while keeping failed work separate from Canary compliance.
- **Considerations**: Preserve label and metadata text verbatim, including non-compliant wording. Work counts every record and succeeds only where `step_failed` is false; chain counts adjacent links; Three-word counts both labels per record. Do not infer semantic completion, rank work quality, derive identity from the filename, write metrics to JSONL, or derive remaining K-tokens from stored context.

### Step 3: Add the five pilot scenario fixtures and behavioral assertions

- **What**: Preserve compact legacy six-field JSONL fixtures for `successful`, `failed-and-fixing`, `broken-chain`, `word-drift`, and `controlled-handoff` so the display path proves backward-compatible parsing. Keep each scenario's one-variable isolation, then assert exact count-based Chain/Work/Three-word output and byte-for-byte non-mutation. Add a current-schema in-memory/temporary record case that verifies the final record's agent and session title are displayed, while null-normalized legacy metadata renders `-`.
- **Where**: `packages/checkpoint-core/fixtures/pilot/successful.jsonl`; `failed-and-fixing.jsonl`; `broken-chain.jsonl`; `word-drift.jsonl`; `controlled-handoff.jsonl`; `packages/checkpoint-core/test/checkpoint-inspect.test.js`
- **Authorized By**: Phase 3 Scope → Includes all five named pilot scenarios; Acceptance Criteria requiring failed-step independence, reduced chain score for a broken link, and isolated word-compliance reduction; Plan Testing Strategy for external calculations and controlled failures; Plan requirement that inspection be read-only.
- **Why**: One-variable fixtures make each signal independently observable and provide transferable evidence for later adapters without storing derived data in raw records.
- **Considerations**: `controlled-handoff.jsonl` validates inspectability of a final high-context record and announced handoff, not automatic termination. Its 92% value is synthetic contract evidence. Real OpenCode non-null values are previous-completed-step TUI-equivalent estimates, while null remains valid fallback; neither form changes Phase 2's honesty rule or proves active-turn/compaction headroom.

### Step 4: Validate real OpenCode paths and parent/retriever usability

- **What**: Preserve the temporary OpenCode integration that captures the exact `checkpoint_path` result, passes it unchanged to inspection with the temporary worktree, and asserts separate parent/subagent summaries. Verify current eight-field records, nullable metadata, latest status, and `success/count (percent)` for Chain, Work, and Three-word; retain the failed-and-correcting sequence, `unknown` context fallback, non-null telemetry calculation coverage, and read-only parent/retriever usage.
- **Where**: `opencode/test/checkpoint-plugin.test.mjs`; `packages/checkpoint-core/bin/checkpoint-inspect.js`; `docs/agent-checkpoint-heartbeat.md` (inspection usage)
- **Authorized By**: Phase 3 Objective and Acceptance Criterion that a parent/retriever can answer “How far did session X get?” from the returned path; Phase 2 Acceptance Criteria for native session path lookup and separate parent/subagent logs; Plan Functional Requirement for parent/retriever/Bash workflows to read selected logs.
- **Why**: Passing the actual tool result across the adapter/CLI boundary verifies the intended workflow rather than testing only hand-written filenames.
- **Considerations**: Tests must use temporary worktrees and dependency injection; they must not require a live OpenCode process or inspect the repository's ignored runtime directory.

### Step 5: Record pilot evidence and gate later adapters

- **What**: Preserve the “OpenCode Pilot Evaluation” evidence in `docs/agent-checkpoint-heartbeat.md`: its five scenarios, real OpenCode path/tool observations, telemetry confidence/fallback evidence, synthetic controlled-handoff qualification, and GO gate for Phases 4–6. Keep the earlier selected-inspector result as historical evidence and align the refinement verification note with the current 29-test combined command. Continue to summarize ignored runtime evidence without copying raw logs into documentation.
- **Where**: `docs/agent-checkpoint-heartbeat.md` (`OpenCode Pilot Evaluation` section)
- **Authorized By**: Phase 3 Deliverable “Recorded decision that later harness execution may proceed or needs contract correction”; Scope → Includes evidence-backed go/no-go notes; Phase 4 prerequisite that Phase 3 authorize later execution; Plan Definition of Done for pilot verification and honest unsupported telemetry.
- **Why**: A durable, evidence-linked gate prevents later adapters from assuming that the pilot contract was validated merely because tests exist.
- **Considerations**: Do not preselect GO before tests and actual pilot observations pass. The completed gate is GO because tool/path execution, read-only inspection, append integrity, signal separation, estimate calculation, and fallback behavior pass; it does not certify live active-turn occupancy, active-turn headroom, compaction headroom, or an observed telemetry-triggered handoff. `null` telemetry remains contract-valid and does not alone require a schema change.

### Step 6: Refine dashboard metadata and count-based rows

- **What**: Keep `checkpoint-watch` direct-file discovery, strict parsing, deterministic sorting, age classification, and per-file failure isolation. Refine each healthy row to carry latest `session`, nullable `agent` and `session_title` (displayed as `-` when absent), activity/age/state, Chain/Work/Three-word strings produced from their `{ success, count, percent }` objects, stored context, done, and next. Work renders the aggregate success count rather than only the latest `COMPLETED`/`FAILED` word; `ERROR` rows retain concise placeholders without suppressing healthy rows.
- **Where**: `packages/checkpoint-core/bin/checkpoint-watch.js` (`parseArgs`, `listSessionFiles`, `loadSessionRows`, `formatAge`, `formatDashboard`); `packages/checkpoint-core/package.json` (`bin.checkpoint-watch`)
- **Authorized By**: Phase 3 Objective to make pilot logs cheaply inspectable; Scope → human-readable latest done/next/failed/context display and externally derived chain/three-word percentages; Acceptance Criteria for answering session progress from raw logs; Plan In Scope → read-only external analysis/display and Non-Functional requirement to preserve behavior outside the pilot; requested dashboard metadata and count-based metric refinement.
- **Why**: A compact multi-session view makes concurrent raw logs inspectable without changing the selected-log inspector or creating another persistence/recovery layer.
- **Considerations**: Missing `.agent-checkpoints/` is an empty dashboard, not an error. Do not recurse, follow nested files, infer process state, mutate records, persist rows, or merge `step_failed` into Canary metrics. Normalize whitespace in displayed error messages so malformed content cannot break row structure. Use only Node built-ins and the existing core parser/analyzer.

### Step 7: Adapt title, done, and next to terminal width

- **What**: Preserve default live refresh/cursor/resource behavior and deterministic ANSI-free `--once`. In `formatDashboard`, retain fixed columns for session, agent, age, state, Chain, Work, Three-word, and context, then calculate remaining width from `stdout.columns` (or deterministic fallback/injected width) and distribute it across `NAME/TITLE`, `DONE`, and `NEXT` as evenly as possible, assigning remainder left-to-right. Truncate each field with ellipsis and hard-bound the completed header, separator, empty-state message, and row to the terminal width.
- **Where**: `packages/checkpoint-core/bin/checkpoint-watch.js` (`parseArgs`, `render`, `runLiveDashboard`, `main`, `truncate`, `distributedWidths`, `formatDashboard`)
- **Authorized By**: Phase 3 Objective and Deliverables for cheap human-readable inspection; Acceptance Criterion that inspection never mutates JSONL; Phase 3 Excludes forbidding a background watchdog or automatic termination; Plan constraint to keep the implementation small with no daemon or external watchdog; requested adaptive use of terminal width across title/done/next.
- **Why**: Foreground refresh gives a bounded live view while `--once` supplies stable script/retriever output, and explicit cleanup avoids leaving terminal state or resources behind.
- **Considerations**: At very narrow widths, preserve the hard line bound even when fixed columns consume the available width; the adaptive fields still receive deterministic minimum widths before final truncation. Additional width must benefit title, done, and next rather than being concentrated in one free-text field. `--refresh-ms`/environment cadence, `--stale-ms`/environment age classification, CLI precedence, ANSI separation, and cursor restoration remain unchanged.

### Step 8: Install and verify the self-contained watcher layout

- **What**: Install `checkpoint-watch.js` to `<OpenCode target>/lib/opencode-processing-skills/checkpoint-watch/bin/checkpoint-watch.js` and a copy of the core module to sibling `src/index.js`, preserving the command's existing `../src/index.js` import without package installation. Preserve symlink safety for the watcher directory/file, and print both the installed watcher path and the shell-safe launch command `node "<OpenCode target>/lib/opencode-processing-skills/checkpoint-watch/bin/checkpoint-watch.js"`. Exercise the installed command with `--once` in a temporary workspace and assert the same placement/output for global and `--project` targets.
- **Where**: `install.sh` (`install_opencode_checkpoint`, installation summary); `opencode/test/checkpoint-plugin.test.mjs` (`assertInstalledOpenCodePilot`, global/project installer tests)
- **Authorized By**: Plan In Scope → OpenCode installation and user-facing installation guidance; Non-Functional requirement to preserve installer behavior; Definition of Done requiring an isolated installer smoke test; Phase 3 Deliverable for a minimal inspection command.
- **Why**: Colocating the only imported core file makes the launch command work from an installed home without npm, package linking, or repository-relative assumptions.
- **Considerations**: Installation must not add runtime dependencies, write a package cache, or require network access. Tests use temporary homes/workspaces, preserve existing symlinks, and never launch a background process; the installed `--once` smoke test remains read-only.

## Testing Plan

Verify command: `node --test packages/checkpoint-core/test/*.test.js opencode/test/*.test.mjs`

| Test Type | What to Test | Expected Outcome |
|-----------|-------------|-----------------|
| CLI behavior | Exact path argument, deterministic summary, latest/null metadata, first-record `0/0 (n/a)`, null/non-null stored context, and concise failures | Selected valid legacy/current logs produce all required fields; absent metadata renders `-`, null context renders `unknown`, and invalid inputs fail without writes. |
| Signal isolation | Successful, failed/fixing, broken-chain, and word-drift fixtures with exact Chain/Work/Three-word count objects | Every metric renders `success/count (percent)`; failure changes Work only, while chain and word drift lower only their respective metrics. |
| Controlled handoff | Final synthetic high-context fixture with exact chain and announced three-word handoff | Summary exposes 92% stored context, last attempted work, and next handoff action without treating the fixture as real-host or automatic-stop evidence. |
| OpenCode telemetry | Latest positive-output assistant record before an output-zero active step, all five token categories, provider/model limit, clamping, malformed data, and SDK errors | Valid SDK-shaped data yields the previous-completed-step TUI-equivalent context-window estimate/headroom; invalid or unavailable data yields null/unknown without blocking persistence. |
| OpenCode boundary | Actual `checkpoint_path` result passed to inspection for temporary parent/subagent sessions using null fallback | Relative path, worktree resolution, latest status, `unknown` display, and metrics remain consistent across tool and CLI. |
| Watch row derivation | Legacy/current logs with metadata, timestamps, failures, null/non-null context, all count metrics, broken chain, and malformed/nested/non-JSONL neighbors | Healthy rows are newest-first and expose nullable metadata plus independent `success/count (percent)` values; malformed input is isolated as `ERROR`. |
| Watch terminal modes | Narrow/medium/wide injected widths plus clock, watcher, interval, and exit hooks across live and `--once` | Extra width is distributed across title/done/next, full values emerge when space permits, every line stays bounded, age semantics remain correct, once has no ANSI, and live resources/cursor are cleaned up. |
| Installed watcher | Global and project temporary homes, exact installed layout, printed launch command, symlink preservation, and installed `--once` execution | The watcher resolves its colocated core import, reports an empty workspace cleanly, and requires neither npm dependencies nor writes to checkpoint files. |
| Regression | All Phase 1 core and Phase 2 adapter/installer tests | Strict dual-read/eight-field-write schema, append/path safety, metadata snapshot, telemetry confidence/fallback, and installer compatibility remain intact. |

### Test Integrity Constraints

- Phase 1 contract tests/fixtures and Phase 2 adapter/installer tests must remain enabled and pass unchanged unless a separately approved gated correction is required; Phase 3 must consume their interfaces rather than weakening them.
- Legacy scenario fixtures must remain valid six-field raw JSONL to preserve compatibility evidence, with no embedded metadata, filename, remaining-token value, or derived metric; current metadata coverage belongs in dedicated records/tests.
- Non-null OpenCode telemetry expectations must be calculated from deterministic SDK-shaped messages and provider/model limits. Tests must keep the later output-zero active assistant record so the value cannot be mistaken for active-turn occupancy.
- Null fallback tests must continue to require successful persistence plus `unknown` feedback/inspection; they may not be generalized into an assumption that all real OpenCode records are null.
- Inspector tests must not infer context-window K-token headroom from the stored fraction or assert active-turn/compaction headroom, because those values are not present in JSONL.
- Each drift fixture must vary only the intended signal relative to its compliant baseline; `step_failed` assertions may not be folded into chain or word calculations.
- Inspector and watcher assertions must retain exact `success/count (percent)` output for Chain, Work, and Three-word, including first-record `0/0 (n/a)` chain and failed-work counts.
- Read-only tests must snapshot exact bytes before inspection and assert identical bytes afterward. Tests may not “normalize” fixture or temporary runtime files as part of reading them.
- Watcher tests must keep direct-file-only discovery assertions: nested JSONL, directories, and non-JSONL files remain excluded, while one malformed direct file remains an isolated error row and cannot suppress a valid row.
- `packages/checkpoint-core/test/checkpoint-watch.test.js` must retain separate live and `--once` expectations. Metadata columns, narrow/medium/wide adaptive title/done/next behavior, ANSI absence in `--once`, ANSI redraw/cursor cleanup in live mode, representative ACTIVE/STALE ages, deterministic sorting, and line-width limits may not be weakened.
- `opencode/test/checkpoint-plugin.test.mjs` installer coverage must continue to verify the copied watcher and core placement, exact quoted launch command, successful installed `--once` invocation, project/global destinations, and symlink preservation.
- Watch tests must inject temporary roots, clocks, timers, watchers, terminal widths, and exit behavior; they must not sleep, depend on a TTY, run a persistent watcher, or infer actual process liveness from ACTIVE/STALE.
- All generated logs and command working directories must be under OS temporary directories; tests must not read or write the repository's real `.agent-checkpoints/` or a user's OpenCode home.
- No tests may be skipped, focused with `.only`, deleted, or have exact output/metric/non-mutation assertions relaxed to make implementation pass.

## Rollback Strategy

Remove `packages/checkpoint-core/bin/checkpoint-watch.js` and its package bin entry, remove watcher tests, and revert only the watch-directory copy and launch-summary additions in `install.sh` plus their installer assertions. If rolling back the full phase, also remove `checkpoint-inspect.js`, its package metadata, pilot fixtures, and inspection tests and revert the Phase 3 evaluation/usage section and OpenCode inspection integration. Raw session logs and the Phase 1/2 checkpoint implementation remain untouched because neither display mutates or migrates them.

## Open Decisions

| Decision | Options | Chosen | Rationale |
|----------|---------|--------|-----------|
| Selected-inspector session selection | Scan all logs; accept session ID and derive path; accept exact `checkpoint_path` result | Accept exactly one path | The gated selected-log workflow centers the returned path; the separate bounded watcher extension owns direct multi-session discovery. |
| Implementation location | New root CLI package; shell script; core package bin | `packages/checkpoint-core/bin/checkpoint-inspect.js` | It reuses the authoritative parser/analysis directly and adds no runtime dependency or new package boundary. |
| Output format | JSON recovery object; table over all sessions; labeled plain text | Labeled selected-session plain text | It is human/retriever readable and cannot be mistaken for a new recovery schema. |
| Pilot evidence persistence | Commit raw logs; chat-only note; summarized concept section | Summarized concept section | Runtime JSONL remains ignored local state while the gate decision and limitations stay durable. |
| Multi-session mode | Background daemon/watchdog; foreground live dashboard; once-only report | Foreground live dashboard plus `--once` | Meets cheap inspection needs while preserving the explicit no-watchdog/no-termination boundary and scriptable output. |
| Session discovery | Recursive traversal; direct regular JSONL only; caller-supplied list | Direct regular `.agent-checkpoints/*.jsonl` only | Matches the workspace raw-log convention and prevents unrelated/nested state from becoming implicit input. |
| Staleness meaning | OS process probe; checkpoint age; work-result status | Checkpoint age only | Timestamp age is available in the raw schema; process liveness is not and must not be inferred. |
| Metric display | Percent only; latest status only; auditable count plus percent | `success/count (percent)` for Chain, Work, and Three-word | It exposes the denominator behind each percentage and keeps aggregate work outcome distinct from latest status. |
| Flexible dashboard width | Fixed title/done/next widths; give all surplus to one field; distribute surplus across three text fields | Even distribution across title, done, and next | These are the most variable human-readable values, so all benefit as terminal width grows while fixed metrics remain scannable. |

## Reality Check

### Code Anchors Used

| File | Symbol/Area | Why it matters |
|------|-------------|----------------|
| `plans/agent-checkpoint-heartbeat/implementation/phase-1-impl.md` | `parseCheckpointJsonl`; `analyzeCheckpoints`; fixture/test targets | Defines the exact calculations and package boundary Phase 3 must reuse. |
| `plans/agent-checkpoint-heartbeat/implementation/phase-2-impl.md` | `checkpoint_path`; `ToolContext.worktree`; `createOpenCodeContextTelemetry`; adapter tests | Defines the real selected path/project root and the revised previous-completed-step estimate plus null-fallback contract. |
| `packages/checkpoint-core/bin/checkpoint-inspect.js` | `formatMetric`; `formatCheckpointSummary`; `formatContext`; `main` | Confirms one selected file, latest Agent/Name-title metadata, uniform count-based metrics, stored context/unknown display, and no headroom reconstruction. |
| `packages/checkpoint-core/bin/checkpoint-watch.js` | `metric`; `loadSessionRows`; `distributedWidths`; `formatDashboard`; `runLiveDashboard`; `main` | Confirms metadata/count row derivation, direct-file isolation, even title/done/next width allocation, terminal bounds, age-only state, ANSI-free once, and live cleanup. |
| `packages/checkpoint-core/package.json` | `bin` | Confirms both inspection commands are exposed without dependencies or a framework. |
| `packages/checkpoint-core/fixtures/pilot/*.jsonl` | five scenario records | Confirms four scenarios intentionally use null and the controlled-handoff fixture uses a synthetic 0.92 value. |
| `packages/checkpoint-core/test/checkpoint-inspect.test.js` | pilot scenarios, latest metadata, count metrics, null/non-null, and non-mutation tests | Confirms legacy compatibility, current display refinements, and byte-for-byte read-only behavior. |
| `packages/checkpoint-core/test/checkpoint-watch.test.js` | row metadata/counts and narrow/medium/wide dashboard tests | Confirms nullable metadata, Work/Chain/Three-word ratios, shared surplus width, full-value emergence, and line bounds. |
| `opencode/checkpoint-runtime.mjs` | `createOpenCodeContextTelemetry`; `formatCheckpointResult` | Confirms TUI-equivalent selection of the previous completed assistant step, five-category token calculation, context-window headroom feedback, and null fallback. |
| `opencode/test/checkpoint-plugin.test.mjs` | telemetry and OpenCode/inspector integration tests | Confirms non-null estimate calculation, active output-zero exclusion, clamping/fallback, selected-path inspection, and separate session logs. |
| `opencode/test/checkpoint-plugin.test.mjs` | `assertInstalledOpenCodePilot`; global/project installer tests | Confirms the installed watcher/core layout, exact launch command, symlink protection, and a successful temporary-workspace `--once` smoke test. |
| `install.sh` | `install_opencode_checkpoint`; Next steps summary | Confirms placement beneath the selected global/project OpenCode home and the direct quoted Node launch command. |
| `docs/agent-checkpoint-heartbeat.md` | Chaining; separated evaluation; path/read access; expected display; context pressure | Provides the human semantics and forbids treating failed work as Canary failure. |
| `docs/overview.md` | Tech Stack; Build & Run; Testing | Confirms no CLI framework/build system currently exists and favors a built-in-only Node entry point. |
| `README.md` | File-based persistence; direct command style | Supports a small explicit command and durable summarized evidence instead of hidden state. |
| `plans/agent-checkpoint-heartbeat/phases/phase-4.md` | Prerequisite | Establishes that this phase's recorded decision gates later harness execution. |

### Mismatches / Notes

- Phases 1–3 are implemented. The current repository contains the backward-compatible core, metadata-aware selected-path inspector, five legacy pilot fixtures, OpenCode metadata/telemetry adapter, bounded adaptive watcher, installer placement, and focused tests described by this plan.
- The watcher is a foreground display, not the excluded background watchdog: it never terminates or restarts sessions and labels only latest-checkpoint age. Its live mode uses ANSI redraw and cursor lifecycle management; `--once` emits deterministic non-ANSI output.
- Inspector and watcher consume normalized legacy/current records. Historical six-field logs show `-` metadata, while current records display the latest captured agent and session title; neither command rewrites historical files.
- All three derived signals now retain their counts in display form. Work reflects successful records, Chain reflects matching adjacent transitions, and Three-word reflects compliant done/next labels; only Work depends on `step_failed`.
- Dashboard width is not assigned solely to one free-text field: after fixed columns, remaining width is split across Name/title, Done, and Next, and every completed line is still truncated to the actual terminal bound.
- Direct-file discovery is intentionally narrower than the selected inspector: watcher discovery includes only regular `.agent-checkpoints/*.jsonl` entries, while `checkpoint-inspect` continues to consume exactly the caller-selected path returned by `checkpoint_path`.
- Each watcher render rereads raw files and derives rows in memory. No dependency, cache, derived file, access-control decision, process probe, or checkpoint mutation was introduced; one changing/malformed file is represented as an error row while other rows remain available.
- The installer copies the watcher and core source into `lib/opencode-processing-skills/checkpoint-watch/{bin,src}` so the existing relative import resolves, and reports the exact `node ".../checkpoint-watch.js"` launch command for both global and project installations.
- The repository still has no general CLI framework or root `scripts/` directory. The implemented core-package Node entry point remains the smallest structure consistent with the dependency-free Phase 1 decision.
- Phase 2 no longer assumes unconditional null. With valid SDK message/provider data it records the TUI-equivalent context-window fraction from the previous completed assistant step and returns context-window headroom; unavailable or invalid data still records null and reports unknown without blocking the append.
- The Phase 2 estimate is not finalized telemetry for the assistant turn currently invoking the tool. Its remaining K-token feedback is model context-window headroom from the previous completed step, not active-turn headroom and not distance to OpenCode's compaction threshold.
- The controlled-handoff fixture's 0.92 value validates the common non-null display/handoff-data path but is synthetic. The earlier isolated real-host null record validates fallback only; it does not establish that real OpenCode always reports null. Telemetry-triggered stopping remains unobserved and is not required for the GO decision.
- The concept evaluation's earlier selected-inspector result remains historical evidence. The implementation plan uses the current combined verify command as the authoritative regression gate for metadata/schema/TUI refinement without rewriting that completed evaluation.
- `loadSessionRows` implements STALE at `ageMs >= staleMs`; current focused tests prove representative below/above-threshold rows but do not isolate exact equality as a separate case. This is a testing-granularity note, not a blocking product decision.
- Root `.agent-checkpoints/` is ignored, so real pilot JSONL cannot serve as committed gate evidence. The evaluation section records commands/results and limitations without embedding or inventing raw logs.
- Phase 1 already owns chain and exact-three-word calculations. Reimplementing formulas in the CLI would create drift and is explicitly avoided.

### Blocking Decisions

- None. Phase 2 and Phase 3 are complete, and the pilot gate is GO for later adapters within the confidence limits above.
