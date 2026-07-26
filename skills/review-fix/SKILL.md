---
name: review-fix
description: Apply accepted related findings from an implementation or implementation-plan review, reusing reviewer context when its retained reasoning materially benefits remediation.
license: MIT
compatibility:
  opencode: ">=0.1"
metadata:
  category: review
  phase: remediation
---

# Skill: Review Fix

This skill is a remediation path after a review. It preserves reviewer context when retained analysis, unresolved assumptions, or cross-file reasoning materially benefits the accepted fix.

The primary SHOULD resume the reviewer that produced the findings using the same `task_id` when that reasoning remains valuable. Prefer a fresh lean session for a fully specified, self-contained fix or verification when accumulated context cost is disproportionate. Do not decide from session age or file count alone. The reviewer may apply related fixes across several files, call sites, and tests when they remain part of the reviewed objective.

## When to Use

Use after:

- `review-implementation-plan` identifies corrections to an implementation plan.
- `review-implementation` identifies code, test, configuration, or integration corrections.

Do not use for:

- Initial review work.
- Plan review corrections; plans remain conversation-owned by the primary. Resume the reviewer for clarification, then update the plan through `update-plan`.
- A genuinely new objective, changed gated scope, new dependency decision, or user-requested independent perspective.
- An unavailable or deliberately discarded reviewer session, or a self-contained fix better served by a fresh lean context. Use `execute-work-package` for new runtime work or `author-and-verify-implementation-plan` for new implementation-plan work.

## Required Inputs

The continuation prompt SHOULD provide:

- Review artifact path.
- Accepted finding IDs or a clear description of the accepted findings.
- Target type: `implementation-plan` or `implementation`.
- Relevant scope or primary decisions. Do not require an exact file allowlist when related call sites or tests need to be discovered.
- A verification command or the expected verification goal. Identify whether a supplied command is broad/full. The reviewer may choose focused targeted tests when none were supplied.

Use `tpl-review-fix-prompt.md` and resume the same reviewer `task_id`.

## Protocol

1. Read the existing review artifact and use the existing session context.
2. Confirm the requested fixes still serve the reviewed objective.
3. Apply the necessary related corrections. Size alone does not require a new work package.
4. During fixing, run the smallest targeted tests that exercise or reproduce the changed or problematic behavior. Do not use a supplied broad/full command after every change or as the first iterative diagnostic step when a targeted test is known or can be identified.
5. When remediation is ready, run the supplied broad/full verification once as the final gate. If it fails, return to targeted diagnosis, fix, and retest; only after targeted tests pass may the broad/full final gate run again. Never weaken or omit that final gate. For implementation-plan remediation, use the equivalent focused and final consistency checks.
6. Return the compact digest below.

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
- **Next**: whether targeted verification is sufficient or an independent re-review is recommended

## Independent Re-review

The remediation pass is not an independent review. A fresh review is optional and requires an explicit primary or user decision. Recommend it when:

- the primary wants an independent final opinion;
- the fix exposes uncertainty that the current reviewer cannot resolve;
- security, persistence, public API, or migration risk warrants another perspective.

Do not start a fresh review merely because a fix spans several files or changes runtime code. Do not automatically chain review -> fix -> review -> fix. After one remediation pass, stop at the primary's decision unless another review is explicitly requested.

## Rules

- Same `task_id` is preferred only when remediation benefits from reviewer reasoning. A fully specified, self-contained fix or verification may use a fresh lean workflow; never pretend it has the old context.
- Keep the same delegate model/variant while resuming.
- Do not re-open already rejected findings unless the primary explicitly asks for reconsideration.
- Do not describe self-verification as an independent review.
- Never weaken, delete, or skip tests to make verification pass.
