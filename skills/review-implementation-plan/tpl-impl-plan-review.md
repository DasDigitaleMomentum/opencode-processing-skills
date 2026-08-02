---
type: review
entity: implementation-plan-review
plan: "{{plan_name}}"
phase: {{phase_number}}
review_mode: "{{review_mode}}"  # single-phase | batch
batch_phases: "{{batch_phases}}"  # optional
status: draft  # draft | final
reviewer: "{{agent_type}}"  # delegate | general
reduction_required: "{{yes_or_no}}"
created: "{{date}}"
---

# Implementation Plan Review: Phase {{phase_number}} - {{phase_title}}

> Reviewing [Phase {{phase_number}} Implementation Plan](../implementation/phase-{{phase_number}}-impl.md)
> Against [Phase {{phase_number}} Scope](../phases/phase-{{phase_number}}.md) and [Plan](../plan.md)

## Assessment

**Verdict**: {{Ready | Needs Revision | Major Gaps}}
**Reduction Required**: {{Yes | No}}

{{brief_reasoning}}

## Findings

<!-- Report exceptions only. Format each finding as:
     - F-N | Critical/Major/Minor/Note | Area: evidence-backed problem. Action: concrete correction.
     Scope-reduction actions should say Remove, Merge, or Simplify.
     Include code evidence only where it materially supports the finding.
     If no material finding exists, state "No findings." -->

- {{finding_or_No_findings}}

## Required Action

**Next**: {{Proceed | Apply review-fix remediation | Update phase scope via update-plan | User decision}}

## Cross-Phase Findings (Batch Only)

<!-- Optional. Include only material conflicts involving actual shared interfaces or dependencies. Omit when none exist. -->

- {{finding}}
