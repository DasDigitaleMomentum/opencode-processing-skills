---
type: review
entity: implementation-review
plan: "checkpoint-harness-integration"
phase: 4
status: final
reviewer: "delegate"
created: "2026-07-27"
---

# Implementation Review: Phase 4 - Hermes Integration

> Reviewing implementation of [Phase 4](../phases/phase-4.md)
> Against [Implementation Plan](../implementation/phase-4-impl.md) and [Plan](../plan.md)

## Overall Assessment

**Verdict**: Needs Rework

The implementation fulfills the phase's Definition of Done in all tested paths: the plugin mirrors the eight-field contract faithfully (verified line-by-line against `packages/checkpoint-core/src/index.js`), hook binding matches the pinned tree's production payloads, installer isolation is extensively tested, and the F-4 cross-adapter parity demonstration is substantive. One Major finding blocks acceptance: the installer's enablement replication omits the disabled-list removal half of the documented `hermes plugins enable` flow, so a plausible state (plugin previously disabled) yields a silent non-activation while the installer reports "Enabled". Remediation is bounded (loud-stop detection, consistent with the installer's existing design).

## Acceptance Criteria Verification

| # | Criterion | Met? | Evidence | Gap |
| - | --------- | ---- | -------- | --- |
| 1 | One real `checkpoint` call on the pinned build produces shared-contract JSONL via the plugin tool; `checkpoint_path` inspectable; `subagent_start` available-but-not-adopted (session-level, post-hoc `subagent_stop` only); telemetry estimate-or-`null` | yes | Smoke `/tmp/opencode/checkpoint-harness-integration-phase4/smoke/smoke.log` steps 5–6: installed plugin (driven in-process with production-shape payloads) appended an eight-field record (`agent`/`session_title` `null`, `context_used` 0.512 estimate) and `checkpoint-inspect` read it. `hermes/test/test_agent_checkpoint.py` 37 tests cover eight-field writes, encoded paths, repeated appends, failed-step, mismatch/unknown-session visible errors, estimate + `null` fallbacks, legacy reads, fixture parity, JS-core cross-read. `subagent_start` non-adoption verified against pinned tree (`plugins.py:164` VALID_HOOKS, `delegate_tool.py:1453–1466` fire site) and documented as follow-up in phase-4.md, impl plan, README, concept doc. | — |
| 2 | `~/.hermes/config.yaml` preserved byte-for-byte except additive `plugins.enabled` entry; activation via documented flow; removable via `hermes plugins disable` | partial | InstallerIsolationTests: absent-config creation, no-plugins-key append, plugins-block-without-enabled insertion, existing-entries append (order-preserving), inline `enabled: []` rewrite, idempotent second run, symlink skip + enable. Disable/removal path uses the real pinned CLI (`hermes plugins disable` → status disabled → directory removal → gone from list). Smoke step 2: config diff exactly 3 additive lines; step 3: `plugins list --json` honors the text-edit enablement; step 7: real `~/.hermes` untouched. | F-1: when the plugin is already in `plugins.disabled`, the installer adds the enabled entry but the loader's deny-list semantics (`plugins.py` `_get_disabled_plugins`: "never load, even if it appears in `plugins.enabled`") keep the plugin dead; the installer still prints "Enabled:". The documented flow (`plugins_cmd.py` `cmd_enable`) removes the disabled entry precisely because it would otherwise veto the enable. |
| 3 | Hermes installer isolation tests pass; other targets unchanged; `bash -n install.sh` passes | yes | Final gate (`final-gate.log`): node 58/58 (0 skipped), python 37/37 OK, `bash -n` green per delegation. Independent re-run of the Python suite during this review: 37/37 OK (`review-python-recheck.log`). Step 9 gated `PROJECT_MODE = false && hermes_enabled = 1`, additive only; skills/DESCRIPTION.md output asserted unchanged. | F-2: negative branches (project-mode skip, disabled-target skip) untested for Hermes — codex/claude suites test both. |
| 4 | checkpoint-watch and the phase-3 inspection path (`checkpoint-inspect`) read logs from all installed harnesses unchanged | yes | `InspectionParityTests.test_cross_adapter_inspection_parity`: pilot fixture log + real codex/claude adapter-runtime writes + Hermes plugin write, each read by `checkpoint-inspect` (session/work-status asserted per log) and all four by `checkpoint-watch --once`; plus symlinked-bin invocation of inspect. | — |
| 5 | Concept-doc harness matrix lists Hermes with actual capabilities | yes | `docs/agent-checkpoint-heartbeat.md` Hermes row: native plugin tools, hook-bound session ID, estimate-or-`null` telemetry, `agent`/`session_title` always `null`, `subagent_start` exists-but-not-adopted, enablement delta, name-collision disambiguation. All statements verified against code and pinned tree. | — |

