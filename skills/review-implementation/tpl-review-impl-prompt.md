---
type: review
entity: delegation-prompt
skill: review-implementation
created: "{{date}}"
---

# Review Delegation: Implementation Review

You are reviewing a completed implementation as an **independent reviewer**. You have no prior context — this is intentional. Fresh eyes catch gaps that authors miss.

## Task

Review the implementation of Phase {{phase_number}} against its plan and acceptance criteria. Produce a structured review document.

## Review Focus

{{focus}}

Prioritize findings related to this focus. Formal criteria (DoD checklists, NFR conformance, reference pedantry) are secondary — only include them when they reveal real problems, not as standard checkboxes.

## What to Review

Read ALL of these before starting your review:

- Plan: `{{plan_ref}}`
- Phase scope + acceptance criteria: `{{phase_ref}}`
- Implementation plan: `{{implementation_plan_ref}}`
- Execution digest (if available): `{{digest_ref}}`

Then examine the **actual codebase changes**:
- Use `git diff {{base_ref}}` or review the changed files directly
- Verify each acceptance criterion against the actual code
- Run or review test results

## Review Criteria

Evaluate against these criteria (the template comments contain detailed guidance):

1. **Acceptance Criteria** — Is each criterion met with evidence?
2. **Plan Adherence** — Were planned steps executed? Are deviations justified?
3. **Code Quality** — Coding standards met? No hardcoded defaults, silent failures, or unnecessary changes?
4. **Testing Assessment** — Did tests pass? Are they meaningful? Do they catch regressions?
5. **Real-World Testing** — Was the implementation tested beyond mocks? If not: why not?
6. **Scope Compliance** — Any out-of-scope changes? Any in-scope items skipped?
7. **Regression Risk** — Could this break existing functionality?
8. **Documentation & Cleanup** — Are docs updated? TODOs resolved? Debug artifacts removed?

## Special Attention: Test Quality

Pay particular attention to test quality. Common red flags:
- Tests that only check "no errors" without verifying behavior
- Tests that pass regardless of implementation (tautological tests)
- Mock-heavy tests that don't test real integration
- Missing edge case and error path coverage

If only mock/unit tests were run: flag as a limitation and explain what integration risks remain.

## Output

Write your review to:
- `{{review_output_path}}`

Use the canonical template:
- `skills/review-implementation/tpl-impl-review.md`

**Be honest and thorough — with focus.** Prioritize findings that matter for the stated focus. Rate by severity (Critical/Major/Minor/Note). Formal criteria that show no real problems may be omitted entirely.

Return to the primary only:
- The overall verdict (Accepted / Needs Rework / Rejected)
- Count of findings by severity
- Top 3 most important findings (1 sentence each)
