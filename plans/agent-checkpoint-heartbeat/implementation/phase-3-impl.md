---
type: planning
entity: implementation-plan
plan: "agent-checkpoint-heartbeat"
phase: 3
status: draft
created: "2026-07-26"
updated: "2026-07-26"
---

# Implementation Plan: Phase 3 - Pilot Evaluation and Inspection

> Implements [Phase 3](../phases/phase-3.md) of [agent-checkpoint-heartbeat](../plan.md)

## Approach

Extend the Phase 1 `packages/checkpoint-core/` package with one dependency-free read-only command, `packages/checkpoint-core/bin/checkpoint-inspect.js`. The command accepts exactly one selected JSONL path—the workspace-root-relative value returned by `checkpoint_path`—resolves it from the same active workspace root, reads it once, delegates strict parsing and percentage calculations to the existing `parseCheckpointJsonl` and `analyzeCheckpoints` exports, and prints a deterministic human-readable summary. It will not discover all sessions, write derived state, rewrite logs, generate a resume prompt, or introduce a CLI framework.

The summary will report the selected file and session, latest timestamp, last attempted `done`, announced `next`, `COMPLETED`/`FAILED` work status, latest context use (`unknown` for `null`), exact-link chain percentage, and exact-three-word percentage. `step_failed` appears only in work status; it is never an input to either Canary metric. Scenario fixtures and tests will prove successful chains, failed-and-fixing work, deliberate chain drift, word-count drift, and a final high-context handoff record. Actual OpenCode pilot observations will be summarized in the existing concept document without committing ignored runtime JSONL.

## Affected Modules

| Module | Change Type | Description |
|--------|-------------|-------------|
| Checkpoint Core (`packages/checkpoint-core/`) | modify | Add the selected-log inspection entry point, deterministic formatter, pilot fixtures, and behavioral tests while reusing the Phase 1 parser/calculations. |
| OpenCode Checkpoint Adapter (`opencode/`) | verify | Exercise Phase 2-produced paths/logs as inspection inputs; no tool contract or persistence behavior changes. |
| Checkpoint concept/evaluation documentation | modify | Document command usage, scenario evidence, telemetry limitations, and the evidence-backed gate for later adapters. |

## Required Context

| File | Why |
|------|-----|
| `plans/agent-checkpoint-heartbeat/plan.md` | Defines external calculation, raw-log selection, no-recovery boundaries, and the later-adapter gate. |
| `plans/agent-checkpoint-heartbeat/phases/phase-3.md` | Supplies the inspection/evaluation scope, scenarios, deliverables, and acceptance criteria. |
| `plans/agent-checkpoint-heartbeat/implementation/phase-1-impl.md` | Defines `parseCheckpointJsonl`, `analyzeCheckpoints`, exact metric semantics, fixture authority, and package/test locations. |
| `plans/agent-checkpoint-heartbeat/implementation/phase-2-impl.md` | Defines the OpenCode `checkpoint_path` output, project-root logs, native sessions, honest-null telemetry, and adapter test targets. |
| `docs/agent-checkpoint-heartbeat.md` | Defines expected selected-session output, chain/word formulas, work-versus-Canary separation, and controlled handoff behavior. |
| `docs/overview.md` | Confirms the dependency-light repository, no build step, and current absence of a preexisting CLI/test framework. |
| `README.md` | Establishes the repository's direct-command usage style and file-based persistence principle. |
| `packages/checkpoint-core/src/index.js` (created by Phase 1) | Provides the strict parser and authoritative calculations the command must call rather than duplicate. |
| `packages/checkpoint-core/fixtures/checkpoint-cases.json` (created by Phase 1) | Supplies the common record/metric expectations that Phase 3 scenarios must preserve. |
| `opencode/checkpoint-runtime.mjs` (created by Phase 2) | Produces the real session logs and relative path consumed by inspection. |
| `opencode/test/checkpoint-plugin.test.mjs` (created by Phase 2) | Provides the adapter regression boundary and temporary-worktree pattern. |
| `plans/agent-checkpoint-heartbeat/phases/phase-4.md` | Shows the go/no-go evidence that later adapter execution requires from this phase. |

## Implementation Steps

### Step 1: Add the selected-log inspection entry point

