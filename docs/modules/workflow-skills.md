---
type: documentation
entity: module
module: "workflow-skills"
version: 1.2
---

# Module: Workflow Skills

> Part of [OpenCode Processing Skills](../overview.md)

## Overview

The `skills/` tree is the reusable workflow library. Each package combines a discoverable `SKILL.md` contract with any templates needed to create persistent documentation, planning, review, handover, or execution artifacts. The skills define triggers, role routing, write boundaries, ordered workflows, and output contracts; the [Skills Reference](../skills.md) is the concise user-facing guide to invoking them.

### Responsibility

This module owns workflow semantics and their canonical Markdown artifact shapes. It covers initial documentation, proportional persistent planning, gated inline or plan-bound execution, independent reviews, context-value-based remediation routing, and legacy-document archiving. It does not define agent personas, select models, install files into a harness, or own a target project's generated `docs/` and `plans/`; those responsibilities belong to the agent definitions, installer/configuration surface, and the target repository respectively. Agent-role behavior and routing are described in the [Agents Reference](../agents.md).

### Dependencies

| Dependency | Type | Purpose |
|-----------|------|---------|
| Agent definitions under `agents/` | module | Supply the maintainer, delegate, doc-explorer, implementer, and legacy-curator personas to which skill routing refers. |
| Installer and configuration | module | Copies each self-contained skill directory into enabled harness skill paths; see the [Installation Guide](../installation.md). |
| OpenCode-compatible skill loader | external | Discovers `SKILL.md` frontmatter and loads a matching workflow into the active agent session. |
| Agent delegation and question tools | external | Support the skills that require fresh reviewers, stateful subagent continuation, self-delegation, or explicit user gates. |
| Git and filesystem tools | external | Provide repository discovery, diff/status evidence, git-aware archival moves, artifact writes, and verification commands. |
| Target-project `docs/` and `plans/` | external | Persist the documentation, planning, review, todo, implementation-plan, and handover artifacts produced or consumed by these workflows. |

## Structure

