---
type: review
entity: implementation-review
plan: null
phase: null
status: final
reviewer: "delegate-strong"
created: "2026-09-14"
---

# Implementation Review: Review-fix Reformulation

> Bounded uncommitted work package, not a plan phase. Authority: the supplied Option B intent and five explicit user decisions. Repository: `/develop/software/opencode-processing-skills`; baseline: HEAD `fb68255`. All references below are repository-relative working-tree line numbers.

## Overall Assessment

**Verdict: Accepted** — for the specified 12-file work package.

The edited contract and its named handoffs implement all five decisions coherently, including diagnosis-only sources, evidence-preserving reuse, correctness-based fresh fallback, token-free authorization, multi-source assignment, and narrow post-digest Implementer reuse. No blocking contradiction was found in the edited surfaces. One **Minor** adjacent rollout/documentation finding remains: unchanged guidance, including the Cursor orchestrator, still teaches the old rules; acceptance of this bounded package is not certification of repository-wide guidance consistency.

**Counts:** Critical 0 · Major 0 · Minor 1 · Note 0.

## Acceptance Criteria Verification

| # | Criterion | Met? | Evidence | Gap |
|---|---|---|---|---|
| 1 | Apply explicitly accepted, evidence-backed defects from review **or diagnosis**, without requiring a review artifact or recollecting secured evidence | Yes | `skills/review-fix/SKILL.md:14-25,46-48,66-67`; `skills/delegate-analysis/SKILL.md:49-50`; `agents/delegate.md:34,47-48`; prompt `skills/review-fix/tpl-review-fix-prompt.md:10,17-21,28` | None in edited surfaces |
| 2 | Post-digest Implementer reuse only for accepted defects of the same completed package; no new package/phase or indefinite continuation | Yes | `skills/review-fix/SKILL.md:61`; `skills/execute-work-package/SKILL.md:65,76,107,198,205,276`; `agents/implementer.md:17,28,52,86,96`; `agents/maintainer.md:108,154`; `AGENTS.md:45,97` | None in edited surfaces; F-1 identifies stale neighboring guidance |
| 3 | Correct and sufficient retained context → reuse; faulty, insufficient, or unavailable context → fresh session with source hint and no claimed inherited context | Yes | `skills/review-fix/SKILL.md:33-40,57-62,67`; `skills/review-implementation/SKILL.md:117-118`; `skills/review-implementation-plan/SKILL.md:111-112`; `agents/maintainer.md:86`; `AGENTS.md:78` | None. Fresh fallback is explicitly an appropriately routed **fresh workflow**, not a fresh session masquerading as `review-fix` reuse |
| 4 | No approval token for review-fix; explicit Primary instruction naming accepted defects and scope is sufficient | Yes | `skills/review-fix/SKILL.md:48,79`; prompt `:10`; `agents/implementer.md:52,86`; `skills/execute-work-package/SKILL.md:107` | None. Acceptance alone is expressly not authorization to edit |
| 5 | Multiple source sessions per pass permitted, with Primary assignment | Yes | `skills/review-fix/SKILL.md:46,49,62`; prompt `:19-21,26,28`; `agents/maintainer.md:86`; `CHANGELOG.md:18` | None. Each resumption keeps its own task/persona/model and assigned defects; external pointers do not transfer retained context |
| 6 | Primary decides independent re-review on new risk; no automatic re-review | Yes | `skills/review-fix/SKILL.md:97,101-107`; all three review skills at `review-implementation:121`, `review-implementation-plan:115`, `review-plan:108`; prompt `:34`; `agents/maintainer.md:133` | None |
| 7 | Preserve plan ownership, review independence, bounded passes, test integrity, and no-gold-plating | Yes | `skills/review-fix/SKILL.md:30,38,53,68-87,107,113-116`; `skills/review-plan/SKILL.md:108`; `agents/delegate.md:66`; unchanged `skills/update-plan/SKILL.md:34-44,83-90` | No boundary regression found |
| 8 | Aligned named surfaces and changelog | Yes, within package | All 12 edited files inspected in context; changelog accurately records decisions at `CHANGELOG.md:15-18`; root rationale at `AGENTS.md:74-78` | Neighbor rollout gap F-1 remains outside the 12 edited files |
| 9 | Independently establish causality of the two reported final-gate failures | Yes | Targeted reproduction, source inspection, and unchanged-at-HEAD check described below | Full gate remains red; unrelated is not equivalent to passing |

