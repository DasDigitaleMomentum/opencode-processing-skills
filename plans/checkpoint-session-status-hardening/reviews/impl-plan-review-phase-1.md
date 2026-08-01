---
type: review
entity: implementation-plan-review
plan: "checkpoint-session-status-hardening"
phase: 1
review_mode: "batch"
batch_phases: "1, 2, 3, 4"
status: final
reviewer: "delegate"
created: "2026-08-01"
---

# Implementation Plan Review: Phase 1 - Adapter Correctness Hardening

> Reviewing [Phase 1 Implementation Plan](../implementation/phase-1-impl.md)
> Against [Phase 1 Scope](../phases/phase-1.md) and [Plan](../plan.md)

## Overall Assessment

**Verdict**: Ready

The plan turns each of the five gated defects into a concrete, source-grounded change with focused regression coverage. Its Hermes design preserves the required parent-owned persisted identity while isolating native-session binding and telemetry, and it leaves lifecycle records entirely to later phases; an implementer can execute it without reopening product or host-capability decisions.

## Scope Alignment

### Findings

- No findings. Steps 1–5 map one-for-one to the five accepted Phase 1 defects, and the only new hook adoption (`subagent_start` and `pre_llm_call`) is narrowly authorized by the corrected binding and complete-instruction requirements.

## Technical Feasibility

### Findings

- No findings. The proposed keyed, lock-protected Hermes state directly replaces the current process-global `_SESSION`, `_PENDING`, and `_TELEMETRY_SLOT` slots in `hermes/agent-checkpoint/agent_checkpoint.py`; the host-supplied native session ID and verified child/parent relation provide the required keys without changing JSONL.
- The Reality Check is consistent with current source: Hermes presently has three global slots and no child/instruction hook registration, `_telemetry` can return negative headroom, the installer recognizes only unquoted disabled entries, and `install_codex_checkpoint` calls `mkdir -p` before guarding child paths. The cited pinned-host contracts are explicitly retained as execution-time host gates rather than treated as locally proven behavior.

## Step Quality Assessment

| Step | Title | Concrete? | Actionable? | Issue |
| ---- | ----- | --------- | ----------- | ----- |
| 1 | Isolate Hermes native sessions while preserving the parent-owned log | Yes | Yes | None |
| 2 | Inject the complete Hermes heartbeat instruction | Yes | Yes | None |
| 3 | Recognize quoted exact Hermes disabled entries | Yes | Yes | None |
| 4 | Preserve a symlinked Codex adapter directory as one unit | Yes | Yes | None |
| 5 | Clamp Hermes context headroom at zero | Yes | Yes | None |

Every step cites a Phase 1 scope item, acceptance criterion, and/or preserved global invariant. The order is safe: binding and instruction behavior are corrected before the independent installer and telemetry fixes, and none of the work enables a status writer.

## Required Context Assessment

### Missing Context

- None.

### Unnecessary Context

- None. The prior Hermes implementation plan/review and pinned-source anchors are relevant because they establish the host contracts and corrected session-level attribution boundary this phase must preserve.

## Testing Plan Assessment

### Test Integrity Check

The single verify command exercises all affected adapter/core suites and installer syntax. The plan names the existing tests whose assumptions must change, preserves exact hook/tool assertions and byte-level/config/symlink safeguards, forbids skips or weakened assertions, and requires the unavailable pinned-host checks to continue failing clearly.

### Test Gaps

- None. Interleaved parent trees, child-to-parent persistence, per-native-session telemetry, complete instruction clauses, quoted block/inline disabled forms, whole-directory symlink protection, and over-limit headroom are all behaviorally asserted.

### Real-World Testing

Relevant and planned. The pinned Hermes v0.19.0 smoke is necessary to validate the child relation, invocation session forwarding, and `pre_llm_call` injection contract. Its binary absence in the current environment is the known final execution blocker, not an implementation-plan defect; local dependency-free tests remain valid but do not replace that gate.

## Findings Summary

No findings.

## Recommendations

1. Proceed with Phase 1 execution and retain the explicit pinned-host smoke gate for final completion.