| Path | Type | Purpose |
|------|------|---------|
| `skills/` | dir | Root of the installable, self-contained workflow-skill library. |
| `skills/archive-legacy-docs/` | dir | Legacy-document normalization package. |
| `skills/archive-legacy-docs/SKILL.md` | file | Defines discovery, flat archive mapping, git-aware moves, and summary generation for legacy documentation. |
| `skills/archive-legacy-docs/tpl-archive-legacy-docs-prompt.md` | file | Delegation prompt that scopes a legacy-curator archive run. |
| `skills/archive-legacy-docs/tpl-legacy-summary.md` | file | Canonical inventory format for `docs-legacy/summary.md`. |
| `skills/author-and-verify-implementation-plan/` | dir | Grounded per-phase implementation-plan authoring package. |
| `skills/author-and-verify-implementation-plan/SKILL.md` | file | Defines the author-and-verify pass that checks gated phase intent against current code and documentation inventories. |
| `skills/author-and-verify-implementation-plan/tpl-author-and-verify-implementation-plan-prompt.md` | file | Delegation prompt with the exact implementation-plan write boundary and required references. |
| `skills/author-and-verify-implementation-plan/tpl-implementation-plan.md` | file | Canonical implementation-plan artifact with concrete steps, tests, integrity constraints, and reality checks. |
| `skills/create-plan/` | dir | Conversation-anchored plan creation package. |
| `skills/create-plan/SKILL.md` | file | Defines proportional selection for durable planning, requirement discovery, phase design, plan/todo creation, confirmation, and the two-pass implementation-plan boundary. |
| `skills/create-plan/tpl-phase.md` | file | Canonical phase artifact for what/why scope, prerequisites, deliverables, and acceptance criteria. |
| `skills/create-plan/tpl-plan.md` | file | Canonical high-level plan artifact for objective, requirements, scope, DoD, phases, risks, and changelog. |
| `skills/create-plan/tpl-todo.md` | file | Canonical persistent todo artifact with phase context, status buckets, and changelog. |
| `skills/delegate-analysis/` | dir | Read/analyze/verify package for routine delegated investigation. |
| `skills/delegate-analysis/SKILL.md` | file | Defines four analysis modes, chooses retrieval by expected output size/relevance, and keeps open-ended web research with the delegate. |
| `skills/execute-work-package/` | dir | Stateful, gated implementation-execution package. |
| `skills/execute-work-package/SKILL.md` | file | Defines plan-bound or inline authority, mandatory same-session gating, retriever isolation for broad evidence, and staged verification invariants. |
| `skills/execute-work-package/tpl-execution-blueprint.md` | file | Canonical concrete step-list contract with plan references or an inline gated brief, returned before execution. |
| `skills/execute-work-package/tpl-execution-digest.md` | file | Canonical compact outcome, edit, verification, and next-step digest. |
| `skills/execute-work-package/tpl-implementer-execute-prompt.md` | file | Same-session resume prompt that locks EXECUTE to approved steps and targeted-then-broad verification. |
| `skills/execute-work-package/tpl-implementer-preflight-prompt.md` | file | Initial read-only BLUEPRINT prompt accepting persistent plan references or a complete inline gated brief. |
| `skills/generate-docs/` | dir | Initial project-documentation generation package. |
| `skills/generate-docs/SKILL.md` | file | Defines project assessment, module discovery, exhaustive inventories, feature documentation, self-delegation, and link verification. |
| `skills/generate-docs/tpl-feature-documentation.md` | file | Canonical feature document for user/technical flows, implementation references, configuration, and limitations. |
| `skills/generate-docs/tpl-module-documentation.md` | file | Canonical module document for responsibility, dependencies, structure, symbols, data flow, configuration, and coverage. |
| `skills/generate-docs/tpl-project-overview.md` | file | Canonical project overview for purpose, architecture, module/feature maps, development, and references. |
| `skills/generate-handover/` | dir | Session-continuity handover package. |
| `skills/generate-handover/SKILL.md` | file | Defines plan-bound and standalone handover creation from actual progress, decisions, file state, blockers, and next steps. |
| `skills/generate-handover/tpl-session-handover.md` | file | Canonical session handover artifact for progress, decisions, implementation state, blockers, and continuation context. |
| `skills/resume-plan/` | dir | Read-only multi-session plan bootstrap package. |
| `skills/resume-plan/SKILL.md` | file | Defines ordered plan/todo/handover/phase/implementation-plan loading, prerequisite validation, and session briefing. |
| `skills/review-fix/` | dir | Accepted-finding remediation package with context-value-based session routing. |
| `skills/review-fix/SKILL.md` | file | Defines remediation that reuses reviewer reasoning when valuable, permits fresh lean work when self-contained, preserves the review record, and stages verification. |
| `skills/review-fix/tpl-review-fix-prompt.md` | file | Remediation prompt carrying accepted finding IDs, routing guidance, scope, and targeted/final verification expectations. |
| `skills/review-implementation-plan/` | dir | Independent implementation-plan review package. |
| `skills/review-implementation-plan/SKILL.md` | file | Defines single-phase and dependency-ordered batch review, default one-session evidence reuse, proportional partitioning, per-phase artifacts, and integrated consistency assessment. |
| `skills/review-implementation-plan/tpl-impl-plan-review.md` | file | Canonical severity-rated per-phase review artifact with optional batch metadata and one batch-wide consistency section. |
| `skills/review-implementation-plan/tpl-review-impl-plan-prompt.md` | file | Delegation prompt for single or batch review, evidence-oriented retriever use, aggregate return, and exceptional contiguous partitioning. |
| `skills/review-implementation/` | dir | Independent completed-implementation review package. |
| `skills/review-implementation/SKILL.md` | file | Defines implementation review against acceptance criteria, code changes, verification, real-world testing, integrity, and regression risk. |
| `skills/review-implementation/tpl-impl-review.md` | file | Canonical severity-rated implementation review artifact with evidence and test-integrity sections. |
| `skills/review-implementation/tpl-review-impl-prompt.md` | file | Delegation prompt for inspecting changes and optionally collecting bounded evidence while the reviewer owns findings and verdict. |
| `skills/review-plan/` | dir | Independent high-level plan review package. |
| `skills/review-plan/SKILL.md` | file | Defines fresh review of requirement coverage, scope, DoD, phases, testing, and plan completeness. |
| `skills/review-plan/tpl-plan-review.md` | file | Canonical severity-rated plan review artifact. |
| `skills/review-plan/tpl-review-plan-prompt.md` | file | Delegation prompt that defines authoritative plan scope and optional bounded retrieval under reviewer ownership. |
| `skills/update-docs/` | dir | Incremental project-documentation maintenance package. |
| `skills/update-docs/SKILL.md` | file | Defines mapping code changes to affected module, feature, and overview documents while preserving manual additions. |
| `skills/update-docs/tpl-feature-documentation.md` | file | Expected feature-document shape that incremental updates must preserve. |
| `skills/update-docs/tpl-module-documentation.md` | file | Expected module-document shape that incremental updates must preserve. |
| `skills/update-docs/tpl-project-overview.md` | file | Expected project-overview shape that incremental updates must preserve. |
| `skills/update-plan/` | dir | Persistent plan-state maintenance package. |
| `skills/update-plan/SKILL.md` | file | Defines atomic todo, phase, plan, implementation-plan, transition, and changelog updates grounded in verified progress. |
| `skills/update-plan/tpl-implementation-plan.md` | file | Expected implementation-plan shape for approach revisions and reality-check maintenance. |
| `skills/update-plan/tpl-phase.md` | file | Expected phase-document shape for explicit status and acceptance updates. |
| `skills/update-plan/tpl-plan.md` | file | Expected plan-document shape for status, scope, phase-table, risk, and changelog updates. |
| `skills/update-plan/tpl-todo.md` | file | Expected todo-document shape for status movement, phase context, and append-only history. |

