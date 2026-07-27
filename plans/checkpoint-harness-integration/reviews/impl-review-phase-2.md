---
type: review
entity: implementation-review
plan: "checkpoint-harness-integration"
phase: 2
status: final
reviewer: "delegate-strong"
created: "2026-07-27"
---

# Implementation Review: Phase 2 - Codex Integration

> Reviewing implementation of [Phase 2](../phases/phase-2.md)
> Against [Implementation Plan](../implementation/phase-2-impl.md) and [Plan](../plan.md)

## Overall Assessment

**Verdict**: Accepted

The implementation delivers the gated Phase 2 scope: a dependency-free stdio MCP adapter (`codex/`) exposing `checkpoint`/`checkpoint_path`, a hook bridge pinned to the codex-cli 0.131.0 wire contract (allow+`updatedInput` pairing, exact deny_unknown_fields key sets), an additive profile-v2 installer that never touches the base `config.toml`, and honest session-level/null-telemetry documentation. The final gate was re-run by this reviewer and passes 39/39 plus `bash -n install.sh`; the credential-free E2E was independently re-executed and passes end-to-end. Two Minor findings (evidence hygiene in smoke.log, missing automated regression test for the checkpoint-watch main-guard) and one open process item (old phase-4 status reconciliation, presumably post-acceptance) do not block acceptance.

## Acceptance Criteria Verification

| # | Criterion | Met? | Evidence | Gap |
| - | --------- | ---- | -------- | --- |
| 1 | One real checkpoint call on the pinned build produces shared-contract JSONL; `checkpoint_path` returns inspectable path; telemetry `null`/unknown; subagent attribution documented unsupported | yes (per accepted proof set) | `/tmp/opencode/checkpoint-harness-integration-phase2/smoke.ahqXPm/workspace/.agent-checkpoints/smoke-session-001.jsonl` contains exactly the 8 contract fields with `context_used`/`agent`/`session_title` = `null`; reviewer re-ran `smoke-e2e.mjs` against the installed adapter → `SMOKE E2E PASSED` (SessionStart → PreToolUse allow+updatedInput → installed MCP stdio → `checkpoint-inspect` → exact 8-field record); `/tmp/opencode/review-phase2-e2e-rerun.log` | No live Codex agent session was run (credential-free constraint); this was adjudicated by the primary decision recorded in impl-plan Mismatches (accepted proof set, no live-agent-run claim). See F-4. |
| 2 | Base `$CODEX_HOME/config.toml` byte-for-byte preserved in installer tests; adapter activates via `codex --profile-v2 agent-checkpoint` | yes | `codex/test/checkpoint-codex.test.mjs` ("codex installer deploys adapter/profile and preserves the base config") asserts byte-for-byte equality across two installer runs; smoke.log SHA256 before/after identical (`a38f79c1...`); `prompt-input-probe.log` shows profile layering accepted by pinned 0.131.0 | — |
| 3 | `node --test packages/checkpoint-core/test/*.test.js opencode/test/*.test.mjs codex/test/*.test.mjs` and `bash -n install.sh` pass | yes | Re-run by reviewer: exit 0, 39 tests / 39 pass / 0 fail / 0 skipped (`/tmp/opencode/review-phase2-gate.log`); `bash -n install.sh` OK | — |
| 4 | agent-checkpoint-heartbeat phase 4 marked completed via `update-plan` | not yet | `plans/agent-checkpoint-heartbeat/plan.md` phase 4 still "pending"; plan todo item "Mark agent-checkpoint-heartbeat phase 4 completed via update-plan" still open | Pending — expected to happen on review acceptance (F-3). |

## Plan Adherence

| Step | Planned | Actual | Deviation? | Assessment |
| ---- | ------- | ------ | ---------- | ---------- |
| 1 | Stdio MCP tools over shared core | `codex/checkpoint-mcp-runtime.mjs` (createMcpRuntime/listTools/callTool) + `checkpoint-mcp-server.mjs` (queue-serialized NDJSON stdio) | none | Exact-8-field records via installed core; unknown methods → -32601 without terminating; parse errors → -32700; in-flight responses flushed before exit. |
| 2 | Hook bridge SessionStart/PreToolUse, session-level | `codex/checkpoint-hook.mjs` + `checkpoint-instruction.md` | none | allow+`updatedInput` always paired; stale caller-supplied internal IDs replaced with current session values; no subagent branch; `turn_id` kept out of identity. |
| 3 | Honest-null telemetry | `CODEX_TELEMETRY` frozen `{contextUsed: null, remainingKTokens: null, source: "unavailable"}`; docs | none | Only `null` enters JSONL; app-server token surface documented as volatile/uncorrelatable, not used. |
| 4 | Additive profile-v2 installer | `install.sh` `install_codex_checkpoint` + summary; `config.yaml.example` comments | none | Base `config.toml` never referenced; symlink guards on every destination and on the profile file; global mode only; TOML quoting handles spaces. |
| 5 | macOS docs and limits | `codex/README.md`, `docs/installation.md`, `docs/agent-checkpoint-heartbeat.md` | none | mcp-list limitation, session-level limit, null telemetry, trust review, and proof set all documented; no overclaim. |
| 6 | Protocol/hook/installer/pinned-CLI verification | `codex/test/checkpoint-codex.test.mjs` (10 tests) + machine-local smoke evidence | minor | All planned test types exist and pass. The pinned-CLI smoke log contains a crashed attempt followed by an unconditional success echo (F-1); the passing run is proven by the record artifact and this reviewer's re-run, not by the log itself. |

