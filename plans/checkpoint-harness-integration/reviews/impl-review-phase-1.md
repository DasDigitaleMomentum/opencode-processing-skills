---
type: review
entity: implementation-review
plan: "checkpoint-harness-integration"
phase: 1
status: final
reviewer: "delegate"
created: "2026-07-27"
---

# Implementation Review: Phase 1 - Grounding and Hermes Research

> Reviewing implementation of [Phase 1](../phases/phase-1.md)
> Against [Implementation Plan](../implementation/phase-1-impl.md) and [Plan](../plan.md)

## Overall Assessment

**Verdict**: Accepted

Phase 1 fulfills its Definition of Done: every old-draft "revalidate before execution" item is classified on the real pinned builds (codex-cli 0.131.0, claude 2.1.170, Hermes v0.19.0), both stop gates that triggered were resolved by recorded user decisions exactly per the Blueprint's record-and-raise protocol, the three execution-authoritative impl plans are faithful to their gated phase scopes and the eight-field contract, and the old drafts carry banner-only superseded pointers. The only findings are a stale todo.md Pending section (Minor) and two low-severity observations about evidence strength and summary wording. Nothing blocks proceeding to Phase 2.

## Acceptance Criteria Verification

| # | Criterion | Met? | Evidence | Gap |
| - | --------- | ---- | -------- | --- |
| 1 | Every "revalidate before execution" item from the old phase-4/5 impl plans is marked confirmed, or the affected plan is revised accordingly. | yes (with flagged evidence-strength caveat) | Codex addendum (phase-2-impl.md, 10 rows): all old phase-4 Step 1 items covered — version pin, option ordering, profile layering (**changed** → `--profile-v2` absorbed into Step 4), schema generation (79 schemas), token-usage surface, hook common fields, `SubagentStart.agent_id` (**changed ABSENT** → gate (a) → user Option A re-scope), `PreToolUse.updatedInput`, MCP tool naming, hook trust. Step-6 checklist items (matcher rewriting, subagent additional context, macOS paths) subsumed by rows 8/9, 7, and the recorded binary path. Claude addendum (phase-3-impl.md, 10 rows): old phase-5 Step 1 items 1–9 confirmed; row 10 (new/volatile surfaces) "noted". Machine-local evidence: `/tmp/opencode/checkpoint-harness-integration-phase1/codex-revalidation.md`, `claude-revalidation.md`. | Claude live parent/subagent `PreToolUse` + statusline payload captures were not obtainable (model auth unavailable in disposable homes); schema/binary evidence plus live SessionStart and `--settings`-merge probes stand, Phase 3 smoke carried as behavioral proof (F-2). |
| 2 | No implementation plan still assumes the six-field-only record wording. | yes | Independent grep: no "exact six-field" in any derived plan; all "six-field" mentions are legacy-read compatibility or reconciliation notes. All three plans state eight-field writes with nullable `agent`/`session_title`, matching ground truth `packages/checkpoint-core/src/index.js` (`RECORD_FIELDS` = 6 legacy + `agent`/`session_title`). Phase-1 verify command re-run by reviewer: `PHASE 1 ARTIFACT CHECKS PASSED`. | — |
| 3 | The Hermes decision is explicit, with rationale and testable acceptance implications; no "unknown surface" item remains without a documented fallback. | yes | phase-4-impl.md "Hermes Integration Decision" section: native plugin decision (gate (c), user, 2026-07-27), rationale (documented `register_tool` + plugin hooks + opt-in `plugins.enabled` ruled additive), documented limits (no `subagent_start`, block-only shell hooks, title/`--pass-session-id` limits), testable acceptance implications, name-collision disambiguation (`hermes checkpoints` = shadow-git rollback store, never a contract substitute), instruction-only fallback recorded as not taken with revival condition. Mirrors phase-4.md Notes and plan.md guiding decision. | — |

Deliverables check (phase doc): revalidation addenda attached to the affected impl plans (embedded dated subsections per the Blueprint Open Decision) ✓; verified impl plans for phases 2–4 ✓; Hermes decision inside phase-4 impl plan ✓; superseded pointers in old drafts ✓ (`git diff`: banner-only, +2 lines each, no other edits).

## Plan Adherence

