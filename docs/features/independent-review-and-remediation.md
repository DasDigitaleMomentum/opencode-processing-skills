---
type: documentation
entity: feature
feature: "independent-review-and-remediation"
version: 1.1
---

# Feature: Independent Review and Remediation

> Part of [OpenCode Processing Skills](../overview.md)

## Summary

Optional review skills let a fresh delegate evaluate a plan, implementation plan, or completed implementation against explicit evidence and record severity-rated findings. Accepted implementation or implementation-plan findings can then be fixed in the same reviewer session so the analysis context is preserved.

## How It Works

Each review workflow defines its own focus, references, immutable output artifact, and verdict contract while sharing a scope-disciplined posture. The maintainer decides whether to invoke a review and which findings to accept; `review-fix` resumes that reviewer only for accepted related remediation and never starts an automatic review/fix loop.

### User Flow

1. The user or maintainer requests an independent quality gate for a completed plan, phase implementation plan, or implementation.
2. A fresh review delegate evaluates the authoritative scope and may use leaf `retriever` for bounded evidence, or `doc-explorer` for a genuinely documentation/module-oriented child task where the prompt permits it.
3. The delegate returns a compact verdict and stable finding IDs; the maintainer presents decisions that genuinely need user input.
4. For accepted implementation-plan or implementation findings, the maintainer resumes the same reviewer session with `review-fix` and the explicit finding IDs.
5. The reviewer changes only the approved scope, verifies it, returns a digest, and leaves the original review artifact unchanged.

### Technical Flow

1. `review-plan`, `review-implementation-plan`, or `review-implementation` prepares authoritative references and starts a fresh delegate (`skills/review-plan/SKILL.md:79`, `skills/review-implementation-plan/SKILL.md:80`, `skills/review-implementation/SKILL.md:82`).
2. The delegate checks only the review type's defined concerns, directly verifies evidence material to a finding, and owns synthesis, severity, verdict, and the final review artifact.
3. The maintainer triages the stable finding IDs; review does not imply automatic remediation.
4. `review-fix` resumes the same implementation or implementation-plan reviewer, applies only accepted related findings under its write boundary, and verifies the result (`skills/review-fix/SKILL.md:44`, `skills/review-fix/SKILL.md:61`).
5. Further independent re-review occurs only when explicitly requested or justified by changed scope, missing context, or a genuine risk decision (`skills/review-fix/SKILL.md:79`).

## Implementation

| Module | Symbols | Role |
|--------|---------|------|
| [Workflow Skills](../modules/workflow-skills.md) | `review-plan` Workflow (`skills/review-plan/SKILL.md:79`), `review-implementation-plan` Workflow (`skills/review-implementation-plan/SKILL.md:80`), `review-implementation` Workflow (`skills/review-implementation/SKILL.md:82`) | Defines independent evidence collection, artifact schemas, severity findings, and verdicts for each gate. |
| [Workflow Skills](../modules/workflow-skills.md) | `review-fix` Protocol (`skills/review-fix/SKILL.md:44`), Write Boundary (`skills/review-fix/SKILL.md:61`) | Reuses reviewer context to remediate explicitly accepted related findings. |
| [Agent Personas](../modules/agent-personas.md) | `delegate` What You Do (`agents/delegate.md:18`), How You Work (`agents/delegate.md:42`), `retriever` Constraints (`agents/retriever.md:27`) | Keeps review ownership with the delegate while permitting bounded leaf evidence collection. |
| [Agent Personas](../modules/agent-personas.md) | `maintainer` Additional skill loops (`agents/maintainer.md:153`), Delegate Session Reuse (`agents/maintainer.md:82`) | Chooses optional gates, tracks task identity, and prevents unrequested review loops. |

## Configuration

Review workflow selection is request-driven, not controlled by an environment flag. The recommended stronger review model can be configured as an `additional_delegates` alias, while expertise, write boundaries, and output templates remain in the loaded skill. See [Agents](../agents.md#stateful-delegate-reuse) and [Installation](../installation.md#additional-delegate-variants).

## Edge Cases & Limitations

- Reviews are optional quality gates and never start automatically after every authoring or execution step.
- Findings must be evidence-backed and relevant to correctness, security, acceptance, or the reviewed objective; speculative gold-plating is out of scope.
- Retriever output is supporting evidence, not a verdict; the reviewer verifies material claims and reports when a retrieval route was not useful.
- `review-fix` applies to implementation and implementation-plan reviews, not plan-review edits, and requires explicit accepted finding IDs.
- The original review artifact is immutable during remediation so its evidence and verdict remain auditable.
- Changed objectives, unavailable reviewer context, or a requested fresh perspective require a new appropriately scoped session rather than forced reuse.
- A remediation digest is not an independent re-review; another quality gate must be explicitly justified or requested.

## Related Features

- [Gated Work-Package Execution](gated-work-package-execution.md)
- [Persistent Planning Lifecycle](persistent-planning-lifecycle.md)
