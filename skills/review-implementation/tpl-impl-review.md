---
type: review
entity: implementation-review
plan: "{{plan_name}}"
phase: {{phase_number}}
status: draft  # draft | final
reviewer: "{{agent_type}}"  # delegate | general
created: "{{date}}"
---

<!-- REVIEW PRIORITY GUIDE
     Focus sections (always address thoroughly):
     - Overall Assessment, Acceptance Criteria Verification, Code Quality Assessment, Testing Assessment, Findings Summary
     
     Secondary sections (include only when real problems found):
     - Reference Consistency, Documentation & Cleanup, formal DoD checklisting
     
     If a secondary section has no real findings, OMIT it entirely rather than
     writing "No issues found." A shorter, focused review is better than a 
     comprehensive-but-cluttered one.
-->

# Implementation Review: Phase {{phase_number}} - {{phase_title}}

> Reviewing implementation of [Phase {{phase_number}}](../phases/phase-{{phase_number}}.md)
> Against [Implementation Plan](../implementation/phase-{{phase_number}}-impl.md) and [Plan](../plan.md)

## Overall Assessment

<!-- REQUIRED: One of: Accepted | Needs Rework | Rejected
     Explain your reasoning in 2-3 sentences.
     Key question: Does the implementation fulfill the phase's Definition of Done? -->

**Verdict**: {{verdict}}

{{summary}}

## Acceptance Criteria Verification

<!-- CHECK: Go through EACH acceptance criterion from the phase doc.
     For each criterion:
     - Was it implemented? (yes/no/partial)
     - Where is the evidence? (file path, test output, commit)
     - If partial: what's missing? -->

| # | Criterion | Met? | Evidence | Gap |
| - | --------- | ---- | -------- | --- |
| 1 | {{crit}}  | {{}} | {{}}     | {{}}|

## Plan Adherence

<!-- CHECK: Does the implementation follow the implementation plan?
     For each planned step:
     - Was it executed as planned?
     - Were there deviations? If so: justified or problematic?
     - Were unplanned changes made? If so: are they in scope? -->

| Step | Planned | Actual | Deviation? | Assessment |
| ---- | ------- | ------ | ---------- | ---------- |
| {{N}} | {{}}   | {{}}   | {{}}       | {{}}       |

## Code Quality Assessment

<!-- CHECK: Does the implementation meet quality standards?
     Evaluate against the coding standards from execute-work-package:
     1. No hardcoded defaults - uses config/env where appropriate?
     2. Root cause addressed - not just symptoms patched?
     3. Minimal changes - only touched what's needed?
     4. Preserves patterns - matches codebase conventions?
     5. No silent failures - errors visible and handled?
     6. Dependency boundary respected - no unauthorized new deps?
     
     Additional checks:
     - Is the code readable and maintainable?
     - Are there code smells or anti-patterns introduced?
     - Is error handling comprehensive? -->

### Findings

- {{finding}}

## Testing Assessment

<!-- CHECK: Were the planned tests actually implemented and run?
     - Did the verify command pass?
     - Were ALL planned test types executed (unit, integration, e2e)?
     - Are tests MEANINGFUL?
       - Do they test behavior, not just structure?
       - Do they cover edge cases and error paths?
       - Do they actually FAIL when the feature breaks (not just pass always)?
       - Would a regression in the implemented feature be caught?
     - Is test coverage adequate for the changes made? -->

### Verify Command Result

- **Command**: {{command}}
- **Exit Code**: {{code}}
- **Result**: {{pass/fail}}

### Test Quality

| Test | What it Tests | Meaningful? | Issue |
| ---- | ------------- | ----------- | ----- |
| {{}} | {{}}          | {{y/n}}     | {{}}  |

### Real-World Testing

<!-- REQUIRED: Was real-world / integration testing performed?
     
     IMPORTANT: Mock tests and unit tests alone are often insufficient.
     They verify isolated behavior but miss:
     - Integration issues between components
     - Environment-specific problems
     - Data flow issues in production-like conditions
     - UI/UX issues that only surface in real usage
     
     State one of:
     - Performed: describe what was tested and results
     - Not performed: explain why and flag as limitation
     - Waived by user: note the waiver with date/context
     
     If mocks were used: explain what they mock and what risks remain. -->

{{status}}

## Scope Compliance

<!-- CHECK: Did the implementation stay within the phase scope?
     - Were any out-of-scope changes made?
     - Were any in-scope items skipped or deferred?
     - Does the implementation affect any modules/files outside the plan's "Affected Modules"? -->

### Findings

- {{finding}}

## Regression Risk

<!-- CHECK: Could this implementation break existing functionality?
     - Were existing tests maintained (not deleted, disabled, or weakened)?
     - Were assertions kept at their original strictness (not loosened to make tests pass)?
     - Do all pre-existing tests still pass?
     - If any test was modified: was the modification justified by a genuine requirement change (not just to silence a failure)?
     - Are there areas where side effects are likely but untested?
     - Were database/schema changes handled safely? -->

### Test Integrity Check

<!-- REQUIRED: Explicitly confirm or deny each:
     - [ ] No existing tests were deleted
     - [ ] No existing tests were disabled (skip, pending, xit, etc.)
     - [ ] No existing assertions were weakened
     - [ ] All pre-existing tests still pass
     If any box is unchecked: flag as Critical finding. -->

### Findings

- {{finding}}

## Documentation & Cleanup

<!-- SECONDARY — Only include if real problems found. Omit entirely if clean.
     CHECK: Is the implementation complete beyond just code?
      - Were necessary documentation updates made (API docs, README, etc.)?
      - Were TODO/FIXME comments resolved or tracked?
      - Were temporary/debug artifacts cleaned up?
      - Is the changelog updated if required? -->

### Findings

- {{finding}}

## Findings Summary

<!-- Consolidate all findings with severity ratings.
     Severity levels:
     - Critical: Must be fixed before merge/acceptance. Breaks functionality or violates DoD.
     - Major: Significant quality or completeness issue. Should be fixed before acceptance.
     - Minor: Improvement opportunity. Can be accepted but should be tracked for follow-up.
     - Note: Observation for awareness. No action required. -->

| # | Severity | Area | Finding | Recommendation |
| - | -------- | ---- | ------- | -------------- |
| 1 | {{sev}}  | {{}} | {{}}    | {{}}           |

## Recommendations

<!-- Prioritized list of actions.
     For each: state whether it blocks acceptance or is a follow-up.
     Start with Critical, then Major, then Minor. -->

1. {{recommendation}}
