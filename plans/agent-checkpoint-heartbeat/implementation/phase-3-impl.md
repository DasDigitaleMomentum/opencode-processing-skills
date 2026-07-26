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

Extend the Phase 1 `packages/checkpoint-core/` package with two dependency-free read-only commands. The existing `packages/checkpoint-core/bin/checkpoint-inspect.js` accepts exactly one selected JSONL path—the workspace-root-relative value returned by `checkpoint_path`—resolves it from the same active workspace root, reads it once, delegates strict parsing and percentage calculations to the existing `parseCheckpointJsonl` and `analyzeCheckpoints` exports, and prints a deterministic human-readable summary.

The bounded live extension, `packages/checkpoint-core/bin/checkpoint-watch.js`, discovers only direct regular `.agent-checkpoints/*.jsonl` files below the current workspace and derives a row per file from the latest validated record plus `analyzeCheckpoints`. Its default foreground mode redraws on a timer and direct-directory changes; `--once` performs one deterministic non-ANSI render and exits. `ACTIVE` and `STALE` are age classifications against the latest checkpoint timestamp and configurable threshold, never process-liveness claims. A malformed or changing file becomes an isolated `ERROR` row rather than preventing healthy rows from rendering. Both commands remain read-only, built-in-Node-only displays: they write no derived state, rewrite no logs, generate no resume prompt, and introduce no daemon, watchdog, automatic termination, or CLI framework.

The summary reports the selected file and session, latest timestamp, last attempted `done`, announced `next`, `COMPLETED`/`FAILED` work status, latest stored context use (`unknown` for `null`), exact-link chain percentage, and exact-three-word percentage. For real OpenCode records, a non-null `context_used` is a TUI-equivalent context-window estimate derived from the previous completed assistant step, not live occupancy for the active tool-calling turn; null remains the valid fallback when the SDK/model data is unavailable or invalid. `step_failed` appears only in work status; it is never an input to either Canary metric. Scenario fixtures and tests prove successful chains, failed-and-fixing work, deliberate chain drift, word-count drift, and a final high-context handoff record. The completed OpenCode pilot evaluation is summarized in the existing concept document without committing ignored runtime JSONL.

Phase 2 returns remaining K-tokens only in checkpoint feedback as context-window headroom (`model context limit - previous completed step token total`). That value is not persisted in the six-field JSONL and therefore is not displayed or reconstructed by Phase 3. It must not be described as active-turn headroom, because the current assistant turn is unfinished, or as compaction headroom, because OpenCode's compaction threshold/reservations are a separate concern not calculated by this adapter or inspector.

## Affected Modules

| Module | Change Type | Description |
|--------|-------------|-------------|
| Checkpoint Core (`packages/checkpoint-core/`) | modify | Add the selected-log inspection entry point, deterministic formatter, pilot fixtures, and behavioral tests while reusing the Phase 1 parser/calculations. |
| Checkpoint Watch (`packages/checkpoint-core/bin/checkpoint-watch.js`) | modify | Add the bounded foreground live/`--once` dashboard over direct workspace checkpoint files, including derived rows, age classification, width-bounded rendering, error isolation, and lifecycle cleanup. |
| OpenCode Checkpoint Adapter (`opencode/`) | verify | Exercise Phase 2-produced paths/logs as inspection inputs; no tool contract or persistence behavior changes. |
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
| `docs/overview.md` | Confirms the dependency-light repository, no build step, and current absence of a preexisting CLI/test framework. |
| `README.md` | Establishes the repository's direct-command usage style and file-based persistence principle. |
| `packages/checkpoint-core/src/index.js` | Provides the strict parser, six-field validation, append behavior, and authoritative calculations the command calls rather than duplicates. |
| `packages/checkpoint-core/bin/checkpoint-inspect.js` | Implements the current selected-path read, deterministic latest-record display, and `unknown` rendering for null telemetry. |
| `packages/checkpoint-core/bin/checkpoint-watch.js` | Implements argument handling, direct-file discovery, row derivation, live/once rendering, terminal-width truncation, and live-resource cleanup. |
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

