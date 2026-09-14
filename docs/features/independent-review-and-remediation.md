---
type: documentation
entity: feature
feature: "independent-review-and-remediation"
version: 1.5
---

# Feature: Independent Review and Remediation

> Part of [OpenCode Processing Skills](../overview.md)

## Summary

Optional review skills let a fresh delegate evaluate a plan, implementation plan, or completed implementation against explicit evidence and record severity-rated findings. Plan-oriented reviews inspect for gaps and unnecessary work but persist only evidence-backed exceptions, not clean-item certification. Invoking a review is optional; once invoked, its progression gate is binding until blocking findings are remediated or explicitly rejected with rationale.

## How It Works

Each review workflow defines its own focus, references, immutable output artifact, and verdict contract while sharing a scope-disciplined posture. Plan and implementation-plan reviews inspect for missing obligations and for planned phases, steps, or artifacts that lack authorization or present necessity, but record only material exceptions. The maintainer decides whether to invoke a review and which findings to accept or reject; accepted plan reductions use one primary-owned `update-plan` pass, while explicitly instructed technical defects may use one `review-fix` pass from a review or diagnosis source. A review artifact is supported, not required. Both remediation routes stop without automatic re-review.

### User Flow

1. The user or maintainer requests an independent quality gate for a completed plan, phase implementation plan, or implementation.
2. A fresh review delegate evaluates the authoritative scope and sends separable evidence collection to leaf `retriever` by default, or to `doc-explorer` for a genuinely documentation/module-oriented child task where the prompt permits it.
3. A plan-oriented review returns a verdict, `Reduction Required` flag, severity counts, stable finding IDs, top actionable findings, and the required next action. `Ready` requires no required reduction and no Critical/Major findings.
4. Once invoked, the review blocks progression on `Reduction Required: Yes` or unresolved Critical/Major findings. The maintainer accepts or explicitly rejects each blocking finding with rationale.
5. Accepted plan-review findings run once through primary-owned `update-plan`. Accepted technical defects run once through `review-fix`: the Primary explicitly supplies the accepted defect set, evidence, scope, and source-session assignment without a token. Each correct and sufficient review/diagnosis source session is reused to preserve secured evidence; faulty, insufficient, or unavailable context routes to a fresh appropriate workflow with only a finding-source hint. Multiple source sessions may be assigned within the bounded pass.
6. For completed-implementation findings, remediation still changes only approved scope, runs targeted checks while fixing, preserves any supplied broad/full final verification, and leaves the original review artifact unchanged.

### Technical Flow

1. `review-plan`, `review-implementation-plan`, or `review-implementation` prepares authoritative references and starts a fresh delegate (`skills/review-plan/SKILL.md:76`, `skills/review-implementation-plan/SKILL.md:78`, `skills/review-implementation/SKILL.md:82`).
2. Plan-oriented delegates inspect forward coverage and reverse authorization/necessity but persist only concrete exceptions (`skills/review-plan/SKILL.md:112`, `skills/review-implementation-plan/SKILL.md:119`).
3. The reviewer owns evidence, severity, verdict, reduction flag, concrete actions, and the immutable review artifact. Missing intent or authorization that prevents a defensible decision yields `Major Gaps`; otherwise the artifact stays exception-only.
4. The maintainer triages stable finding IDs. Review does not imply automatic edits, but invoking it makes the progression gate binding (`skills/review-plan/SKILL.md:139`, `skills/review-implementation-plan/SKILL.md:153`).
5. Accepted plan findings use one bounded `update-plan` remediation pass (`skills/update-plan/SKILL.md:83`). Accepted technical defects use one `review-fix` pass with explicit token-free Primary authority and exact source-session assignment (`skills/review-fix/SKILL.md:42-53`). It reuses correct and sufficient retained evidence or falls back fresh with a source hint (`skills/review-fix/SKILL.md:57-62`), then reports fixed/unresolved findings, edits, and verification (`skills/review-fix/SKILL.md:89-97`).
6. The remediation is not an independent review. Materially new risk or uncertainty is escalated, and the Primary decides whether to request a fresh re-review; none starts automatically (`skills/review-fix/SKILL.md:99-107`).

