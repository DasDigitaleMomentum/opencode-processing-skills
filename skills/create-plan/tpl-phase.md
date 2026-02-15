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

### Excludes (deferred to later phases)

- {{item}}

## Prerequisites

<!-- What must be done before this phase can start -->

- [ ] {{prerequisite}}

## Deliverables

<!-- Concrete outputs of this phase -->

- [ ] {{deliverable}}

## Acceptance Criteria

<!-- How to verify this phase is complete -->

- [ ] {{criterion}}

## Dependencies on Other Phases

<!-- Which phases must complete first, which can run in parallel -->

| Phase | Relationship | Notes |
|-------|-------------|-------|
| {{phase_ref}} | blocks/blocked-by/parallel | {{notes}} |

## Notes

<!-- Context, decisions, observations relevant to this phase -->
