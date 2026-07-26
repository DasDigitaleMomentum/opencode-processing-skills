---
type: documentation
entity: feature
feature: "independent-review-and-remediation"
version: 1.2
---

# Feature: Independent Review and Remediation

> Part of [OpenCode Processing Skills](../overview.md)

## Summary

Optional review skills let a fresh delegate evaluate a plan, implementation plan, or completed implementation against explicit evidence and record severity-rated findings. Accepted findings then route to the context that best fits the remediation: reuse the reviewer when its reasoning remains materially useful, or prefer a fresh lean task for a fully specified self-contained fix or verification.

## How It Works

Each review workflow defines its own focus, references, immutable output artifact, and verdict contract while sharing a scope-disciplined posture. The maintainer decides whether to invoke a review, which findings to accept, and whether retained reviewer analysis is worth its context cost. `review-fix` never starts an automatic review/fix loop.

### User Flow

1. The user or maintainer requests an independent quality gate for a completed plan, phase implementation plan, or implementation.
2. A fresh review delegate evaluates the authoritative scope and sends separable evidence collection to leaf `retriever` by default, or to `doc-explorer` for a genuinely documentation/module-oriented child task where the prompt permits it.
3. The delegate returns a compact verdict and stable finding IDs; the maintainer presents decisions that genuinely need user input.
4. For accepted implementation-plan or implementation findings, the maintainer resumes the reviewer with `review-fix` when retained analysis, assumptions, or cross-file reasoning helps; a fully specified fix/test/command prefers a fresh lean task or tiny primary check.
5. The remediation changes only the approved scope, runs targeted checks while fixing, then preserves any supplied broad/full verification as the final gate; it returns a digest and leaves the original review artifact unchanged.

### Technical Flow

1. `review-plan`, `review-implementation-plan`, or `review-implementation` prepares authoritative references and starts a fresh delegate (`skills/review-plan/SKILL.md:79`, `skills/review-implementation-plan/SKILL.md:80`, `skills/review-implementation/SKILL.md:82`).
2. The delegate checks only the review type's defined concerns, directly verifies evidence material to a finding, and owns synthesis, severity, verdict, and the final review artifact.
3. The maintainer triages the stable finding IDs; review does not imply automatic remediation.
4. `review-fix` reuses the reviewer only when retained reasoning materially benefits accepted remediation; session age and file count do not decide (`skills/review-fix/SKILL.md:14`, `skills/review-fix/SKILL.md:90`).
5. During fixing it runs the smallest targeted behavioral test, then runs the supplied broad/full command once as the final gate. A broad failure returns to targeted diagnosis/fix/retest before another broad run (`skills/review-fix/SKILL.md:44`).
6. Further independent re-review occurs only when explicitly requested or justified by changed scope, missing context, or a genuine risk decision (`skills/review-fix/SKILL.md:80`).

## Implementation

| Module | Symbols | Role |
|--------|---------|------|
| [Workflow Skills](../modules/workflow-skills.md) | `review-plan` Workflow (`skills/review-plan/SKILL.md:79`), `review-implementation-plan` Workflow (`skills/review-implementation-plan/SKILL.md:80`), `review-implementation` Workflow (`skills/review-implementation/SKILL.md:82`) | Defines independent evidence collection, artifact schemas, severity findings, and verdicts for each gate. |
| [Workflow Skills](../modules/workflow-skills.md) | `review-fix` Context Policy (`skills/review-fix/SKILL.md:14`), Protocol (`skills/review-fix/SKILL.md:44`), Write Boundary (`skills/review-fix/SKILL.md:62`) | Selects reuse by retained reasoning value, remediates accepted findings, and stages verification without weakening the final gate. |
| [Agent Personas](../modules/agent-personas.md) | `delegate` What You Do (`agents/delegate.md:18`), How You Work (`agents/delegate.md:42`), `retriever` Constraints (`agents/retriever.md:27`) | Keeps review ownership with the delegate while permitting bounded leaf evidence collection. |
| [Agent Personas](../modules/agent-personas.md) | `maintainer` Additional skill loops (`agents/maintainer.md:154`), Delegate Session Reuse (`agents/maintainer.md:82`) | Chooses optional gates, tracks task identity, and prevents unrequested review loops. |

## Configuration

Review workflow selection is request-driven, not controlled by an environment flag. The recommended stronger review model can be configured as an `additional_delegates` alias, while expertise, write boundaries, and output templates remain in the loaded skill. See [Agents](../agents.md#stateful-delegate-reuse) and [Installation](../installation.md#additional-delegate-variants).

## Edge Cases & Limitations

- Reviews are optional quality gates and never start automatically after every authoring or execution step.
- Findings must be evidence-backed and relevant to correctness, security, acceptance, or the reviewed objective; speculative gold-plating is out of scope.
- Retriever output is supporting evidence, not a verdict; the reviewer verifies material claims and reports when a retrieval route was not useful.
- `review-fix` applies to implementation and implementation-plan reviews, not plan-review edits, and requires explicit accepted finding IDs.
- The original review artifact is immutable during remediation so its evidence and verdict remain auditable.
- Changed objectives, unavailable context, or a requested fresh perspective require a new appropriately scoped session. Even unchanged scope should prefer fresh lean work when a fully specified fix or verification does not benefit from the reviewer's accumulated reasoning.
- Targeted remediation tests never replace a supplied broad/full final command; broad failure returns to targeted diagnosis before that final gate is rerun.
- A remediation digest is not an independent re-review; another quality gate must be explicitly justified or requested.

## Related Features

- [Gated Work-Package Execution](gated-work-package-execution.md)
- [Persistent Planning Lifecycle](persistent-planning-lifecycle.md)