## Implementation

| Module | Symbols | Role |
|--------|---------|------|
| [Workflow Skills](../modules/workflow-skills.md) | `review-plan` Output Contract (`skills/review-plan/SKILL.md:112`), `review-implementation-plan` Output Contract (`skills/review-implementation-plan/SKILL.md:119`), `review-implementation` Workflow (`skills/review-implementation/SKILL.md:82`) | Defines exception-only evidence collection, severity findings, compact digests, and binding progression gates. |
| [Workflow Skills](../modules/workflow-skills.md) | `update-plan` Plan-review Remediation (`skills/update-plan/SKILL.md:83`), `review-fix` Eligibility and Output (`skills/review-fix/SKILL.md:57-62`, `skills/review-fix/SKILL.md:89-107`) | Applies one accepted remediation pass, preserves secured evidence and review artifacts, uses correctness-based routing, and leaves re-review to the Primary. |
| [Agent Personas](../modules/agent-personas.md) | `delegate` What You Do (`agents/delegate.md:24`), How You Work (`agents/delegate.md:42`), `retriever` Constraints (`agents/retriever.md:33`) | Keeps review ownership with the delegate while permitting bounded leaf evidence collection. |
| [Agent Personas](../modules/agent-personas.md) | `maintainer` Persistent Lifecycle (`agents/maintainer.md:113`), Delegate Session Reuse (`agents/maintainer.md:82`) | Chooses optional gates, assigns source sessions, and decides whether new risk warrants independent re-review. |

## Configuration

Review workflow selection is request-driven, not controlled by an environment flag. The recommended stronger review model can be configured as an `additional_delegates` alias, while expertise, write boundaries, and output templates remain in the loaded skill. See [Agents](../agents.md#stateful-delegate-reuse) and [Installation](../installation.md#additional-delegate-variants).

## Edge Cases & Limitations

- Reviews are optional and never start automatically, but an invoked review's blocking result is mandatory for progression until remediated or explicitly rejected with rationale.
- Findings must be evidence-backed and relevant to correctness, security, acceptance, or the reviewed objective; speculative gold-plating is out of scope.
- Auditing existing planned work for authorization and present necessity is scope discipline, not adversarial review. Reduction removes, merges, or simplifies work rather than replacing it with new abstractions or infrastructure.
- Retriever output is supporting evidence, not a verdict; the reviewer verifies material claims and reports when a retrieval route was not useful.
- `update-plan` owns conversation-held plan-review remediation; `review-fix` owns explicitly instructed, evidence-backed technical implementation-plan and implementation remediation. Stable labels may replace IDs when none exist, and no approval token is required; both routes are bounded to one pass.
- The original review artifact is immutable during remediation so its evidence and verdict remain auditable.
- Correct and sufficient retained review/diagnosis context routes to that exact source session so secured evidence is not recollected. Faulty, insufficient, or unavailable context, changed objectives, or a requested fresh perspective require a fresh appropriately routed session with the finding source only as a hint; it must not claim inherited context.
- Targeted remediation tests never replace a supplied broad/full final command; broad failure returns to targeted diagnosis before that final gate is rerun.
- A completed-package Implementer may be resumed after its digest only for accepted defects of that same package; the exception cannot start another phase/package or become indefinite continuation.
- A remediation digest reports outcomes, affected findings, edits, verification, and next action. It is not an independent re-review; materially new risk is escalated and the Primary explicitly decides whether another quality gate is warranted.

## Related Features

- [Gated Work-Package Execution](gated-work-package-execution.md)
- [Persistent Planning Lifecycle](persistent-planning-lifecycle.md)
