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

Prioritize findings related to this focus. Formal criteria (DoD checklists, NFR conformance, reference pedantry) are secondary — only include them when they reveal real problems, not as standard checkboxes.

## What to Review

Use these as the authoritative review scope:

- Plan: `{{plan_ref}}`
- Phase scope: `{{phase_ref}}`
- Implementation plan: `{{implementation_plan_ref}}`
- Ordered batch phase/implementation-plan/output tuples (batch only): `{{batch_review_refs}}`
- Project docs (if available): `{{docs_refs}}`

Then examine the **actual codebase** to verify:
- Do the file paths and symbols referenced in the implementation plan exist?
- Does the proposed approach align with existing code patterns?
- Are the "Code Anchors" in the Reality Check section accurate?

Use `retriever` by default for separable codebase, reference, or test evidence collection, or `doc-explorer` for a genuinely documentation- or module-oriented child task. Retriever delegation is evidence-oriented, not phase-oriented: collect shared or overlapping evidence once, reuse it, and do not create nested per-phase retriever fan-out by default. Read the authoritative scope artifacts and decisive evidence for actual findings yourself. You own synthesis, findings, severity, verdict, scope interpretation, and the final review; do not repeat broad child retrieval.

For a batch, use this one fresh reviewer session by default. After reviewing phases sequentially, perform exactly one integrated cross-phase consistency assessment and include it in one per-phase artifact. Do not create a consolidated artifact. Return one aggregate digest. Do not fan out reviewers per phase unless explicitly requested for independent perspectives, required by genuinely unrelated domains or specialist expertise, or needed because combined evidence exceeds practical context capacity. Partition oversized work into contiguous dependency/domain groups; do not repeat completed reviews, and centrally check only cross-partition interfaces.

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
- Batch per-phase output paths (batch only): `{{batch_review_output_paths}}`

Use the canonical template:
- `skills/review-implementation-plan/tpl-impl-plan-review.md`

**Be honest and thorough — with focus.** Prioritize findings that matter for the stated focus. Give each finding a stable ID (`F-1`, `F-2`, ...), and rate it by severity (Critical/Major/Minor/Note). Formal criteria that show no real problems may be omitted entirely.

Require testing, rollback, edge-case, security, deployment, and documentation detail only where explicit scope or concrete risk warrants it; justified `N/A` is acceptable. Do not invent policy or infrastructure. Verify step authorization and ensure ungated blocking decisions stop dependent planning. Zero findings is valid.

Return to the primary only:
- Single-phase: the overall verdict, count of findings by severity, and top 3 findings with IDs.
- Batch: one aggregate digest with overall and per-phase verdicts, aggregate severity counts, the top 3 findings across the batch, and the integrated consistency result.
