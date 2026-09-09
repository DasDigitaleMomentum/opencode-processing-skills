---
name: review-fix
description: Apply accepted related findings from an implementation or implementation-plan review, resuming the reviewer session whenever it is available.
license: MIT
compatibility:
  opencode: ">=0.1"
metadata:
  category: review
  phase: remediation
---

# Skill: Review Fix

This skill is a remediation path after a review. It resumes the reviewer session that produced the findings whenever that session is still available.

The primary resumes the reviewer that produced the findings using the same `task_id` when it is available; use a fresh lean session only when that session is unavailable or a fresh context is deliberately wanted. The reviewer may apply related fixes across several files, call sites, and tests when they remain part of the reviewed objective.

## When to Use

Use after:

- `review-implementation-plan` identifies corrections to an implementation plan.
- `review-implementation` identifies code, test, configuration, or integration corrections.

Do not use for:

- Initial review work.
- Plan review corrections; plans remain conversation-owned by the primary. Resume the reviewer for clarification, then update the plan through `update-plan`.
- A genuinely new objective, changed gated scope, new dependency decision, or user-requested independent perspective.
- An unavailable reviewer session, or a deliberately fresh context. Use `execute-work-package` for new runtime work or `author-and-verify-implementation-plan` for new implementation-plan work.

## Required Inputs

The continuation prompt SHOULD provide:

- Review artifact path.
- Accepted finding IDs or a clear description of the accepted findings.
- Target type: `implementation-plan` or `implementation`.
- Relevant scope or primary decisions. Do not require an exact file allowlist when related call sites or tests need to be discovered.
- A verification command or the expected verification goal. Identify whether a supplied command is broad/full. The reviewer may choose focused targeted tests when none were supplied.

Use `tpl-review-fix-prompt.md`. Resume the same reviewer `task_id` whenever it is available; otherwise use the fresh lean path described above.

## Protocol

1. Read the existing review artifact and use the existing session context.
2. Confirm the requested fixes still serve the reviewed objective.
3. Apply the necessary related corrections. For implementation-plan scope findings, remove, merge, or simplify the accepted steps/artifacts instead of adding compensating design. Size alone does not require a new work package.
4. For implementation fixes, use targeted tests while editing and preserve any supplied broad/full final gate. For implementation-plan fixes, check only the changed steps and directly affected references; do not invent a formal verification suite.
5. Return the compact digest below and stop. This is one remediation pass, not the start of a review loop.

### Remediation posture

**No Gold-Plating. No Adversarial Reviewing. No Scope Creep.** Fix accepted,
evidence-backed findings and the related changes required to complete them. Do
not use remediation to invent improvements, reopen rejected findings, or
create another review/fix cycle.

The accepted findings and reviewed objective are the gate. Do not add unrelated improvements or silently change the objective. If a new decision is required, report it to the primary; do not invent a new gate or switch agents autonomously.

## Write Boundary

- For `implementation-plan`, edit the relevant implementation-plan artifacts and related references required by the accepted findings.
- For `implementation`, edit related code, configuration, integration points, and tests required by the accepted findings.
- Do not modify the review artifact; it remains the immutable record of the independent review.
- Do not modify phase scope, acceptance criteria, or unrelated docs/plans.
- Do not perform Git history operations.

## Output Contract

Return only:

- **Outcome**: succeeded | partial | blocked
- **Findings**: fixed and unresolved finding IDs
- **Edits**: changed files with one-line descriptions
- **Verify**: command/checks and result
- **Next**: stop | primary decision required; an independent re-review was not started

## Independent Re-review

The remediation pass is not an independent review. A fresh review is optional and requires an explicit primary or user decision. The primary may choose it when:

- the primary wants an independent final opinion;
- the fix exposes uncertainty that the current reviewer cannot resolve;
- security, persistence, public API, or migration risk warrants another perspective.

Do not start or recommend a fresh review merely because findings were fixed, steps were removed, or the change spans several files. Do not chain review -> fix -> review -> fix. After one remediation pass, stop at the primary's decision unless another review is explicitly requested or a materially new risk/uncertainty is exposed.

## Rules

- Resume the same `task_id` whenever the reviewer session is available; otherwise use a fresh lean workflow and never pretend it has the old context.
- Keep the same delegate model/variant while resuming.
- Do not re-open already rejected findings unless the primary explicitly asks for reconsideration.
- Do not describe self-verification as an independent review.
- Never weaken, delete, or skip tests to make verification pass.
- Do not replace removed gold-plating with new abstraction, infrastructure, tests, or documentation unless an accepted finding and the reviewed objective require it.