- **What**: Create `packages/checkpoint-core/bin/checkpoint-inspect.js` with a `main(args, io)` entry point that requires one path argument, resolves a relative path from the caller's current workspace, reads the selected file as UTF-8, calls `parseCheckpointJsonl` and `analyzeCheckpoints`, prints one summary, and returns a non-zero exit status with a concise error for a missing argument, unreadable file, empty log, malformed JSONL, or invalid record. Add a package-local `bin`/script reference only if it does not require installing dependencies; direct `node <path> <checkpoint-path>` remains the canonical invocation.
- **Where**: `packages/checkpoint-core/bin/checkpoint-inspect.js`; `packages/checkpoint-core/package.json` (entry/script metadata only)
- **Authorized By**: Phase 3 Scope → Includes a read-only script/CLI over a path returned by `checkpoint_path`; Deliverables “Minimal read-only inspection command/script” and “Human-readable selected-session output”; Plan Functional Requirement that parent, retriever, Bash, and Python workflows can read a selected session log.
- **Why**: A single explicit path keeps inspection cheap and predictable while avoiding session discovery, background services, or another persistent representation.
- **Considerations**: Do not scan `.agent-checkpoints/`, select a newest file, accept a directory, write caches, update access metadata intentionally, or add recovery/resume behavior. Reading a user-supplied path is the command's only filesystem action.

### Step 2: Format work progress and Canary metrics without mixing them

- **What**: Implement pure formatting helpers in the command module, including `formatCheckpointSummary`, `formatContext`, and `formatPercent`. Use the final validated record for session/timestamp/done/next/failure/context fields and the Phase 1 analysis result for metrics. Render `step_failed=true` as `FAILED` and false as `COMPLETED`; render `context_used: null` as `unknown`; render a first-record chain as `n/a`; otherwise render percentages deterministically without recomputing them. Include labels that let a parent or retriever directly answer the last attempted step and announced next step.
- **Where**: `packages/checkpoint-core/bin/checkpoint-inspect.js` (`formatCheckpointSummary`, `formatContext`, `formatPercent`)
- **Authorized By**: Phase 3 Scope → Includes latest done/next/failed/context display and externally derived percentages; Acceptance Criteria for all six displayed answers; Phase 3 Notes defining Canary as instruction compliance rather than work correctness; Plan Guiding Decision that `step_failed` is independent of Canary quality.
- **Why**: Explicitly separate output fields prevent an honestly failed work step from being misreported as chain or word-compliance degradation.
- **Considerations**: Preserve label text verbatim, including non-compliant wording. Do not infer semantic completion, rank work quality, calculate a filename-derived session ID, or include metrics in the source JSONL.

### Step 3: Add the five pilot scenario fixtures and behavioral assertions

- **What**: Add compact valid JSONL fixtures for `successful`, `failed-and-fixing`, `broken-chain`, `word-drift`, and `controlled-handoff` under a dedicated pilot fixture directory. The failed scenario will keep exact chain/three-word compliance while setting `step_failed=true`; the broken-chain scenario will change only one transition; the word-drift scenario will change only one label's whitespace-delimited word count; and the controlled-handoff scenario will end with a high valid `context_used` value and a three-word next action identifying handoff. Extend tests to run the parser/analyzer and CLI over every fixture, assert exact output/percentages, and compare file bytes before and after inspection.
- **Where**: `packages/checkpoint-core/fixtures/pilot/successful.jsonl`; `failed-and-fixing.jsonl`; `broken-chain.jsonl`; `word-drift.jsonl`; `controlled-handoff.jsonl`; `packages/checkpoint-core/test/checkpoint-inspect.test.js`
- **Authorized By**: Phase 3 Scope → Includes all five named pilot scenarios; Acceptance Criteria requiring failed-step independence, reduced chain score for a broken link, and isolated word-compliance reduction; Plan Testing Strategy for external calculations and controlled failures; Plan requirement that inspection be read-only.
- **Why**: One-variable fixtures make each signal independently observable and provide transferable evidence for later adapters without storing derived data in raw records.
- **Considerations**: `controlled-handoff.jsonl` validates inspectability of a final high-context record and announced handoff, not automatic termination. The OpenCode adapter's real current telemetry remains `null`; the fixture exercises the common contract's valid non-null path without changing Phase 2's honesty rule.