## Plan Adherence

No persistent plan or phase applies. `git diff`, file-context reads, and targeted textual searches covered all 12 supplied paths; `git diff --stat` reports 103 insertions and 68 deletions. No test, installer, or runtime file is modified by this package. The Implementer skill-permission addition is necessary for the explicitly authorized skill transition, not an unrelated expansion.

## Code Quality Assessment

This package changes executable workflow instructions rather than application algorithms. The changes address the original contract defects directly, preserve existing workflow structure, introduce no dependencies or silent fallbacks, and make escalation explicit.

### Contradiction and boundary audit

- **Retirement:** Every applicable retirement statement in the edited agents, execution skill, and root principles carries the same-package exception or points to its authoritative definition. Interrupted/missing-digest recovery at `skills/execute-work-package/SKILL.md:208-216` and `agents/maintainer.md:90-92` is a different case, not a prohibition on the completed-package exception.
- **Review artifacts:** Artifact requirements in the three independent **review** skills remain appropriate to review output. `review-fix` itself accepts digest/message sources and only freezes a source review artifact when one exists. Plan-review clarification remains deliberately non-editing.
- **Availability:** No leftover availability-only `review-fix` fallback was found in the edited rules. Fresh fallback routes to `execute-work-package` or `author-and-verify-implementation-plan` as appropriate; that removes the former simultaneous allowance/prohibition of fresh remediation.
- **Tokens:** `agents/implementer.md:73,79,100` and `skills/execute-work-package/SKILL.md:167-185` still require tokens for normal EXECUTE. This is not leakage: `agents/implementer.md:52,86` and execution Statefulness at `:107` explicitly separate review-fix from those modes and waive that requirement. A fresh fallback package follows its own ordinary gate, not the review-fix authorization contract.
- **One pass / independence:** Each assigned pass returns its own digest and stops. New risk is escalated, never an automatic trigger. Fixer self-verification is not described as independent review; source review records remain immutable.
- **Plan ownership:** Technical implementation-plan corrections are distinct from conversation-owned phase scope/acceptance changes. The latter continue through Primary-owned `update-plan`; Implementer does not acquire general plan-writing rights.
- **Duplication:** Short routing summaries repeat central rules in the agents and root rationale, but explicitly defer eligibility, fallback, and closure to the skill. No materially divergent second rulebook was found in the 12 edited surfaces. Actual neighboring drift is documented as F-1 rather than requesting cosmetic deduplication.

## Testing Assessment

### Verify Command Result

- **Command:** `node --test opencode/test/checkpoint-plugin.test.mjs && python3 -m unittest discover -s hermes/test`
- **Independent result:** exit **1**. Node: **19/19 pass**. Python: **55 tests, 2 failures**.
- **Targeted reproduction:** from `hermes/test`, `python3 -m unittest -v test_agent_checkpoint.InstallerIsolationTests.test_skills_output_and_description_unchanged test_agent_checkpoint.InstallerIsolationTests.test_disable_and_removal_path` exits **1**, reproducing both failures.
- **Independent evidence logs:** `/tmp/opencode/retriever-evidence/gate-node.out`, `/tmp/opencode/retriever-evidence/gate-python.out`, `/tmp/opencode/retriever-evidence/py-targeted.out`. These are temporary same-machine evidence, not durable repository artifacts.
- **Static diff integrity:** `git diff --check` exits **0**.

### Gate causality

1. **Missing Hermes executable is environmental.** `hermes/test/test_agent_checkpoint.py:36` resolves `shutil.which("hermes")`; `:54-58` fails explicitly if absent, requiring pinned Hermes v0.19.1. `test_disable_and_removal_path` calls this prerequisite at `:1041`, before exercising installer behavior. Independent `command -v hermes` / `which hermes` returned exit 1. No pinned binary was installed or bypassed for this review.
2. **Heading assertion mismatch predates this package.** `hermes/test/test_agent_checkpoint.py:1034` expects `User-attended walkthrough — Maintainer-owned`, but the installed source at `skills/browser-walkthrough/SKILL.md:27` says `User-attended walkthrough — Maintainer-coordinated, optionally Delegate-executed`. The assertion reads that browser skill, not any edited review-fix instruction. Both test and browser source are unchanged at HEAD; their mismatch therefore exists independently of this diff. The current Node suite also expects the coordinated wording at `opencode/test/checkpoint-plugin.test.mjs:406` and passes.