### Step 2: Format work progress and Canary metrics without mixing them

- **What**: Implement pure formatting helpers in the command module, including `formatCheckpointSummary`, `formatContext`, and `formatPercent`. Use the final validated record for session/timestamp/done/next/failure/context fields and the Phase 1 analysis result for metrics. Render `step_failed=true` as `FAILED` and false as `COMPLETED`; render `context_used: null` as `unknown`; render a first-record chain as `n/a`; otherwise render percentages deterministically without recomputing them. Treat a real OpenCode non-null value as the stored TUI-equivalent context-window estimate from the previous completed assistant step. Include labels that let a parent or retriever directly answer the last attempted step and announced next step.
- **Where**: `packages/checkpoint-core/bin/checkpoint-inspect.js` (`formatCheckpointSummary`, `formatContext`, `formatPercent`)
- **Authorized By**: Phase 3 Scope → Includes latest done/next/failed/context display and externally derived percentages; Acceptance Criteria for all six displayed answers; Phase 3 Notes defining Canary as instruction compliance rather than work correctness; Plan Guiding Decision that `step_failed` is independent of Canary quality.
- **Why**: Explicitly separate output fields prevent an honestly failed work step from being misreported as chain or word-compliance degradation.
- **Considerations**: Preserve label text verbatim, including non-compliant wording. Do not infer semantic completion, rank work quality, calculate a filename-derived session ID, or include metrics in the source JSONL. Do not derive remaining K-tokens from `context_used`: the model limit is absent from JSONL, and Phase 2 feedback is context-window headroom rather than active-turn or compaction headroom.

### Step 3: Add the five pilot scenario fixtures and behavioral assertions

- **What**: Add compact valid JSONL fixtures for `successful`, `failed-and-fixing`, `broken-chain`, `word-drift`, and `controlled-handoff` under a dedicated pilot fixture directory. The failed scenario will keep exact chain/three-word compliance while setting `step_failed=true`; the broken-chain scenario will change only one transition; the word-drift scenario will change only one label's whitespace-delimited word count; and the controlled-handoff scenario will end with a high valid `context_used` value and a three-word next action identifying handoff. Extend tests to run the parser/analyzer and CLI over every fixture, assert exact output/percentages, and compare file bytes before and after inspection.
- **Where**: `packages/checkpoint-core/fixtures/pilot/successful.jsonl`; `failed-and-fixing.jsonl`; `broken-chain.jsonl`; `word-drift.jsonl`; `controlled-handoff.jsonl`; `packages/checkpoint-core/test/checkpoint-inspect.test.js`
- **Authorized By**: Phase 3 Scope → Includes all five named pilot scenarios; Acceptance Criteria requiring failed-step independence, reduced chain score for a broken link, and isolated word-compliance reduction; Plan Testing Strategy for external calculations and controlled failures; Plan requirement that inspection be read-only.
- **Why**: One-variable fixtures make each signal independently observable and provide transferable evidence for later adapters without storing derived data in raw records.
- **Considerations**: `controlled-handoff.jsonl` validates inspectability of a final high-context record and announced handoff, not automatic termination. Its 92% value is synthetic contract evidence. Real OpenCode non-null values are previous-completed-step TUI-equivalent estimates, while null remains valid fallback; neither form changes Phase 2's honesty rule or proves active-turn/compaction headroom.

### Step 4: Validate real OpenCode paths and parent/retriever usability