### Step 4: Validate real OpenCode paths and parent/retriever usability

- **What**: Extend the temporary OpenCode integration test to capture the exact string returned by `checkpoint_path`, pass that unchanged relative path to the inspection `main` with the temporary worktree as current directory, and assert the summary for separate parent and subagent sessions. Include a failed-and-correcting subagent sequence whose next record reuses the correction label, then verify that the latest work status and both Canary metrics remain independently correct. Add a read-only retriever/parent usage example to the concept document using the same direct Node command and selected path.
- **Where**: `opencode/test/checkpoint-plugin.test.mjs`; `packages/checkpoint-core/bin/checkpoint-inspect.js`; `docs/agent-checkpoint-heartbeat.md` (inspection usage)
- **Authorized By**: Phase 3 Objective and Acceptance Criterion that a parent/retriever can answer “How far did session X get?” from the returned path; Phase 2 Acceptance Criteria for native session path lookup and separate parent/subagent logs; Plan Functional Requirement for parent/retriever/Bash workflows to read selected logs.
- **Why**: Passing the actual tool result across the adapter/CLI boundary verifies the intended workflow rather than testing only hand-written filenames.
- **Considerations**: Tests must use temporary worktrees and dependency injection; they must not require a live OpenCode process or inspect the repository's ignored runtime directory.

### Step 5: Record pilot evidence and gate later adapters

- **What**: Add an “OpenCode Pilot Evaluation” section to `docs/agent-checkpoint-heartbeat.md` containing the implementation revision/date, verify result, a five-row scenario table, observed latest state and metric outcomes, real OpenCode path/tool observations, known telemetry limitation, and a go/no-go decision for Phases 4–6. Define the gate as GO only when selected-path inspection, append integrity, signal separation, and explicit unknown telemetry all match the contract; otherwise record NO-GO with the concrete contract correction required before later adapter execution. Summarize actual ignored JSONL evidence without copying raw logs into documentation.
- **Where**: `docs/agent-checkpoint-heartbeat.md` (`OpenCode Pilot Evaluation` section)
- **Authorized By**: Phase 3 Deliverable “Recorded decision that later harness execution may proceed or needs contract correction”; Scope → Includes evidence-backed go/no-go notes; Phase 4 prerequisite that Phase 3 authorize later execution; Plan Definition of Done for pilot verification and honest unsupported telemetry.
- **Why**: A durable, evidence-linked gate prevents later adapters from assuming that the pilot contract was validated merely because tests exist.
- **Considerations**: Do not preselect GO before tests and actual pilot observations pass. Record unavailable context-trigger evidence as a limitation, not a fabricated success; `null` telemetry is contract-valid and does not alone require a schema change.

## Testing Plan

Verify command: `node --test packages/checkpoint-core/test/*.test.js opencode/test/*.test.mjs`

| Test Type | What to Test | Expected Outcome |
|-----------|-------------|-----------------|
| CLI behavior | Exact path argument, deterministic summary, first-record `n/a`, null/non-null context, and concise failures | Selected valid logs produce all required fields; invalid inputs fail without writes. |
| Signal isolation | Successful, failed/fixing, broken-chain, and word-drift fixtures | Failure status never changes Canary metrics; chain and word drift lower only their respective percentages. |
| Controlled handoff | Final high-context fixture with exact chain and announced three-word handoff | Summary exposes context, last attempted work, and next handoff action without generating recovery state or terminating anything. |
| OpenCode boundary | Actual `checkpoint_path` result passed to inspection for temporary parent/subagent sessions | Relative path, worktree resolution, latest status, and metrics remain consistent across tool and CLI. |
| Regression | All Phase 1 core and Phase 2 adapter/installer tests | Raw schema, append behavior, path safety, plugin behavior, and installer compatibility remain unchanged. |

### Test Integrity Constraints

