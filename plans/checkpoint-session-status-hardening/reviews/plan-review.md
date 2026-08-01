---
type: review
entity: plan-review
plan: "checkpoint-session-status-hardening"
status: final
reviewer: "delegate"
created: "2026-07-31"
---

# Plan Review: checkpoint-session-status-hardening

> Reviewing [checkpoint-session-status-hardening](../plan.md)

## Overall Assessment

**Verdict**: Needs Revision

The plan correctly preserves the accepted same-file, exact four-field `session_status` record and the two-value `open`/`closed` vocabulary; it also assigns all five accepted adapter findings and keeps `OPEN` distinct from process liveness. Two execution-significant ambiguities remain around Hermes identity semantics and operational reader-first installation, plus two smaller reader-state/capability gaps that should be resolved before implementation plans are authored.

## Requirement Coverage

| Requirement | Covered By | Gap? | Notes |
| ----------- | ---------- | ---- | ----- |
| Fix the five accepted Hermes/Codex findings | Phase 1; plan requirements lines 47–51; DoD line 82 | Partial | Instruction delivery, quoted disabled entries, Codex destination symlink preservation, and non-negative headroom are concrete. The Hermes binding outcome is not unambiguous; see F-1. |
| Add exact same-file `session_status` records with only `open`/`closed` | Plan decisions lines 24–30; Phase 2 | No | The exact four-field variant, physical-order reduction, reopen behavior, duplicate idempotence, and exclusion from checkpoint metrics are all stated. |
| Preserve legacy/current checkpoint readers, bytes, metrics, and compatibility APIs | Plan requirements lines 43, 56–59; Phase 2 | No | This is grounded in the current exact six-/eight-field parser and checkpoint-only analysis path (`packages/checkpoint-core/src/index.js:59-123,209-285`). |
| Display honest persisted state without age-derived liveness | Plan target; Phase 2 | Partial | `OPEN` is correctly defined as unclosed and age remains informational. `ERROR` is not yet separated clearly from lifecycle reduction; see F-4. |
| Emit lifecycle events only for transitions proven by each harness | Phases 3–4 | Partial | Capability revalidation is required, but Phase 3 does not state the no-start-hook result for OpenCode; see F-3. |
| Deploy readers before status-capable writers | Plan decision line 27; DoD line 86; Phases 2–4 | Partial | Phase order is correct, but installed-asset ordering and restart behavior are not owned by phase acceptance/tests; see F-2. |
| Reconcile stale checkpoint-plan metadata while leaving PydanticAI pending | Plan requirement line 52; Phase 4 | No | The current `agent-checkpoint-heartbeat` plan indeed has completed Codex/Claude phases, pending Phase 6, and a stale todo still pointing to Phase 4. |
| Provide focused regressions, broad gates, and pinned-host evidence | Plan testing strategy; all phases | Partial | The listed suites and explicit unavailable-binary blocker are appropriate. F-1 through F-4 leave several expected assertions unspecified. |

## Scope Clarity

### Findings

- **F-1 (Major) — Hermes binding outcome conflicts with the stated attribution boundary.** The plan requires “concurrent parent/subagent session bindings” and parent/child/resumed-parent identity and telemetry isolation (`plan.md:47`; `phase-1.md:27,54`), while excluding Hermes start-time subagent attribution beyond what is required (`plan.md:77`). Current Hermes behavior intentionally uses session-level logging where subagents share the parent log (`hermes/agent-checkpoint/agent_checkpoint.py:15-20`) but stores one process-global session, pending invocation, and telemetry slot (`:85-88`). The plan does not say whether the accepted fix preserves parent-log sharing while keying concurrent native sessions, or introduces distinct child IDs. Those outcomes have different code, tests, status-log paths, and scope.
- **F-3 (Minor) — Phase 3 lacks an explicit honest result when OpenCode has no verified start/resume hook.** The current OpenCode plugin exposes tools only (`opencode/checkpoint-plugin.ts:53-61`; `opencode/checkpoint-runtime.mjs:146-208`). Phase 3 correctly requires revalidation and says events are emitted only on verified hooks, but its objective expects writers for both OpenCode and Codex and its acceptance says unsupported close behavior leaves `OPEN`. If OpenCode still has no trustworthy start/resume event, the correct result is no status writer and `UNKNOWN` for checkpoint-only logs—not a fabricated `open`.
- The remaining scope is appropriately bounded: no liveness inference, crash fabrication, richer lifecycle vocabulary, watchdog, sidecar, locking, or unrelated adapter redesign is introduced.

## Definition of Done Assessment

### Findings

- **F-2 (Major) — The reader-first DoD is not yet operationally assigned.** The DoD says compatible readers must be copied before any installed adapter can emit status, but Phase 3 only requires installed assets to be “mutually compatible,” Phase 4 has a general installation-preservation criterion, and the testing strategy does not require an ordering assertion or dashboard-restart instruction. This matters in the current installer: OpenCode copies the plugin/runtime before the core/watch reader assets (`install.sh:937-960`), Codex copies its hook before its bundled core (`:1016-1035`), and Claude copies hook configuration/script before its bundled core (`:1102-1129`). A live old `checkpoint-watch` also keeps its old parser after files are refreshed. Phase acceptance must own reader-asset-first ordering and the required reader-process refresh before writer activation; no version protocol or new infrastructure is needed.

## Phase Structure Assessment

