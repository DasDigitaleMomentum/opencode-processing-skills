---
type: review
entity: plan-review
plan: "checkpoint-harness-integration"
status: final
reviewer: "delegate"
created: "2026-07-27"
---

# Plan Review: checkpoint-harness-integration

> Reviewing [checkpoint-harness-integration](../plan.md)

## Overall Assessment

**Verdict**: Needs Revision

The plan is fundamentally sound: the reuse of the agent-checkpoint-heartbeat phase-4/5 implementation plans as the technical basis for phases 2–3 is legitimate (verified: the approaches are detailed, current API-grounded, and map 1:1 onto the new phases), and the Hermes conditional scope is properly tamed by a Phase 1 decision gate that requires testable acceptance implications. However, the plan's central reuse mechanism contains genuine ambiguities that the stated review focus asked about: plan.md contradicts the phase documents on *when* revalidation happens, and it is unclear *which* artifact — the old draft impl plans or the Phase-1-derived ones — is authoritative at execution time. All findings are Minor and fixable with localized text edits; no re-review should be needed after update since Phase 1 gates all downstream execution.

## Requirement Coverage

| Requirement | Covered By | Gap? | Notes |
| ----------- | ---------- | ---- | ----- |
| Codex `checkpoint`/`checkpoint_path` via stdio MCP + hook identity bridge, additive profile | Phase 2 | No | Maps to old phase-4 impl plan; acceptance criteria are concrete (parent+subagent smoke, byte-preserved base config). |
| Claude Code tools via skills-directory plugin, hooks, statusline sidecar, opt-in `--settings` | Phase 3 | No | Maps to old phase-5 impl plan; acceptance covers validation, identity, telemetry fallback, config preservation. |
| Hermes checkpoint integration per Phase-1 decision | Phases 1 + 4 | No | Decision gate in Phase 1; Phase 4 acceptance is branch-conditional and checkable per branch (see DoD Assessment). |
| All harnesses append shared-contract records; side state out of raw logs | Phases 2–4 + Phase 1 reconciliation | No | Eight-field contract verified as shipped (`packages/checkpoint-core` writes eight fields, reads legacy six); sidecar exclusion is explicit in the phase-5 impl plan and phase-3.md. |
| `install.sh` per-target install (codex/claude/hermes), global mode, symlink preservation | Phases 2–4 | No | Hermes target verified present (`install.sh:254-307`, `~/.hermes/skills/processing`); sequential editing of the shared file is explicitly justified. |
| Existing inspection (checkpoint_path consumers, checkpoint-watch) reads all harness logs unchanged | DoD only | **Yes (F-4)** | No phase owns demonstrating cross-adapter inspection parity; each adapter phase only smokes its own harness. |
| NFRs: pinned versions/revalidation, no base-config mutation, suites green, honest docs | Phases 1–4 | Partial (F-1) | Plan.md attributes revalidation to "each adapter phase"; phase docs attribute it to Phase 1. See F-1. |

## Scope Clarity

Scope is well defined. In-scope items are actionable per phase; out-of-scope items are explicit (PydanticAI, Claude Desktop app, contract changes, recovery/transcript machinery) and match the old plan's KISS exclusions. The scope-bounding assumptions ("Claude Code Desktop" = macOS CLI; Hermes skills surface as the only verified capability; stop-and-revise on drift) are recorded at plan level and consistently echoed in the phase docs. No unowned explicit objectives beyond F-4.

### Findings

- None beyond F-4 (tracked under Requirement Coverage).

## Definition of Done Assessment

The DoD is objectively verifiable, including the conditional Hermes items that were part of the review focus:

- The Phase-4 acceptance criteria are branch-conditional: the *native* branch requires an end-to-end demonstrated tool call producing valid shared-contract JSONL; the *instruction-only* branch requires the checkpoint instruction in the installed Hermes skills, documented limits, and instructed/external logging producing valid JSONL. Both branches are yes/no checkable.
- The conditional shape is safe because Phase 1's acceptance criteria hard-require the Hermes decision to be "explicit, with rationale and testable acceptance implications" with "no 'unknown surface' item remaining without a documented fallback". Verifiability is inherited from that gate rather than left open.
- DoD items for Codex/Claude (pinned-build tool verification, byte-for-byte config preservation, inspection parity) are concrete and testable.

