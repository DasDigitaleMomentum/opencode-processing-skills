---
type: documentation
entity: feature
feature: "persistent-planning-lifecycle"
version: 1.0
---

# Feature: Persistent Planning Lifecycle

> Part of [OpenCode Processing Skills](../overview.md)

## Summary

Planning conversations become a durable hierarchy of plan, phase, implementation-plan, todo, review, and handover files. A later session can reconstruct current scope and progress from those artifacts without relying on the previous chat context.

## How It Works

The primary maintainer owns intent and phase design because those decisions arise in conversation. Template-governed workflows then persist the agreed scope, ground per-phase implementation plans against the codebase, update progress after work, and capture a handover whenever context needs to move between sessions.

### User Flow

1. The user and maintainer clarify the objective, requirements, Definition of Done, test strategy, and phase boundaries.
2. `create-plan` writes the plan hub, phase files, todo, and required directories.
3. Before a phase executes, `author-and-verify-implementation-plan` records the technical approach and verifies referenced files and symbols against the current codebase.
4. `update-plan` records completed work, changes item status, and performs evidence-backed phase transitions.
5. `generate-handover` captures current state and decisions when work will continue in another session; `resume-plan` later rebuilds the ordered context and checks prerequisites.

### Technical Flow

1. `create-plan` keeps requirement negotiation in the primary, optionally delegates bounded codebase analysis, and writes the plan/phase/todo hierarchy (`skills/create-plan/SKILL.md:50`).
2. `author-and-verify-implementation-plan` uses a canonical delegate to create an explicit per-phase technical artifact grounded in current sources (`skills/author-and-verify-implementation-plan/SKILL.md:66`).
3. `update-plan` identifies the authoritative plan, applies status and changelog updates, and validates phase-transition conditions (`skills/update-plan/SKILL.md:45`, `skills/update-plan/SKILL.md:124`).
4. `generate-handover` gathers session evidence, writes the handover, and synchronizes the todo when a plan exists (`skills/generate-handover/SKILL.md:41`, `skills/generate-handover/SKILL.md:90`).
5. `resume-plan` reads the plan hub in its defined order, loads only required context, validates prerequisites, and presents an implementation briefing (`skills/resume-plan/SKILL.md:45`, `skills/resume-plan/SKILL.md:56`, `skills/resume-plan/SKILL.md:85`).

## Implementation

| Module | Symbols | Role |
|--------|---------|------|
| [Workflow Skills](../modules/workflow-skills.md) | `create-plan` Workflow (`skills/create-plan/SKILL.md:50`), `plan` (`skills/create-plan/tpl-plan.md:3`), `phase` (`skills/create-plan/tpl-phase.md:3`), `todo` (`skills/create-plan/tpl-todo.md:3`) | Converts negotiated intent into the persistent plan hierarchy. |
| [Workflow Skills](../modules/workflow-skills.md) | `author-and-verify-implementation-plan` Workflow (`skills/author-and-verify-implementation-plan/SKILL.md:66`) | Adds the per-phase technical approach and verifies code references. |
| [Workflow Skills](../modules/workflow-skills.md) | `update-plan` Phase Transition (`skills/update-plan/SKILL.md:124`), `resume-plan` Workflow (`skills/resume-plan/SKILL.md:45`), `generate-handover` Workflow (`skills/generate-handover/SKILL.md:41`) | Maintains progress, reconstructs sessions, and transfers context. |
| [Agent Personas](../modules/agent-personas.md) | `maintainer` Plan-to-Implementation Lifecycle (`agents/maintainer.md:122`) | Owns user-facing decisions, routing, phase sequence, and persistent work tracking. |
| [Agent Personas](../modules/agent-personas.md) | `delegate` How You Work (`agents/delegate.md:42`), `doc-explorer` Core Responsibilities (`agents/doc-explorer.md:25`) | Grounds implementation plans in code and writes planning artifacts only when a governing skill assigns them. |

## Configuration

Planning uses no runtime feature flags. Artifact locations and frontmatter are controlled by the bundled templates and the target-project convention in [Architecture rationale](../../AGENTS.md#target-project-file-convention). Model selection for the involved agents is an installer concern documented in [Installation](../installation.md#model-configuration).

## Edge Cases & Limitations

- A phase specifies what and why; its implementation plan specifies how. Technical changes should not silently rewrite agreed scope.
- Plans are conversation-anchored, so missing product decisions must return to the user instead of being inferred by a subagent.
- Phase transitions require acceptance and verification evidence; status must not advance merely because code was written.
- `resume-plan` can reconstruct only what prior sessions persisted; undocumented chat-only decisions remain unavailable.
- Standalone handovers are supported when no plan exists, but they live under `docs/handovers/` rather than a plan directory.

## Related Features

- [Gated Work-Package Execution](gated-work-package-execution.md)
- [Independent Review and Remediation](independent-review-and-remediation.md)
- [Documentation Lifecycle](documentation-lifecycle.md)
