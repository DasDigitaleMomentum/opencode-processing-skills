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

<!-- Binding decisions and constraints that govern scope or acceptable solutions. Do not invent unspecified product, policy, or operational rules. Resolve material user-owned choices before creating this artifact. -->

- {{decision_or_constraint}}

### Scope-Bounding Assumptions (optional)

<!-- Include only assumptions that materially bound scope, acceptance, or later decisions. Omit otherwise. -->

- {{assumption}}

## Requirements

<!-- Confirmed requirements plus concrete existing invariants necessary for the requested behavior. Do not infer generic quality requirements. -->

### Functional

- [ ] {{requirement}}

### Non-Functional

<!-- Optional: include only explicit requirements or obligations supported by a concrete invariant/risk. -->

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

<!-- Use the smallest complete phase set: cover necessary real paths and existing invariants without speculative work. For multi-phase plans, state briefly why each phase needs a separate execution boundary. -->

| Phase | Title | Contribution | Why Separate | Detail | Status |
|-------|-------|--------------|--------------|--------|--------|
| 1 | {{title}} | {{contribution_to_target_outcome}} | {{necessity_or_single_phase}} | [Phase](phases/phase-1.md) | pending |

## Risks & Open Questions

<!-- Optional: only decision-relevant known risks or unresolved questions. Omit rather than inventing hypothetical risks. -->

| Risk/Question | Impact | Mitigation/Answer |
|---------------|--------|-------------------|
| {{description}} | {{impact}} | {{mitigation}} |

## Changelog

<!-- Append-only log of significant changes to this plan -->

### {{date}}

- Plan created
