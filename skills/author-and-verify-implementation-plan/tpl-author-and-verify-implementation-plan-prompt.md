---
type: planning
entity: delegation-prompt
skill: author-and-verify-implementation-plan
created: "{{date}}"
---

# Delegate Task: Author and Verify Implementation Plan

Load and follow the `author-and-verify-implementation-plan` skill. Your delegate model/variant does not change this workflow.

Task:
- Author or update the phase implementation plan at:
  - `{{implementation_plan_path}}`

Constraints:
- Do NOT change phase scope/DoD. If you find mismatches, capture them under **Reality Check** and report to primary.
- Trace every implementation step to an authorizing requirement, scope item, acceptance criterion, or preserved existing invariant.
- Produce the smallest sufficient solution. Use each step's **Why** to explain present necessity and prefer existing structures and direct changes.
- New modules, layers, interfaces, shared utilities, migrations, or infrastructure require evidence that the current outcome needs them and a simpler reuse path is insufficient. Do not future-proof for hypothetical later phases.
- Before writing the final artifact, perform exactly one deletion pass and remove or merge reducible work. Do not create an author/review loop.
- Do not invent unspecified product, policy, security, privacy, compliance, authorization, or operational behavior. Preserve existing invariants and avoid concrete regressions or vulnerabilities without creating new policy.
- Record any necessary ungated decision as a blocking **Reality Check** item and stop before planning dependent work.
- Omit optional testing, rollback, edge-case, deployment, and documentation detail unless scope or concrete risk needs it.
- Use existing project docs inventories if present (`docs/**`).
- You may write exactly this implementation-plan artifact: `{{implementation_plan_path}}`.
- Do NOT edit code/config files, perform Git operations, or change unrelated docs/plans artifacts.
- Use the canonical frontmatter and required headings; omit optional sections when irrelevant.
- This fresh Delegate session owns exactly this phase implementation plan. For multi-phase work, the Maintainer invokes phases sequentially and later delegates read completed prior plans for cross-phase continuity; do not author another phase in this session. After all plans are complete, the existing ordered batch-review workflow remains unchanged.

## References (read these yourself)

### Plans
- Plan: {{plan_ref}} (read for global context)
- Phase: {{phase_ref}}
- Current Implementation Plan (if any): {{implementation_plan_ref}}

### Previous Implementation Plan (optional)
- Previous phase when this phase depends on it: {{prev_implementation_plan_ref}}

### Docs (optional)
- Overview: {{docs_overview_ref}}
- Modules: {{docs_modules_ref}}
- Features: {{docs_features_ref}}

## Output

- Update `{{implementation_plan_path}}` using the canonical template:
  - `skills/author-and-verify-implementation-plan/tpl-implementation-plan.md`

Return a compact digest only:
- changed file path
- 3–6 bullet summary of what you grounded/verified
- any Reality Check items requiring primary review
