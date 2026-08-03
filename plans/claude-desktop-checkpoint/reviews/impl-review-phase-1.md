---
type: review
entity: implementation-review
plan: "claude-desktop-checkpoint"
phase: 1
status: final
reviewer: "delegate"
created: "2026-08-03"
---

# Implementation Review: Phase 1 - Desktop Adapter and Automated Proof

> Reviewing implementation of [Phase 1](../phases/phase-1.md)
> Against [Implementation Plan](../implementation/phase-1-impl.md) and [Plan](../plan.md)

## Overall Assessment

**Verdict**: Accepted

The complete current Phase 1 source state fulfills all eleven acceptance criteria: the Desktop-only MCP boundary, shared-core lifecycle, fail-closed configuration and installer behavior, documentation, isolation, and full automated regression proof are implemented and covered by meaningful behavioral tests. The previous F-1 temp-sibling ownership defect is remediated in production code and protected by a deterministic byte-preservation regression test; the focused and complete gates both pass with no skips, and the real Claude Desktop model E2E remains correctly reserved for Phase 2.

## Acceptance Criteria Verification

| # | Criterion | Met? | Evidence | Gap |
| - | --------- | ---- | -------- | --- |
| 1 | Initialization advertises the approved identity/workspace boundary and exactly two strict tools. | Yes | `claude-desktop/agent-checkpoint/checkpoint-mcp-runtime.mjs:12-13,45-92,215-225`; focused initialization/schema test passes. | None. |
| 2 | Invalid workspace, string, boolean, method, or tool inputs return errors without writes or false success. | Yes | Runtime validation and error conversion at `checkpoint-mcp-runtime.mjs:15-42,142-204,207-242`; focused validation/no-write test passes. | None. |
| 3 | Successful `checkpoint` and `checkpoint_path` return the required session/path/result data, with path lookup write-free. | Yes | `checkpoint-mcp-runtime.mjs:165-198`; real-core lifecycle/path test passes. | None. |
| 4 | Filesystem write failures return tool errors without reporting success. | Yes | `checkpoint-mcp-runtime.mjs:235-241`; blocked `.agent-checkpoints` focused test passes. | None. |
| 5 | A valid final checkpoint writes `open`, checkpoint, and `closed` via the real shared core with null Desktop metadata. | Yes | `checkpoint-mcp-runtime.mjs:165-177`; persisted lifecycle test verifies the real shared core and all three null metadata fields. | None. |
| 6 | Stdio requests are serialized; stdout is JSON-RPC-only and diagnostics use stderr. | Yes | Queue and stream routing at `checkpoint-mcp-server.mjs:8-41`; multi-request stdio/parse-error test passes with parseable stdout and empty stderr. | None. |
| 7 | Config creation/merge is additive, identical registration is byte-stable, and writes use validated sibling staging plus atomic rename. | Yes | `configure-desktop.mjs` implements semantic merge, exact-registration idempotence, exclusive sibling creation, staged parse/revalidation, mode preservation, and atomic rename. Cleanup ownership is assigned only after successful `wx` creation; the focused CLI tests prove byte-stable no-op, inode replacement, no owned-temp residue, and preservation of a deterministic pre-existing sibling sentinel. | None. |
| 8 | Malformed/non-object JSON, conflict, symlink, missing Node, disabled target, and project mode fail or skip without partial installation. | Yes | Desktop preflight runs before Step 1 in `install.sh`; isolated tests cover every named failure/skip path and assert original config, external symlink target, adapter absence, and untouched OpenCode target as applicable. | None. |
| 9 | Claude Code configuration and files remain unchanged by the Desktop target. | Yes | Isolated installer test verifies exact Claude Code sentinel/config bytes before and after Desktop installation. | None. |
| 10 | Focused and complete automated gates pass without required skips. | Yes | Fresh focused run: 19/19 pass, 0 skipped. Fresh complete primary command: 116/116 Node tests and 55/55 Hermes tests pass; `bash -n`, scriptc coverage/build, native watcher smoke, and `git diff --check` also pass. | None; real Desktop execution is deliberately outside Phase 1. |
| 11 | A fresh independent implementation review has no findings before Phase 2. | Yes | This fresh review examined the current uncommitted code, tests, installer/config diff, prior F-1 boundary, and fresh verification output. | None. |

## Plan Adherence

