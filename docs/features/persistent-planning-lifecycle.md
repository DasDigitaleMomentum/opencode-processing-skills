---
type: documentation
entity: feature
feature: "persistent-planning-lifecycle"
version: 1.4
---

# Feature: Persistent Planning Lifecycle

> Part of [OpenCode Processing Skills](../overview.md)

## Summary

When work is multi-phase, multi-session, explicitly requested as a plan, or needs durable coordination/tracking, planning conversations become a durable hierarchy of plan, phase, implementation-plan, todo, review, and handover files. A later session can reconstruct current scope and progress from those artifacts without relying on previous chat context.

## How It Works

The primary maintainer first decides whether persistence is proportional to the work. When it is, the maintainer owns intent and designs the smallest sufficient phase set because those decisions arise in conversation. Plan and implementation-plan authors each perform one deletion pass before handoff, while template-governed workflows preserve two-way traceability from confirmed obligations to owners and from planned work back to authorization and present necessity. A bounded self-contained package can instead use an inline `execute-work-package` brief without creating `plans/` artifacts.

### User Flow

1. The user and maintainer determine whether work needs multi-phase/multi-session coordination, durable tracking, or an explicitly requested plan.
2. `create-plan` proposes the confirmed scope and fewest necessary phases, performs one author-owned deletion/merge pass, and obtains user confirmation before writing the plan, phase, and todo artifacts. The plan table records only each phase's contribution and why it needs a separate boundary; phase docs define what and why without repeating authorization. It creates `implementation/`, `reviews/`, and `handovers/` only when their workflows first need them.
3. Before execution, `author-and-verify-implementation-plan` records the smallest sufficient technical approach for each phase in a fresh Delegate session and performs one author-owned deletion pass. Each step uses `What`, `Where`, `Authorized By`, `Why`, and `Considerations`; testing has one primary verify command plus optional checks, and `Reality Check` appears only for material exceptions. Later delegates read prior artifacts to preserve necessary cross-phase continuity without future-proofing.
4. If an optional plan or implementation-plan review is invoked, its gate becomes binding: `Reduction Required: Yes` or unresolved Critical/Major findings stop progression until the primary remediates or explicitly rejects them with rationale. Reviews inspect for gaps and unnecessary work but persist only evidence-backed exceptions.
5. `update-plan` records completed work and evidence-backed phase transitions. It also performs one primary-owned remediation pass for accepted plan-review reductions; accepted implementation-plan reductions use one `review-fix` pass. Each returns a reduction digest and stops without automatic re-review.
6. `generate-handover` captures current state and decisions when work will continue in another session; `resume-plan` later rebuilds the ordered context and checks prerequisites.

### Technical Flow

1. `create-plan` is selected only for work that warrants persistence. It derives the fewest necessary phases, performs exactly one deletion pass, and gates all artifact writes on confirmation (`skills/create-plan/SKILL.md:76`, `skills/create-plan/SKILL.md:106`). Empty downstream directories are created only by the workflow that needs them (`skills/create-plan/SKILL.md:153`, `skills/create-plan/SKILL.md:167`).
2. `author-and-verify-implementation-plan` uses a canonical delegate to design the smallest sufficient technical change, trace each step in both directions, and perform one author-owned minimality pass before returning (`skills/author-and-verify-implementation-plan/SKILL.md:81`, `skills/author-and-verify-implementation-plan/SKILL.md:127`).
3. `review-plan` and `review-implementation-plan` inspect forward coverage and reverse authorization/necessity while persisting only evidence-backed exceptions. Their compact digests carry verdict, reduction flag, severity counts, top actionable findings, and next action (`skills/review-plan/SKILL.md:93`, `skills/review-implementation-plan/SKILL.md:98`). A requested review binds progression until blocking findings are resolved or explicitly rejected (`skills/review-plan/SKILL.md:139`, `skills/review-implementation-plan/SKILL.md:153`).
4. `update-plan` identifies the authoritative plan, applies status and changelog updates, validates phase transitions, and performs one bounded primary-owned pass for accepted plan-review findings (`skills/update-plan/SKILL.md:83`). Implementation-plan findings instead use one bounded `review-fix` pass with changed/directly affected checks (`skills/review-fix/SKILL.md:44`, `skills/review-fix/SKILL.md:69`). Neither path automatically re-reviews.
5. `generate-handover` gathers session evidence, writes the handover, and synchronizes the todo when a plan exists (`skills/generate-handover/SKILL.md:41`, `skills/generate-handover/SKILL.md:90`).
6. `resume-plan` reads the plan hub in its defined order, loads only required context, validates prerequisites, and presents an implementation briefing (`skills/resume-plan/SKILL.md:45`, `skills/resume-plan/SKILL.md:56`, `skills/resume-plan/SKILL.md:85`).