- **What**: Extend the temporary OpenCode integration test to capture the exact string returned by `checkpoint_path`, pass that unchanged relative path to the inspection `main` with the temporary worktree as current directory, and assert the summary for separate parent and subagent sessions. Include a failed-and-correcting subagent sequence whose next record reuses the correction label, then verify that the latest work status and both Canary metrics remain independently correct. Preserve explicit `unknown` inspection coverage for the valid null fallback, while Phase 2 telemetry tests separately establish the deterministic non-null estimate path. Add a read-only retriever/parent usage example to the concept document using the same direct Node command and selected path.
- **Where**: `opencode/test/checkpoint-plugin.test.mjs`; `packages/checkpoint-core/bin/checkpoint-inspect.js`; `docs/agent-checkpoint-heartbeat.md` (inspection usage)
- **Authorized By**: Phase 3 Objective and Acceptance Criterion that a parent/retriever can answer “How far did session X get?” from the returned path; Phase 2 Acceptance Criteria for native session path lookup and separate parent/subagent logs; Plan Functional Requirement for parent/retriever/Bash workflows to read selected logs.
- **Why**: Passing the actual tool result across the adapter/CLI boundary verifies the intended workflow rather than testing only hand-written filenames.
- **Considerations**: Tests must use temporary worktrees and dependency injection; they must not require a live OpenCode process or inspect the repository's ignored runtime directory.

### Step 5: Record pilot evidence and gate later adapters

- **What**: Add an “OpenCode Pilot Evaluation” section to `docs/agent-checkpoint-heartbeat.md` containing the implementation revision/date, verify result, a five-row scenario table, observed latest state and metric outcomes, real OpenCode path/tool observations, telemetry confidence/fallback evidence, and a go/no-go decision for Phases 4–6. Define the gate as GO only when selected-path inspection, append integrity, signal separation, deterministic previous-completed-step estimate coverage, and null/unknown fallback all match the contract; otherwise record NO-GO with the concrete contract correction required before later adapter execution. Record the selected-inspector evaluation's 18/18 result, the synthetic nature of controlled-handoff's 92%, and that an earlier real-host null observation demonstrates only the fallback—not that OpenCode always reports null. Summarize actual ignored JSONL evidence without copying raw logs into documentation.
- **Where**: `docs/agent-checkpoint-heartbeat.md` (`OpenCode Pilot Evaluation` section)
- **Authorized By**: Phase 3 Deliverable “Recorded decision that later harness execution may proceed or needs contract correction”; Scope → Includes evidence-backed go/no-go notes; Phase 4 prerequisite that Phase 3 authorize later execution; Plan Definition of Done for pilot verification and honest unsupported telemetry.
- **Why**: A durable, evidence-linked gate prevents later adapters from assuming that the pilot contract was validated merely because tests exist.
- **Considerations**: Do not preselect GO before tests and actual pilot observations pass. The completed gate is GO because tool/path execution, read-only inspection, append integrity, signal separation, estimate calculation, and fallback behavior pass; it does not certify live active-turn occupancy, active-turn headroom, compaction headroom, or an observed telemetry-triggered handoff. `null` telemetry remains contract-valid and does not alone require a schema change.

### Step 6: Add the bounded checkpoint dashboard and direct-file row derivation

- **What**: Implement `checkpoint-watch` as a second core-package command with `parseArgs`, `listSessionFiles`, `loadSessionRows`, `formatAge`, and `formatDashboard`. Discover only direct regular files whose names end in `.jsonl` under `<workspace>/.agent-checkpoints`, sort discovery deterministically, parse each file with `parseCheckpointJsonl`, and calculate chain/three-word values with `analyzeCheckpoints`. Derive each healthy row from the latest record: session ID, latest activity and age, `ACTIVE` when age is below the threshold or `STALE` when age is at least the threshold, independent chain/word percentages, `COMPLETED`/`FAILED`, stored context or `unknown`, `done`, and `next`. Catch each file's read/parse/validation failure separately and produce an `ERROR` row named from that file while preserving all healthy rows.
- **Where**: `packages/checkpoint-core/bin/checkpoint-watch.js` (`parseArgs`, `listSessionFiles`, `loadSessionRows`, `formatAge`, `formatDashboard`); `packages/checkpoint-core/package.json` (`bin.checkpoint-watch`)
- **Authorized By**: Phase 3 Objective to make pilot logs cheaply inspectable; Scope → human-readable latest done/next/failed/context display and externally derived chain/three-word percentages; Acceptance Criteria for answering session progress from raw logs; Plan In Scope → read-only external analysis/display and Non-Functional requirement to preserve behavior outside the pilot.
- **Why**: A compact multi-session view makes concurrent raw logs inspectable without changing the selected-log inspector or creating another persistence/recovery layer.
- **Considerations**: Missing `.agent-checkpoints/` is an empty dashboard, not an error. Do not recurse, follow nested files, infer process state, mutate records, persist rows, or merge `step_failed` into Canary metrics. Normalize whitespace in displayed error messages so malformed content cannot break row structure. Use only Node built-ins and the existing core parser/analyzer.

