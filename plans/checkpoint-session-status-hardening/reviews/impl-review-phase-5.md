---
type: review
entity: implementation-review
plan: "checkpoint-session-status-hardening"
phase: 5
status: final
reviewer: "delegate"
created: "2026-08-01"
---

# Implementation Review: Phase 5 - Declared Closure and Compact Dashboard

> Reviewing implementation of [Phase 5](../phases/phase-5.md)
> Against [Implementation Plan](../implementation/phase-5-impl.md), [final Implementation Plan Review](impl-plan-review-phase-5.md), and [Plan](../plan.md)

## Overall Assessment

**Verdict**: Accepted

The Phase 5 implementation fulfills all seven acceptance criteria without an evidence-backed code, test, installer, or documentation finding. The shared core and Hermes mirror validate first and append exact `open` → checkpoint → optional `closed` records; every adapter preserves its established identity boundary; the installed instructions and managed migration are conservative; and the watcher implements the approved compact, grouped presentation while leaving the inspector unchanged. The exact Claude Code 2.1.170 and Hermes v0.19.0 host smokes remain blocked by absent binaries, as already recorded by the global plan; that environment gate still blocks plan completion but is not implementation rework.

## Acceptance Criteria Verification

| # | Criterion | Met? | Evidence | Gap |
| - | --------- | ---- | -------- | --- |
| 1 | A checkpoint-only resumed session becomes `OPEN` on its next checkpoint. | Yes | Shared sequencing is centralized in `packages/checkpoint-core/src/index.js:230-274`; the OpenCode resumed-session regression asserts `open` then checkpoint and `OPEN` reduction in `opencode/test/checkpoint-plugin.test.mjs:426-451`; Hermes mirrors and tests the same behavior in `hermes/agent-checkpoint/agent_checkpoint.py:439-478` and `hermes/test/test_agent_checkpoint.py:212-225`. | — |
| 2 | Omitted/default calls stay open; `close_session=true` writes checkpoint then `closed` in exact physical order. | Yes | `packages/checkpoint-core/src/index.js:243-274` constructs all three records from one timestamp before sequential appends. `packages/checkpoint-core/test/checkpoint-core.test.js:244-324` verifies `open` → checkpoint → `closed`, failed-step closure, default/explicit-false reopen, exact keys, one clock call, checkpoint-only metrics, and invalid-value no-write behavior. Adapter tests assert the same sequence. | — |
| 3 | Normally finishing subagents are instructed to close only on their final checkpoint; interruption remains unclosed. | Yes | All four fragments state the final-call role rule, parent default, closure/success independence, interruption behavior, and reopen semantics (`opencode/checkpoint-instruction.md:5-17`, `codex/checkpoint-instruction.md:5-17`, `claude/agent-checkpoint/instructions/checkpoint.md:5-17`, `hermes/agent-checkpoint/checkpoint-instruction.md:5-17`). OpenCode, Claude, Codex, and Hermes injection/install assertions exercise those clauses. | — |
| 4 | Every adapter exposes the same optional argument without changing identity, metadata, telemetry, path, or checkpoint semantics. | Yes | OpenCode validates and forwards `close_session` while retaining `ToolContext.sessionID`, agent/title, worktree, and telemetry (`opencode/checkpoint-runtime.mjs:161-223`). Codex preserves session-level hook identity (`codex/checkpoint-hook.mjs:54-78`; `codex/checkpoint-mcp-runtime.mjs:15-38,98-139`). Claude preserves native parent/composite child and telemetry identities through strict hook/runtime boundaries (`claude/agent-checkpoint/scripts/checkpoint-hook.mjs:117-162`; `claude/agent-checkpoint/server/checkpoint-mcp-runtime.mjs:43-70,190-239`). Hermes retains transitive root-parent logging and per-native-session telemetry (`hermes/agent-checkpoint/agent_checkpoint.py:407-478,497-551`). Representative non-booleans are rejected before any new line at every required persistence boundary. | — |
| 5 | The dashboard uses only the compact approved columns, hides IDs/freshness, preserves age/work/context, and compacts count/metrics. | Yes | `packages/checkpoint-core/bin/checkpoint-watch.js:105-173,203-247` projects `CP`, slash percentages, and the exact nine columns while retaining `session` only for identity/ties. `packages/checkpoint-core/test/checkpoint-watch.test.js:43-74,171-210,242-267` verifies values, deterministic width allocation, exact headers, hidden IDs, and retained work/context fields. | — |
| 6 | Open/unknown rows precede separated closed rows; errors are last; valid groups sort newest-first; closed `CURRENT` is `—`. | Yes | The explicit rank and latest-event comparator are in `packages/checkpoint-core/bin/checkpoint-watch.js:163-173`; separator and `CURRENT` rendering are in `:237-246`. Regressions cover latest physical-event age, open-group ordering, rank order, blank separators, error isolation, hidden closed work, and closed `—` (`packages/checkpoint-core/test/checkpoint-watch.test.js:43-169,242-267`). | — |
| 7 | Existing logs require no migration and the detailed inspector retains identity/raw `next`. | Yes | Exact six/eight/four-field parsing and checkpoint-only filtering remain intact in `packages/checkpoint-core/src/index.js:293-405`. Neither `packages/checkpoint-core/bin/checkpoint-inspect.js` nor `packages/checkpoint-core/test/checkpoint-inspect.test.js` differs from `HEAD`; the supplied Node gate includes those unchanged inspector regressions. Only installed OpenCode persona instruction text has a bounded managed migration; JSONL logs are never rewritten. | — |