## Plan Adherence

| Step | Planned | Actual | Deviation? | Assessment |
| ---- | ------- | ------ | ---------- | ---------- |
| 1 | Plugin package: `plugin.yaml` (kind standalone, tools/hooks lists) + module mirroring contract semantics | `hermes/agent-checkpoint/plugin.yaml`, `agent_checkpoint.py` (484 lines), `__init__.py` exposing `register(ctx)` per loader requirement | none | Contract mirror verified against `index.js`: field sets, type/range checks, timestamp regex+roundtrip, encodeURIComponent-equivalent safe sets (`!*'()` + unreserved) — parity holds, including bool-rejection for `context_used`/`step_failed` and exact legacy/current field-set acceptance. Byte-compatibility (compact separators, UTF-8 literals, key insertion order) test-asserted and cross-read by the JS core. |
| 2 | Hooks bind session/workspace/telemetry; mismatch visible; no `subagent_start` subscription | `_on_session_start`/`_on_pre_tool_call`/`_on_pre_api_request` with locked process-local state, mismatch latch raising `ValueError`, unknown-session refusal, telemetry slot with invalid-payload clearing | none | Payload consumption matches pinned production call sites (`plugins.py:2146` `pre_tool_call` kwargs superset; `conversation_loop.py:439` `on_session_start`; hooks.py `_DEFAULT_PAYLOADS`). `register(ctx)` kwargs match `PluginContext.register_tool(name, toolset, schema, handler)` and `register_hook` (VALID_HOOKS validation). Manifest `kind: standalone` valid; `provides_*` informational. |
| 3 | Installer: copy plugin dir (symlink-preserving) + documented enablement, additive only | `install_hermes_checkpoint` + `hermes_enable_plugin_entry` (awk text edit), Step 9, Cursor renumbered Step 10, summary block | justified deviation | Enablement applied as a text edit instead of invoking `hermes plugins enable` — the Blueprint-approved design (whole-file rewrite by `save_config` would break byte-for-byte preservation). Loud stop on unsupported inline `enabled: [x]`. See F-1/F-3 for two gaps in the replication. |
| 4 | Docs: installation.md section, concept-doc row, README, config comments, disambiguation | All four updated; wording verified accurate against implementation and pinned tree | none | Honesty requirements met: estimate semantics disclosed, `subagent_start` "exists but deliberately not adopted" (corrected stop-and-revise wording consistent across phase/impl-plan/README/concept doc), `hermes checkpoints` disambiguated in all user-facing surfaces. |
| 5 | Contract-parity, installer-isolation, pinned-CLI, inspection-parity tests | 37-test Python suite incl. real-CLI disable path and four-log inspection parity; JS inspect regression test | none | Fail-clearly-not-skip honored (`require_hermes`/`require_node` raise failures). `checkpoint-inspect.js` realpath guard now identical to the phase-2 `checkpoint-watch.js` pattern; regression test asserts canonical and via-symlink invocation (platform-permission `t.skip` guard is legitimate, not a weakening). |

## Code Quality Assessment

### Findings