### Step 7: Support live and deterministic one-shot terminal modes

- **What**: In default live mode, hide the cursor, render immediately, refresh serially on the configured positive interval and direct-directory notifications, clear/redraw with ANSI cursor-home/clear-screen sequences, and always clear the timer, close the watcher, await the pending render, and restore the cursor on signal, injected test exit, or error. If the checkpoint directory does not yet exist, continue timer refreshes without a watcher. In `--once` mode, render exactly once with no ANSI sequences and exit. Bound every title, separator, header, and row to `stdout.columns` (or the deterministic fallback/injected width), shrink the session/done/next columns to minima, and use ellipsis truncation so long labels cannot wrap past the terminal width.
- **Where**: `packages/checkpoint-core/bin/checkpoint-watch.js` (`parseArgs`, `render`, `runLiveDashboard`, `main`, `truncate`, `columnWidths`, `formatDashboard`)
- **Authorized By**: Phase 3 Objective and Deliverables for cheap human-readable inspection; Acceptance Criterion that inspection never mutates JSONL; Phase 3 Excludes forbidding a background watchdog or automatic termination; Plan constraint to keep the implementation small with no daemon or external watchdog.
- **Why**: Foreground refresh gives a bounded live view while `--once` supplies stable script/retriever output, and explicit cleanup avoids leaving terminal state or resources behind.
- **Considerations**: `--refresh-ms`/`CHECKPOINT_WATCH_REFRESH_MS` controls refresh cadence and `--stale-ms`/`CHECKPOINT_WATCH_STALE_MS` controls only checkpoint-age classification; both must be positive safe integers and CLI values override environment defaults. Live ANSI is presentation-only and must be fully absent from `--once`; cursor restoration must occur even when setup or rendering fails.

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
| CLI behavior | Exact path argument, deterministic summary, first-record `n/a`, null/non-null stored context, and concise failures | Selected valid logs produce all required fields; null renders `unknown`, non-null renders the stored percentage, and invalid inputs fail without writes. |
| Signal isolation | Successful, failed/fixing, broken-chain, and word-drift fixtures | Failure status never changes Canary metrics; chain and word drift lower only their respective percentages. |
| Controlled handoff | Final synthetic high-context fixture with exact chain and announced three-word handoff | Summary exposes 92% stored context, last attempted work, and next handoff action without treating the fixture as real-host or automatic-stop evidence. |
| OpenCode telemetry | Latest positive-output assistant record before an output-zero active step, all five token categories, provider/model limit, clamping, malformed data, and SDK errors | Valid SDK-shaped data yields the previous-completed-step TUI-equivalent context-window estimate/headroom; invalid or unavailable data yields null/unknown without blocking persistence. |
| OpenCode boundary | Actual `checkpoint_path` result passed to inspection for temporary parent/subagent sessions using null fallback | Relative path, worktree resolution, latest status, `unknown` display, and metrics remain consistent across tool and CLI. |
| Watch row derivation | Multiple direct valid logs with different timestamps, failed status, null/non-null context, broken chain, and malformed/nested/non-JSONL neighbors | Healthy rows are newest-first and expose independently derived values; only direct regular JSONL is discovered; malformed input is isolated as `ERROR`. |
| Watch terminal modes | Injected clock, terminal width, watcher, interval, and exit hooks across live and `--once` paths | Representative ages yield ACTIVE below and STALE above the threshold, matching the implementation's at-or-above STALE comparison; once output has no ANSI; live redraws and closes timer/watcher and restores the cursor; every line fits the terminal width. |
| Installed watcher | Global and project temporary homes, exact installed layout, printed launch command, symlink preservation, and installed `--once` execution | The watcher resolves its colocated core import, reports an empty workspace cleanly, and requires neither npm dependencies nor writes to checkpoint files. |
| Regression | All Phase 1 core and Phase 2 adapter/installer tests | Raw schema, append behavior, path safety, plugin behavior, telemetry confidence labels/fallback, and installer compatibility remain unchanged. |

