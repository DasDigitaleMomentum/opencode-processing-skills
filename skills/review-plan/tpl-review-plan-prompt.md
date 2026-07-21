---
type: review
entity: delegation-prompt
skill: review-plan
created: "{{date}}"
---

# Review Delegation: Plan Review

Load and follow the `review-plan` skill. Your delegate model/variant does not change this workflow.

You are reviewing a plan as an **independent reviewer**. You have no prior context about this plan — this is intentional. Fresh eyes catch gaps that authors miss.

## Task

Review the plan and produce a structured review document.

## Review Focus

{{focus}}

Prioritize findings related to this focus. Formal criteria (DoD checklists, NFR conformance, reference pedantry) are secondary — only include them when they reveal real problems, not as standard checkboxes.

## What to Review

- Plan: `{{plan_ref}}`
- Phase documents: `{{phases_dir}}`

Read ALL of these before starting your review.

## Review Criteria

Evaluate the plan against these criteria (the template comments contain detailed guidance):

1. **Requirement Coverage** — Is every requirement traceable to a phase/deliverable?
2. **Scope Clarity** — Are in-scope and out-of-scope items specific and actionable?
3. **Definition of Done** — Is each criterion objectively verifiable?
4. **Phase Structure** — Clean boundaries? Realistic sizing? Correct dependency order?
5. **Testing Strategy** — Proportional, meaningful checks for explicit behavior and concrete risk; justified N/A is acceptable.
6. **Reference Consistency** — Do all cross-references match?
7. **Completeness** — Are intent, context, scope, decisions, and acceptance sufficient for the later implementation-plan pass?

## Output

Write your review to:
- `{{review_output_path}}`

Use the canonical template:
- `skills/review-plan/tpl-plan-review.md`

**Be honest and thorough — with focus.** Prioritize findings that matter for the stated focus. Give each finding a stable ID (`F-1`, `F-2`, ...), and rate it by severity (Critical/Major/Minor/Note). Formal criteria that show no real problems may be omitted entirely.

Only flag omissions required by explicit objectives, use cases, requirements, or acceptance criteria. Do not search for extra scope or invent product/policy/security/privacy/compliance/authorization/operational behavior. Zero findings is valid.

Return to the primary only:
- The overall verdict (Ready / Needs Revision / Major Gaps)
- Count of findings by severity
- Top 3 most important findings with IDs (1 sentence each)
