---
type: review
entity: implementation-review
plan: "agent-checkpoint-heartbeat"
phase: 3
status: final
reviewer: "delegate"
created: "2026-07-26"
---

# Implementation Review: Phase 3 - Pilot Evaluation and Inspection

> Reviewing implementation of [Phase 3](../phases/phase-3.md)
> Against [Implementation Plan](../implementation/phase-3-impl.md) and [Plan](../plan.md)

## Overall Assessment

**Verdict**: Needs Rework

The selected-log inspector is correctly read-only, deterministic, and keeps failed-step status separate from chain and word metrics; all five scenarios and the actual adapter-to-inspector function boundary are well tested. The phase's GO decision is nevertheless premature because its claimed OpenCode pilot evidence is mock/injected evidence, and the sequential Phase 2 real-host check found that a fresh current installation exposes neither tool and produces no real OpenCode checkpoint log.

## Acceptance Criteria Verification

| # | Criterion | Met? | Evidence | Gap |
| - | --------- | ---- | -------- | --- |
| 1 | Given a checkpoint path, inspection reports last attempted, next, failed status, latest context, chain, and three-word percentage. | Yes | Formatter at `packages/checkpoint-core/bin/checkpoint-inspect.js:17-29`; fixture/CLI tests at `packages/checkpoint-core/test/checkpoint-inspect.test.js:38-93`. | None in the inspector. |
| 2 | `step_failed=true` does not lower Canary metrics. | Yes | `failed-and-fixing.jsonl` produces `FAILED` with 100%/100%; asserted at `packages/checkpoint-core/test/checkpoint-inspect.test.js:38-55` and adapter correction sequence at `opencode/test/checkpoint-plugin.test.mjs:178-207`. | None. |
| 3 | A deliberately broken link lowers chain percentage. | Yes | `broken-chain.jsonl` varies one transition and is asserted at 50% chain / 100% words. | None. |
| 4 | A non-three-word label lowers only word compliance. | Yes | `word-drift.jsonl` keeps 100% chain while yielding 83.33% word compliance; exact calculation asserted in the scenario test. | None. |
| 5 | The tool never mutates session JSONL. | Yes | CLI uses only `readFile` at `packages/checkpoint-core/bin/checkpoint-inspect.js:32-48`; byte-before/after checks cover all fixtures and temporary adapter logs. | No mutation path found. |
| 6 | A parent or retriever can answer progress using the returned path and raw log. | Partial | The injected adapter's exact returned paths are passed unchanged to the inspector at `opencode/test/checkpoint-plugin.test.mjs:173-207`; output contains every requested answer. | The actual fresh OpenCode host supplied no `checkpoint_path` tool or host-produced raw log, so the end-to-end pilot premise is not established (F-1). |

## Plan Adherence

| Step | Planned | Actual | Deviation? | Assessment |
| ---- | ------- | ------ | ---------- | ---------- |
| 1 | Add a one-path read-only CLI with concise failures. | `main` requires exactly one path, reads once, delegates strict parsing/analysis, and returns status 1 on errors. | No | Conforms. |
| 2 | Format latest work progress and Canary metrics separately. | Latest record drives work fields; core analysis drives percentages; null and first-chain displays are explicit. | No | Conforms. |
| 3 | Add five one-signal pilot fixtures and non-mutation tests. | All five fixtures and exact metric/output/byte assertions are present. | No | Conforms. |
| 4 | Validate real OpenCode paths and parent/retriever usability. | The exact path from the injected adapter is consumed by the real inspector in temporary worktrees. | Partial | This is not a real OpenCode-loaded tool path; the host-loader check failed upstream. |
| 5 | Record evidence and gate later adapters. | Documentation records 15/15 tests, scenario results, null telemetry, and GO. | Problematic | GO relies on mock-backed “OpenCode tool tests” and conflicts with the fresh-host failure (F-1). |

## Code Quality Assessment

### Findings