### Test Integrity Constraints

- Phase 1 contract tests/fixtures and Phase 2 adapter/installer tests must remain enabled and pass unchanged unless a separately approved gated correction is required; Phase 3 must consume their interfaces rather than weakening them.
- Scenario fixtures must remain valid six-field raw JSONL with no embedded filename, remaining-token value, chain percentage, or three-word percentage.
- Non-null OpenCode telemetry expectations must be calculated from deterministic SDK-shaped messages and provider/model limits. Tests must keep the later output-zero active assistant record so the value cannot be mistaken for active-turn occupancy.
- Null fallback tests must continue to require successful persistence plus `unknown` feedback/inspection; they may not be generalized into an assumption that all real OpenCode records are null.
- Inspector tests must not infer context-window K-token headroom from the stored fraction or assert active-turn/compaction headroom, because those values are not present in JSONL.
- Each drift fixture must vary only the intended signal relative to its compliant baseline; `step_failed` assertions may not be folded into chain or word calculations.
- Read-only tests must snapshot exact bytes before inspection and assert identical bytes afterward. Tests may not “normalize” fixture or temporary runtime files as part of reading them.
- Watcher tests must keep direct-file-only discovery assertions: nested JSONL, directories, and non-JSONL files remain excluded, while one malformed direct file remains an isolated error row and cannot suppress a valid row.
- `packages/checkpoint-core/test/checkpoint-watch.test.js` must retain separate live and `--once` expectations. ANSI absence in `--once`, ANSI redraw/cursor cleanup in live mode, representative ACTIVE/STALE ages, deterministic sorting, and line-width limits may not be weakened.
- `opencode/test/checkpoint-plugin.test.mjs` installer coverage must continue to verify the copied watcher and core placement, exact quoted launch command, successful installed `--once` invocation, project/global destinations, and symlink preservation.
- Watch tests must inject temporary roots, clocks, timers, watchers, terminal widths, and exit behavior; they must not sleep, depend on a TTY, run a persistent watcher, or infer actual process liveness from ACTIVE/STALE.
- All generated logs and command working directories must be under OS temporary directories; tests must not read or write the repository's real `.agent-checkpoints/` or a user's OpenCode home.
- No tests may be skipped, focused with `.only`, deleted, or have exact output/metric/non-mutation assertions relaxed to make implementation pass.

## Rollback Strategy

Remove `packages/checkpoint-core/bin/checkpoint-watch.js` and its package bin entry, remove watcher tests, and revert only the watch-directory copy and launch-summary additions in `install.sh` plus their installer assertions. If rolling back the full phase, also remove `checkpoint-inspect.js`, its package metadata, pilot fixtures, and inspection tests and revert the Phase 3 evaluation/usage section and OpenCode inspection integration. Raw session logs and the Phase 1/2 checkpoint implementation remain untouched because neither display mutates or migrates them.

## Open Decisions