| Phase | Title | Verdict | Issue |
| ----- | ----- | ------- | ----- |
| 1 | Adapter Correctness Hardening | Needs revision | F-1 leaves the expected Hermes parent/child/native-session mapping and telemetry isolation assertion ambiguous. The other four accepted findings are well bounded and independently testable. |
| 2 | Status Contract and Readers | Needs clarification | The reader-first boundary and strict mixed parser are correctly placed here, but F-4 must distinguish reduced lifecycle state from a reader failure. |
| 3 | OpenCode and Codex Status Writers | Needs revision | F-2 needs explicit installed reader-before-writer acceptance; F-3 needs a valid no-hook/`UNKNOWN` outcome for OpenCode. |
| 4 | Claude, Hermes, and Rollout Closure | Needs revision | Dependencies on Phases 1–3 are sound, but F-2 must also cover Claude/Hermes installation and the final operational refresh guidance. |

The dependency order—correct the known defects, land readers, then enable writers—is otherwise sound. The phases remain within the accepted four-phase scope and do not need additional lifecycle states or unrelated work.

## Testing Strategy Assessment

### Test Coverage Gaps

- **F-1:** State the expected log/session identity for parent, child, resumed parent, and two interleaved native sessions, then assert that each invocation receives only its own binding and telemetry. The test must also prove whether child checkpoints intentionally share the parent log or use a distinct host-provided ID.
- **F-2:** Add isolated installer assertions that parser/inspector/watch or bundled core reader assets are refreshed before status-capable hook/plugin assets for each affected adapter. Document and verify the operator sequence that restarts a live dashboard before activating a writer.
- **F-3:** Add the capability-gate case: if OpenCode revalidation finds no trustworthy start/resume event, no status line is appended and existing checkpoint-only logs render `UNKNOWN`; where an `open` hook exists but no close hook exists, the state remains `OPEN` regardless of age.
- **F-4:** Define tests separately for valid-log reduction (`OPEN`/`CLOSED`/`UNKNOWN`) and malformed/I/O failure. Preserve strict whole-log failure, but specify whether `checkpoint-inspect` retains its current nonzero/stderr behavior or prints an `ERROR` state, while `checkpoint-watch` continues to isolate the file as an `ERROR` row.

### Real-World Testing

Relevant and planned. The pinned Claude Code and Hermes smokes are appropriate because lifecycle payloads and installer behavior depend on those hosts; the plan honestly records their current absence as a completion blocker rather than weakening or silently skipping the gate.

## Reference Consistency

### Findings

- **F-1:** Align `plan.md:47,77` and `phase-1.md:27,54` around one Hermes identity model. The current references permit both session-level parent-log sharing and new per-child attribution, so they do not yet define one acceptance outcome.
- **F-4 (Minor):** The target outcome names persisted `OPEN`/`CLOSED`/`UNKNOWN`, while the functional requirement adds `ERROR` for both readers and Phase 2 calls it a dashboard state. Define `ERROR` solely as a reader failure presentation—not a persisted status or a fourth lifecycle reduction result—to preserve the accepted `open|closed` vocabulary.

## Findings Summary

| ID | Severity | Area | Finding | Recommendation |
| --- | -------- | ---- | ------- | -------------- |
| F-1 | Major | Scope / Phase 1 | Hermes concurrency acceptance does not define whether subagents share the parent session log or receive distinct identity, conflicting with the attribution exclusion. | Choose and state one host-identity/log mapping, align plan and Phase 1 wording, and make interleaved binding/telemetry tests assert it. |
| F-2 | Major | Reader-first rollout | Phase ordering is reader-first, but installed copy order, live-reader refresh, phase ownership, and a verification assertion are missing despite current writer-before-reader installer sequences. | Assign reader-asset-first ordering to Phases 3–4, require a focused installer-order test, and document restarting readers before writer activation. |
| F-3 | Minor | Honest lifecycle semantics | Phase 3 does not explicitly allow OpenCode to emit no status and remain `UNKNOWN` if revalidation finds no trustworthy start/resume hook. | Add the no-hook outcome; reserve `OPEN` for an observed open event with no later close. |
| F-4 | Minor | Reader state / Testability | `ERROR` is not clearly distinguished from the three lifecycle reduction displays, and inspector malformed-input behavior is unspecified. | Define `ERROR` as read/parse failure presentation only and state reader-specific malformed-input behavior. |

## Recommendations

1. Resolve F-1 before authoring Phase 1’s implementation plan so the accepted Hermes fix cannot expand into unintended subagent-attribution work or preserve the global-state defect under a vague test.
2. Resolve F-2 by making reader-before-writer installation and reader restart explicit acceptance/test obligations in Phases 3–4.
3. Clarify F-3 and F-4 without adding lifecycle values: no observed open means `UNKNOWN`; `ERROR` is a reader failure, never a `session_status` value.
4. After those revisions, proceed to `author-and-verify-implementation-plan`; the exact JSONL contract, compatibility constraints, the other four known-fix definitions, phase order, and broad verification gates are otherwise ready.

## Remediation Addendum — 2026-07-31

**Updated verdict**: Ready — no actionable findings remain.

- **F-1 resolved:** `plan.md` now fixes one parent-owned Hermes log, internal child-to-parent mapping, no persisted child attribution, and per-native-session binding/telemetry isolation; Phase 1 makes the parent/child/resumed-parent and interleaved-parent-tree outcomes explicit.
- **F-2 resolved:** reader-assets-before-writer-assets ordering and the dashboard-then-harness restart sequence now appear in the guiding decisions, testing strategy, and Phase 3/4 scope and acceptance criteria.
- **F-3 resolved:** Phase 3 now permits an explicit no-writer result when OpenCode has no trustworthy start/resume event, with no emitted status and checkpoint-only logs remaining `UNKNOWN`.
- **F-4 resolved:** `ERROR` is restricted to reader failure presentation; Phase 2 preserves inspector nonzero/stderr behavior and isolates malformed/unreadable dashboard inputs as per-file `ERROR` rows without extending lifecycle reduction or the persisted vocabulary.

The original findings above remain as review history. The remediated plan is ready for `author-and-verify-implementation-plan`.