## Implementation

| Module | Symbols | Role |
|--------|---------|------|
| [Workflow Skills](../modules/workflow-skills.md) | `create-plan` Phase Design and Confirmation (`skills/create-plan/SKILL.md:76`, `skills/create-plan/SKILL.md:106`), `plan` (`skills/create-plan/tpl-plan.md:3`), `phase` (`skills/create-plan/tpl-phase.md:3`), `todo` (`skills/create-plan/tpl-todo.md:3`) | Confirms and writes the smallest sufficient persistent hierarchy, without empty downstream scaffolding. |
| [Workflow Skills](../modules/workflow-skills.md) | `author-and-verify-implementation-plan` Authoring and Rules (`skills/author-and-verify-implementation-plan/SKILL.md:81`, `skills/author-and-verify-implementation-plan/SKILL.md:127`) | Adds necessary technical steps sequentially with two-way traceability and one author-owned deletion pass. |
| [Workflow Skills](../modules/workflow-skills.md) | `review-plan` Output Contract (`skills/review-plan/SKILL.md:112`), `review-implementation-plan` Output Contract (`skills/review-implementation-plan/SKILL.md:119`) | Persists evidence-backed exceptions and makes an invoked reduction/findings gate binding for progression. |
| [Workflow Skills](../modules/workflow-skills.md) | `update-plan` Review Remediation (`skills/update-plan/SKILL.md:83`), `review-fix` Protocol (`skills/review-fix/SKILL.md:44`), `resume-plan` Workflow (`skills/resume-plan/SKILL.md:45`) | Applies one bounded reduction pass, maintains progress, and reconstructs sessions without automatic re-review loops. |
| [Agent Personas](../modules/agent-personas.md) | `maintainer` Persistent Plan-to-Implementation Lifecycle (`agents/maintainer.md:130`) | Selects persistent versus inline execution, then owns user-facing decisions, phase sequence, and durable tracking. |
| [Agent Personas](../modules/agent-personas.md) | `delegate` How You Work (`agents/delegate.md:50`), `doc-explorer` Core Responsibilities (`agents/doc-explorer.md:32`) | Grounds implementation plans in code and writes planning artifacts only when a governing skill assigns them. |

## Configuration

Planning uses no runtime feature flags. Artifact locations and frontmatter are controlled by the bundled templates and the target-project convention in [Architecture rationale](../../AGENTS.md#target-project-file-convention). Model selection for the involved agents is an installer concern documented in [Installation](../installation.md#model-configuration).

## Edge Cases & Limitations

- A phase specifies what and why; its implementation plan specifies how. Technical changes should not silently rewrite agreed scope.
- Authors must keep planned work traceable to confirmed scope or a concrete existing invariant, while reviews persist only evidence-backed exceptions rather than formal clean-item traceability certification.
- Plans are conversation-anchored, so missing product decisions must return to the user instead of being inferred by a subagent.
- Significance or non-triviality alone does not require persistence. A bounded inline brief must still state task, DoD, constraints, and approved broad/full final verification.
- Confirmation precedes plan writes; `implementation/`, `reviews/`, and `handovers/` are not pre-created as empty scaffolding.
- Phase transitions require acceptance and verification evidence; status must not advance merely because code was written.
- Optional review remains opt-in, but after invocation required reduction and Critical/Major findings must be decided before progression. A remediation digest closes one pass; it is not permission for an automatic re-review.
- Automatic parallel reviewer-per-phase and nested phase-oriented retriever fan-out are not defaults. Reviewer separation is exceptional: explicit independent perspectives, unrelated domains, specialist needs, or impractical combined context.
- `resume-plan` can reconstruct only what prior sessions persisted; undocumented chat-only decisions remain unavailable.
- Standalone handovers are supported when no plan exists, but they live under `docs/handovers/` rather than a plan directory.

## Related Features

- [Gated Work-Package Execution](gated-work-package-execution.md)
- [Independent Review and Remediation](independent-review-and-remediation.md)
- [Documentation Lifecycle](documentation-lifecycle.md)