| Decision | Options | Chosen | Rationale |
|----------|---------|--------|-----------|
| Session selection | Scan all logs; accept session ID and derive path; accept exact `checkpoint_path` result | Accept exactly one path | The gated phase explicitly centers the returned path and excludes aggregate display. |
| Implementation location | New root CLI package; shell script; core package bin | `packages/checkpoint-core/bin/checkpoint-inspect.js` | It reuses the authoritative parser/analysis directly and adds no runtime dependency or new package boundary. |
| Output format | JSON recovery object; table over all sessions; labeled plain text | Labeled selected-session plain text | It is human/retriever readable and cannot be mistaken for a new recovery schema. |
| Pilot evidence persistence | Commit raw logs; chat-only note; summarized concept section | Summarized concept section | Runtime JSONL remains ignored local state while the gate decision and limitations stay durable. |
| Multi-session mode | Background daemon/watchdog; foreground live dashboard; once-only report | Foreground live dashboard plus `--once` | Meets cheap inspection needs while preserving the explicit no-watchdog/no-termination boundary and scriptable output. |
| Session discovery | Recursive traversal; direct regular JSONL only; caller-supplied list | Direct regular `.agent-checkpoints/*.jsonl` only | Matches the workspace raw-log convention and prevents unrelated/nested state from becoming implicit input. |
| Staleness meaning | OS process probe; checkpoint age; work-result status | Checkpoint age only | Timestamp age is available in the raw schema; process liveness is not and must not be inferred. |

## Reality Check

### Code Anchors Used

| File | Symbol/Area | Why it matters |
|------|-------------|----------------|
| `plans/agent-checkpoint-heartbeat/implementation/phase-1-impl.md` | `parseCheckpointJsonl`; `analyzeCheckpoints`; fixture/test targets | Defines the exact calculations and package boundary Phase 3 must reuse. |
| `plans/agent-checkpoint-heartbeat/implementation/phase-2-impl.md` | `checkpoint_path`; `ToolContext.worktree`; `createOpenCodeContextTelemetry`; adapter tests | Defines the real selected path/project root and the revised previous-completed-step estimate plus null-fallback contract. |
| `packages/checkpoint-core/bin/checkpoint-inspect.js` | `formatCheckpointSummary`; `formatContext`; `main` | Confirms the implemented inspector reads one selected file, displays the latest stored fraction or `unknown`, and does not calculate headroom. |
| `packages/checkpoint-core/bin/checkpoint-watch.js` | `listSessionFiles`; `loadSessionRows`; `formatDashboard`; `runLiveDashboard`; `main` | Confirms direct-file discovery, parser/analyzer reuse, derived rows, age-only ACTIVE/STALE, per-file errors, ANSI-free once output, bounded terminal rendering, and live cleanup. |
| `packages/checkpoint-core/package.json` | `bin` | Confirms both inspection commands are exposed without dependencies or a framework. |
| `packages/checkpoint-core/fixtures/pilot/*.jsonl` | five scenario records | Confirms four scenarios intentionally use null and the controlled-handoff fixture uses a synthetic 0.92 value. |
| `packages/checkpoint-core/test/checkpoint-inspect.test.js` | pilot scenario, deterministic summary, null/non-null, and non-mutation tests | Confirms current Phase 3 expectations and byte-for-byte read-only behavior. |
| `opencode/checkpoint-runtime.mjs` | `createOpenCodeContextTelemetry`; `formatCheckpointResult` | Confirms TUI-equivalent selection of the previous completed assistant step, five-category token calculation, context-window headroom feedback, and null fallback. |
| `opencode/test/checkpoint-plugin.test.mjs` | telemetry and OpenCode/inspector integration tests | Confirms non-null estimate calculation, active output-zero exclusion, clamping/fallback, selected-path inspection, and separate session logs. |
| `opencode/test/checkpoint-plugin.test.mjs` | `assertInstalledOpenCodePilot`; global/project installer tests | Confirms the installed watcher/core layout, exact launch command, symlink protection, and a successful temporary-workspace `--once` smoke test. |
| `install.sh` | `install_opencode_checkpoint`; Next steps summary | Confirms placement beneath the selected global/project OpenCode home and the direct quoted Node launch command. |
| `docs/agent-checkpoint-heartbeat.md` | Chaining; separated evaluation; path/read access; expected display; context pressure | Provides the human semantics and forbids treating failed work as Canary failure. |
| `docs/overview.md` | Tech Stack; Build & Run; Testing | Confirms no CLI framework/build system currently exists and favors a built-in-only Node entry point. |
| `README.md` | File-based persistence; direct command style | Supports a small explicit command and durable summarized evidence instead of hidden state. |
| `plans/agent-checkpoint-heartbeat/phases/phase-4.md` | Prerequisite | Establishes that this phase's recorded decision gates later harness execution. |