| Step | Planned | Actual | Deviation? | Assessment |
| ---- | ------- | ------ | ---------- | ---------- |
| 1 | Confirm pilot GO + CLI pinnability | Confirmed; versions recorded (`step1-prerequisites.txt`: codex-cli 0.131.0, claude 2.1.170, Hermes v0.19.0 `e0b9ab5a`) | no | As planned. |
| 2 | Codex revalidation, classify confirmed/changed | 10 items classified; 2 changed (profile layering, `SubagentStart` ABSENT) | no | Stop gate (a) raised, not worked around — per protocol. |
| 3 | Claude revalidation | 9 Step-1 items confirmed live/schema-level; gate (b) NOT triggered | partial | Live `PreToolUse`/statusline payload captures impossible without model auth in disposable homes; schema-level evidence substituted and honestly flagged (F-2). Fields required by the stop condition were confirmed present, so proceeding was correct. |
| 4 | Eight-field reconciliation + per-harness sourcing decisions | Codex both `null`; Claude `agent` = subagent `agent_type` else `null`, `session_title` = statusline `session_name` else `null`; Hermes both `null` — each an explicit Open Decision row in its derived plan | no | Matches the honesty criterion; no invented identity sources. |
| 5 | Hermes primary-source research | Four gated questions answered on pinned install tree + CLI help; name collision disambiguated (`hermes-research.md`) | no | Read-only probes; no `~/.hermes` state mutated. |
| 6 | Hermes decision (gated, bounded) | Stop gate (c) raised (all global activation paths write `config.yaml` → policy judgment outside gated space); user ruled documented `hermes plugins enable` opt-in additive; native plugin chosen; fallback not taken | no | Exactly the record-and-raise path the Blueprint mandated; plan.md/phase-4.md amended atomically. |
| 7 | Author phase-2 impl (Codex) | `implementation/phase-2-impl.md` authored: addendum embedded, sourcing decision recorded, `--profile-v2` absorbed, session-level re-scope applied, verify command grown (`+ bash -n install.sh`), `update-plan` carry included | no | Faithful to gated phase-2 scope and user Option A. |
| 8 | Author phase-3 impl (Claude) | `implementation/phase-3-impl.md` authored: addendum embedded, sourcing decision recorded, merge semantics absorbed, verify command grown, `update-plan` carry included | no | Faithful to gated phase-3 scope. |
| 9 | Author phase-4 impl (Hermes) | `implementation/phase-4-impl.md` authored fresh: decision record, Python-native plugin, documented enablement, F-4 inspection parity, sequential-install prerequisite reflected | no | Within the gate-(c) decision bounds; no undocumented surface planned. |
| 10 | Superseded pointers in old drafts | Dated banners added atop both old drafts; `git diff` confirms banner-only (+2 lines each); no frontmatter/status edits | no | Phase-status reconciliation correctly left to `update-plan`. |
| 11 | Cross-phase consistency + wrap-up | Verified independently: naming (`<session_id>--<agent_id>`, `_checkpoint_session_id`/`_workspace_root`/`_telemetry_session_id`), workspace-root sourcing (Codex hook `cwd`; Claude `CLAUDE_PROJECT_DIR`; Hermes process cwd), identical eight-field language, verify-command growth matching plan Testing Strategy, sequential `install.sh` assumption explicit in phase-3/4 Required Context and phase-4 Prerequisites. Handover exists (`handovers/session-2026-07-27.md`) | no | Consistent. |

Both conditional stop gates that triggered (a, c) were resolved by user decisions recorded in plan.md (guiding decisions, risk rows, changelog), phase-2.md/phase-4.md Notes, and todo.md changelog — the two authorized deviation points, both handled as designed.

## Code Quality Assessment

No runtime code was produced (grounding/authoring phase); assessed as artifact quality against the same standards:

- **Root cause addressed**: revalidation findings flow into revised content (profile layering → `--profile-v2` in Step 4/Open Decisions; `SubagentStart` absence → session-level re-scope) rather than being patched over. Changed items are never silently designed around.
- **Minimal changes**: derived plans carry the old drafts forward with only the mandated deltas (eight-field wording, this-machine execution, revalidation results, gated acceptance criteria); volatile-API lists and carried stop conditions are preserved and restated for future re-pins.
- **Honesty invariants**: telemetry is `null`-first everywhere (Codex unknown-only; Claude sidecar with explicit unknown fallback; Hermes estimate-or-`null`); no derived values enter JSONL in any plan; no KISS violation (no daemon, marketplace, transcript parsing, or volatile multi-agent surface adopted).
- **Additive/opt-in**: Codex base `config.toml` and Claude `settings.json`/`~/.claude.json` byte-for-byte preserved; Hermes delta limited to the single sanctioned `plugins.enabled` entry with byte-for-byte preservation of all other content and a `plugins disable` removal path — matching the gate-(c) clarification exactly.

### Findings

- None.

## Testing Assessment

### Verify Command Result

- **Command**: the structural artifact check from phase-1-impl.md Testing Plan (read-only greps over the three derived plans and the two old drafts)
- **Exit Code**: 0 (re-run independently by this reviewer)
- **Result**: pass — `PHASE 1 ARTIFACT CHECKS PASSED` (matches `final-gate.log`)

### Test Quality

