---
type: review
entity: implementation-review
plan: "checkpoint-harness-integration"
phase: 3
status: final
reviewer: "delegate"
created: "2026-07-27"
---

# Implementation Review: Phase 3 - Claude Code Integration

> Reviewing implementation of [Phase 3](../phases/phase-3.md)
> Against [Implementation Plan](../implementation/phase-3-impl.md) and [Plan](../plan.md)

## Overall Assessment

**Verdict**: Accepted

The implementation fulfills the phase's Definition of Done: the skills-directory plugin passes strict validation on the pinned claude 2.1.170 build (source and installed), hook-injected parent/composite-subagent identity produces separate eight-field JSONL logs, the atomic statusline sidecar feeds honest telemetry with explicit-unknown degradation, and the installer preserves base `settings.json`/`~/.claude.json` byte-for-byte with symlink guards and project-mode skip. The final gate (57/57 tests + `bash -n install.sh`) and a 9-step pinned-CLI smoke in a disposable home are green; no tests were skipped, weakened, focused, or deleted. The one acceptance item pending at review time (heartbeat phase-5 status reconciliation) is a closeout action that follows review acceptance per the Phase 2 precedent, and the credential-free proof-set limitation matches the primary's accepted Phase 2 decision.

## Acceptance Criteria Verification

| # | Criterion | Met? | Evidence | Gap |
| - | --------- | ---- | -------- | --- |
| 1 | Plugin passes strict validation on the pinned build; scoped MCP tools discoverable and callable | yes | `smoke.log`: `validate-source-strict` + `validate-installed-strict` PASS on claude 2.1.170; `plugin-discovery-attempt` shows `agent-checkpoint@skills-dir` loaded; unit test asserts `tools/list` = exactly `checkpoint`/`checkpoint_path` with pinned schemas; stdio E2E round-trips both tools | Live authenticated session (claude itself spawning the plugin MCP) not performed — credentials unavailable in isolated home; accepted Phase 2 precedent (see F-2) |
| 2 | One real parent and one real subagent checkpoint produce separate shared-contract JSONL logs via hook-injected IDs; `checkpoint_path` returns inspectable paths | yes | `smoke.log` `hook-rewrites`: parent → `_checkpoint_session_id: smoke-sess`, subagent → `smoke-sess--agent-1` + `_agent_type: implementer`; `mcp-end-to-end-and-inspect`: two separate JSONL logs, `checkpoint_path` → `.agent-checkpoints/smoke-sess--agent-1.jsonl`, `checkpoint-inspect` on both; runtime test asserts distinct deterministic files and exact record content | Driven by smoke-scripted hook executions with schema-accurate payloads, not a live model run (same accepted limitation) |
| 3 | Statusline telemetry returned when valid; explicit unknown on null/compaction/mismatch; sidecar never in raw logs/inspection | yes | Tests: null percentage, post-compaction atomic replacement, malformed JSON, missing identity, session mismatch, project mismatch (`realpath`-safe), out-of-range percentage, invalid sidecar — all → `null`/`unknown`; raw logs asserted free of `_checkpoint_session_id|_telemetry_session_id|_agent_type|remainingKTokens|used_percentage|context_window_size|total_input_tokens|updated_at`; no `.tmp` leftovers after rename; smoke records `context_used: 0.37`, `session_title: "Smoke Session"`, inspect shows `Context used: 37%` | none |
| 4 | Base `settings.json`/`~/.claude.json` byte-for-byte preserved in installer tests; activation via documented `--settings` launch | yes | Installer test snapshots both files (incl. a preexisting user `statusLine`) before/after install and after a symlink-protection re-run; generated `agent-checkpoint.settings.json` contains only the `statusLine` key with shell-quoted paths (tested with a space-containing `Claude Home` path); activation command documented in installer summary, README, `docs/installation.md`, `config.yaml.example` | none |
| 5 | Full test command + `bash -n install.sh` pass | yes | `final-gate-1.log`: 57 tests, 57 pass, 0 fail, 0 skipped, 0 todo; combined gate exit 0; targeted Claude suite 17/17 (`targeted-1.log`) | none |
| 6 | agent-checkpoint-heartbeat phase 5 marked completed via `update-plan` | pending | `plans/agent-checkpoint-heartbeat/phases/phase-5.md` still `status: pending`; heartbeat plan table row 5 still pending | Closeout action follows review acceptance, matching the Phase 2 precedent (phase 4 was marked after its review verdict); see F-1 |