### Findings

- F-3 (Minor): the eight-field reconciliation is framed in plan.md and phase-1.md as wording alignment ("drafted against six-field wording", "reconciles record fields"), but the DoD requires "current eight-field records with nullable agent/session-title metadata" from every adapter. The derived impl plans must therefore make a real per-harness decision — where `agent`/`session_title` values come from (e.g., hook-supplied identity vs. an honestly documented `null`) — not merely substitute "eight" for "six" in test assertions. As written, the reconciliation scope item undersells this and could invite a purely textual pass.

## Phase Structure Assessment

| Phase | Title | Verdict | Issue |
| ----- | ----- | ------- | ----- |
| 1 | Grounding and Hermes Research | OK (heavy) | Coherent grounding gate, but large for one session: two-harness pinned revalidation + contract reconciliation + Hermes primary research + decision + authoring/verifying three implementation plans (F-6). |
| 2 | Codex Integration | OK | Clean boundary; consumes Phase 1 output; per-phase testable result. |
| 3 | Claude Code Integration | OK | Clean boundary; sequential-after-2 justified by shared `install.sh`. |
| 4 | Hermes Integration | OK | Conditional scope is bounded by the Phase 1 gate; prerequisite on phases 2–3 keeps installer changes reviewable. |

Dependency order is correct (1 blocks 2–4; adapters sequential due to the shared installer, explicitly reasoned). Each phase produces a committable result with its own acceptance criteria.

## Testing Strategy Assessment

The strategy is proportional and behavior-focused: per-adapter Node suites with exact-record assertions (no internal fields persisted), hook identity-injection tests proving distinct parent/subagent logs, telemetry fallback cases (null/compaction/mismatch), installer isolation with preexisting-config snapshots, and a pinned-CLI real smoke per harness. The full-regression command composition grows correctly per phase (phase-2 command includes codex tests, phase-3 adds claude tests) and matches the reused impl plans' verify commands.

### Test Coverage Gaps

- None evidence-backed. The unowned cross-adapter parity demonstration (F-4) is a coverage/ownership gap, not a missing test type.

### Real-World Testing

Relevant and planned: each adapter phase requires a real-CLI smoke on this machine's pinned build in an isolated home/repository (tool discovery, one parent + one subagent checkpoint, selected-path inspection). This matches the concrete integration risk (model-carried subagent ID on Codex; plugin/hook/statusline behavior on Claude) and the plan's stop-for-decision rules on failure.

## Reference Consistency

Cross-references verified: old phase-4/5 phase docs and impl plans exist and map 1:1 to new phases 2/3; the eight-field contract is real and shipped; the Hermes installer target exists as documented; the old plan's changelog confirms the phases 1–3 GO the new plan relies on; old phases 4/5 are still `pending`, consistent with the "mark completed (or superseded)" scope item.

### Findings

- F-5 (Note): plan.md's DoD references "the phase-3 inspection path" meaning agent-checkpoint-heartbeat's phase 3, but this plan's own phase 3 is Claude Code Integration. Qualify the reference (e.g., "the agent-checkpoint-heartbeat phase-3 inspection path, `checkpoint-inspect`") to avoid misreading.

## Completeness Check

Intent, context, scope, guiding decisions, risks, and per-phase acceptance are sufficient for the implementation-plan pass — with two ambiguities in the reuse mechanism that Phase 1 itself will execute under:

### Findings