### Mismatches / Notes

- Phases 1–3 are implemented. The current repository contains the core, selected-path inspector, five pilot fixtures, OpenCode adapter, bounded watcher extension, installer placement, and focused tests described by this plan; the single verification command passes 24/24 tests.
- The watcher is a foreground display, not the excluded background watchdog: it never terminates or restarts sessions and labels only latest-checkpoint age. Its live mode uses ANSI redraw and cursor lifecycle management; `--once` emits deterministic non-ANSI output.
- Direct-file discovery is intentionally narrower than the selected inspector: watcher discovery includes only regular `.agent-checkpoints/*.jsonl` entries, while `checkpoint-inspect` continues to consume exactly the caller-selected path returned by `checkpoint_path`.
- Each watcher render rereads raw files and derives rows in memory. No dependency, cache, derived file, access-control decision, process probe, or checkpoint mutation was introduced; one changing/malformed file is represented as an error row while other rows remain available.
- The installer copies the watcher and core source into `lib/opencode-processing-skills/checkpoint-watch/{bin,src}` so the existing relative import resolves, and reports the exact `node ".../checkpoint-watch.js"` launch command for both global and project installations.
- The repository still has no general CLI framework or root `scripts/` directory. The implemented core-package Node entry point remains the smallest structure consistent with the dependency-free Phase 1 decision.
- Phase 2 no longer assumes unconditional null. With valid SDK message/provider data it records the TUI-equivalent context-window fraction from the previous completed assistant step and returns context-window headroom; unavailable or invalid data still records null and reports unknown without blocking the append.
- The Phase 2 estimate is not finalized telemetry for the assistant turn currently invoking the tool. Its remaining K-token feedback is model context-window headroom from the previous completed step, not active-turn headroom and not distance to OpenCode's compaction threshold.
- The controlled-handoff fixture's 0.92 value validates the common non-null display/handoff-data path but is synthetic. The earlier isolated real-host null record validates fallback only; it does not establish that real OpenCode always reports null. Telemetry-triggered stopping remains unobserved and is not required for the GO decision.
- The concept evaluation records the selected-inspector revision's 18/18 result. The current combined suite is 24/24 after adding the six watcher tests; this implementation-plan revision records that extension without rewriting the already completed inspector evaluation.
- `loadSessionRows` implements STALE at `ageMs >= staleMs`; current focused tests prove representative below/above-threshold rows but do not isolate exact equality as a separate case. This is a testing-granularity note, not a blocking product decision.
- Root `.agent-checkpoints/` is planned to be ignored, so real pilot JSONL cannot serve as committed gate evidence. The evaluation section must record commands/results and limitations without embedding or inventing raw logs.
- Phase 1 already owns chain and exact-three-word calculations. Reimplementing formulas in the CLI would create drift and is explicitly avoided.

### Blocking Decisions

- None. Phase 2 and Phase 3 are complete, and the pilot gate is GO for later adapters within the confidence limits above.
