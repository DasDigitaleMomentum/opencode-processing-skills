---
type: planning
entity: plan
plan: "{{plan_name}}"
status: draft  # draft | active | completed | abandoned
created: "{{date}}"
updated: "{{date}}"
---

# Plan: {{plan_name}}

## Objective

<!-- What should be achieved? Clear, measurable goal -->

## Motivation

<!-- Why is this needed? Business value, technical debt, user demand -->

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

<!-- What tests are needed, what coverage is expected -->

- [ ] {{test_description}}

## Phases

<!-- Only if plan exceeds single-session capacity -->

| Phase | Title | Scope | Status |
|-------|-------|-------|--------|
| 1 | {{title}} | [Detail](phases/phase-1.md) | pending |

## Risks & Open Questions

<!-- Known risks, unresolved questions, assumptions -->

| Risk/Question | Impact | Mitigation/Answer |
|---------------|--------|-------------------|
| {{description}} | {{impact}} | {{mitigation}} |

## Changelog

<!-- Append-only log of significant changes to this plan -->

### {{date}}

- Plan created