## Plan Adherence

| Step | Planned | Actual | Deviation? | Assessment |
| ---- | ------- | ------ | ---------- | ---------- |
| 1 | In-place plugin package (manifest, `.mcp.json`, hooks, README), `${CLAUDE_PLUGIN_ROOT}`/`${CLAUDE_PROJECT_DIR}` references | All files present with pinned names (`mcp__plugin_agent-checkpoint_checkpoint__*`); strict validation passes | none | As planned |
| 2 | Dependency-free stdio MCP runtime/server, exactly two tools, hook-injected identity required, `CLAUDE_PROJECT_DIR` root, honest telemetry | `checkpoint-mcp-runtime.mjs`/`checkpoint-mcp-server.mjs` implement protocol, schemas, unknown degradation, rejection of missing identity; core unchanged | none | As planned |
| 3 | SessionStart/SubagentStart instruction injection; exact PreToolUse matchers; full-input `updatedInput`; stale internal IDs overwritten; SessionEnd sidecar cleanup | `checkpoint-hook.mjs` implements all four events; internal fields deleted and rebuilt from current hook identity; `checkpoint_path` allowed with public `session_id` preserved | none | As planned; overwrite is unconditional (stronger than "on mismatch", guarantee identical) |
| 4 | Atomic statusline sidecar (tmp+rename), minimal snapshot, compact statusline row, mismatch guards, approximate remaining K | `checkpoint-statusline.mjs` + MCP `readTelemetry` implement exactly; sidecar holds only documented fields | none | As planned |
| 5 | Installer: copy plugin + core, preserve symlinks, generate statusLine-only settings, never edit base files, project-mode skip | `install_claude_checkpoint` + `claude_enabled` gate + summary output; settings/key shape and byte-for-byte preservation tested | none | As planned |
| 6 | Docs: plugin README, installation guide, concept-doc harness row, config comments | All four updated with honest telemetry/activation/volatility semantics | none | As planned |
| 7 | Node tests + installer smoke + pinned-CLI smoke; fail clearly when claude missing/too old | 17 tests; strict-validation test asserts (never skips) on missing/outdated claude; 9-step smoke in disposable home | none | As planned |

## Code Quality Assessment

### Findings

