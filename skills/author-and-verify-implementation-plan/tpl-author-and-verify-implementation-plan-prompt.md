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
- Do not invent unspecified product, policy, security, privacy, compliance, authorization, or operational behavior. Preserve existing invariants and avoid concrete regressions or vulnerabilities without creating new policy.
- Record any necessary ungated decision under **Reality Check → Blocking Decisions** and stop before choosing it or planning dependent work. Local, reversible technical choices are allowed only when they do not change observable behavior or policy.
- Keep testing, rollback, edge-case, deployment, and documentation content proportional to relevance and risk. `N/A` with a short reason is valid; do not create infrastructure to satisfy the template.
- Use existing project docs inventories if present (`docs/**`).
- You may write exactly this implementation-plan artifact: `{{implementation_plan_path}}`.
- Do NOT edit code/config files, perform Git operations, or change unrelated docs/plans artifacts.
- Use the canonical template/headings and frontmatter keys from `skills/author-and-verify-implementation-plan/tpl-implementation-plan.md`.

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

Return a compact digest only:
- changed file path
- 3–6 bullet summary of what you grounded/verified
- any Reality Check items requiring primary review
