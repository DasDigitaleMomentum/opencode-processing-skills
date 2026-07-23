---
type: review
entity: delegation-prompt
skill: review-implementation-plan
created: "{{date}}"
---

# Review Delegation: Implementation Plan Review

Load and follow the `review-implementation-plan` skill. Your delegate model/variant does not change this workflow.

You are reviewing an implementation plan as an **independent reviewer**. You have no prior context — this is intentional. Fresh eyes catch gaps that authors miss.

## Task

Review the implementation plan for Phase {{phase_number}} and produce a structured review document.

## Review Focus

{{focus}}

Prioritize findings related to this focus. Formal criteria (DoD checklists, NFR conformance, reference pedantry) are secondary — only include them when they reveal real problems, not as standard checkboxes.

## What to Review

Use these as the authoritative review scope:

- Plan: `{{plan_ref}}`
- Phase scope: `{{phase_ref}}`
- Implementation plan: `{{implementation_plan_ref}}`
- Project docs (if available): `{{docs_refs}}`

Then examine the **actual codebase** to verify:
- Do the file paths and symbols referenced in the implementation plan exist?
- Does the proposed approach align with existing code patterns?
- Are the "Code Anchors" in the Reality Check section accurate?

You may use `retriever` for bounded evidence collection, or `doc-explorer` for a genuinely documentation- or module-oriented child task. You own synthesis, findings, severity, verdict, scope interpretation, and the final review; directly verify evidence that materially supports a finding.

## Review Criteria

Evaluate against these criteria (the template comments contain detailed guidance):

1. **Scope Alignment** — Does it implement exactly what the phase requires (no gaps, no creep)?
2. **Technical Feasibility** — Is the approach sound and appropriate for this codebase?
3. **Step Quality** — Are steps concrete (real paths/symbols) and actionable?
4. **Required Context** — Are all necessary files listed? Any unnecessary ones?
5. **Testing Plan** — Does the verify command exercise changed behavior with checks proportional to explicit scope and concrete risk?
6. **Reference Consistency** — Do all file/symbol references match current repo state?
7. **Reality Check Validation** — Is the grounding section honest and complete?

## Output

Write your review to:
- `{{review_output_path}}`

Use the canonical template:
- `skills/review-implementation-plan/tpl-impl-plan-review.md`

**Be honest and thorough — with focus.** Prioritize findings that matter for the stated focus. Give each finding a stable ID (`F-1`, `F-2`, ...), and rate it by severity (Critical/Major/Minor/Note). Formal criteria that show no real problems may be omitted entirely.

Require testing, rollback, edge-case, security, deployment, and documentation detail only where explicit scope or concrete risk warrants it; justified `N/A` is acceptable. Do not invent policy or infrastructure. Verify step authorization and ensure ungated blocking decisions stop dependent planning. Zero findings is valid.

Return to the primary only:
- The overall verdict (Ready / Needs Revision / Major Gaps)
- Count of findings by severity
- Top 3 most important findings with IDs (1 sentence each)
