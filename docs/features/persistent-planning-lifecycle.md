---
type: documentation
entity: feature
feature: "persistent-planning-lifecycle"
version: 1.2
---

# Feature: Persistent Planning Lifecycle

> Part of [OpenCode Processing Skills](../overview.md)

## Summary

When work is multi-phase, multi-session, explicitly requested as a plan, or needs durable coordination/tracking, planning conversations become a durable hierarchy of plan, phase, implementation-plan, todo, review, and handover files. A later session can reconstruct current scope and progress from those artifacts without relying on previous chat context.

## How It Works

The primary maintainer first decides whether persistence is proportional to the work. When it is, the maintainer owns intent and phase design because those decisions arise in conversation; template-governed workflows persist scope, ground implementation plans, update progress, and capture handovers. A bounded self-contained package can instead use an inline `execute-work-package` brief without creating `plans/` artifacts.

### User Flow

1. The user and maintainer determine whether work needs multi-phase/multi-session coordination, durable tracking, or an explicitly requested plan.
2. When persistence is warranted, `create-plan` writes the plan hub, phase files, todo, and required directories; otherwise the bounded package routes to an inline gated execution brief.
3. Before execution, `author-and-verify-implementation-plan` records each phase's technical approach sequentially, verifies references against the current codebase, and performs author-owned consistency QA across the completed set.
4. When independent implementation-plan review is requested for multiple phases, one fresh reviewer session normally processes the dependency-ordered batch, writes each per-phase review artifact, performs one integrated cross-phase assessment, and returns one aggregate digest.
5. `update-plan` records completed work, changes item status, and performs evidence-backed phase transitions.
6. `generate-handover` captures current state and decisions when work will continue in another session; `resume-plan` later rebuilds the ordered context and checks prerequisites.

### Technical Flow

1. `create-plan` is selected only for work that warrants persistence; it keeps requirement negotiation in the primary, optionally delegates bounded codebase analysis, and writes the plan/phase/todo hierarchy (`skills/create-plan/SKILL.md:27`, `skills/create-plan/SKILL.md:50`).
2. `author-and-verify-implementation-plan` uses a canonical delegate to create explicit per-phase technical artifacts, processes batches sequentially, and retains responsibility for cross-phase consistency before handoff (`skills/author-and-verify-implementation-plan/SKILL.md:66`, `skills/author-and-verify-implementation-plan/SKILL.md:133`).
3. `review-implementation-plan` defaults a multi-plan review to one session fresh from authoring. It reviews in dependency order, consolidates overlapping evidence, preserves per-phase artifacts, and adds one integrated consistency assessment (`skills/review-implementation-plan/SKILL.md:102`, `skills/review-implementation-plan/SKILL.md:144`). Oversized review is partitioned only by contiguous dependency/domain groups, with a central check limited to cross-partition interfaces (`skills/review-implementation-plan/SKILL.md:112`).
4. `update-plan` identifies the authoritative plan, applies status and changelog updates, and validates phase-transition conditions (`skills/update-plan/SKILL.md:45`, `skills/update-plan/SKILL.md:124`).
5. `generate-handover` gathers session evidence, writes the handover, and synchronizes the todo when a plan exists (`skills/generate-handover/SKILL.md:41`, `skills/generate-handover/SKILL.md:90`).
6. `resume-plan` reads the plan hub in its defined order, loads only required context, validates prerequisites, and presents an implementation briefing (`skills/resume-plan/SKILL.md:45`, `skills/resume-plan/SKILL.md:56`, `skills/resume-plan/SKILL.md:85`).

## Implementation

| Module | Symbols | Role |
|--------|---------|------|
| [Workflow Skills](../modules/workflow-skills.md) | `create-plan` Selection (`skills/create-plan/SKILL.md:27`), Workflow (`skills/create-plan/SKILL.md:50`), `plan` (`skills/create-plan/tpl-plan.md:3`), `phase` (`skills/create-plan/tpl-phase.md:3`), `todo` (`skills/create-plan/tpl-todo.md:3`) | Creates the persistent hierarchy only when durable coordination/tracking or an explicit plan is warranted. |
| [Workflow Skills](../modules/workflow-skills.md) | `author-and-verify-implementation-plan` Workflow and Rules (`skills/author-and-verify-implementation-plan/SKILL.md:66`, `skills/author-and-verify-implementation-plan/SKILL.md:133`) | Adds technical approaches sequentially and performs author-owned cross-phase consistency QA. |
| [Workflow Skills](../modules/workflow-skills.md) | `review-implementation-plan` Batch Workflow (`skills/review-implementation-plan/SKILL.md:102`), Rules (`skills/review-implementation-plan/SKILL.md:150`) | Independently validates an ordered batch in one reviewer session by default, preserving per-phase artifacts and producing one aggregate digest and integrated consistency assessment. |
| [Workflow Skills](../modules/workflow-skills.md) | `update-plan` Phase Transition (`skills/update-plan/SKILL.md:124`), `resume-plan` Workflow (`skills/resume-plan/SKILL.md:45`), `generate-handover` Workflow (`skills/generate-handover/SKILL.md:41`) | Maintains progress, reconstructs sessions, and transfers context. |
| [Agent Personas](../modules/agent-personas.md) | `maintainer` Persistent Plan-to-Implementation Lifecycle (`agents/maintainer.md:121`) | Selects persistent versus inline execution, then owns user-facing decisions, phase sequence, and durable tracking. |
| [Agent Personas](../modules/agent-personas.md) | `delegate` How You Work (`agents/delegate.md:42`), `doc-explorer` Core Responsibilities (`agents/doc-explorer.md:25`) | Grounds implementation plans in code and writes planning artifacts only when a governing skill assigns them. |

## Configuration

Planning uses no runtime feature flags. Artifact locations and frontmatter are controlled by the bundled templates and the target-project convention in [Architecture rationale](../../AGENTS.md#target-project-file-convention). Model selection for the involved agents is an installer concern documented in [Installation](../installation.md#model-configuration).

## Edge Cases & Limitations

- A phase specifies what and why; its implementation plan specifies how. Technical changes should not silently rewrite agreed scope.
- Plans are conversation-anchored, so missing product decisions must return to the user instead of being inferred by a subagent.
- Significance or non-triviality alone does not require persistence. A bounded inline brief must still state task, DoD, constraints, and approved broad/full final verification.
- Phase transitions require acceptance and verification evidence; status must not advance merely because code was written.
- Automatic parallel reviewer-per-phase and nested phase-oriented retriever fan-out are not defaults. Reviewer separation is exceptional: explicit independent perspectives, unrelated domains, specialist needs, or impractical combined context.
- `resume-plan` can reconstruct only what prior sessions persisted; undocumented chat-only decisions remain unavailable.
- Standalone handovers are supported when no plan exists, but they live under `docs/handovers/` rather than a plan directory.

## Related Features

- [Gated Work-Package Execution](gated-work-package-execution.md)
- [Independent Review and Remediation](independent-review-and-remediation.md)
- [Documentation Lifecycle](documentation-lifecycle.md)