The reviewer independently ran `git diff HEAD --quiet -- hermes/test/test_agent_checkpoint.py skills/browser-walkthrough/SKILL.md opencode/test/checkpoint-plugin.test.mjs` successfully (exit 0), and inspected the cited prerequisite and assertion source. Together with the reproduced failures, this confirms both reported causes are outside this package. No clean checkout, Git mutation, test weakening, or claimed green gate was needed.

### Test Quality

| Check | What it establishes | Limitation |
|---|---|---|
| Node suite | Checkpoint/runtime and installer behavior; selected installed agent/skill markers, including execute-work-package, remain valid | Does not semantically test the five review-fix decisions |
| Python suite and two targeted tests | Reproduce the reported failures and locate the failing environmental prerequisite / unrelated heading assertion | Hermes host lifecycle integration cannot complete without the pinned executable |
| Direct diff/context audit and scenario tracing | Diagnosis without review artifact; available-but-faulty context; same-package Implementer continuation without token; multi-source assignments; new-risk escalation; new-package rejection | Human/agent judgment over prose, not behavioral guarantees across model executions |

### Real-World Testing

**Partially performed:** the repository's real Node/Python installer and checkpoint tests were executed, subject to the two explained failures. **Not performed:** live multi-session LLM journeys exercising the new remediation contract. That remains a limitation, not a user waiver. Existing automated coverage cannot prove agents will obey semantic routing instructions.

## Scope Compliance

The reviewed implementation is confined to the 12 supplied files. Untracked `config.yaml.azure` and `config.yaml.openai` were present before review and were neither inspected nor modified. This review writes only this artifact; no implementation corrections, documentation updates, or Git mutations were performed.

## Regression Risk

### Test Integrity Check

- No existing tests deleted.
- No existing tests disabled or skipped by the diff.
- No assertions weakened.
- **Not all pre-existing tests pass in this environment:** the two failures above remain. They are documented as independently established pre-existing/environmental failures, not classified as Critical regressions caused by this package.

The principal residual risk is instruction uptake and stale adjacent guidance, not runtime code behavior.

## Documentation & Cleanup

### F-1 — Minor: Unchanged neighboring guidance can still teach the superseded contract

**Evidence:**

- `docs/agents.md:47` instructs reviewer-session reuse whenever available, with fresh fallback **only** when unavailable.
- `docs/agents.md:92` explicitly forbids any post-digest continuation; `:150` repeats BLUEPRINT → EXECUTE-only reuse.
- `cursor/task-delegation.md:49,52,73` repeats availability-only reviewer reuse and unconditional post-digest retirement.
- The neighboring active skill `cursor/skills/ops-orchestrator/SKILL.md:38,72,80` still routes remediation as existing-reviewer / reviewer-fresh work, without the new diagnosis-source and correctness-based eligibility handoff.

**Impact:** Consumers consulting docs first or using the Cursor orchestration layer can still reject a valid same-package Implementer continuation or reuse an available but faulty source session, reproducing the original misunderstanding. The new canonical skill is coherent; these unchanged summaries have not followed it.

**Scope/severity:** Nonblocking **Minor** for the expressly bounded 12-file package; it is an adjacent rollout gap, not a contradiction hidden in one of the edited files. It would need resolution before claiming repository-wide or Cursor-wide contract alignment.

**Recommendation:** The Primary should explicitly decide whether to authorize a separate bounded documentation/Cursor alignment pass, preferably replacing duplicated eligibility rules with references to the canonical contract. No such expansion or edit was undertaken in this review.

## Findings Summary

| ID | Severity | Area | Finding | Recommendation |
|---|---|---|---|---|
| F-1 | Minor | Adjacent guidance / rollout | Unchanged docs and Cursor instructions retain availability-only reviewer routing and unconditional Implementer retirement | Primary decides a separately scoped alignment follow-up; no block on the specified 12-file package |

## Recommendations

1. Accept the specified package: all five binding decisions are implemented and no in-package blocking defect was found.
2. Decide whether to authorize the F-1 neighboring docs/Cursor follow-up; do not silently enlarge this package or claim all adapters are aligned.
3. Treat the red gate separately: supply the pinned Hermes environment and address the pre-existing heading assertion through their appropriate scope before expecting a green full gate. Do not weaken or omit the gate, and do not attribute its present failures to this contract edit.
4. No automatic remediation or independent re-review is requested. The Primary retains those decisions.