Unplanned changes: two pre-existing failures fixed under the recorded stop conditions — (a) test bug in `opencode/test/checkpoint-plugin.test.mjs` (path canonicalization via `realpath`; assertion now compares against the *correct* physical path — strengthened, not weakened) and (b) real pilot bug in `packages/checkpoint-core/bin/checkpoint-watch.js` (main-guard now `realpathSync`s both sides). Both minimal and root-caused (`fix/watch-rootcause*.log` proves `argv[1]` `/var/...` vs `import.meta.url` `/private/var/...` mismatch). The phase-4/5-impl superseded banners are Phase 1 scope.

## Code Quality Assessment

### Findings

- No hardcoded defaults that belong in config: node resolution via `command -v node` at install time with a clear failure; paths absolute in generated TOML; no machine-specific values in the adapter.
- Root causes addressed: hook/server main-guard and stdio-flush issues fixed at the cause (realpath both sides; queue-serialized writes with deferred exit), not patched around.
- Minimal changes: shared core untouched; OpenCode pilot untouched except the justified test fix; installer changes confined to the Codex target.
- Patterns preserved: `install_opencode_checkpoint_file` reuse gives the Codex adapter the same symlink-preservation semantics as the pilot; TOML generated via heredoc with `toml_escape` consistent with installer style.
- No silent failures: hook exits 1 with stderr on invalid JSON; MCP tool without hook injection returns `isError` without writing; server diagnostics on stderr only; protocol errors keep the server alive.
- Dependency boundary respected: zero new dependencies (node stdlib only); base configs never mutated.
- Note: `_checkpoint_session_id: input.session_id ?? null` in the PreToolUse hook can inject `null` when Codex omits `session_id`; the MCP runtime then rejects the call visibly (no write). This is the honest failure mode — acceptable.

## Testing Assessment

### Verify Command Result

- **Command**: `node --test packages/checkpoint-core/test/*.test.js opencode/test/*.test.mjs codex/test/*.test.mjs && bash -n install.sh`
- **Exit Code**: 0
- **Result**: pass (39/39; re-run independently by this reviewer)

### Test Quality

| Test | What it Tests | Meaningful? | Issue |
| ---- | ------------- | ----------- | ----- |
| MCP runtime protocol test | initialize echo, tools/list, checkpoint append, checkpoint_path no-write, missing-injection rejection, unknown-method survival | y | Exact record-key set + regex asserting no internal fields persisted; asserts no append on rejected calls. |
| MCP stdio server test | Real spawned server over NDJSON; responses flushed before exit | y | Regression coverage for the queue/flush fix; would fail on the naive `close → exit` bug. |
| Eight-field vs legacy six-field | New writes 8-field; legacy logs readable via core normalization | y | Behavioral, not structural. |
| SessionStart hook wire | Exact output key set, instruction marker, session ID announcement | y | Exact-keys assertion catches `deny_unknown_fields` violations on the pinned wire. |
| PreToolUse hook wire | allow+`updatedInput` pairing, stale internal ID replacement, cwd injection (path with space) | y | Directly targets the pinned-build mandatory pairing. |
| Hook via symlinked install path | Main-guard under `/tmp`-style symlinked invocation | y | Regression test for the main-guard bug class. |
| Hook non-checkpoint tools/events + invalid JSON | Empty stdout/exit 0 for others; exit 1 + stderr on bad JSON | y | — |
| Installer: adapter/profile/base config | Byte-for-byte base config preservation across two runs; profile contents (`[features] hooks`, `[mcp_servers.*]`, `enabled_tools`, both `[[hooks.*]]`, matcher, node binary exists) | y | Also proves stale regular files are refreshed while symlinked destinations are protected. |
| Installer: disabled target / project mode | No adapter artifacts created | y | — |
| checkpoint-watch main-guard fix | Invocation through non-canonical path | partial | Manual probe evidence only (`fix/watch-fixed-fixture.log`); no automated regression test spawns the binary through a non-canonical path (F-2). |