## Key Symbols

| Symbol | Kind | Visibility | Location | Purpose |
|--------|------|------------|----------|---------|
| `archive-legacy-docs` | workflow | public | `skills/archive-legacy-docs/SKILL.md:2` | Skill entry point for collecting scattered legacy docs into a git-aware flat archive. |
| `delegation-prompt` (`archive-legacy-docs`) | template | public | `skills/archive-legacy-docs/tpl-archive-legacy-docs-prompt.md:3` | Contract for delegating archive policy and output to legacy-curator. |
| `docs-archive-summary` | template | public | `skills/archive-legacy-docs/tpl-legacy-summary.md:3` | Contract for the forensic archive inventory and per-file summaries. |
| `author-and-verify-implementation-plan` | workflow | public | `skills/author-and-verify-implementation-plan/SKILL.md:2` | Skill entry point for producing a code-grounded implementation plan without changing gated phase intent. |
| `delegation-prompt` (`author-and-verify-implementation-plan`) | template | public | `skills/author-and-verify-implementation-plan/tpl-author-and-verify-implementation-plan-prompt.md:3` | Contract for the delegate's references, exclusive write target, and compact return. |
| `implementation-plan` (`author-and-verify`) | template | public | `skills/author-and-verify-implementation-plan/tpl-implementation-plan.md:3` | Canonical phase implementation-plan schema including Required Context, Testing Plan, and Reality Check. |
| `create-plan` | workflow | public | `skills/create-plan/SKILL.md:2` | Skill entry point for creating durable plan artifacts only when work warrants persistent coordination/tracking or an explicit plan. |
| `phase` (`create-plan`) | template | public | `skills/create-plan/tpl-phase.md:3` | Canonical what/why phase schema. |
| `plan` (`create-plan`) | template | public | `skills/create-plan/tpl-plan.md:3` | Canonical project-change plan schema. |
| `todo` (`create-plan`) | template | public | `skills/create-plan/tpl-todo.md:3` | Canonical persistent task-state and changelog schema. |
| `delegate-analysis` | workflow | public | `skills/delegate-analysis/SKILL.md:2` | Skill entry point for scoped investigation in four explicit analysis modes. |
| `execute-work-package` | workflow | public | `skills/execute-work-package/SKILL.md:2` | Skill entry point for plan-bound or inline gated implementation with mandatory gate-session reuse and staged verification. |
| `blueprint` | template | public | `skills/execute-work-package/tpl-execution-blueprint.md:3` | Canonical pre-execution step-list schema supporting plan references or an inline brief. |
| `digest` | template | public | `skills/execute-work-package/tpl-execution-digest.md:3` | Canonical compact execution-result schema. |
| `subagent-execute-prompt` | template | public | `skills/execute-work-package/tpl-implementer-execute-prompt.md:3` | Approved-step continuation contract that stages targeted tests before the broad/full final gate. |
| `subagent-preflight-prompt` | template | public | `skills/execute-work-package/tpl-implementer-preflight-prompt.md:3` | No-write BLUEPRINT contract with persistent-plan or inline-brief authority. |
| `generate-docs` | workflow | public | `skills/generate-docs/SKILL.md:2` | Skill entry point for initial project, module, and feature documentation. |
| `feature` (`generate-docs`) | template | public | `skills/generate-docs/tpl-feature-documentation.md:3` | Canonical feature-document schema. |
| `module` (`generate-docs`) | template | public | `skills/generate-docs/tpl-module-documentation.md:3` | Canonical module-document schema used by this document. |
| `project-overview` (`generate-docs`) | template | public | `skills/generate-docs/tpl-project-overview.md:3` | Canonical project-overview schema. |
| `generate-handover` | workflow | public | `skills/generate-handover/SKILL.md:2` | Skill entry point for on-demand plan-bound or standalone session handovers. |
| `session-handover` | template | public | `skills/generate-handover/tpl-session-handover.md:3` | Canonical handover schema for session state and continuation context. |
| `resume-plan` | workflow | public | `skills/resume-plan/SKILL.md:2` | Skill entry point for read-only, ordered session bootstrap from persisted plan artifacts. |
| `review-fix` | workflow | public | `skills/review-fix/SKILL.md:2` | Skill entry point for accepted-finding remediation, reusing reviewer context only when its reasoning is materially useful. |
| `continuation-prompt` | template | public | `skills/review-fix/tpl-review-fix-prompt.md:3` | Canonical remediation prompt with context-value routing and staged verification. |
| `review-implementation-plan` | workflow | public | `skills/review-implementation-plan/SKILL.md:2` | Skill entry point for independent single-phase or ordered batch review against current code. |
| `implementation-plan-review` | template | public | `skills/review-implementation-plan/tpl-impl-plan-review.md:3` | Canonical per-phase schema with severity-rated findings, batch metadata, and an optional integrated consistency section used exactly once per batch. |
| `delegation-prompt` (`review-implementation-plan`) | template | public | `skills/review-implementation-plan/tpl-review-impl-plan-prompt.md:3` | Contract for one fresh batch reviewer by default, consolidated evidence retrieval, per-phase outputs, and one aggregate digest. |
| `review-implementation` | workflow | public | `skills/review-implementation/SKILL.md:2` | Skill entry point for independent completed-implementation review. |
| `implementation-review` | template | public | `skills/review-implementation/tpl-impl-review.md:3` | Canonical implementation review schema with evidence, verification, and regression analysis. |
| `delegation-prompt` (`review-implementation`) | template | public | `skills/review-implementation/tpl-review-impl-prompt.md:3` | Contract for reviewing actual changes and writing the implementation review artifact. |
| `review-plan` | workflow | public | `skills/review-plan/SKILL.md:2` | Skill entry point for independent plan-quality review. |
| `plan-review` | template | public | `skills/review-plan/tpl-plan-review.md:3` | Canonical plan review schema with coverage, scope, phase, testing, and findings sections. |
| `delegation-prompt` (`review-plan`) | template | public | `skills/review-plan/tpl-review-plan-prompt.md:3` | Contract for cold plan review and its compact status return. |
| `update-docs` | workflow | public | `skills/update-docs/SKILL.md:2` | Skill entry point for incremental documentation synchronization after code changes. |
| `feature` (`update-docs`) | template | public | `skills/update-docs/tpl-feature-documentation.md:3` | Feature-document contract whose manual additions and headings must survive updates. |
| `module` (`update-docs`) | template | public | `skills/update-docs/tpl-module-documentation.md:3` | Module-document contract whose inventories and manual additions must survive updates. |
| `project-overview` (`update-docs`) | template | public | `skills/update-docs/tpl-project-overview.md:3` | Project-overview contract whose module, feature, architecture, and development sections are maintained. |
| `update-plan` | workflow | public | `skills/update-plan/SKILL.md:2` | Skill entry point for keeping plan artifacts synchronized with verified progress. |
| `implementation-plan` (`update-plan`) | template | public | `skills/update-plan/tpl-implementation-plan.md:3` | Expected implementation-plan schema for recorded technical deviations and reality checks. |
| `phase` (`update-plan`) | template | public | `skills/update-plan/tpl-phase.md:3` | Expected phase schema for status and acceptance updates. |
| `plan` (`update-plan`) | template | public | `skills/update-plan/tpl-plan.md:3` | Expected plan schema for phase-table, status, scope, risk, and changelog maintenance. |
| `todo` (`update-plan`) | template | public | `skills/update-plan/tpl-todo.md:3` | Expected todo schema for phase context and status transitions. |