- Phase 1 contract tests/fixtures and Phase 2 adapter/installer tests must remain enabled and pass unchanged unless a separately approved gated correction is required; Phase 3 must consume their interfaces rather than weakening them.
- Scenario fixtures must remain valid six-field raw JSONL with no embedded filename, remaining-token value, chain percentage, or three-word percentage.
- Each drift fixture must vary only the intended signal relative to its compliant baseline; `step_failed` assertions may not be folded into chain or word calculations.
- Read-only tests must snapshot exact bytes before inspection and assert identical bytes afterward. Tests may not “normalize” fixture or temporary runtime files as part of reading them.
- All generated logs and command working directories must be under OS temporary directories; tests must not read or write the repository's real `.agent-checkpoints/` or a user's OpenCode home.
- No tests may be skipped, focused with `.only`, deleted, or have exact output/metric/non-mutation assertions relaxed to make implementation pass.

## Rollback Strategy

Remove `packages/checkpoint-core/bin/checkpoint-inspect.js`, its package metadata entry, pilot fixtures, and inspection tests; revert the Phase 3 evaluation/usage section and the small OpenCode integration extension. Raw session logs and the Phase 1/2 checkpoint implementation remain untouched because inspection never mutates or migrates them.

## Open Decisions

| Decision | Options | Chosen | Rationale |
|----------|---------|--------|-----------|
| Session selection | Scan all logs; accept session ID and derive path; accept exact `checkpoint_path` result | Accept exactly one path | The gated phase explicitly centers the returned path and excludes aggregate display. |
| Implementation location | New root CLI package; shell script; core package bin | `packages/checkpoint-core/bin/checkpoint-inspect.js` | It reuses the authoritative parser/analysis directly and adds no runtime dependency or new package boundary. |
| Output format | JSON recovery object; table over all sessions; labeled plain text | Labeled selected-session plain text | It is human/retriever readable and cannot be mistaken for a new recovery schema. |
| Pilot evidence persistence | Commit raw logs; chat-only note; summarized concept section | Summarized concept section | Runtime JSONL remains ignored local state while the gate decision and limitations stay durable. |

## Reality Check

### Code Anchors Used

| File | Symbol/Area | Why it matters |
|------|-------------|----------------|
| `plans/agent-checkpoint-heartbeat/implementation/phase-1-impl.md` | `parseCheckpointJsonl`; `analyzeCheckpoints`; fixture/test targets | Defines the exact calculations and package boundary Phase 3 must reuse. |
| `plans/agent-checkpoint-heartbeat/implementation/phase-2-impl.md` | `checkpoint_path`; `ToolContext.worktree`; adapter tests; telemetry fallback | Defines the real selected path, project root, OpenCode test seam, and expected `null` context. |
| `docs/agent-checkpoint-heartbeat.md` | Chaining; separated evaluation; path/read access; expected display; context pressure | Provides the human semantics and forbids treating failed work as Canary failure. |
| `docs/overview.md` | Tech Stack; Build & Run; Testing | Confirms no CLI framework/build system currently exists and favors a built-in-only Node entry point. |
| `README.md` | File-based persistence; direct command style | Supports a small explicit command and durable summarized evidence instead of hidden state. |
| `plans/agent-checkpoint-heartbeat/phases/phase-4.md` | Prerequisite | Establishes that this phase's recorded decision gates later harness execution. |

### Mismatches / Notes

- The current working tree still has no implemented `packages/`, `opencode/`, or automated tests; those are ordered outputs of Phases 1 and 2. Phase 3 targets their authored interfaces and cannot execute until both prior phases pass.
- The existing repository has no CLI framework or general `scripts/` directory. A single core-package Node entry point is the smallest structure consistent with the dependency-free Phase 1 decision.
- Phase 2 deliberately returns `context_used: null` because current OpenCode custom tools lack defensible current occupancy. The controlled-handoff fixture validates the common non-null display/handoff-data path; actual OpenCode evaluation must separately record that telemetry-triggered stopping remains unobserved when the harness reports unknown.
- Root `.agent-checkpoints/` is planned to be ignored, so real pilot JSONL cannot serve as committed gate evidence. The evaluation section must record commands/results and limitations without embedding or inventing raw logs.
- Phase 1 already owns chain and exact-three-word calculations. Reimplementing formulas in the CLI would create drift and is explicitly avoided.

### Blocking Decisions

- None for implementation-plan authoring. Phase 3 execution remains blocked by its gated prerequisite until the Phase 2 pilot is implemented, installed, and producing valid session logs.
