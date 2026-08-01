---
type: review
entity: implementation-review
plan: "checkpoint-session-status-hardening"
phase: 1
status: final
reviewer: "delegate"
created: "2026-08-01"
---

# Implementation Review: Phase 1 - Adapter Correctness Hardening

> Reviewing implementation of [Phase 1](../phases/phase-1.md)
> Against [Implementation Plan](../implementation/phase-1-impl.md) and [Plan](../plan.md)

## Overall Assessment

**Verdict**: Accepted

The implementation addresses all five accepted defects at their root while preserving the existing checkpoint record contract, opt-in activation, additive configuration behavior, and symlink safety. Focused review evidence passed (49 Hermes tests excluding only the pinned-host smoke, 11 Codex tests, and `bash -n`), and no actionable correctness, scope, test-quality, contract-preservation, or installer-safety finding was identified.

## Acceptance Criteria Verification

| # | Criterion | Met? | Evidence | Gap |
| - | --------- | ---- | -------- | --- |
| 1 | Parent, mapped child, and resumed parent write only to the parent-owned log, with two interleaved parent trees isolated. | Yes | Native-session maps and transitive root resolution are implemented in `hermes/agent-checkpoint/agent_checkpoint.py:84-97,314-391`; checkpoint dispatch selects the addressed native session while persisting the root parent ID at `:398-412,470-478`. Behavioral coverage at `hermes/test/test_agent_checkpoint.py:226-279` verifies parent/child/resumed-parent writes, absence of child logs, nested mapping, interleaved roots, and distinct telemetry. | None. |
| 2 | Normal Hermes parents and children receive the complete heartbeat instruction automatically. | Yes | `hermes/agent-checkpoint/checkpoint-instruction.md:3-13` contains cadence, exact three-word chaining, parallel-call, failed-step correction, telemetry-honesty, context-pressure handoff, and quality-boundary clauses. `agent_checkpoint.py:78-79,481-483,509-513` loads and injects it through `pre_llm_call`; `plugin.yaml:9-14` declares the hook. Tests at `hermes/test/test_agent_checkpoint.py:132-153,612-626` check every required clause for parent and subagent payloads and installed-byte parity. | Pinned Hermes host execution remains unavailable on this machine; see Real-World Testing. |
| 3 | Single- and double-quoted disabled entries in block and inline YAML stop safely with unchanged config and manual guidance. | Yes | The validation-only pass in `install.sh:1200-1257` normalizes exact unquoted, single-quoted, and double-quoted scalars and returns before the edit pass. Tests at `hermes/test/test_agent_checkpoint.py:707-753` cover all six exact block/inline forms, nonzero exit, byte-identical config, `plugins.disabled` diagnostics, the manual command, and near-match controls. | None. |
| 4 | A symlinked `$CODEX_HOME/agent-checkpoint` remains untouched and receives no writes through the link. | Yes | `install.sh:1003-1039` checks the whole destination with `-L` before `mkdir` or child installation and skips the complete adapter copy; independent profile handling remains at `:1041-1071`. `codex/test/checkpoint-codex.test.mjs:505-529` proves link identity, target directory entries, and sentinel bytes are unchanged while the independent profile is still installed. | None. |
| 5 | Over-limit Hermes telemetry reports `context_used: 1.0` and non-negative remaining headroom. | Yes | `hermes/agent-checkpoint/agent_checkpoint.py:301-307` clamps the fraction to `[0,1]` and remaining K-tokens to a zero lower bound; feedback uses that value at `:413-418`. `hermes/test/test_agent_checkpoint.py:419-432` covers just-over-limit and far-over-limit inputs, exact `1.0`/`0`, `~0k`, and absence of negative text. | None. |
| 6 | Existing checkpoint and installer suites remain green except for explicitly unavailable pinned-host binaries. | Yes | The locally runnable focused gate passed: 49/49 Hermes tests, 11/11 Codex tests, and `bash -n install.sh`. Existing six-/eight-field validation, JS parser parity, append behavior, idempotency, config preservation, per-file symlinks, disabled targets, and project mode remain covered. The exact broad gate was not repeated because Claude 2.1.170 and Hermes v0.19.0 are absent from `PATH`, the known host blocker recorded by the plan. | No code gap established; pinned-host evidence remains outstanding before final plan completion. |

## Plan Adherence

| Step | Planned | Actual | Deviation? | Assessment |
| ---- | ------- | ------ | ---------- | ---------- |
| 1 | Replace process-global Hermes binding/telemetry slots with native-session isolation and parent-log mapping. | Added lock-protected `_SESSIONS`, `_PENDING`, and `_TELEMETRY` state, `subagent_start` mapping, native handler forwarding, and root-parent persistence. | No material deviation. | Complete and contract-preserving. |
| 2 | Inject the full instruction through `pre_llm_call` and install the asset. | Added the canonical plugin-local instruction, callback/manifest registration, installer copy, clause tests, and byte-parity test. | No. | Complete. |
| 3 | Extend only Hermes disabled-list validation for quoted exact values. | Added exact scalar normalization to the validation pass; the additive edit pass and unrelated config remain unchanged. | No. | Complete and narrowly scoped. |
| 4 | Guard the whole Codex adapter directory before any write. | Added a pre-`mkdir` directory-symlink branch while retaining independent profile and per-file behavior. | No. | Complete and installer-safe. |
| 5 | Clamp remaining Hermes headroom to zero. | Added a lower bound without changing unknown telemetry or persisted fields. | No. | Complete. |