| Step | Planned | Actual | Deviation? | Assessment |
| ---- | ------- | ------ | ---------- | ---------- |
| 1 | Establish focused RED coverage. | The final focused suite contains behavioral runtime, config, installer, isolation, negative-path, and deterministic temp-collision coverage. | No material deviation in the delivered state. | Conforms; the current suite is regression-catching rather than structural. |
| 2 | Implement Desktop MCP runtime and serialized server. | Runtime/server were added under the approved adapter directory and use the unchanged shared core. | No. | Conforms. |
| 3 | Implement fail-closed config planning and atomic writes. | Planner/CLI implement semantic merge, symlink rejection, staged validation, mode preservation, atomic rename, and ownership-safe cleanup. | No. | Conforms; the F-1 remediation now matches the explicit helper-owned-cleanup boundary. |
| 4 | Add independent global Desktop installer target. | `install.sh` and `config.yaml.example` implement the independent target, preflight, isolated install, registration, and restart/log guidance. | No. | Conforms for the specified paths. |
| 5 | Document only the Phase 1 adapter surface. | Focused README contains the approved tool, path, restart, diagnostics, removal, and Phase-2 boundary guidance. | No. | Conforms. |

## Code Quality Assessment

### Findings

- No material findings. The implementation is dependency-free, reuses the shared core without changing its contract, validates all public inputs before a core write, keeps JSON-RPC and diagnostics on separate streams, and contains configuration mutation behind explicit fail-closed planning.
- Previous F-1 is resolved: `writeAtomically` initializes `cleanupPath` to `null`, assigns it only after exclusive creation succeeds, and clears it after rename. An `EEXIST` collision therefore cannot authorize removal of the foreign sibling.

## Testing Assessment

### Verify Command Result

- **Command**: `bash -c 'set -euo pipefail; node --test packages/checkpoint-core/test/*.test.js opencode/test/*.test.mjs codex/test/*.test.mjs claude/test/*.test.mjs claude-desktop/test/*.test.mjs; python3 -m unittest discover -s hermes/test; bash -n install.sh; ...; git diff --check'` (the exact Primary Verify Command from `phase-1-impl.md`)
- **Exit Code**: 0
- **Result**: Pass — 116 Node tests and 55 Hermes tests passed; no skips or failures; shell syntax, scriptc coverage/build, native watcher smoke, and whitespace gates completed.

### Test Quality

| Test | What it Tests | Meaningful? | Issue |
| ---- | ------------- | ----------- | ----- |
| Runtime initialization/validation/lifecycle/filesystem tests | Public schemas, validation, error results, real-core persistence, honest-null metadata, and no-write lookup behavior. | Yes | Uses the real shared core and asserts persisted records rather than only return status. |
| Stdio server test | Malformed input, ordered request handling, flush behavior, JSON-RPC stdout, and persisted request order. | Yes | Covers positive framing/order behavior; production routing also keeps diagnostics on stderr. |
| Config planner/CLI tests | Semantic preservation, unsafe JSON shapes, conflict/symlink rejection, mode preservation, atomic inode replacement, byte-stable no-op, owned-temp cleanup, and foreign-sibling preservation. | Yes | The deterministic preload fixes time, creates the exact predicted sibling with `wx`, forces the production create to fail with `EEXIST`, and proves both config and sentinel bytes remain unchanged. |
| Installer isolation/negative-path tests | Global install, installed bytes, config merge, idempotence, auto/disabled/project modes, preflight ordering, missing Node, symlinks, and Claude Code byte isolation. | Yes | Uses disposable `HOME`, target homes, and workspaces only. |
| Complete repository gate | Existing adapters/core, Hermes, installer syntax, native watcher, and whitespace regression surface. | Yes | Broad regression proof passed from the reviewed source state. |

### Real-World Testing

Not performed. This is an explicit and appropriate Phase 1 boundary: the phase is source-only and prohibits mutation of the real Claude Desktop home, while Phase 2 owns installed-version readback, real global installation, restart, Desktop model tool invocation, persisted closed lifecycle, MCP-log inspection, and watcher evidence. Automated direct MCP tests do not prove that future gate and are not treated here as a substitute.

## Scope Compliance

### Findings

- The implementation changes exactly the seven approved files: five under `claude-desktop/`, plus `install.sh` and `config.yaml.example`. No dependency manifest, existing adapter/core, real Desktop home, branch, commit, pull request, or agent/tool-prefixed artifact was introduced; tests use disposable homes/workspaces.

## Regression Risk

### Test Integrity Check

- [x] No existing tests were deleted.
- [x] No existing tests were disabled.
- [x] No existing assertions were weakened.
- [x] All pre-existing tests still pass.

### Findings

- Existing tests were not edited by this phase; the new Desktop suite adds coverage without weakening prior behavior. The complete existing-adapter/core, Hermes, installer, native watcher, and whitespace gates pass from the reviewed source state.

## Findings Summary

| ID | Severity | Area | Finding | Recommendation |
| -- | -------- | ---- | ------- | -------------- |
| — | — | — | No material findings. | Proceed to the Phase 2 live gate. |

- Critical: 0
- Major: 0
- Minor: 0
- Note: 0

## Recommendations

1. Proceed to the Phase 2 reality check and real Claude Desktop installation/model E2E using only this reviewed source state; do not treat the Phase 1 direct MCP proof as live Desktop evidence.
