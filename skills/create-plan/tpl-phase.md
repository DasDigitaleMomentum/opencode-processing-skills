---
type: planning
entity: phase
plan: "{{plan_name}}"
phase: {{phase_number}}
status: pending  # pending | in_progress | completed | skipped
created: "{{date}}"
updated: "{{date}}"
---

# Phase {{phase_number}}: {{phase_title}}

> Part of [{{plan_name}}](../plan.md)

## Objective

<!-- What should this phase achieve? Specific, bounded goal -->

## Scope

<!-- What is in scope for THIS phase specifically -->

### Includes

- {{item}}

### Excludes

<!-- Exclusion does not create or authorize a later phase. -->

- {{item}}

## Prerequisites

<!-- Optional: only concrete prerequisites. Omit if none. -->

- [ ] {{prerequisite}}

## Deliverables

<!-- Smallest complete set of concrete outputs: include necessary real integration paths, but no speculative deliverables. -->

- [ ] {{deliverable}}

## Acceptance Criteria

<!-- How to verify the requested behavior, affected real paths, and applicable existing invariants are complete -->

- [ ] {{criterion}}

## Dependencies on Other Phases

<!-- Optional: actual dependencies only. Omit if none. -->

| Phase | Relationship | Notes |
|-------|-------------|-------|
| {{phase_ref}} | blocks/blocked-by | {{notes}} |

## Notes

<!-- Context, decisions, observations relevant to this phase -->