## Code Quality Assessment

### Findings

- No actionable findings. The changes address the underlying state ownership and write-order defects rather than masking symptoms, follow existing dependency-free Python/shell/Node patterns, keep failures visible, add no dependencies, and preserve exact six-/eight-field JSONL behavior. Locking covers all shared Hermes maps, native identity is supplied by the host rather than model arguments, and installer guards occur before the unsafe write points.

## Testing Assessment

### Verify Command Result

The review used the approved locally runnable targeted evidence rather than repeating the blocked broad gate:

```bash
# unittest discovery with only the pinned host smoke removed
python3 - <<'PY'
import sys, unittest
sys.path.insert(0, "hermes/test")
suite = unittest.defaultTestLoader.discover("hermes/test")
def flatten(items):
    for item in items:
        if isinstance(item, unittest.TestSuite):
            yield from flatten(item)
        else:
            yield item
tests = [test for test in flatten(suite)
         if not test.id().endswith("InstallerIsolationTests.test_disable_and_removal_path")]
result = unittest.TextTestRunner(verbosity=2).run(unittest.TestSuite(tests))
raise SystemExit(not result.wasSuccessful())
PY
node --test codex/test/*.test.mjs
bash -n install.sh
```

- **Exit Codes**: `0`, `0`, `0`
- **Result**: Hermes 49 passed / 0 failed / 0 skipped; Codex 11 passed / 0 failed / 0 skipped; shell syntax passed.
- **Evidence logs**: `/tmp/opencode/checkpoint-session-status-hardening-phase1-hermes-targeted.log`, `/tmp/opencode/checkpoint-session-status-hardening-phase1-codex-targeted.log`, and `/tmp/opencode/checkpoint-session-status-hardening-phase1-bash-n.log`.

### Test Quality

| Test | What it Tests | Meaningful? | Issue |
| ---- | ------------- | ----------- | ----- |
| Hermes parent-log and interleaving regressions | Physical destination, persisted root identity, absent child logs, transitive mapping, handler routing, and telemetry separation across interleaved trees. | Yes | None. Assertions would fail on child attribution, wrong destination, or cross-session telemetry. |
| Hermes instruction regressions | Exact hook registration, parent/child callback results, every required semantic clause, and installed source-byte equality. | Yes | Real host delivery is not locally exercised because the pinned binary is absent. |
| Hermes disabled-YAML regressions | Every accepted quoting/layout form, failure status and diagnostics, byte preservation, and exact-name false-positive controls. | Yes | None. These run the real installer against disposable homes. |
| Codex directory-symlink regression | Real filesystem link identity, target entry/byte preservation, skip output, and independent profile behavior. | Yes | None. This directly catches writes through the directory link. |
| Hermes headroom regression | Persisted clamped fraction and returned headroom for slight and extreme over-limit input. | Yes | None. It checks both numeric and user-visible behavior. |
| Existing compatibility/install suites | Six-/eight-field parsing and bytes, append and failure behavior, cross-adapter reading, idempotency, config preservation, existing symlink cases, and disabled/project modes. | Yes | None in locally runnable coverage. |

No pre-existing test was deleted or disabled. Review of the test diff found no weakened assertion; the one changed mismatch expectation is the explicitly authorized resumed-parent behavior, and exact tool/hook assertions were expanded rather than relaxed.

### Real-World Testing

**Partially performed.** The targeted suites execute the actual Python/Node adapter code, shell installer, temporary homes, filesystem symlinks, append-only JSONL writes, and cross-adapter parser/inspector paths. The 11 Codex tests use isolated runtime and installer subprocesses rather than a real Codex CLI, which is sufficient for this phase's directory-symlink installer change.

The pinned Hermes v0.19.0 host smoke was not performed because `hermes` is absent from `PATH`; consequently, live-host `subagent_start`, handler session forwarding, and `pre_llm_call` delivery remain unconfirmed on this machine. Claude Code 2.1.170 is also absent, so the exact broad repository gate remains blocked as already documented. This is the known host evidence limitation requested for treatment as a blocker to the later broad gate, not a Phase 1 code finding.

## Scope Compliance

### Findings

- No actionable findings. The reviewed Phase 1 hunks are limited to the five accepted Hermes/Codex fixes, focused tests, and directly affected documentation. Separate pre-existing framework-role edits in `AGENTS.md`, `agents/`, workflow skills, role-oriented documentation/configuration, and unrelated `install.sh` sections were explicitly excluded from findings; no lifecycle-event contract or reader/writer work was introduced by the Phase 1 implementation.

## Regression Risk

### Test Integrity Check

- [x] No existing tests were deleted.
- [x] No existing tests were disabled or silently skipped.
- [x] No existing assertions were weakened.
- [x] All locally runnable pre-existing targeted tests pass; the exact broad gate remains blocked solely by the recorded absence of the pinned Claude and Hermes host binaries.

### Findings

- No actionable findings. Residual risk is confined to the already-known pinned Hermes host boundary; local tests preserve record bytes/fields, visible identity errors, telemetry null behavior, additive config edits, installer idempotency, and existing symlink safeguards.

## Findings Summary

No actionable findings (0 Critical, 0 Major, 0 Minor, 0 Note).

## Recommendations

1. Accept Phase 1. Before final plan completion, run the already-defined exact broad gate in an environment containing Claude Code 2.1.170 and Hermes v0.19.0; this is a non-code host verification requirement, not rework for this implementation.
