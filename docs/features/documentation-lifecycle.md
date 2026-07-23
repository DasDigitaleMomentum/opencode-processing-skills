---
type: documentation
entity: feature
feature: "documentation-lifecycle"
version: 1.0
---

# Feature: Documentation Lifecycle

> Part of [OpenCode Processing Skills](../overview.md)

## Summary

The documentation workflows turn an existing codebase into a navigable project overview, exhaustive module inventories, and implementation-linked feature guides, then provide a separate refresh path that updates only documentation affected by later code changes.

## How It Works

Initial generation is codebase-anchored and owned by `doc-explorer`; larger repositories are partitioned into module-scoped child sessions so each inventory remains focused. Later refreshes begin from the existing docs, map source changes back to documented modules/features, and preserve stable material instead of regenerating the whole set.

### User Flow

1. The user asks to document an existing project or to refresh documentation after code changes.
2. The maintainer loads `generate-docs` for an undocumented project or `update-docs` for an established structured set.
3. `doc-explorer` writes the template-governed files under `docs/`, self-delegating module inventories when the repository is large.
4. The user receives only the changed paths and any evidence gaps; the durable detail remains in the files.

### Technical Flow

1. `generate-docs` assesses the codebase, identifies responsibility boundaries, and selects overview, module, and feature artifacts (`skills/generate-docs/SKILL.md:48`).
2. Its Self-Delegation rule partitions projects with multiple or large modules into scoped `doc-explorer` sessions (`skills/generate-docs/SKILL.md:38`, `agents/doc-explorer.md:52`).
3. Each writer follows the bundled project, module, or feature template and persists output under `docs/` (`skills/generate-docs/SKILL.md:70`, `skills/generate-docs/SKILL.md:80`, `skills/generate-docs/SKILL.md:91`).
4. `update-docs` later identifies source changes, maps them to existing documentation, applies targeted updates, and validates cross-references (`skills/update-docs/SKILL.md:51`, `skills/update-docs/SKILL.md:67`, `skills/update-docs/SKILL.md:87`, `skills/update-docs/SKILL.md:110`).

## Implementation

| Module | Symbols | Role |
|--------|---------|------|
| [Workflow Skills](../modules/workflow-skills.md) | `generate-docs` Workflow (`skills/generate-docs/SKILL.md:48`), `project-overview` (`skills/generate-docs/tpl-project-overview.md:3`), `module` (`skills/generate-docs/tpl-module-documentation.md:3`), `feature` (`skills/generate-docs/tpl-feature-documentation.md:3`) | Defines initial discovery, artifact contracts, required inventories, and verification. |
| [Workflow Skills](../modules/workflow-skills.md) | `update-docs` Workflow (`skills/update-docs/SKILL.md:49`), `project-overview` (`skills/update-docs/tpl-project-overview.md:3`), `module` (`skills/update-docs/tpl-module-documentation.md:3`), `feature` (`skills/update-docs/tpl-feature-documentation.md:3`) | Maps code changes to the existing documentation and refreshes only affected content. |
| [Agent Personas](../modules/agent-personas.md) | `doc-explorer` Core Responsibilities (`agents/doc-explorer.md:25`), Self-Delegation (`agents/doc-explorer.md:52`) | Owns docs-focused exploration, file writes, scaling, and compact reporting. |
| [Agent Personas](../modules/agent-personas.md) | `maintainer` agent routing (`agents/maintainer.md:107`) | Selects the workflow and delegates the codebase-anchored writing task. |

## Configuration

The output schema is configured by the bundled templates rather than environment variables. Target projects use the `docs/overview.md`, `docs/modules/*.md`, and `docs/features/*.md` convention defined in [Architecture rationale](../../AGENTS.md#target-project-file-convention); installed `doc-explorer` model settings come from the [installer configuration](../installation.md#model-configuration).

## Edge Cases & Limitations

- Initial generation and refresh are distinct workflows: `generate-docs` must not overwrite an established structured set, while `update-docs` depends on existing artifacts.
- Symbol inventories are best-effort when language tooling is unavailable, but file and directory inventories must still be explicit and explained.
- Feature documentation records discoverable behavior and must state genuine unknowns; it must not invent runtime guarantees.
- Existing maintained documentation should be linked as a source instead of duplicated into generated files.
- Self-delegated writers need disjoint file ownership so concurrent module writes do not conflict.

## Related Features

- [Persistent Planning Lifecycle](persistent-planning-lifecycle.md)
- [Multi-Target Installation](multi-target-installation.md)
