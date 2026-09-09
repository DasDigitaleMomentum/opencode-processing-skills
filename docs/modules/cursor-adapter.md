---
type: documentation
entity: module
module: "cursor-adapter"
version: 1.1
---

# Module: Cursor Adapter

> Part of [OpenCode Processing Skills](../overview.md)

## Overview

The `cursor/` module is the static compatibility layer that exposes the repository's file-based planning and execution workflows to Cursor. It supplies one report-first orchestration skill, Task-role mapping, an optional project rule, and an AGENTS bootstrap snippet. It deliberately reuses the canonical workflow skills and [Agent Personas](agent-personas.md) rather than maintaining transformed copies. For user-facing installation paths and activation guidance, see [Installation → Cursor Compatibility](../installation.md#cursor-compatibility).

### Responsibility

This module owns Cursor-specific orchestration vocabulary, Task invocation/resume mapping, installable bootstrap artifacts, and the mapping from semantic framework roles to Cursor subagent types. It does not own canonical subagent behavior (`agents/`), workflow expertise/templates (`skills/`), installer implementation (`install.sh`), or Cursor's model/runtime configuration. The adapter translates orchestration mechanics only; it does not port OpenCode agent pickers or model aliases.

### Dependencies

| Dependency | Type | Purpose |
|-----------|------|---------|
| `agents/` | module | Supplies canonical delegate, doc-explorer, implementer, and legacy-curator bodies that installation converts into Cursor subagent prompts. |
| `skills/` | module | Supplies untransformed workflow skills and templates; the Cursor layer only explains how to map OpenCode task terminology. |
| `install.sh` and target configuration | module | Copy adapter assets, shared workflow skills, and stripped persona bodies into global or project Cursor locations. |
| Cursor Task runtime | external | Provides `Task`, `subagent_type`, and `resume`, which implement delegation and stateful gated execution. |
| Cursor rules and skills discovery | external | Loads `.mdc` project rules and `SKILL.md` orchestration entrypoints. |
| [Installation](../installation.md) | module | Provides maintained user-facing setup, target configuration, destinations, and activation instructions. |

## Structure

| Path | Type | Purpose |
|------|------|---------|
| `cursor/` | dir | Root of all static artifacts specific to the Cursor installation target. |
| `cursor/AGENTS.snippet.md` | file | Optional project guidance that anchors the persistent interface, scope discipline, role mapping, and lifecycle in an `AGENTS.md`. |
| `cursor/README.md` | file | Maintainer-facing manifest of adapter artifacts, install destinations, persona derivation, and manual parity responsibility. |
| `cursor/skills/` | dir | Contains Cursor-native orchestration skill entrypoints. |
| `cursor/skills/ops-orchestrator/` | dir | Cursor orchestration skill package. |
| `cursor/skills/ops-orchestrator/SKILL.md` | file | Maps the maintainer policy and lifecycle onto Cursor tools and semantic Task roles. |
| `cursor/task-delegation.md` | file | Canonical role-to-Task mapping and invocation/resume reference copied into the orchestrator skill package. |
| `cursor/tpl-orchestrator.mdc` | file | Template for the optional project rule that triggers orchestration and delegation for structured workflows. |

## Key Symbols