- Contract mirroring is exact and root-caused: no hardcoded drift from the JS core; the model-limit table is deliberately small with an env override (`AGENT_CHECKPOINT_CONTEXT_LIMIT_TOKENS`) — but see F-4 for one indefensible prefix entry.
- Minimal change surface: Hermes target extended additively; the only core-package change is the carried `checkpoint-inspect.js` realpath fix + regression test (in scope per handover note and delegation).
- No silent failures in the plugin: mismatched/unknown sessions raise visible errors; malformed records fail before any append (test asserts no partial write); telemetry degrades to honest `null`.
- Hook/telemetry state is process-local, lock-guarded, and provably absent from JSONL (`test_no_hook_or_telemetry_state_persisted` greps the raw text for forbidden tokens).
- The awk enablement edit preserves inode/permissions (`cat` overwrite), is idempotent via exact item match (trailing comments tolerated, `- agent-checkpoint-extra` correctly not matched), and appends without reordering (subsequence assertion in tests).

## Testing Assessment

### Verify Command Result

- **Command**: `node --test packages/checkpoint-core/test/*.test.js opencode/test/*.test.mjs codex/test/*.test.mjs claude/test/*.test.mjs && python3 -m unittest discover -s hermes/test && bash -n install.sh`
- **Exit Code**: 0 (final-gate.log: node 58/58, 0 skipped; python 37/37; bash -n green per delegation)
- **Result**: pass — independently spot-checked: `python3 -m unittest discover -s hermes/test` re-run during review → 37/37 OK.

### Test Quality

| Test | What it Tests | Meaningful? | Issue |
| ---- | ------------- | ----------- | ----- |
| CheckpointWriteTests (8) | Eight-field writes, appends, step_failed, validation-before-append, mismatch/unknown-session visible errors, payload binding, other-tool isolation, field-set/type ranges | y | Behavioral, asserts no partial append and no `.agent-checkpoints` creation on failure |
| PathParityTests (3) | Shared fixture pathCases, traversal containment (`../outside` → `%2F` encoding), unicode encoding + empty/None rejection | y | Cross-adapter fixture parity, not just structure |
| TelemetryTests (5) | Known-model estimate (0.42), env override for unknown model, null fallbacks (absent/invalid/unknown model), clamp to 1.0 | y | Invalid payloads clear the slot (no stale estimate) — tested per-value |
| LegacyReadTests (1) | Six-field normalize with null metadata | y | — |
| FixtureParityTests (4) | Pilot fixtures + analysis cases validate, byte-compat (separators/UTF-8/key order), JS core parses Hermes log (chain/telemetry preserved), no state persisted | y | The JS-core cross-read is the strongest parity guarantee available without a shared runtime |
| InstallerIsolationTests (9) | Files installed, absent/no-key/no-enabled/existing-entries/inline-`[]` configs, idempotency (file bytes + config identical), symlink skip, skills/DESCRIPTION unchanged, real-CLI disable/removal | y | F-2: no project-mode or disabled-target negative-branch tests (codex/claude suites have both) |
| InspectionParityTests (1) | Four harness logs via checkpoint-inspect each + checkpoint-watch --once + symlinked inspect | y | Uses real codex/claude adapter runtimes and the real Hermes plugin for record production |
| checkpoint-inspect.test.js (new JS test) | Main-guard runs via canonical and symlinked bin paths | y | Platform-permission skip guard legitimate |

### Real-World Testing

