---
type: review
entity: implementation-plan-review
plan: "{{plan_name}}"
phase: {{phase_number}}
status: draft  # draft | final
reviewer: "{{agent_type}}"  # delegate | general
created: "{{date}}"
---

# Implementation Plan Review: Phase {{phase_number}} - {{phase_title}}

> Reviewing [Phase {{phase_number}} Implementation Plan](../implementation/phase-{{phase_number}}-impl.md)
> Against [Phase {{phase_number}} Scope](../phases/phase-{{phase_number}}.md) and [Plan](../plan.md)

## Overall Assessment

<!-- REQUIRED: One of: Ready | Needs Revision | Major Gaps
     Explain your reasoning in 2-3 sentences.
     Key question: Could an implementer execute this plan without guessing? -->

**Verdict**: {{verdict}}

{{summary}}

## Scope Alignment

<!-- CHECK: Does the implementation plan stay within the gated phase scope?
     - Does it implement everything the phase requires (no gaps)?
     - Does it implement ONLY what the phase requires (no scope creep)?
     - Are the "Affected Modules" consistent with the phase scope?
     - If deviations exist: are they justified and flagged? -->

### Findings

- {{finding}}

## Technical Feasibility

<!-- CHECK: Is the proposed approach technically sound?
     - Are the chosen patterns/libraries/approaches appropriate for the codebase?
     - Are there simpler alternatives that were overlooked?
     - Does the approach align with existing codebase conventions?
     - Are performance implications considered where relevant?
     - Are edge cases and error handling addressed? -->

### Findings

- {{finding}}

## Step Quality Assessment

<!-- CHECK: Are the implementation steps concrete and actionable?
     For each step evaluate:
     - Does it reference REAL file paths and symbols (not placeholders)?
     - Is the What/Where/Why filled in concretely (not hand-wavy)?
     - Are considerations meaningful (not generic boilerplate)?
     - Is the step order logically correct?
     - Could an implementer execute this step without additional research? -->

| Step | Title | Concrete? | Actionable? | Issue |
| ---- | ----- | --------- | ----------- | ----- |
| {{N}} | {{t}} | {{y/n}}  | {{y/n}}     | {{}}  |

## Required Context Assessment

<!-- CHECK: Is the "Required Context" section complete?
     - Are all files that the implementer needs to read listed?
     - Are the "Why" explanations clear?
     - Are there files that SHOULD be listed but aren't?
     - Are there files listed that aren't actually needed? -->

### Missing Context

- {{file_and_reason}}

### Unnecessary Context

- {{file_and_reason}}

## Testing Plan Assessment

<!-- CHECK: Is the testing plan adequate for this phase?
     - Does the verify command actually test the changes?
     - Is there exactly ONE primary verify command (as per convention)?
     - Are the test types appropriate (unit vs integration vs e2e)?
     - Do the tests verify BEHAVIOR and CORRECTNESS, not just "no errors"?
     - Are the "Expected Outcome" descriptions specific and verifiable?
     - Is there a real-world testing step?
       If not: flag as a limitation. Mock/unit tests alone often miss integration issues.
       If the user explicitly waived: note the waiver. -->

### Test Gaps

- {{gap}}

### Real-World Testing

<!-- REQUIRED: State whether real-world / integration testing is planned.
     If only mocks/unit tests: flag as limitation with risk explanation.
     If user waived: note waiver. -->

{{status}}

## Reference Consistency

<!-- CHECK: Are all references in the implementation plan valid?
     - Do file paths in "Code Anchors" actually exist in the repo?
     - Do symbol references match current code (not outdated)?
     - Do module references match docs/modules/*.md?
     - Are cross-references to plan.md and phase-N.md correct? -->

### Findings

- {{finding}}

## Reality Check Validation

<!-- CHECK: Is the "Reality Check" section of the implementation plan honest?
     - Were enough code anchors examined?
     - Are noted mismatches genuine (or are real mismatches missing)?
     - Are open questions flagged appropriately?
     - Has the plan been updated to reflect discovered reality? -->

### Findings

- {{finding}}

## Findings Summary

<!-- Consolidate all findings with severity ratings.
     Severity levels:
     - Critical: Blocks execution. Must be resolved before implementing.
     - Major: Significant gap that risks implementation quality or correctness.
     - Minor: Improvement opportunity. Can proceed but should be addressed.
     - Note: Observation for awareness. No action required. -->

| # | Severity | Area | Finding | Recommendation |
| - | -------- | ---- | ------- | -------------- |
| 1 | {{sev}}  | {{}} | {{}}    | {{}}           |

## Recommendations

<!-- Prioritized list of actions. Start with Critical, then Major, then Minor. -->

1. {{recommendation}}