### Real-World Testing

Performed. A credential-free E2E drove the *installed* hook → installed stdio MCP server → `checkpoint-inspect` chain in an isolated `CODEX_HOME`/workspace on pinned codex-cli 0.131.0, producing an exact 8-field record (artifact verified: `smoke.ahqXPm/workspace/.agent-checkpoints/smoke-session-001.jsonl`); profile layering was proven against the real CLI (`--profile-v2 ... debug prompt-input` exit 0, `prompt-input-probe.log`). This reviewer independently re-executed the E2E successfully. Not performed (documented, accepted): a live Codex agent session with credentials — substituted by the primary-accepted proof set per the impl-plan Mismatches note.

## Scope Compliance

### Findings

- In-scope items delivered; no out-of-scope changes detected. `git status` shows only the planned files plus the two justified bug fixes and Phase 1 superseded banners.
- Exclusions honored: no app-server client, no WebSocket, no marketplace packaging, no `spawn_agent`/`multi_agent_v2` adoption, no subagent attribution fabricated anywhere (code, tests, docs).

## Regression Risk

### Test Integrity Check

- [x] No existing tests were deleted
- [x] No existing tests were disabled (skip, pending, xit, etc.)
- [x] No existing assertions were weakened (the opencode installer test was corrected to compare against the canonical path — a strictness-preserving test bug fix)
- [x] All pre-existing tests still pass (39/39 including the full core and OpenCode suites; `fix/gate-baseline.log` shows the pre-fix 37/2 state, resolved)

### Findings

- The `checkpoint-watch.js` main-guard change alters process-entry behavior; covered by manual probe only (F-2). Risk is low (the guard's semantics are unchanged for canonical invocations; non-canonical invocation previously did nothing at all).

## Documentation & Cleanup

### Findings

- F-1 (evidence hygiene): `smoke.log` retains a crashed E2E attempt (`SyntaxError: Unexpected end of JSON input` at `smoke-e2e.mjs:33`) followed by an unconditional `SMOKE ALL PASSED` echo; the passing run's step output (`SMOKE E2E PASSED`) appears in no log. The functional claim is nonetheless proven by the record artifact and this reviewer's re-run. Docs themselves (`codex/README.md`, `docs/installation.md`, concept doc) are accurate and honest, including the mcp-list limitation, session-level logging limit, null telemetry, and the no-live-agent-run boundary.

## Findings Summary

| ID  | Severity | Area | Finding | Recommendation |
| --- | -------- | ---- | ------- | -------------- |
| F-1 | Minor | Test evidence | smoke.log's `SMOKE ALL PASSED` marker is unreliable: the log contains a crashed E2E attempt followed by an unconditional success echo, and the passing run's output was never captured. | Follow-up: make the smoke wrapper chain the echo with `&&` (or `set -e`) and re-capture a clean passing log; keep the passing `SMOKE E2E PASSED` output in the spooled evidence. |
| F-2 | Minor | Test coverage | The `checkpoint-watch.js` main-guard symlink fix has no automated regression test (manual probe only), unlike the analogous hook fix which is test-covered. | Follow-up: add a small spawn-based test invoking `checkpoint-watch.js --once` through a non-canonical (e.g. `/var` on macOS) path in a temp workspace. |
| F-3 | Note | Process | Acceptance criterion 4 (mark agent-checkpoint-heartbeat phase 4 completed via update-plan) not yet executed; old plan phase 4 still "pending", todo item open. | Execute on review acceptance via `update-plan`. |
| F-4 | Note | Acceptance scope | No live Codex agent session was run (credential-free constraint); acceptance relies on the primary-accepted proof set (TOML parse + profile-layering acceptance + credential-free E2E), which is documented in the impl-plan Mismatches and all user docs. | No action; revisit only if a future re-pin changes the hook/MCP surface. |

## Recommendations

1. (Non-blocking, follow-up) F-1: harden the smoke wrapper so success markers are conditional, and capture a clean passing E2E log into the machine-local evidence set.
2. (Non-blocking, follow-up) F-2: add the spawn-based non-canonical-path regression test for `checkpoint-watch.js`.
3. (On acceptance) F-3: mark agent-checkpoint-heartbeat phase 4 completed via `update-plan` and check off the Phase 2 todo items.