Performed (credential-free proof set per the accepted phase-2/3 precedent — no live model inference). Pinned-CLI smoke on Hermes Agent v0.19.0 (e0b9ab5a) in an isolated `HERMES_HOME`: installer exit 0; config diff exactly 3 additive lines; `hermes plugins list --json` shows agent-checkpoint enabled/user/1.0.0 (proving Hermes honors the installer's text-edit enablement); `hermes hooks test on_session_start` exit 0; the installed plugin drove a real checkpoint (eight-field, estimate 0.512); `checkpoint-inspect` read the log; real `~/.hermes` mtime untouched. The disable/removal path test additionally exercises the real CLI. Remaining mock boundary: hook payloads in unit tests are synthetic but match the pinned tree's documented production shapes (verified during this review at the fire sites).

## Scope Compliance

### Findings

- All changes inside phase-4 scope: new `hermes/`, Hermes sections of `install.sh`/`config.yaml.example`/`docs/`, carried `checkpoint-inspect.js` fix + regression test. Other modified files in the working tree (`opencode/test/checkpoint-plugin.test.mjs`, `checkpoint-watch.js` + test) are phase-2 residue verified as previously reviewed work, not phase-4 scope creep.
- Plan DoD item "cross-adapter inspection parity shown with `checkpoint-inspect` and checkpoint-watch": **evidence sufficient** — automated four-log parity test (pilot fixture, real codex/claude adapter-runtime records, Hermes plugin record) through both tools, plus the smoke's inspect run over the real installed-plugin log.

## Regression Risk

### Test Integrity Check

- [x] No existing tests were deleted
- [x] No existing tests were disabled (node run reports 0 skipped; Python suite has no skip decorators — `require_*` raise failures)
- [x] No existing assertions were weakened (core/watch/test diffs are additive; inspect test diff is one added test + import changes)
- [x] All pre-existing tests still pass (58/58 node incl. prior suites)

### Findings

- None. The inspect main-guard change mirrors the already-reviewed phase-2 watch-guard pattern and is covered by a new regression test.

## Findings Summary

| ID  | Severity | Area | Finding | Recommendation |
| --- | -------- | ---- | ------- | -------------- |
| F-1 | Major | install.sh `hermes_enable_plugin_entry` | Enablement replication omits the disabled-list half of the documented flow. `hermes plugins enable` adds to `plugins.enabled` AND discards from `plugins.disabled` (`plugins_cmd.py` `cmd_enable`, explicitly because "explicit disable wins" otherwise vetoes the enable); the loader (`plugins.py` `_get_disabled_plugins`) never loads a disabled-listed plugin even when enabled. A realistic path — user runs the documented `hermes plugins disable agent-checkpoint`, later re-runs `install.sh` (routine skill updates) — leaves the plugin permanently dead while the installer prints "Enabled:". The `enabled: []` + `disabled: [agent-checkpoint]` test config constructs exactly this state but asserts only text preservation. | Detect the plugin name under a `disabled:` list and loud-stop with the manual instruction (`hermes plugins enable agent-checkpoint`), consistent with the existing loud-stop-on-unsupported-form design; additive-only forbids removing the entry, so stopping (not editing) is the sanctioned remediation. Add a test asserting the stop. |
| F-2 | Minor | hermes/test installer coverage | No tests for the Hermes step's negative branches: project-mode skip (`PROJECT_MODE != false`) and disabled-target skip (`hermes_enabled = 0`). Codex and Claude suites each test both branches; the Hermes gate uses the identical pattern but is unverified. | Add two installer tests (project mode → no `plugins/agent-checkpoint/`, no config delta; target disabled → same). |
| F-3 | Minor | install.sh awk edit | Inline-dict `plugins: {…}` (or `plugins:` with any trailing non-comment content) is not detected: the awk requires `plugins:` alone on the line, so it appends a second block-style `plugins:` key — a duplicate YAML key whose silent later-wins resolution can drop the user's inline plugin config. Rare (Hermes' own `atomic_yaml_write` always emits block style) but contradicts the loud-stop safety design. | Loud-stop on `^plugins:` lines with trailing non-comment content, mirroring the inline-`enabled` handling. |
| F-4 | Minor | `agent_checkpoint.py` `_MODEL_PREFIX_LIMITS` | The `("gpt-4", 8192)` prefix is not defensible for the variants it catches: gpt-4-turbo/-0125/-1106 (128k) and gpt-4-32k (32k) would get estimates overstated 16×/4× instead of honest `null`. The env override mitigates; estimate semantics are disclosed. | Narrow the prefix set (exact table + `gpt-4o` prefixes, `claude-`) or add explicit turbo/32k entries. |
| F-5 | Note | hermes/test installer coverage | The `enabled: []` + `disabled: [agent-checkpoint]` fixture documents the F-1 state but asserts only text preservation, so the misleading-success behavior is invisible in the suite. | Covered by the F-1 recommendation (assert the loud stop on this fixture). |
| F-6 | Note | `agent_checkpoint.py` hook design | `on_session_start` fires only for brand-new sessions on the pinned build (`conversation_loop.py:439` "not on continuation"); continued sessions rely on `pre_tool_call` payload binding plus the process-cwd fallback. The design degrades correctly (no invented identity), verified in code; user-facing docs do not spell out the continued-session path. | No action required; optionally one README sentence noting continued sessions bind via `pre_tool_call`. |