| Test | What it Tests | Meaningful? | Issue |
| ---- | ------------- | ----------- | ----- |
| Structural artifact check (verify command) | Presence of eight-field wording, Reality Check, addenda, sourcing decisions, Hermes rationale/fallback, superseded banners, absence of stale six-field wording | y (for a plans-only phase) | Presence-greps alone could pass vacuously; mitigated by this reviewer's full read of all artifacts — content is substantively correct, not just keyword-complete. |
| Revalidation completeness (manual checklist) | Every old-draft Step 1 item classified with evidence | y | Reviewed row-by-row against both old drafts — complete, including the Step-6/Step-7 dated checklists (subsumed rows noted in Acceptance Criteria table). |
| Hermes decision record (manual review) | Approach, rationale, limits, fallback, testable implications, disambiguation | y | Complete. |
| Code/test regression | N/A by design (plans-only phase) | y | Correctly waived; suite-level regression carried by adapter phases per plan Testing Strategy. |

### Real-World Testing

Performed: both revalidations ran against the real pinned CLI binaries on this machine (help output, binary string/schema extraction, live `SessionStart` hook and `--settings`-merge probes in disposable homes, app-server schema generation into OS temp dirs, Hermes install-tree source inspection). Limitation (F-2): Claude live parent/subagent `PreToolUse` and statusline payload captures required model auth unavailable in disposable homes; schema-level evidence from the pinned binary stands, the derived plan carries Phase 3's pinned-CLI smoke as the behavioral proof, and the gate-(b) stop condition is restated for re-pins. No mocks were substituted for harness evidence.

## Scope Compliance

`git status`/`git diff` verified: the only tracked-file modifications are the two banner-only edits to the old drafts; everything else is the new untracked `plans/checkpoint-harness-integration/` directory (plan artifacts, reviews, todo, handover). No runtime code, installer, config, or harness-home changes. Old drafts untouched apart from banners. All probe evidence machine-local under `/tmp/opencode/checkpoint-harness-integration-phase1/`, uncommitted — matching the Blueprint Open Decision on evidence retention.

### Findings

- None.

## Regression Risk

### Test Integrity Check

- [x] No existing tests were deleted (no test files touched)
- [x] No existing tests were disabled
- [x] No existing assertions were weakened (the derived plans carry the old drafts' integrity constraints forward in contract-current wording — the authorized reconciliation, with strictness preserved: exact eight-field writes, legacy six-field reads, internal fields never persisted, no skips for API drift)
- [x] All pre-existing tests still pass (N/A — no code changed; suites untouched)

### Findings

- None. Existing plan artifacts undamaged (old drafts banner-only); no executable surface modified.

## Documentation & Cleanup

### Findings

- **F-1 (Minor)**: `todo.md` is stale. Its Pending section lists four items Phase 1 actually completed — "Confirm pilot GO state and record pinned versions" (duplicated by an identical Completed entry), "Reconcile old phase-4/5 impl plans with the eight-field record contract", "Resume Phase 1 execution Steps 7–12" (execution finished; final gate passed), and "Author/verify implementation plans for phases 1–4" (phases 2–4 authored). The plan DoD requires "this plan's todo/changelog current"; the changelog is current but the Pending section is not. A future `resume-plan` session could misread remaining work. Recommend reconciling via `update-plan` at phase wrap-up.

## Findings Summary

| ID  | Severity | Area | Finding | Recommendation |
| --- | -------- | ---- | ------- | -------------- |
| F-1 | Minor | Documentation | todo.md Pending section stale: four completed Phase-1 items still listed pending (one duplicated in Completed); contradicts plan DoD todo-currency requirement | Reconcile todo.md via `update-plan` when marking Phase 1 completed; no content rework needed. |
| F-2 | Note | Real-World Testing | Claude live parent/subagent `PreToolUse` + statusline payload captures were not obtainable (model auth unavailable in disposable homes); schema/binary-level confirmation plus live SessionStart/`--settings`-merge probes stand | None beyond the already-carried Phase 3 pinned-CLI smoke and the restated gate-(b) stop condition; risk is contained and honestly documented in both the evidence file and addendum row 10. |
| F-3 | Note | Wording | plan.md changelog and todo.md summarize the Claude revalidation as "10/10 confirmed", while the addendum classifies row 10 (new/volatile surfaces) as "noted" — the 9 old-draft Step-1 items are confirmed | Cosmetic; optionally reword to "9/9 Step-1 items confirmed, new surfaces noted" when next touching those files. |

## Recommendations

1. (Minor, blocks nothing) Reconcile `todo.md` via `update-plan` at Phase 1 wrap-up: move the four stale Pending items to Completed or drop them as duplicates. Does not block acceptance or Phase 2 start.
2. (Note) No action: F-2's behavioral proof is already scheduled as Phase 3's pinned-CLI smoke; keep the gate-(b) stop condition prominent during Phase 3 execution.
3. (Note) Optional wording tidy of the "10/10 confirmed" summaries (F-3) whenever the files are next edited.
