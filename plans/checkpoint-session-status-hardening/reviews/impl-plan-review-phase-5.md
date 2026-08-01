---
type: review
entity: implementation-plan-review
plan: "checkpoint-session-status-hardening"
phase: 5
review_mode: "single-phase"
batch_phases: ""
status: final
reviewer: "delegate"
created: "2026-08-01"
---

# Implementation Plan Review: Phase 5 - Declared Closure and Compact Dashboard

> Reviewing [Phase 5 Implementation Plan](../implementation/phase-5-impl.md)
> Against [Phase 5 Scope](../phases/phase-5.md) and [Plan](../plan.md)

## Overall Assessment

**Verdict**: Ready

The remediated plan is executable without an unresolved product or technical decision. Prior F-1, F-2, and F-3 are closed: the OpenCode instruction upgrade is an exact, end-bounded managed migration with a loud unknown-content stop; every declared-closure path has strict raw-boolean validation before persistence; and the persona module documentation is included throughout the context, edit, and test scope. The lifecycle and compact-dashboard decisions remain concrete, code-grounded, and proportionally tested.

## Scope Alignment

### Findings

- The plan implements every Phase 5 deliverable: lazy `open`, optional checkpoint-following `closed`, role-aware final-checkpoint guidance, the exact compact dashboard, stale-input compatibility, and focused cross-adapter coverage.
- It preserves the gated exclusions. No host-idle heuristic, parent/child schema, new close hook, log migration, liveness claim, or closure-as-success interpretation is introduced.
- Prior **F-3 is closed**. `docs/modules/agent-personas.md` now appears in Affected Modules, Required Context, Step 7's edit set, the installer/docs test matrix, and the test-integrity constraints (`phase-5-impl.md:33,69,125,147,159`).

## Technical Feasibility

### Findings

- Prior **F-1 is closed**. Current `install_opencode_checkpoint_instruction` skips every marker-bearing persona (`install.sh:1037-1058`), and the checked-in fragment has only the legacy start marker (`opencode/checkpoint-instruction.md:1-11`). Step 4 now replaces that behavior with a complete start/end-bounded block, exact byte matching of the known pre-Phase-5 fragment including its terminal newline, byte-preserving prefix/suffix replacement, exact-current idempotency, path-specific nonzero refusal for unknown/customized start-marker content, and unchanged symlink handling (`phase-5-impl.md:100-104`). The plan explicitly applies this classification to retained generated variants and all other ordinary personas; the current installer order confirms the instruction pass runs after canonical copies and configured variant generation while still scanning every installed `agents/*.md` file (`install.sh:1486-1558`).
- Prior **F-2 is closed**. The plan prohibits truthiness, `=== true`, and nullish normalization for `close_session`; omission alone defaults to false. It requires raw real-boolean validation in the shared core, OpenCode fallback executor, Codex MCP runtime, Claude hook and MCP runtime, and Hermes direct and handler paths before the first lifecycle or checkpoint append (`phase-5-impl.md:17,76-80,84-88,92-96`). Those are the actual persistence boundaries in the current source: OpenCode delegates to the core, Codex and Claude have custom MCP runtimes, Claude rebuilds hook input, Codex preserves full public input, and Hermes has a native handler/core mirror.
- The shared lifecycle sequence is feasible with current primitives. The core already has strict exact-shape creators, one-line `appendRecord`, physical-order reduction, and checkpoint-only filtering (`packages/checkpoint-core/src/index.js:159-196,224-268,311-399`). The plan requires all argument and record validation before the first append, one captured timestamp, and sequential `open` → checkpoint → optional `closed` writes while accepting only truthful prefixes after I/O failure.
- Hermes can mirror the same behavior without changing its root-parent identity model: `_resolve_invocation`, `_create_record`, `_create_status_record`, `_append_record`, `checkpoint`, `_CHECKPOINT_SCHEMA`, and `_handle_checkpoint` are all present at the cited boundaries (`hermes/agent-checkpoint/agent_checkpoint.py:229-294,407-453,472-519`).
- The dashboard work remains actionable against the isolated current projection/formatter. The plan specifies the exact nine columns, checkpoint count and slash metric, internal-only session identity, state ranks, latest-event age sort, deterministic tie-breaks, separators, error rendering, closed `CURRENT=—`, and width behavior. It also preserves the detailed inspector and turns the already-public stale inputs into validated no-ops rather than silently removing them.

