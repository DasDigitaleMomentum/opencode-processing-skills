---
type: review
entity: plan-review
plan: "{{plan_name}}"
status: draft  # draft | final
reviewer: "{{agent_type}}"  # delegate | general
reduction_required: "{{yes_or_no}}"
created: "{{date}}"
---

# Plan Review: {{plan_name}}

> Reviewing [{{plan_name}}](../plan.md)

## Assessment

**Verdict**: {{Ready | Needs Revision | Major Gaps}}
**Reduction Required**: {{Yes | No}}

{{brief_reasoning}}

## Findings

<!-- Report exceptions only. Format each finding as:
     - F-N | Critical/Major/Minor/Note | Area: evidence-backed problem. Action: concrete correction.
     Scope-reduction actions should say Remove, Merge, or Simplify.
     If no material finding exists, state "No findings." -->

- {{finding_or_No_findings}}

## Required Action

**Next**: {{Proceed | Apply update-plan remediation | User decision}}
