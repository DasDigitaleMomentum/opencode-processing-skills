---
name: review-fix
description: Apply explicitly accepted, evidence-backed defect fixes in the eligible existing session that produced the review or diagnosis, preserving secured evidence.
license: MIT
compatibility:
  opencode: ">=0.1"
metadata:
  category: review
  phase: remediation
---

# Skill: Review Fix

This skill provides **context-preserving defect remediation**: apply explicitly accepted, evidence-backed fixes using the eligible existing session that produced the review or diagnosis. A review artifact is one supported finding source, not a prerequisite.

The point of preserving context is to reuse already-secured evidence, not collect it again. Related fixes may span files, call sites, and tests within the accepted objective. Reuse depends on correct and sufficient retained context/output, not the source workflow's mode or fix size.

## When to Use

Use after:

- `review-implementation-plan` identifies corrections to an implementation plan.
- `review-implementation` identifies code, test, configuration, or integration corrections.
- An analysis digest/message identifies a concrete defect and its diagnosis.
- An Implementer digest/message identifies a concrete defect of the same completed work package.

Do not use for:

- Initial review work.
- Plan review corrections; plans remain conversation-owned by the primary. Resume the reviewer for clarification, then update the plan through `update-plan`.
- A genuinely new objective, changed gated scope, new dependency decision, or user-requested independent perspective.

| Situation | Route |
|---|---|
| Accepted defect, explicit Primary remediation instruction, eligible source session | `review-fix` in that existing session |
| New implementation objective/package, or fresh implementation needed under the fallback below | `execute-work-package` in a fresh Implementer |
| New technical implementation-plan work, or fresh technical planning needed under the fallback | `author-and-verify-implementation-plan` in a fresh session |
| Conversation-owned plan corrections, including phase scope or acceptance changes | Primary via `update-plan`; reviewer may clarify, not edit the plan |
| Mechanical self-fix within the Maintainer's existing narrow allowance | Maintainer self-fix; no expansion of that allowance |
| Evidence retrieval | `retriever` may supply evidence, but is not a remediation owner |

## Required Inputs

The continuation prompt must provide:

- **Finding source:** review artifact path **or** analysis/implementation digest or message reference; multiple sources may be bundled.
- **Accepted defect set:** IDs when present, otherwise stable short labels; include each defect's concrete description, expected behavior/invariant, and evidence.
- **Authority:** the Primary has accepted the defects **and explicitly instructed remediation** within the supplied scope. This instruction is sufficient; no approval token or new Blueprint is required.
- **Session:** exact source `task_id`, same persona and model/variant, and correct and sufficient retained review/diagnosis context/output for the assigned defects.
- Target type: `implementation-plan` or `implementation`.
- **Scope:** accepted objective, relevant boundaries, and Primary decisions. Do not require an exact file allowlist when related call sites or tests need to be discovered.
- **Verification:** command or expected verification goal. Identify whether a supplied command is broad/full. The fixer may choose focused targeted tests when none were supplied.
- **Closure:** one bounded remediation pass, compact digest, then stop and return unresolved defects or decisions to the Primary.

Use `tpl-review-fix-prompt.md` for an eligible continuation.

### Session eligibility and fallback

- If the source session's retained review/diagnosis context/output is correct and sufficient, resume its exact `task_id` with the same persona and model/variant through `review-fix`.
- If that context/output is faulty, insufficient, or unavailable, the Primary starts a fresh session through the appropriate route above, with a pointer to the finding source as a **hint**. The fresh session must establish the evidence it needs; never pretend it has the old context. This is a fresh workflow, not `review-fix` session reuse.
- An Implementer may be resumed after its digest only for accepted defects of the **same completed package** under this contract. This narrow retirement exception cannot start another phase/package or authorize indefinite continuation.
- The Primary may bundle findings from multiple source sessions in one pass and assigns defects to the eligible sessions explicitly. Each resumption retains its own exact `task_id` and persona/model variant; pointers to other sources do not confer their retained context. Return each assigned digest to the Primary; bundling does not create an automatic continuation loop.

## Protocol

1. Read the finding source and reuse the secured evidence in the existing session context. Inspect current state or evidence gaps only as needed for the fix; do not repeat broad evidence collection.
2. Confirm explicit Primary authorization, session eligibility, and that the fixes still serve the accepted objective. If eligibility fails, stop and report the fallback need to the Primary before dependent edits.
3. Apply the necessary related corrections. For implementation-plan scope findings, remove, merge, or simplify the accepted steps/artifacts instead of adding compensating design. Size alone does not require a new work package.
4. For implementation fixes, use targeted tests while editing and preserve any supplied broad/full final gate. For implementation-plan fixes, check only the changed steps and directly affected references; do not invent a formal verification suite.
5. Return the compact digest below and stop. This is one remediation pass, not the start of a review loop.

### Remediation posture

**No Gold-Plating. No Adversarial Reviewing. No Scope Creep.** Fix accepted,
evidence-backed findings and the related changes required to complete them. Do
not use remediation to invent improvements, reopen rejected findings, or
create another review/fix cycle.

The Primary's explicit instruction naming the accepted defects and scope is the gate; acceptance alone is not an instruction to edit. Do not add unrelated improvements or silently change the objective. If a new decision is required, report it to the Primary; do not invent a new gate or switch agents autonomously.

## Write Boundary

- For `implementation-plan`, edit the relevant implementation-plan artifacts and related references required by the accepted findings.
- For `implementation`, edit related code, configuration, integration points, and tests required by the accepted findings.
- Do not modify a source review artifact; it remains the immutable record of the independent review.
- Do not modify phase scope, acceptance criteria, or unrelated docs/plans.
- Do not perform Git history operations.

## Output Contract

Return only:

- **Outcome**: succeeded | partial | blocked
- **Findings**: fixed and unresolved defect IDs or stable short labels
- **Edits**: changed files with one-line descriptions
- **Verify**: command/checks and result
- **Next**: stop | primary decision required; an independent re-review was not started

## Independent Re-review

The remediation pass is not an independent review. A fresh review is optional and requires an explicit primary or user decision. The primary may choose it when:

- the primary wants an independent final opinion;
- the fix exposes uncertainty that the current fixer cannot resolve;
- security, persistence, public API, or migration risk warrants another perspective.

Do not start or recommend a fresh review merely because findings were fixed, steps were removed, or the change spans several files. Do not chain review -> fix -> review -> fix. After one remediation pass, stop. Materially new risk/uncertainty must be escalated to the Primary, who decides whether to request an independent re-review; it never triggers one automatically.

## Rules

- Follow the session eligibility and fallback rules above; never substitute a fresh session while claiming retained context.
- Keep the same persona and model/variant while resuming.
- Do not re-open already rejected findings unless the primary explicitly asks for reconsideration.
- Do not describe self-verification as an independent review.
- Never weaken, delete, or skip tests to make verification pass.
- Do not replace removed gold-plating with new abstraction, infrastructure, tests, or documentation unless an accepted finding and the accepted objective require it.