- F-1 (Minor): **revalidation ownership is internally contradictory.** plan.md's guiding decisions say "each adapter phase starts with the revalidation step defined there", and the NFRs say "each adapter phase records its pinned CLI version and revalidates documented API surfaces immediately before implementation". But phase-1.md's scope assigns pinned-version recording and revalidation of both harness surfaces to Phase 1, and phases 2–3 list "Phase 1 completed: surface revalidated … impl plan confirmed or revised" as a blocking prerequisite. The phase documents are mutually consistent; the plan.md lines are stale phrasing from the old impl plans' per-phase Step 1. An executor reading only plan.md would mis-sequence the grounding work.
- F-2 (Minor): **which implementation plan is authoritative at execution time is ambiguous.** Phase 1 derives new impl plans into this plan's `implementation/` (`phase-2-impl.md`, `phase-3-impl.md`, `phase-4-impl.md`), yet phases 2–3 name the old `agent-checkpoint-heartbeat/implementation/phase-{4,5}-impl.md` (status: draft, six-field wording) as the "authoritative How … as reconciled in Phase 1", and the scope-bounding assumption "the affected impl plan is revised first" does not say *which* plan is revised. After Phase 1, two candidate artifacts exist per adapter. The derived plans should be declared superseding (with a pointer left in the old ones, matching the in-scope "superseded with a pointer" item); otherwise an implementer could execute the stale draft directly.

## Findings Summary

| ID  | Severity | Area | Finding | Recommendation |
| --- | -------- | ---- | ------- | -------------- |
| F-1 | Minor | Completeness / plan-phase consistency | plan.md places pinned-version revalidation at the start of each adapter phase; phase-1.md and the phase 2–3 prerequisites place it in Phase 1. | Reword the plan.md guiding decision and NFR to state that Phase 1 performs the revalidation once and adapter phases consume the confirmed impl plans. |
| F-2 | Minor | Completeness / reuse mechanism | After Phase 1, both the old draft impl plans and the derived ones could claim authority; phases 2–3 still link to the old six-field drafts as "authoritative How". | State in plan.md and phases 2–4 that the derived `implementation/phase-N-impl.md` files supersede the old impl plans at execution; leave a superseded-pointer in the old artifacts. |
| F-3 | Minor | DoD / reconciliation depth | Eight-field reconciliation is framed as wording alignment, but derived plans must decide per-harness `agent`/`session_title` sourcing (populate vs. honest `null`). | Extend phase-1.md's reconciliation item to require an explicit metadata-sourcing decision per harness in the derived impl plans. |
| F-4 | Minor | Requirement Coverage | Cross-adapter inspection parity (functional requirement + DoD item) is owned by no phase; each adapter phase only smokes its own harness. | Assign the all-harness inspection/checkpoint-watch parity demonstration explicitly to Phase 4 deliverables/acceptance (or a plan-level integration check). |
| F-5 | Note | Reference Consistency | "The phase-3 inspection path" in the DoD is ambiguous with this plan's own Phase 3 (Claude Code Integration). | Qualify as the agent-checkpoint-heartbeat phase-3 inspection path (`checkpoint-inspect`). |
| F-6 | Note | Phase Structure | Phase 1 (dual revalidation + reconciliation + Hermes research/decision + three impl plans) is heavy for a single session. | Accept a multi-session Phase 1 with a handover, or split impl-plan authoring per adapter; no structural change required. |

## Recommendations

1. (F-1) Align plan.md's guiding decision and NFR wording with the phase docs: Phase 1 owns pinned-version recording and surface revalidation; adapter phases consume the confirmed plans.
2. (F-2) Declare the Phase-1-derived impl plans in `plans/checkpoint-harness-integration/implementation/` as the execution-authoritative versions, superseding the old drafts with a pointer; clarify that stop-and-revise targets the derived plan.
3. (F-3) Make the eight-field reconciliation require an explicit per-harness `agent`/`session_title` sourcing decision in each derived impl plan.
4. (F-4) Assign the cross-adapter inspection parity demonstration to Phase 4's deliverables and acceptance criteria.
5. (F-5, F-6) Qualify the "phase-3 inspection path" reference; note Phase 1 may span sessions.
