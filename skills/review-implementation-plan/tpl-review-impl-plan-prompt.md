---
type: review
entity: delegation-prompt
skill: review-implementation-plan
created: "{{date}}"
---

# Review Delegation: Implementation Plan Review

Load and follow the `review-implementation-plan` skill. Your delegate model/variant does not change this workflow.

You are reviewing implementation plans as an **independent reviewer** fresh from the authoring context. In batch mode, retain useful review context between phases; independence does not require a cold reviewer per phase.

## Task

Review mode: `{{review_mode}}` (`single-phase` or `batch`).

- Single-phase: review Phase {{phase_number}} and produce its structured review document.
- Batch: review the ordered phase set `{{ordered_phase_set}}` sequentially in dependency order, writing each existing per-phase review artifact.

## Review Focus

{{focus}}

Use this focus for additional prioritization. Do not turn formal criteria into a checklist.

## What to Review

Use these as the authoritative review scope:

- Plan: `{{plan_ref}}`
- Phase scope: `{{phase_ref}}`
- Implementation plan: `{{implementation_plan_ref}}`
- Ordered batch phase/implementation-plan/output tuples (batch only): `{{batch_review_refs}}`
- Project docs (if available): `{{docs_refs}}`

Use the actual codebase selectively to resolve material questions about feasibility, minimality, or a referenced target. Do not certify every path, symbol, or Reality Check entry when no concrete concern exists.

For a batch, use this one fresh reviewer session by default. Review phases sequentially, report only material cross-phase conflicts in the affected per-phase artifact, and return one aggregate digest. Do not create a consolidated artifact or formal no-issue consistency report.

## Review Criteria

1. Check that phase obligations are covered.
2. Check that steps and new artifacts are presently necessary and use a direct existing path where sufficient.
3. Inspect current code only as needed to identify concrete feasibility, reference, sequencing, or verification problems.

Review the relevant material, but write only exceptions. Do not produce coverage or disposition tables for clean items, and do not require testing or Reality Check detail without a concrete reason.

## Output

Write your review to:
- `{{review_output_path}}`
- Batch per-phase output paths (batch only): `{{batch_review_output_paths}}`

Use the canonical template:
- `skills/review-implementation-plan/tpl-impl-plan-review.md`

Give each finding a stable ID (`F-1`, `F-2`, ...), severity, concise evidence, and action. Flag only concrete gaps or unnecessary existing work; do not invent requirements, policy, infrastructure, or replacement work. Zero findings is valid.

Return to the primary only:
- Single-phase: verdict, reduction required (Yes / No), severity counts, top 3 actionable findings, and required next action.
- Batch: one aggregate digest with overall/per-phase verdicts and reduction flags, aggregate severity counts, top 3 actionable findings, and required next action.