## Data Flow

1. A user request matches a skill's `name` and `description` frontmatter, causing the harness or maintainer to load that package's `SKILL.md`.
2. The skill identifies the owning role, required inputs, read/write boundary, ordered workflow, and output contract. Where a delegate is involved, the primary fills the package's prompt template with paths and decisions rather than copying source content into chat.
3. The owning agent reads authoritative scope and decisive evidence directly, while delegates/reviewers and implementers send separable evidence collection to `retriever` by default. In implementation-plan batch review, retrieval is evidence-oriented: overlapping evidence is consolidated rather than fanned out recursively by phase. Delegates use `doc-explorer` only for documentation/module child tasks. The parent retains judgment, artifact, and execution ownership.
4. Review workflows persist independent findings. Multiple implementation plans normally use one reviewer session fresh from authoring, sequential dependency-order review, existing per-phase artifacts, one integrated consistency assessment, and one aggregate digest. Oversized batches use contiguous dependency/domain partitions and a central interface-only check; separate reviewers otherwise require an explicit perspective, unrelated domain, specialist need, or impractical combined context.
5. `review-fix` feeds accepted findings back to the reviewer only when retained reasoning is worth the context cost; fully specified fixes or checks prefer fresh lean work. Remediation uses targeted iterative checks before any supplied broad/full final gate and never changes the immutable review artifact.
6. Work that warrants durable coordination uses plan maintenance, handovers, and later `resume-plan` restoration; a bounded package may instead execute from an inline gated brief. The installer distributes the same self-contained skill packages to each enabled harness, while harness-specific agent/tool semantics remain outside this module.

## Configuration

Every `SKILL.md` exposes YAML frontmatter for at least `name`, `description`, `license`, `compatibility`, and `metadata`; the values determine discovery, documented compatibility, category, and lifecycle phase. Bundled templates use their own `type` and `entity` frontmatter plus artifact-specific fields such as `plan`, `phase`, `skill`, `module`, or `feature`. Template variables are supplied by the invoking workflow when an artifact is created.

The skill library has no module-local runtime configuration file or environment variables. Target enablement, destination paths, agent models, and model variants are external installer concerns documented in the [Installation Guide](../installation.md). Some workflows require platform capabilities such as stateful task continuation or a question tool; installation into another harness does not itself translate those semantics.

## Inventory Notes

- **Coverage**: full
- **Notes**: The Structure inventory contains the `skills/` root, all 14 tracked package directories, and all 43 paths returned by `git ls-files skills` on this branch. Key Symbols are best-effort exhaustive for a Markdown package: every tracked file contributes its public skill name or primary template `entity`, with exact 1-based source locations. Markdown subsections and variable fields subordinate to those top-level contracts are intentionally described through the owning file rather than treated as language-level exports.
