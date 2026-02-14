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

<!-- Which modules will be modified or created -->

| Module | Change Type | Description |
|--------|-------------|-------------|
| [{{module_name}}](../../docs/modules/{{module_name}}.md) | modify/create/delete | {{what_changes}} |

## Implementation Steps

<!-- Ordered steps, each above code level. Not line-by-line but also not hand-wavy -->

### Step 1: {{step_title}}

- **What**: {{description}}
- **Where**: {{module/file/area}}
- **Why**: {{rationale}}
- **Considerations**: {{edge_cases_or_constraints}}

### Step 2: {{step_title}}

- **What**: {{description}}
- **Where**: {{module/file/area}}
- **Why**: {{rationale}}
- **Considerations**: {{edge_cases_or_constraints}}

## Testing Plan

<!-- How to verify the implementation -->

| Test Type | What to Test | Expected Outcome |
|-----------|-------------|-----------------|
| {{type}} | {{description}} | {{outcome}} |

## Rollback Strategy

<!-- How to undo changes if something goes wrong -->

## Open Decisions

<!-- Technical decisions that need to be made during implementation -->

| Decision | Options | Chosen | Rationale |
|----------|---------|--------|-----------|
| {{decision}} | {{options}} | {{chosen}} | {{rationale}} |