- The inspector implementation itself has no blocking defect: it is dependency-free, readable, reuses the authoritative parser/calculations, performs no writes, and cleanly distinguishes `FAILED` work from Canary metrics.
- **F-1 (Major):** The pilot gate is not evidence-backed at the required host boundary. `docs/agent-checkpoint-heartbeat.md:257-271` records GO and describes the adapter tests as real OpenCode tool tests, but those tests instantiate `createOpenCodeCheckpointPlugin` with `fakeTool` and invoke executors directly (`opencode/test/checkpoint-plugin.test.mjs:15-32,132-218`). Sequential independent verification with the actual fresh OpenCode host found the tools unavailable due to the Phase 2 dependency-resolution failure, so no real OpenCode path/log observation supports the gate.

## Testing Assessment

### Verify Command Result

- **Command**: `node --test packages/checkpoint-core/test/*.test.js opencode/test/*.test.mjs`
- **Exit Code**: 0
- **Result**: Pass — 15/15 tests; `bash -n install.sh` and `git diff --check` also passed.

### Test Quality

| Test | What it Tests | Meaningful? | Issue |
| ---- | ------------- | ----------- | ----- |
| Five scenario matrix | Exact status, chain, and word outcomes for success, failure, broken chain, word drift, and handoff | Yes | Variables are isolated and expected values are exact. |
| Inspector non-mutation loop | Direct CLI reading and byte identity for every fixture | Yes | Strong regression coverage for read-only behavior. |
| Error behavior | Missing argument/file, empty, malformed, and schema-invalid logs | Yes | Concise nonzero behavior is asserted. |
| Adapter-to-inspector path flow | Exact `checkpoint_path` result, parent/subagent summaries, correction chain, and byte identity | Yes at module integration level | Uses an injected fake OpenCode helper rather than a host-loaded plugin. |
| Controlled handoff | Valid 92% contract fixture and announced handoff display | Yes | Correctly documented as synthetic, not OpenCode telemetry. |

### Real-World Testing

Partially performed. The reviewer ran the actual CLI and real filesystem tests successfully, including temporary adapter-produced logs and byte-preservation checks. Real OpenCode end-to-end inspection was attempted but could not be performed because the freshly installed current host did not register `checkpoint` or `checkpoint_path`; this is the acceptance-blocking F-1. The intentionally null/unknown OpenCode telemetry is an accepted gated fallback and is not a finding.

## Scope Compliance

### Findings

- The code stays within a selected-log CLI, pure formatting, fixtures/tests, and the planned evaluation documentation. It does not scan sessions, create recovery state, generate resume prompts, terminate agents, or implement later adapters.

## Regression Risk

### Test Integrity Check

- [x] No existing tests were deleted
- [x] No tests were disabled (15 tests ran; zero skipped/todo)
- [x] No existing assertions were weakened in the tracked diff
- [x] All automated pre-existing/current tests pass

### Findings

- Inspector regression risk is low due to exact outputs, error cases, shared core calculations, and byte-level immutability checks. Product-level pilot risk remains high until the real host supplies the path/log being inspected.

## Documentation & Cleanup

### Findings

- `docs/agent-checkpoint-heartbeat.md:269-271` overstates evidence by calling injected factory tests “real OpenCode tool tests” and declaring GO despite the independently observed fresh-host tool absence. The synthetic 92% handoff and null telemetry are labeled honestly and require no change on their own.

## Findings Summary

| ID  | Severity | Area | Finding | Recommendation |
| --- | -------- | ---- | ------- | -------------- |
| F-1 | Major | Pilot evidence / gate | The GO decision is based on mock/injected adapter evidence and is contradicted by a fresh real-host installation where neither checkpoint tool is available. | Keep the inspector implementation, but change the gate to NO-GO/pending until Phase 2 host loading is fixed and a real parent/subagent path-to-inspection observation passes; then record that evidence accurately. |

## Recommendations

1. **Blocks acceptance:** Resolve the Phase 2 host-loader finding and rerun one real OpenCode parent/subagent checkpoint-path-inspection flow in an isolated worktree.
2. **Blocks acceptance:** Replace the current GO/“real tool test” wording with the actual pending/failing evidence, or update it after the host-level flow genuinely passes.
