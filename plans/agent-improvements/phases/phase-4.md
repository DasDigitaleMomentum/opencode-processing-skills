---
type: planning
entity: phase
plan: "agent-improvements"
phase: 4
status: pending
created: "2026-07-11"
updated: "2026-07-11"
---

# Phase 4: Canonical Delegate & Review Remediation

> Part of [agent-improvements](../plan.md)

## Objective

Keep task expertise in skills and preserve reviewer context during remediation. The same reviewer `task_id` is the default path for accepted related findings, including multi-file runtime fixes. New work packages and additional reviews are explicit decisions, not automatic policy consequences.

## Scope

### Includes

- `agents/delegate.md` as the canonical skill-driven delegate persona.
- `skills/delegate-analysis/` for routine exploration and analysis modes.
- `skills/review-fix/` for same-session remediation.
- Review skills and prompts that route accepted findings back to the existing reviewer.
- Maintainer and Cursor routing/documentation that prevents context-cold remediation by default.
- Policy-light guardrails that prevent automatic review/fix loops and unnecessary Blueprint gates.

### Excludes

- Replacing `implementer` for new, independently scoped implementation work.
- Changing the meaning of an independent initial review.
- Automatic fresh reviews after every remediation pass.

## Acceptance Criteria

- [ ] A review can transition to `review-fix` using the same reviewer `task_id`.
- [ ] Related fixes may span files, call sites, tests, and runtime code without requiring a new work package solely because of size.
- [ ] Review-fix does not require an exact file allowlist or a separate Blueprint by default.
- [ ] New work packages are reserved for changed scope/objective, unavailable context, new primary decisions, or explicit fresh context.
- [ ] Additional review/fix loops never start automatically.
- [ ] The review artifact remains immutable during remediation.
- [ ] Maintainers and delegates use an explicit anti-gold-plating, non-adversarial, no-scope-creep review posture while still reporting real defects.

## Verification

- Inspect generated OpenCode and Cursor artifacts for a single canonical delegate persona.
- Verify review prompts explicitly load their review skills.
- Verify `review-fix` is installed and preserves same-session routing.
- Run `git diff --check` and the installer help/project smoke tests.

## Notes

The reviewer's prior context is an asset, not a reason to force a new implementer. The primary retains control over scope and acceptance; the policy must not invent extra gates or gold-plate the workflow.

The operating reminder is: **No Gold-Plating. No Adversarial Reviewing. No Scope Creep.** This is a focus rule, not a reason to suppress evidence-backed defects or required related changes.
