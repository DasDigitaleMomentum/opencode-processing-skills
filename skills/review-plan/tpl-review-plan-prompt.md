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

Use this focus for additional prioritization. Do not turn formal criteria into a checklist.

## What to Review

- Plan: `{{plan_ref}}`
- Phase documents: `{{phases_dir}}`

Use these as the authoritative review scope. Retrieve the portions needed to evaluate the stated focus and criteria.

## Review Criteria

1. Check that requested outcomes are covered.
2. Check that each phase and material deliverable is presently necessary and cannot be removed or merged without losing a required outcome.
3. Check execution readiness only far enough to identify concrete blockers or misleading instructions.

Review the relevant material, but write only exceptions. Do not produce coverage or disposition tables for clean items.

## Output

Write your review to:
- `{{review_output_path}}`

Use the canonical template:
- `skills/review-plan/tpl-plan-review.md`

Give each finding a stable ID (`F-1`, `F-2`, ...), severity, concise evidence, and action. Flag only concrete gaps or unnecessary existing work; do not invent requirements or replacement work. Zero findings is valid.

Return to the primary only:
- Verdict and reduction required (Yes / No)
- Count of findings by severity
- Top 3 actionable findings with IDs
- Required next action (Proceed / Apply update-plan remediation / User decision)
