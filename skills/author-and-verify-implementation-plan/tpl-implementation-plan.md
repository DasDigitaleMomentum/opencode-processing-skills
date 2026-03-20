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
     Each step should reference concrete targets (file paths and/or symbols/components). -->

### Step 1: {{step_title}}

- **What**: {{description}}
- **Where**: {{module/file/area}}
- **Why**: {{rationale}}
- **Considerations**: {{edge_cases_or_constraints}}

## Testing Plan

<!-- How to verify the implementation.
     Prefer a single primary "verify" command when possible (e.g. `pytest ...`, `npm test`, `go test ./...`).
     The verify command must exercise the CHANGED BEHAVIOR, not just compile or lint.
     
     IMPORTANT constraints:
     - Existing tests MUST NOT be disabled, deleted, or weakened to make the implementation pass.
     - All pre-existing tests must still pass after implementation.
     - E2E / real-world testing is the default for user-facing changes.
       If not feasible: state why and flag for user decision (do not silently downgrade to unit tests). -->

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

<!-- How to undo changes if something goes wrong -->

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
