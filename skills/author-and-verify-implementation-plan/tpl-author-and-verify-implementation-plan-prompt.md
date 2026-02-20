---
type: planning
entity: delegation-prompt
skill: author-and-verify-implementation-plan
created: "{{date}}"
---

# Doc-Explorer Delegation: Author and Verify Implementation Plan

You are `doc-explorer`.

Task:
- Author or update the phase implementation plan at:
  - `{{implementation_plan_path}}`

Constraints:
- Do NOT change phase scope/DoD. If you find mismatches, capture them under **Reality Check** and report to primary.
- Use existing project docs inventories if present (`docs/**`).

## References (read these yourself)

### Plans
- Plan: {{plan_ref}} (read for global context)
- Phase: {{phase_ref}}
- Current Implementation Plan (if any): {{implementation_plan_ref}}

### Adjacent Implementation Plans (optional)
- Previous phase (optional): {{prev_implementation_plan_ref}}
- Next phase (optional): {{next_implementation_plan_ref}}

### Docs (optional)
- Overview: {{docs_overview_ref}}
- Modules: {{docs_modules_ref}}
- Features: {{docs_features_ref}}

## Output

- Update `{{implementation_plan_path}}` using the canonical template:
  - `skills/author-and-verify-implementation-plan/tpl-implementation-plan.md`

Return to the primary only:
- which files you changed
- a 3–6 bullet summary of what you grounded/verified