- No hardcoded defaults: workspace root from `CLAUDE_PROJECT_DIR`, identity from hook payloads, no invented session IDs; missing identity yields a clear tool error, never a fabricated one.
- Root cause addressed: identity bridge is solved at the documented hook surface rather than via transcript parsing or heuristics; telemetry bridge is a single atomic latest-value file — the smallest defensible process boundary.
- Minimal changes: `packages/checkpoint-core/` reused unchanged; `install.sh` gained one gated function + summary block; existing skills/agents copy behavior untouched.
- Patterns preserved: mirrors the accepted Phase 2 Codex adapter layout (runtime/server split, installed-core sibling, symlink-safe `isMain` guard, space-safe quoting helpers) and the repo's fail-clearly-not-skip test convention.
- No silent failures: hook exits 1 with stderr on invalid JSON; statusline degrades to the `unknown` row with stderr diagnostics (correct — it must not break the host UI); MCP returns `isError` tool results; SessionEnd removal failure is a stderr diagnostic that cannot block teardown.
- Dependency boundary respected: zero new dependencies; three deliberate `encodeSessionId` mirrors documented as such (avoids cross-imports into the plugin; same choice as the Codex adapter).
- `remainingKTokens` flows only into tool feedback (the core's eight-field record cannot persist it) — verified against `checkpoint-core/src/index.js` and asserted by the raw-log absence test.

## Testing Assessment

### Verify Command Result

- **Command**: `node --test packages/checkpoint-core/test/*.test.js opencode/test/*.test.mjs codex/test/*.test.mjs claude/test/*.test.mjs && bash -n install.sh`
- **Exit Code**: 0
- **Result**: pass (57/57; 0 skipped; `final-gate-1.log`, `targeted-1.log` 17/17)

### Test Quality

| Test | What it Tests | Meaningful? | Issue |
| ---- | ------------- | ----------- | ----- |
| Manifest/MCP/hooks shape | Pinned plugin file shapes, exact scoped matchers, command wiring | y | Asserts behaviorally load-bearing names, not just existence |
| Strict validation (pinned CLI) | Real `claude plugin validate --strict` in a disposable `CLAUDE_CONFIG_DIR` | y | Fails clearly when claude missing/too old; real home untouched |
| MCP protocol + telemetry-fed records | initialize/list/call, eight-field parent+subagent records, sourcing rules, rejection paths, unknown methods | y | Parses written logs through the shared core and asserts raw bytes exclude internal/sidecar fields — would catch contract regressions |
| Missing `CLAUDE_PROJECT_DIR` | Clear error, nothing persisted | y | Asserts no `.agent-checkpoints` created |
| `readTelemetry` degradation | null/absent/mismatched/invalid/out-of-range snapshots | y | Covers every documented unknown path including `realpath` project mismatch |
| Eight-field writes + legacy six-field reads | Contract continuity | y | Legacy record readable with null metadata, no migration |
| Stdio server flush | Real spawned server, serialized responses before exit | y | Catches the documented in-flight-drop race; assembles the installed layout explicitly |
| Selected-path inspection parity | `checkpoint-inspect` on Claude-produced logs | y | Cross-harness inspection parity for this phase |
| Hook instruction injection | SessionStart/SubagentStart `additionalContext` + announced IDs | y | Exact output-key shape asserted |
| Hook PreToolUse rewrite | Parent/subagent injection, stale-ID overwrite, distinct IDs | y | Stale internal fields provably never trusted |
| Hook passthrough/ignore | `checkpoint_path` public-ID preservation, non-matching tools/events silent, invalid JSON exit 1 | y | Public `session_id` preserved verbatim |
| SessionEnd cleanup | Only the matching sidecar removed, sibling kept | y | — |
| Symlinked install path | Hook runs when invoked below a symlinked dir | y | Guards the macOS `/tmp`/`/var` canonicalization trap |
| Statusline normalize/format/atomic | Valid/null/compaction/malformed/no-identity cases, no `.tmp` leftovers | y | Atomicity and honest degradation both asserted |
| Installer isolation | Byte-for-byte base preservation, symlink guards, generated settings shape, space-containing home path | y | Re-run with planted symlinks proves protection; user `statusLine` survives |
| Disabled target | No plugin artifacts, other targets unaffected | y | — |
| Project mode | Plugin skipped in `--project` | y | — |

### Real-World Testing

Performed, within the primary's accepted credential-free proof-set precedent (Phase 2): a 9-step pinned-CLI (claude 2.1.170) smoke in a disposable `CLAUDE_CONFIG_DIR` and throwaway project proved strict validation (source + installed), installer behavior, settings-file shape, hook rewrites for parent and composite subagent IDs, a credential-free end-to-end chain (hook → installed MCP → two separate shared-contract JSONL logs → statusline-fed `context_used` 0.37 / `session_title` → `checkpoint-inspect` on both), and plugin discovery without auth (`agent-checkpoint@skills-dir` loaded). Evidence: `/tmp/opencode/checkpoint-harness-integration-phase3/smoke.log` (+`smoke.mjs`).

Not performed: a live authenticated parent/subagent model run (claude itself firing the hooks, applying `updatedInput`, and spawning the plugin MCP), because credentials are unavailable in an isolated home (`Not logged in`); no workaround attempted and the real home/credentials untouched. The residual gap is Claude-owned wiring covered by Phase 1 schema-level revalidation on the pinned build; the hook/MCP payloads exercised in tests and smoke match that revalidated schema. Judged not to undermine acceptance — see F-2.

## Scope Compliance

### Findings

- In-scope only: new `claude/` plugin + tests; gated `install.sh` addition; `config.yaml.example` comments; `docs/installation.md`; `docs/agent-checkpoint-heartbeat.md` harness row. No marketplace/cache manipulation, no background monitors, no transcript parsing — exclusions respected.
- The three other modified files (`opencode/test/checkpoint-plugin.test.mjs`, `packages/checkpoint-core/bin/checkpoint-watch.js`, `packages/checkpoint-core/test/checkpoint-watch.test.js`) are the already-reviewed Phase 2 changes (project-mode path canonicalization test fix; watch main-guard symlink resolution + regression test), not Phase 3 drift.

## Regression Risk

### Test Integrity Check

- [x] No existing tests were deleted (Claude suite is new; all other suites untouched by this phase)
- [x] No existing tests were disabled (no `skip`/`only`/`todo` in `claude/test/`; gate reports `skipped 0, todo 0`; the pinned-CLI validation test asserts instead of skipping when claude is missing/too old)
- [x] No existing assertions were weakened (Phase-2-carried test edits are the accepted canonicalization fix and a new regression test)
- [x] All pre-existing tests still pass (57/57 in the final gate, up from Phase 2's 40/40 by exactly the 17 new Claude tests)

### Findings

- None. The final gate count delta (40 → 57) equals the new suite size; sidecar state lives outside raw logs; `SessionEnd` cleanup cannot touch JSONL or other sessions' sidecars (tested).

## Findings Summary

| ID  | Severity | Area | Finding | Recommendation |
| --- | -------- | ---- | ------- | -------------- |
| F-1 | Note | Plan reconciliation | agent-checkpoint-heartbeat phase 5 still `pending` (phase file + plan table) at review time; acceptance criterion 6 is a closeout action | Execute `update-plan` for heartbeat phase 5 at acceptance, matching the Phase 2 (phase 4) precedent |
| F-2 | Note | Verification scope | Live authenticated model runs not possible in the isolated home; hook firing/`updatedInput` application/plugin-MCP spawning by claude itself is proven at schema level (Phase 1 revalidation) plus scripted hook→MCP E2E, not by a live session | None — accepted Phase 2 credential-free precedent; plan-level docs record the evidence boundary; revisit only if a future re-pin changes the surface |
| F-3 | Note | Plugin packaging | Source-tree plugin is not standalone-runnable (`server/checkpoint-core.mjs` exists only after `install.sh` copies the shared core); strict source validation passes because it does not spawn the server | None — deliberate single-core design shared with the Codex adapter; installed plugin is validated separately in the smoke |
| F-4 | Note | SessionEnd cleanup | Sidecar removal is keyed on hook `cwd` while the statusline writes under `workspace.project_dir`; if the two ever diverge, an ephemeral sidecar survives SessionEnd | None required — stale snapshots are guarded by session/project mismatch on read and never enter logs or inspection |

## Recommendations

1. At acceptance: mark agent-checkpoint-heartbeat phase 5 completed via `update-plan` (F-1) and reconcile this plan's phase-3 status/todo/changelog per the established closeout workflow. Does not block the verdict; blocks plan DoD bookkeeping only.
2. No Critical, Major, or Minor actions. The implementation may proceed to commit/closeout as-is.