## Step Quality Assessment

| Step | Title | Concrete? | Actionable? | Issue |
| ---- | ----- | --------- | ----------- | ----- |
| 1 | Centralize lazy open and declared close in the shared core | Yes | Yes | Exact validation order, timestamp reuse, append order, failure-prefix behavior, and compatibility invariants are specified. |
| 2 | Expose the backward-compatible option through all Node tools and wrappers | Yes | Yes | Raw-value validation and every relevant schema, hook, runtime, identity, and error boundary are explicit. |
| 3 | Mirror sequencing and the optional argument in Hermes Python | Yes | Yes | Direct/handler validation, root-parent attribution, record construction, locking, and no-new-hook constraints are explicit. |
| 4 | Install role-aware final-checkpoint instructions | Yes | Yes | Exact legacy/current/unknown classifications, end marker, preservation rules, affected personas, diagnostics, and regressions close F-1. |
| 5 | Implement the exact compact dashboard and deterministic state groups | Yes | Yes | Projection, columns, values, sort ranks, separators, widths, errors, and hidden identity are fully defined. |
| 6 | Retain stale inputs only as compatibility no-ops and prove reader parity | Yes | Yes | Validation and precedence remain while byte-identical no-op behavior and reader invariants are directly tested. |
| 7 | Reconcile public behavior, inventories, and distributed assets | Yes | Yes | Public guides, adapter READMEs, all affected module inventories, installed assets, and persona migration semantics are enumerated. |

Every step cites a Phase 5 scope item, acceptance criterion, global decision, or preserved compatibility invariant. No dependent work is planned behind an unresolved decision.

## Required Context Assessment

### Missing Context

- None.

### Unnecessary Context

- None. Prior phase plans and reviews are justified by the identity, reader-first rollout, and compatibility invariants this cross-adapter extension must preserve.

## Testing Plan Assessment

### Test Integrity Check

The plan preserves exact six-/eight-/four-field schemas, checkpoint-only parsing and metrics, adapter identity and telemetry behavior, inspector output/failures, watcher discovery and width guarantees, installer symlink/config safety, and the fail-clearly pinned-host checks. It authorizes expectation changes only for lazy lifecycle writes, the optional closure argument, managed-instruction migration, and the gated dashboard layout; no test is disabled, skipped, or weakened.

### Test Gaps

- No evidence-backed gaps. The matrix directly covers exact-legacy/current/unknown persona states, unrelated-byte and symlink preservation, representative invalid `close_session` values at every meaningful boundary with no new append, close/reopen ordering, all adapter identities, compact dashboard groups, hidden IDs, stale no-op equivalence, and inspector parity.

### Real-World Testing

Relevant and planned. Local Node/Python integration tests exercise real hook/runtime processes, temporary installed layouts, JSONL bytes, inspector output, and dashboard formatting. The exact Claude Code 2.1.170 and Hermes v0.19.0 host smokes remain mandatory in a suitable environment; their known absence on the current host is correctly retained as an execution-verification blocker rather than converted into a skip or success claim.

## Reality Check Validation

### Findings

- The listed source, test, installer, documentation, and prior-phase anchors exist and support the proposed extension. The plan accurately records the current marker-present installer skip, raw-value normalization risk, dashboard layout/data flow, stale-option exposure, inspector boundary, and adapter identity differences.
- The Codex session-level and Hermes root-parent closure limitation is explicit and consistent with the phase's no-hierarchy boundary. A later ordinary checkpoint reopens the shared persisted row; the plan does not pretend those harnesses can produce separately attributed child closure.
- The OpenCode/Claude separate subagent identities, existing host-observed lifecycle writers, duplicate-status idempotence, physical-order authority, and reader-first installation order remain preserved and testable.
- “Blocking Decisions: None” is accurate. The pinned-host absence blocks final verification, not implementation design or plan actionability.

## Findings Summary

No findings. Prior F-1, F-2, and F-3 are fully remediated in the implementation plan.

## Recommendations

1. Proceed to gated Phase 5 execution using this implementation plan.
2. Keep the exact Claude Code 2.1.170 and Hermes v0.19.0 host gate visibly blocked until it can run; do not weaken it or claim global completion from local-only results.