## Recommendations

1. **(blocks acceptance, F-1)** Add disabled-entry detection with a loud stop + manual-flow instruction to `hermes_enable_plugin_entry`, and a test asserting the stop on the existing `enabled: []` + `disabled: [agent-checkpoint]` fixture.
2. **(follow-up, F-2)** Add project-mode and disabled-target negative-branch installer tests for the Hermes step.
3. **(follow-up, F-3)** Extend the loud stop to `plugins:` lines with trailing inline content.
4. **(follow-up, F-4)** Narrow the `gpt-4` prefix limit to defensible entries.

## Remediation (review-fix, 2026-07-27)

Applied in the reviewer session per accepted findings; original findings above retained as the record. Verify: targeted `python3 -m unittest discover -s hermes/test` (44/44 OK) + `node --test packages/checkpoint-core/test/*.test.js` (23/23, 0 skipped), then final gate `node --test packages/checkpoint-core/test/*.test.js opencode/test/*.test.mjs codex/test/*.test.mjs claude/test/*.test.mjs && python3 -m unittest discover -s hermes/test && bash -n install.sh` → exit 0 (node 58/58, 0 skipped; python 44/44). Spool: `/tmp/opencode/checkpoint-harness-integration-phase4/review-fix/`.

- **F-1 — Resolved.** `hermes_enable_plugin_entry` now runs a validation-only awk pass before editing: a `plugins.disabled` entry for the plugin (block items or inline `[...]` list, exact-name bounded so `agent-checkpoint-extra` does not false-positive) stops the installer (exit 4, `set -e` aborts) with `hermes plugins enable agent-checkpoint` manual instructions; config untouched. Tests: `test_disabled_plugin_entry_stops_loudly` (the ready-made `enabled: []`+`disabled:[agent-checkpoint]` fixture), `test_inline_disabled_list_stops_loudly`; the prior inline-`[]` rewrite coverage kept via a `disabled: [other-plugin]` variant.
- **F-2 — Resolved.** Added `test_disabled_target_skips_plugin` (`OPS_SYNC_HERMES=false`) and `test_project_mode_skips_plugin` (`--project`), mirroring the codex/claude negative-branch patterns.
- **F-3 — Resolved.** The validation pass loud-stops (exit 3) on `plugins:` lines with trailing non-comment content (inline dict), preventing the duplicate-key silent-loss append. Test: `test_inline_plugins_dict_stops_loudly`.
- **F-4 — Resolved.** Model table now exact entries (`gpt-4` 8192, `gpt-4-32k` 32768, `gpt-4-turbo`/`-preview`/`0125`/`1106` 128000) plus uniform-limit prefixes only (`claude-`, `gpt-4o`, `gpt-4-turbo`, `gpt-4-32k`); unlisted variants → honest `null`. Tests: `test_gpt4_family_model_limits`, `test_unlisted_gpt4_variant_falls_back_to_null`.
- **F-5 — Resolved** (folded into F-1 stop-case tests).
- **F-6 — Resolved.** README session-level bullet now states `on_session_start` fires only for brand-new sessions and continued sessions bind via `pre_tool_call`.

No remaining actionable findings. Verdict recommendation: **Accepted** after this remediation (primary decision).
