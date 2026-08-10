---
type: planning
entity: implementation-plan
plan: "{{plan_name}}"
phase: {{phase_number}}
status: draft  # draft | active | completed | revised
created: "{{date}}"
updated: "{{date}}"
---

# Implementation Plan: Phase {{phase_number}} - {{phase_title}}

> Implements [Phase {{phase_number}}](../phases/phase-{{phase_number}}.md) of [{{plan_name}}](../plan.md)

## Approach

<!-- Describe the smallest complete technical change, including necessary real integration paths and preserved invariants, what existing structures it reuses, and why any new structure is necessary now. -->

## Affected Modules

| Module | Change Type | Description |
|--------|-------------|-------------|
| [{{module_name}}](../../docs/modules/{{module_name}}.md) | modify/create/delete | {{what_changes}} |

## Required Context

<!-- Files the implementing agent MUST read before starting this phase. -->

| File | Why |
|------|-----|
| {{path}} | {{reason}} |

## Implementation Steps

<!-- Ordered steps, each above code level. Not line-by-line but also not hand-wavy.
     Each step should reference concrete targets and its authorizing gated item or preserved invariant. -->

### Step 1: {{step_title}}

- **What**: {{description}}
- **Where**: {{module/file/area}}
- **Authorized By**: {{requirement_scope_item_acceptance_criterion_or_existing_invariant}}
- **Why**: {{present_need_and_rationale}}
- **Considerations**: {{relevant_constraints_or_N/A}}

## Testing Plan

<!-- One command that exercises changed behavior. Do not add test infrastructure merely to fill this section. -->

**Primary Verify Command**: `{{command}}`

### Additional Checks (optional)

- {{check_required_by_scope_or_concrete_risk}}

## Rollback Strategy (optional)

<!-- How to undo changes if relevant. Otherwise state N/A with a short reason. Do not invent infrastructure. -->

## Reality Check (optional)

<!-- Optional: include only material code/plan mismatches or the exact user-owned decision that blocks dependent work. A blocking item stops dependent planning until the Maintainer obtains the decision. Omit when none exist. -->

- {{mismatch_or_blocking_decision}}