## Plan Adherence

| Step | Planned | Actual | Deviation? | Assessment |
| ---- | ------- | ------ | ---------- | ---------- |
| 1 | Centralize lazy open and declared close in the shared core. | One captured timestamp, strict raw boolean validation, preconstructed exact records, destination validation, and sequential one-line appends were added to `checkpoint`. | No | Complete and consistent with physical-order and truthful-prefix constraints. |
| 2 | Route the option through all Node tools and wrappers. | OpenCode native/fallback, Codex MCP/hook-preservation path, and Claude hook/MCP paths expose and forward the raw option while retaining host-owned identity. | No | Complete; invalid inputs fail before persistence with the established error envelopes. |
| 3 | Mirror the behavior in Hermes Python. | Schema, direct function, handler, root-parent resolution, exact records, and reopen behavior were extended without a new host-close hook. | No | Complete; parent/child/interleaved identity invariants remain covered. |
| 4 | Install role-aware instructions and safely migrate the old OpenCode fragment. | Four fragments were updated. `install_opencode_checkpoint_instruction` now appends absent blocks, preserves exact-current bytes and symlinks, replaces only the exact legacy bytes, and rejects unknown marked content unchanged. | No | Complete. Independent byte comparison confirmed the embedded 1,045-byte legacy fragment exactly equals `HEAD:opencode/checkpoint-instruction.md`; focused installer tests cover migration, variants, surrounding bytes, idempotency, refusal, and symlinks. |
| 5 | Implement the compact dashboard and deterministic state groups. | Exact columns, adaptive widths, hidden ID, CP/slash metrics, lifecycle ranking, latest-event sorting, separators, and closed-current behavior were implemented. | No | Complete and width-bounded. |
| 6 | Retain stale inputs as validated no-ops and prove reader parity. | CLI/environment parsing and validation remain; stale values no longer enter row/render data flow and produce byte-identical output. Inspector source/tests remain unchanged. | No | Complete. |
| 7 | Update public behavior, inventories, and distributed assets. | Canonical behavior/install docs, module inventories, and all adapter READMEs describe strict option semantics, identities, ordering, migration, dashboard behavior, stale no-ops, and the pinned-host blocker. Existing installer paths distribute the changed core/watcher/runtimes/instructions/Hermes mirror reader-first. | No | Complete and consistent with actual source. |

## Code Quality Assessment

### Findings

- No findings. The implementation addresses the lifecycle operation at the shared Node boundary and its intentional Python mirror rather than duplicating Node ordering in each wrapper. It adds no dependency or persisted field, keeps append-only one-line writes and explicit error propagation, and preserves the plan's acknowledged no-lock/no-cross-process-contiguity boundary.
- Strict validation is defense-in-depth rather than coercion: omission/`undefined` alone defaults false, while `null`, strings, numbers, arrays/lists, and objects/dicts are rejected before the leading `open` can be written. Claude additionally validates the full-input rewrite boundary; Codex deliberately preserves the raw public field for MCP validation.
- The watcher refactor is localized to row projection, ranking, and formatting. Lifecycle remains reducer-derived, age remains informational, stale options do not affect rendering, and malformed files remain isolated `ERROR` rows rather than persisted states.

## Testing Assessment

### Verify Command Result

