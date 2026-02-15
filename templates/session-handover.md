---
type: planning
entity: session-handover
plan: "{{plan_name}}"          # omit for standalone handovers (no plan)
session_date: "{{date}}"
phase: {{phase_number}}        # omit for standalone handovers (no plan)
---

# Session Handover: {{date}}

<!-- For plan-bound handovers: -->
> [{{plan_name}}](../plan.md) - [Phase {{phase_number}}](../phases/phase-{{phase_number}}.md)

<!-- For standalone handovers (docs/handovers/): remove the plan/phase reference above -->

## Session Summary

<!-- What was worked on in this session, in 2-3 sentences -->

## Progress

### Completed

- {{what_was_done}}

### In Progress (interrupted)

<!-- Work that was started but not finished -->

- {{what_is_in_progress}} - State: {{current_state}}

### Not Started (planned but deferred)

- {{what_was_planned_but_not_done}} - Reason: {{why}}

## Key Decisions Made

<!-- Decisions and their rationale, so the next session doesn't revisit them -->

| Decision | Rationale | Alternatives Considered |
|----------|-----------|------------------------|
| {{decision}} | {{why}} | {{alternatives}} |

## Current State of Implementation

<!-- Describe the technical state: what files were changed, what's half-done -->

### Modified Files

| File | Change | Status |
|------|--------|--------|
| {{file_path}} | {{description}} | complete/partial |

### Pending Tests

- {{test_that_needs_to_run}}

## Blockers & Issues

<!-- Anything that blocks progress -->

- {{blocker_description}}

## Next Steps

<!-- Prioritized list of what the next session should do first -->

1. {{next_step}}

## Context for Next Session

<!-- Any non-obvious context the next session needs to know -->
<!-- Include: error messages encountered, workarounds applied, assumptions made -->
