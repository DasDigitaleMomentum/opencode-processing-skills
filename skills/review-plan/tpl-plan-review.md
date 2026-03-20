---
type: review
entity: plan-review
plan: "{{plan_name}}"
status: draft  # draft | final
reviewer: "{{agent_type}}"  # delegate | general
created: "{{date}}"
---

# Plan Review: {{plan_name}}

> Reviewing [{{plan_name}}](../plan.md)

## Overall Assessment

<!-- REQUIRED: One of: Ready | Needs Revision | Major Gaps
     Explain your reasoning in 2-3 sentences. -->

**Verdict**: {{verdict}}

{{summary}}

## Requirement Coverage

<!-- CHECK: Does the plan cover ALL stated requirements (functional + non-functional)?
     For each requirement, trace it to a phase or deliverable.
     Flag any requirement that has no clear owner (phase/deliverable). -->

| Requirement | Covered By | Gap? | Notes |
| ----------- | ---------- | ---- | ----- |
| {{req}}     | {{ref}}    | {{}} | {{}}  |

## Scope Clarity

<!-- CHECK: Is the scope well-defined?
     - Are "In Scope" items specific enough to be actionable?
     - Are "Out of Scope" items explicitly listed (not just implied)?
     - Could someone unfamiliar with the project understand what's included and excluded?
     - Are there items that SHOULD be in scope but aren't? -->

### Findings

- {{finding}}

## Definition of Done Assessment

<!-- CHECK: Is the DoD concrete and verifiable?
     - Can each criterion be objectively checked (yes/no)?
     - Are there implicit assumptions that should be explicit?
     - Does the DoD cover: functionality, tests, documentation, deployment?
     - Is the DoD achievable within the planned phases? -->

### Findings

- {{finding}}

## Phase Structure Assessment

<!-- CHECK: Is the phase breakdown sound?
     - Does each phase produce a testable, committable result?
     - Are phase boundaries clean (no "half-done" states)?
     - Is the dependency order correct?
     - Is each phase realistically sized for a single session (~15-20 files max)?
     - Are there phases that should be split or merged? -->

| Phase | Title | Verdict | Issue |
| ----- | ----- | ------- | ----- |
| {{N}} | {{t}} | {{ok?}} | {{}}  |

## Testing Strategy Assessment

<!-- CHECK: Is the testing strategy adequate?
     - Are the right TEST TYPES defined (unit, integration, e2e)?
     - Is each critical path covered by at least one test?
     - Are the tests MEANINGFUL (not just "it runs without errors")?
     - Do tests verify BEHAVIOR, not just structure?
     - Is there a real-world / manual testing step defined?
       If not: this is a finding. Mock-only testing is often insufficient.
       If the user explicitly waived real-world testing, note that here. -->

### Test Coverage Gaps

- {{gap}}

### Real-World Testing

<!-- REQUIRED: State whether real-world / integration testing is planned.
     If only mocks/unit tests: flag as a limitation and explain risk.
     If user explicitly waived: note the waiver and date. -->

{{status}}

## Reference Consistency

<!-- CHECK: Are all internal references valid and consistent?
     - Do phase references in plan.md match actual phase files?
     - Do requirement IDs (if used) match across documents?
     - Are file paths and module names consistent?
     - Do scope boundaries in phases align with the plan's scope? -->

### Findings

- {{finding}}

## Completeness Check

<!-- CHECK: Is the plan sufficiently detailed for execution?
     - Could someone start implementing Phase 1 based solely on plan + phase docs?
     - Are there implicit decisions that should be made explicit?
     - Are risks and mitigations realistic?
     - Are there missing sections or empty placeholders? -->

### Findings

- {{finding}}

## Findings Summary

<!-- Consolidate all findings with severity ratings.
     Severity levels:
     - Critical: Blocks execution. Must be resolved before proceeding.
     - Major: Significant gap that risks implementation quality or correctness.
     - Minor: Improvement opportunity. Can proceed but should be addressed.
     - Note: Observation for awareness. No action required. -->

| # | Severity | Area | Finding | Recommendation |
| - | -------- | ---- | ------- | -------------- |
| 1 | {{sev}}  | {{}} | {{}}    | {{}}           |

## Recommendations

<!-- Prioritized list of actions. Start with Critical, then Major, then Minor. -->

1. {{recommendation}}