- **Planned command**: `node --test packages/checkpoint-core/test/*.test.js opencode/test/*.test.mjs codex/test/*.test.mjs claude/test/*.test.mjs && python3 -m unittest discover -s hermes/test && bash -n install.sh`
- **Broad local evidence**: Node **87/88**, with the sole failure being the preserved fail-clearly check for absent Claude Code 2.1.170; Hermes **54/55**, with the sole failure being the preserved fail-clearly check for absent Hermes v0.19.0; `bash -n install.sh` passes.
- **Exit Code**: Nonzero for each broad language gate solely because its exact pinned host binary is absent; zero for Bash syntax.
- **Result**: All locally runnable tests pass. The approved host gate remains blocked, not waived or converted to a skip.

Reviewer-focused verification also passed:

- Shared core + watcher: **30/30**.
- OpenCode lifecycle/installer/migration/refusal: **4/4**.
- Codex MCP/hook/installer: **3/3**.
- Claude MCP/hook/installer paths not requiring the pinned CLI: **3/3**.
- Hermes registration/write/parity/installed-asset subset: **22/22**.
- `bash -n install.sh` and `git diff --check`: exit 0.

### Test Quality

| Test area | What it tests | Meaningful? | Issue |
| --------- | ------------- | ----------- | ----- |
| Shared lifecycle | Exact line keys/order, one timestamp, failed-step close, reopen, no-write invalid values, checkpoint-only parsing, and metric exclusion. | Yes | None. Assertions inspect persisted JSONL bytes/records and reducer outcomes, so ordering or schema regressions fail behaviorally. |
| Adapter boundaries | Public schemas/defaults, raw-value rejection, hook rewriting, MCP error shapes, native/composite/session/root-parent identities, metadata/telemetry, and paths. | Yes | None. Tests drive actual runtime and hook boundaries, including child/parent distinctions and invalid input before file creation. |
| Managed migration/install | Fresh/current/legacy/unknown block states, retained variants, unrelated-byte preservation, symlink safety, installed assets, base-config isolation, and reader-first output order. | Yes | None. Temporary real homes and subprocess installer runs exercise the distribution path rather than mocks alone. |
| Watcher/inspector | Compact columns, percentages, widths, latest-event age, lifecycle groups, hidden IDs, separators, closed current, stale byte parity, errors, once/live cleanup, and unchanged inspector details/failures. | Yes | None. Deterministic filesystem logs and command entry points would catch projection, formatting, sort, and isolation regressions. |
| Documentation | Public ordering, lifecycle limitations, role semantics, identity caveats, migration, stale no-op, and compact columns. | Yes | None. Assertions are focused on behavior-bearing claims and upgrade ordering. |

### Real-World Testing

**Performed locally for integration surfaces**: tests use actual Node/Python processes, temporary filesystem logs, MCP/hook protocol messages, isolated installer homes, installed source bytes, and watcher/inspector CLI entry points. **Not performed for the two pinned host surfaces** because Claude Code 2.1.170 and Hermes v0.19.0 are absent on this host. That known limitation remains a mandatory external verification blocker; no host behavior is inferred from the local substitutes.

## Scope Compliance

### Findings

- No findings. The review was restricted to the Phase 5 working-tree implementation relative to `HEAD` (`a21b605`) and its directly affected tests/docs. Prior committed Phase 1–4 and framework behavior was treated only as a preserved invariant, not as a source of findings; unrelated untracked local configuration was excluded.
- No host-idle close, parent/child schema, log migration, liveness inference, new close hook, or unrelated adapter redesign was introduced. The only migration edits installed OpenCode persona instruction blocks under the exact managed policy authorized by the remediated implementation plan.

## Regression Risk

### Test Integrity Check

- [x] No existing tests were deleted.
- [x] No existing tests were disabled or newly skipped.
- [x] No existing assertions were weakened; watcher assertions were replaced only where the gated output contract changed and retain deterministic width, age, discovery, failure, live-cleanup, and symlinked-entry coverage.
- [x] No locally runnable pre-existing regression is present. The only non-passing broad checks are the unchanged fail-clearly pinned-host guards, which stop before host behavior can run.

### Findings

- No findings. The principal residual risk is external compatibility with the exact pinned Claude/Hermes binaries, already represented by the mandatory blocked host gate rather than hidden by mocks or skips.

## Findings Summary

No Critical, Major, Minor, or Note findings.

| ID | Severity | Area | Finding | Recommendation |
| -- | -------- | ---- | ------- | -------------- |
| — | — | — | No implementation findings. | No code rework. |

The absent Claude Code 2.1.170 and Hermes v0.19.0 binaries are a known verification blocker, not a code finding.

## Recommendations

1. Accept the Phase 5 implementation without code rework.
2. Keep the global plan active/blocked until the exact Claude Code 2.1.170 and Hermes v0.19.0 host smokes pass in a suitable environment; do not weaken or waive those checks.
