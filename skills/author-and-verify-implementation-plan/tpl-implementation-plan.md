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

<!-- High-level technical approach. Above code level - describe WHAT changes WHERE and WHY -->

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
- **Why**: {{rationale}}
- **Considerations**: {{relevant_edge_cases_or_constraints_or_N/A_with_reason}}

## Testing Plan

<!-- How to verify the implementation.
     Prefer a single primary "verify" command when possible (e.g. `pytest ...`, `npm test`, `go test ./...`).
     The verify command must exercise the CHANGED BEHAVIOR, not just compile or lint.
     
     Keep testing proportional to changed behavior and concrete risk; N/A is acceptable with a short reason.
     Do not create test or deployment infrastructure merely to fill this section.

     Integrity constraints:
      - Existing tests MUST NOT be disabled, deleted, or weakened to make the implementation pass.
      - Update affected tests only where authorized behavior changes.
      - Use integration/E2E/manual checks when warranted by the changed behavior and risk. -->

| Test Type | What to Test | Expected Outcome |
|-----------|-------------|-----------------|
| {{type}} | {{description}} | {{outcome}} |

### Test Integrity Constraints

<!-- List any existing tests that will be AFFECTED by this phase's changes.
     For each: state whether it needs updating (because behavior intentionally changed)
     or must remain untouched (unchanged behavior).
     If no existing tests are affected, state "No existing tests affected." -->

- {{constraint}}

## Rollback Strategy

<!-- How to undo changes if relevant. Otherwise state N/A with a short reason. Do not invent infrastructure. -->

## Open Decisions

| Decision | Options | Chosen | Rationale |
|----------|---------|--------|-----------|
| {{decision}} | {{options}} | {{chosen}} | {{rationale}} |

## Reality Check

<!-- Ground this implementation plan against current repository reality.
     Use this section to record what you verified in the codebase (anchors) and any mismatches.
     Do NOT change the gated phase scope here; raise scope changes to the primary. -->

### Code Anchors Used

| File | Symbol/Area | Why it matters |
|------|-------------|----------------|
| {{path}} | {{symbol_or_area}} | {{why}} |

### Mismatches / Notes

- {{note}}

### Blocking Decisions

<!-- List necessary decisions not authorized by the gated plan/phase. Do not choose an answer or plan dependent work.
     Unspecified product, policy, security, privacy, compliance, authorization, or operational behavior is not authorized.
     If none, state "None." -->

- {{blocking_decision_or_None}}
