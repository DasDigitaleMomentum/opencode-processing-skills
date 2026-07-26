---
type: review
entity: implementation-review
plan: "agent-checkpoint-heartbeat"
phase: 1
status: final
reviewer: "delegate"
created: "2026-07-26"
---

# Implementation Review: Phase 1 - Shared Contract and Monorepo Foundation

> Reviewing implementation of [Phase 1](../phases/phase-1.md)
> Against [Implementation Plan](../implementation/phase-1-impl.md) and [Plan](../plan.md)

## Overall Assessment

**Verdict**: Accepted

The core fulfills the Phase 1 Definition of Done: it writes the exact six-field append-only format, safely encodes caller-provided session IDs, keeps derived metrics external, and separates failed work from Canary calculations. One minor validation defect remains: the purported strict timestamp validator accepts impossible calendar dates because `Date.parse` normalizes them.

## Acceptance Criteria Verification

| # | Criterion | Met? | Evidence | Gap |
| - | --------- | ---- | -------- | --- |
| 1 | A valid record contains only the six authorized fields. | Yes | `packages/checkpoint-core/src/index.js:4-11,43-83,86-104`; exact-key tests at `packages/checkpoint-core/test/checkpoint-core.test.js:31-73`. | None. |
| 2 | Repeated appends produce independently parseable JSONL lines without rewriting history. | Yes | `appendFile` adds one compact line at `packages/checkpoint-core/src/index.js:132-158`; byte-prefix and two-record assertions at `packages/checkpoint-core/test/checkpoint-core.test.js:83-119`. | None. |
| 3 | Unsafe session IDs cannot escape the root checkpoint directory. | Yes | UTF-8 percent encoding and containment check at `packages/checkpoint-core/src/index.js:15-28,106-129`; traversal, separators, controls, percent, spaces, and Unicode fixtures at `packages/checkpoint-core/fixtures/checkpoint-cases.json:2-9`. | No caller-controlled lexical escape found; pre-existing filesystem symlinks were outside the gated identifier threat model. |
| 4 | `checkpoint_path` resolves a workspace-relative path for a stable session ID. | Yes | `checkpointPath` at `packages/checkpoint-core/src/index.js:106-108`; shared exact mapping tests at `packages/checkpoint-core/test/checkpoint-core.test.js:75-81`. | None. |
| 5 | A failed step remains visible while chain and three-word calculations remain independent. | Yes | Raw `step_failed` is preserved while metrics use only labels at `packages/checkpoint-core/src/index.js:194-219`; independence test at `packages/checkpoint-core/test/checkpoint-core.test.js:142-149`. | None. |
| 6 | Tests cover first record, matching chain, broken chain, compliant/non-compliant labels, failed steps, missing context, and unsafe IDs. | Yes | Fixture matrix at `packages/checkpoint-core/fixtures/checkpoint-cases.json`; tests at `packages/checkpoint-core/test/checkpoint-core.test.js:31-157`. | Calendar-invalid ISO-shaped timestamps are not covered; see F-1. |

## Plan Adherence

| Step | Planned | Actual | Deviation? | Assessment |
| ---- | ------- | ------ | ---------- | ---------- |
| 1 | Create a dependency-free private ESM package. | Added package manifest and one public core module without a root toolchain or dependencies. | No | Conforms. |
| 2 | Construct and strictly validate the six-field raw contract. | Exact fields, types, defaults, ranges, and generated UTC timestamps are implemented. | Partial | Strict calendar validity is incomplete; F-1. |
| 3 | Implement safe relative lookup and append-only persistence. | Encoded POSIX-relative paths are resolved under the workspace checkpoint directory and appended with Node built-ins. | No | Conforms to the planned caller-ID safety model. |
| 4 | Add parsing, calculations, and reusable fixtures. | Strict non-empty JSONL parsing, copied analysis output, chain percentage, and whitespace word counting are present. | No | Conforms. |
| 5 | Add behavioral tests and ignore runtime state. | Focused `node:test` coverage and anchored `/.agent-checkpoints/` ignore rule are present. | No | Conforms, subject to F-1's missing edge case. |

## Code Quality Assessment

### Findings

- **F-1 (Minor):** `validateCheckpointRecord` combines an ISO-shaped regex with `Date.parse`, but `Date.parse` normalizes impossible dates. The independent probe accepted `2026-02-30T00:00:00Z`, contradicting the implementation plan's “valid ISO UTC timestamp” validation and the parser's strictness claim (`packages/checkpoint-core/src/index.js:13,57-63`). Generated records remain valid because `toISOString()` is used; the defect affects validation of externally supplied JSONL.

The implementation otherwise remains small, dependency-free, readable, and explicit about errors. Defaults are centralized, writes are not silently swallowed, and no derived values leak into persistence.

## Testing Assessment

### Verify Command Result

- **Command**: `node --test packages/checkpoint-core/test/*.test.js opencode/test/*.test.mjs`
- **Exit Code**: 0
- **Result**: Pass — 15/15 tests, including all Phase 1 tests; `git diff --check` also passed.

### Test Quality

| Test | What it Tests | Meaningful? | Issue |
| ---- | ------------- | ----------- | ----- |
| Core schema/default tests | Exact keys, defaults, types, ranges, extra/missing fields | Yes | Omits impossible calendar dates that match the timestamp regex. |
| Path fixture tests | Stable encoding for traversal separators, backslashes, controls, percent, spaces, and Unicode | Yes | Directly regression-tests caller-controlled path mapping. |
| Temporary-workspace append test | Directory placement, feedback, repeated append, parseability, and preservation of prior bytes | Yes | Exercises the real filesystem rather than a mock. |
| Analysis fixture tests | First/matching/broken chains, word drift, failed steps, and null context | Yes | Exact expected percentages and non-mutation are asserted. |

### Real-World Testing

Performed: the suite used real temporary directories and Node filesystem append/read operations, and the reviewer independently reran the broad 15-test command. No external harness is required for this harness-neutral phase. An additional direct validator probe exposed F-1.

## Scope Compliance

### Findings

- The implementation stays inside the shared core, fixtures/tests, and anchored Git ignore entry. It introduces no daemon, recovery schema, harness adapter, or repository-wide package manager.

## Regression Risk

### Test Integrity Check

- [x] No existing tests were deleted
- [x] No existing tests were disabled (15 tests ran; zero skipped/todo)
- [x] No existing assertions were weakened in the tracked diff
- [x] All current and pre-existing checks pass

### Findings

- Regression risk is low because the package is isolated and dependency-free. F-1 is confined to accepting malformed external timestamps; writer-generated records and append behavior are unaffected.

## Findings Summary

| ID  | Severity | Area | Finding | Recommendation |
| --- | -------- | ---- | ------- | -------------- |
| F-1 | Minor | Validation / tests | ISO-shaped but impossible calendar timestamps are accepted by the strict record validator. | Compare the parsed instant's canonical UTC components/string to the input (accounting for the allowed optional milliseconds) and add a rollover-date regression test. |

## Recommendations

1. **Follow-up, non-blocking:** Correct strict timestamp calendar validation and add the missing test case before treating arbitrary external JSONL as fully strict.
