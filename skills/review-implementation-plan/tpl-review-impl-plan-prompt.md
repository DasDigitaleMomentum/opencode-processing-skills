---
type: review
entity: delegation-prompt
skill: review-implementation-plan
created: "{{date}}"
---

# Review Delegation: Implementation Plan Review

You are reviewing an implementation plan as an **independent reviewer**. You have no prior context — this is intentional. Fresh eyes catch gaps that authors miss.

## Task

Review the implementation plan for Phase {{phase_number}} and produce a structured review document.

## What to Review

Read ALL of these before starting your review:

- Plan: `{{plan_ref}}`
- Phase scope: `{{phase_ref}}`
- Implementation plan: `{{implementation_plan_ref}}`
- Project docs (if available): `{{docs_refs}}`

Then examine the **actual codebase** to verify:
- Do the file paths and symbols referenced in the implementation plan exist?
- Does the proposed approach align with existing code patterns?
- Are the "Code Anchors" in the Reality Check section accurate?

## Review Criteria

Evaluate against these criteria (the template comments contain detailed guidance):

1. **Scope Alignment** — Does it implement exactly what the phase requires (no gaps, no creep)?
2. **Technical Feasibility** — Is the approach sound and appropriate for this codebase?
3. **Step Quality** — Are steps concrete (real paths/symbols) and actionable?
4. **Required Context** — Are all necessary files listed? Any unnecessary ones?
5. **Testing Plan** — Does the verify command actually test the changes? Real-world testing?
6. **Reference Consistency** — Do all file/symbol references match current repo state?
7. **Reality Check Validation** — Is the grounding section honest and complete?

## Output

Write your review to:
- `{{review_output_path}}`

Use the canonical template:
- `skills/review-implementation-plan/tpl-impl-plan-review.md`

**Be honest and thorough.** Rate findings by severity (Critical/Major/Minor/Note). Verify claims against actual code — don't take the implementation plan at face value.

Return to the primary only:
- The overall verdict (Ready / Needs Revision / Major Gaps)
- Count of findings by severity
- Top 3 most important findings (1 sentence each)
