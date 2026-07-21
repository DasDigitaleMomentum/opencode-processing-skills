---
type: planning
entity: plan
plan: "{{plan_name}}"
status: draft  # draft | active | completed | abandoned
created: "{{date}}"
updated: "{{date}}"
---

# Plan: {{plan_name}}

## Problem / Context

<!-- What problem or current state motivates this work? Keep this concise and link detailed architecture context. -->

## Target Outcome

<!-- What measurable outcome should replace the current state, and why does it matter? -->

## Guiding Decisions & Constraints

<!-- Binding decisions and constraints that govern scope or acceptable solutions. Do not invent unspecified policy. -->

- {{decision_or_constraint}}

### Scope-Bounding Assumptions (optional)

<!-- Include only assumptions that materially bound scope, acceptance, or later decisions. Omit otherwise. -->

- {{assumption}}

## Requirements

<!-- Functional and non-functional requirements -->

### Functional

- [ ] {{requirement}}

### Non-Functional

- [ ] {{requirement}}

## Scope

### In Scope

- {{item}}

### Out of Scope

- {{item}}

## Definition of Done

<!-- Concrete criteria that must ALL be met -->

- [ ] {{criterion}}

## Testing Strategy

<!-- Tests proportionate to the changed behavior and concrete risk. N/A is acceptable with a short reason; do not invent infrastructure. -->

- [ ] {{test_description}}

## Phases

<!-- Only if plan exceeds single-session capacity -->

| Phase | Title | Contribution | Detail | Status |
|-------|-------|--------------|--------|--------|
| 1 | {{title}} | {{brief_contribution_to_target_outcome}} | [Phase](phases/phase-1.md) | pending |

## Risks & Open Questions

<!-- Known risks, unresolved questions, assumptions -->

| Risk/Question | Impact | Mitigation/Answer |
|---------------|--------|-------------------|
| {{description}} | {{impact}} | {{mitigation}} |

## Changelog

<!-- Append-only log of significant changes to this plan -->

### {{date}}

- Plan created