| Symbol | Kind | Visibility | Location | Purpose |
|--------|------|------------|----------|---------|
| `OpenCode Processing Skills (Cursor)` | section | public | `cursor/AGENTS.snippet.md:1` | Identifies the bootstrap text intended for merging into a project's agent instructions. |
| `AGENTS snippet.Persistent interface` | section | public | `cursor/AGENTS.snippet.md:5` | Establishes `plans/**` and `docs/**` as Cursor's durable workflow inputs and outputs. |
| `AGENTS snippet.Scope reminder` | policy | public | `cursor/AGENTS.snippet.md:10` | Carries the framework's evidence-backed scope discipline into project guidance. |
| `AGENTS snippet.Orchestration` | workflow | public | `cursor/AGENTS.snippet.md:17` | Selects the orchestration skill, maps roles to Task types, and defines resumable gated execution and review remediation. |
| `AGENTS snippet.Lifecycle` | workflow | public | `cursor/AGENTS.snippet.md:34` | Summarizes the ordered planning, review, execution, remediation, update, and handover sequence. |
| `Cursor install layer` | section | internal | `cursor/README.md:1` | Defines the module as static input to `install.sh`. |
| `Cursor install manifest` | table | internal | `cursor/README.md:5` | Maps each adapter artifact to its global or project destination and responsibility. |
| `Cursor persona synchronization contract` | policy | internal | `cursor/README.md:12` | Requires installed Cursor subagents to be derived from canonical personas with frontmatter removed. |
| `Cursor orchestrator parity contract` | policy | internal | `cursor/README.md:14` | Records that material maintainer changes require a manual orchestrator update. |
| `ops-orchestrator frontmatter` | frontmatter | public | `cursor/skills/ops-orchestrator/SKILL.md:1` | Declares the skill name, trigger description, Cursor compatibility, category, and source. |
| `Orchestrator (Cursor)` | workflow | public | `cursor/skills/ops-orchestrator/SKILL.md:13` | Establishes the Cursor primary and requires the local delegation reference before Task dispatch. |
| `Orchestrator.Ground Truth` | section | public | `cursor/skills/ops-orchestrator/SKILL.md:21` | Assigns authoritative phase scope to `plans/**` and navigation context to `docs/**`. |
| `Orchestrator.Scope reminder` | policy | public | `cursor/skills/ops-orchestrator/SKILL.md:26` | Prevents gotcha-driven or unrelated work while retaining required related discovery. |
| `Orchestrator.Operating Rules` | policy | public | `cursor/skills/ops-orchestrator/SKILL.md:32` | Defines documentation-first operation, ambiguity/safety questions, delegation, bounded inline edits, search, report-first endings, and parallelism. |
| `Orchestrator.Delegation anti-patterns` | table | internal | `cursor/skills/ops-orchestrator/SKILL.md:43` | Maps context-expensive primary behavior to Cursor Task delegation. |
| `Orchestrator.When to use which role` | section | public | `cursor/skills/ops-orchestrator/SKILL.md:52` | Defines semantic roles, Task types, artifact write boundaries, and Blueprint exceptions. |
| `Orchestrator.Plan-to-implementation lifecycle` | workflow | public | `cursor/skills/ops-orchestrator/SKILL.md:63` | Defines ordered routing across planning, reviews, execution, remediation, plan updates, and handovers. |
| `Orchestrator.Additional loops` | section | internal | `cursor/skills/ops-orchestrator/SKILL.md:83` | Routes legacy preparation, documentation generation/updates, and plan resumption. |
| `Orchestrator.Execution summary` | workflow | public | `cursor/skills/ops-orchestrator/SKILL.md:89` | Maps gated implementation to Blueprint Task, primary approval, and resumed Execute Task. |
| `Orchestrator.Work tracking` | policy | public | `cursor/skills/ops-orchestrator/SKILL.md:99` | Requires `TodoWrite` and exactly one in-progress item for multi-step work. |
| `Orchestrator.Testing policy` | policy | public | `cursor/skills/ops-orchestrator/SKILL.md:103` | Requires root-cause fixes, inter-phase tests, and behavior-exercising verification. |
| `Orchestrator.Safety` | policy | public | `cursor/skills/ops-orchestrator/SKILL.md:109` | Prohibits unauthorized destructive work, requires minimal deltas, synchronizes plans, and gates commits on request. |
| `Cursor Task Delegation` | workflow | public | `cursor/task-delegation.md:1` | Defines Task-based substitution for OpenCode's agent picker. |
| `Role → Task mapping` | table | public | `cursor/task-delegation.md:5` | Maps every semantic framework role and shell-heavy verification to a Cursor subagent type and persona file. |
| `How to invoke` | workflow | public | `cursor/task-delegation.md:21` | Defines persona-prefixed Task prompts for explicit skill loading, artifact paths, and compact returns. |
| `Write boundaries` | policy | public | `cursor/task-delegation.md:40` | Defines scope discipline, delegate escalation, artifact exceptions, review remediation continuity, and fresh-context criteria. |
| `Gated implementation (blueprint → execute)` | workflow | public | `cursor/task-delegation.md:54` | Requires two separate Task calls joined by the reviewer-approved resume identifier. |
| `Delegation prompt patterns` | table | public | `cursor/task-delegation.md:64` | Standardizes prompt labels for exploration, targeted reading, web research, and deep dives. |
| `Cursor vs OpenCode skill notes` | mapping | public | `cursor/task-delegation.md:75` | Translates `task()`/`task_id` terminology, the `explore` exception, and doc-explorer self-delegation into Cursor semantics. |
| `tpl-orchestrator frontmatter` | frontmatter | public | `cursor/tpl-orchestrator.mdc:1` | Declares the project rule description and disables unconditional application. |
| `tpl-orchestrator trigger workflow` | workflow | public | `cursor/tpl-orchestrator.mdc:6` | Activates documentation-first orchestration, skill loading, persona-based Task delegation, and gated implementation for matching requests. |

## Data Flow

1. Cursor target configuration causes `install.sh` to copy shared workflow skills and the adapter orchestration skill into global or project Cursor skill directories.
2. Installation copies `cursor/task-delegation.md` into the orchestrator package, derives Cursor subagent prompts from selected `agents/*.md` bodies, and optionally installs the AGENTS snippet and `.mdc` project rule.
3. A matching request activates `ops-orchestrator`. The orchestrator first reads persistent `docs/**` and `plans/**`, then loads the workflow skill that owns the requested operation.
4. The orchestrator reads the colocated delegation reference, maps the semantic role to `explore`, `generalPurpose`, or `shell`, prefixes the selected canonical persona, and sends the scoped task through Cursor `Task`.
5. Gated implementation uses the returned agent identifier with `resume` between Blueprint and Execute; accepted review findings likewise resume the reviewer for `review-fix` when the scope is continuous.
6. Subagents write only within persona/skill boundaries and return compact digests. The repository artifacts, not Cursor chat state, remain the durable interface.

## Configuration

- The orchestration skill declares `compatibility: cursor` and metadata identifying its category and repository source. Its description controls skill discovery.
- `cursor/tpl-orchestrator.mdc` uses `alwaysApply: false`, so the project rule is request-triggered rather than injected into every Cursor interaction.
- Target enablement, home directories, `OPS_SYNC_CURSOR`, `OPS_CURSOR_HOME`, global versus `--project` destinations, and symlink behavior are maintained in [Installation → Installing into Cursor](../installation.md#installing-into-cursor).
- Cursor chooses model capacity through its Task/runtime settings. Repository `config.yaml` model assignments and generated OpenCode delegate aliases do not configure Cursor.
- Adapter files assume the installer colocates `task-delegation.md` with the orchestration skill and installs canonical persona bodies under project or global `subagents/`.

## Inventory Notes

- **Coverage**: full
- **Notes**: Structure was derived from `git ls-files cursor` and includes all five tracked files plus every relevant directory below `cursor/`. Key Symbols cover all frontmatter manifests, named sections, workflow blocks, mapping tables, and explicit synchronization contracts; line numbers refer to the current repository files. The module is declarative Markdown rather than executable language code.
