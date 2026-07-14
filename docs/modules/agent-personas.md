---
type: documentation
entity: module
module: "agent-personas"
version: 1.0
---

# Module: Agent Personas

> Part of [OpenCode Processing Skills](../overview.md)

## Overview

The `agents/` module defines the prompt-level personas that divide orchestration, documentation, analysis, implementation, and legacy-document cleanup responsibilities. These Markdown files are executable configuration: their frontmatter declares the OpenCode role and permissions, while their bodies define routing, workflow, and write-boundary contracts. The installer also derives compatible subagent prompts from selected personas for other harnesses. For the user-facing role guide, see [Agents Reference](../agents.md); for installation and model selection, see [Installation](../installation.md).

### Responsibility

This module is the canonical source for the interactive and non-interactive primary orchestrators and for the four installed subagent personas. It owns role behavior, delegation permissions, workflow boundaries, and compact-return expectations. It does not own task expertise or artifact templates, which live in `skills/`; installation mechanics, which live in `install.sh`; or Cursor-specific orchestration, which is documented in [Cursor Adapter](cursor-adapter.md).

### Dependencies

| Dependency | Type | Purpose |
|-----------|------|---------|
| `skills/` | module | Supplies the workflow instructions and templates that personas load; skills are authoritative for task-specific execution and artifact contracts. |
| `docs/` and `plans/` | module | Provide the persistent file-based interface that primary and documentation personas read and maintain. |
| `install.sh` and `config.yaml` | module | Install personas, inject configured model options, create delegate aliases, and adapt selected subagents for supported harnesses. |
| OpenCode agent runtime | external | Interprets persona frontmatter such as `mode`, `hidden`, and `permission`, and provides task and skill dispatch. |
| [Agents Reference](../agents.md) | module | Provides the maintained user-facing explanation of roles and delegation philosophy without duplicating it here. |

## Structure

| Path | Type | Purpose |
|------|------|---------|
| `agents/` | dir | Canonical persona definitions installed into supported agent runtimes. |
| `agents/delegate.md` | file | Defines the single skill-driven analysis/review persona reused by generated `delegate-*` model aliases. |
| `agents/doc-explorer.md` | file | Defines the docs-focused writer for `docs/**` and explicitly routed, template-governed `plans/**` artifacts. |
| `agents/implementer.md` | file | Defines the execution-only subagent and its gated BLUEPRINT → GATE → EXECUTE → DIGEST protocol. |
| `agents/legacy-curator.md` | file | Defines the legacy-document archiving persona restricted to `docs-legacy/**`. |
| `agents/maintainer-direct.md` | file | Defines the non-interactive primary orchestrator that asks only at genuine decision points. |
| `agents/maintainer.md` | file | Defines the interactive primary orchestrator, delegation policy, lifecycle routing, testing rules, and safety discipline. |

## Key Symbols

| Symbol | Kind | Visibility | Location | Purpose |
|--------|------|------------|----------|---------|
| `Delegate frontmatter` | frontmatter | public | `agents/delegate.md:1` | Declares the canonical delegate description, subagent mode, visibility, and denial of nested task dispatch. |
| `Delegate` | persona | public | `agents/delegate.md:12` | Establishes the shared persona used for skill-driven analysis, reviews, verification, and explicit template-governed artifacts. |
| `Delegate.What You Do` | section | internal | `agents/delegate.md:16` | Enumerates the supported analysis, review, remediation, command, and artifact-writing task categories. |
| `Delegate.Informal Scope Reminder` | policy | public | `agents/delegate.md:29` | Prevents gold-plating and adversarial scope expansion while preserving evidence-backed defect discovery. |
| `Delegate.How You Work` | workflow | public | `agents/delegate.md:40` | Defines skill loading, resumed-session continuity, scope-change handling, and concise return behavior. |
| `Delegate.Tool Preferences` | policy | internal | `agents/delegate.md:49` | Requires parallel independent reads and chooses AST-aware versus text search by query type. |
| `Delegate.Constraints` | policy | public | `agents/delegate.md:56` | Sets the default read/analyze boundary, exceptions for explicit artifacts and `review-fix`, Blueprint expectations, and the Git prohibition. |
| `Doc Explorer frontmatter` | frontmatter | public | `agents/doc-explorer.md:1` | Declares subagent mode, permits only doc-explorer self-delegation, and allowlists documentation/planning skills. |
| `Doc Explorer` | persona | public | `agents/doc-explorer.md:19` | Establishes the codebase-anchored writer for documentation and selected skill-governed planning artifacts. |
| `Doc Explorer.Core Responsibilities` | section | internal | `agents/doc-explorer.md:25` | Defines module/symbol mapping, staleness checks, grounded references, and handoff boundaries to other personas. |
| `Doc Explorer.How You Work` | workflow | public | `agents/doc-explorer.md:34` | Specifies repository assessment, module analysis, dependency tracing, symbol extraction, and documentation comparison. |
| `Doc Explorer.Working Mode` | workflow | public | `agents/doc-explorer.md:45` | Requires a relevant skill, template-compliant writes, bounded paths, and a short status return. |
| `Doc Explorer.Self-Delegation for Large Codebases` | workflow | public | `agents/doc-explorer.md:52` | Defines per-module doc-explorer delegation thresholds and the orchestrator/child split. |
| `Doc Explorer.Write Early, Flush Often` | policy | internal | `agents/doc-explorer.md:70` | Limits unwritten source context by persisting partial documentation throughout exploration. |
| `Doc Explorer.Constraints` | policy | public | `agents/doc-explorer.md:80` | Enforces documentation/planning write boundaries, symbol line references, supported search methods, and preservation of manual additions. |
| `Implementer frontmatter` | frontmatter | public | `agents/implementer.md:1` | Declares execution-only subagent mode, broad edit permission, denied delegation, and exclusive access to `execute-work-package`. |
| `Implementer` | persona | public | `agents/implementer.md:17` | Establishes the execution-only role used by the primary orchestrator. |
| `Implementer.Ground Truth` | section | public | `agents/implementer.md:21` | Makes the execution skill and its templates authoritative for the gated protocol. |
| `Implementer.Inputs` | section | public | `agents/implementer.md:30` | Requires the subagent to load referenced `plans/**` and `docs/**` artifacts directly. |
| `Implementer.Modes` | workflow | public | `agents/implementer.md:35` | Separates Blueprint and Execute into distinct primary task calls. |
| `Implementer.MODE: BLUEPRINT` | workflow | public | `agents/implementer.md:39` | Produces the execution step list without commands, edits, or premature execution. |
| `Implementer.MODE: EXECUTE` | workflow | public | `agents/implementer.md:53` | Applies an approved Blueprint, requires an approval token, and emits the canonical digest. |
| `Implementer.Hard Constraints` | policy | public | `agents/implementer.md:67` | Prohibits Git operations, limits verification to the approved command, and controls response/output scope. |
| `Implementer.Failure / BLOCKED` | workflow | public | `agents/implementer.md:75` | Defines the minimum execute action and the structured blocked response when execution cannot proceed. |
| `Legacy Curator frontmatter` | frontmatter | public | `agents/legacy-curator.md:1` | Declares subagent mode, edit permission, denied delegation, and exclusive access to `archive-legacy-docs`. |
| `Legacy Curator` | persona | public | `agents/legacy-curator.md:17` | Establishes the repository-hygiene role for legacy documentation onboarding. |
| `Legacy Curator.Ground Truth` | section | public | `agents/legacy-curator.md:21` | Makes `archive-legacy-docs` authoritative and defines the clean-state objective. |
| `Legacy Curator.What you do` | workflow | public | `agents/legacy-curator.md:27` | Defines discovery, git-aware moves, and summary generation for legacy documents. |
| `Legacy Curator.Hard Constraints` | policy | public | `agents/legacy-curator.md:33` | Restricts writes to `docs-legacy/**` and prohibits commits, pushes, code refactors, and risky ambiguous moves. |
| `Maintainer Direct frontmatter` | frontmatter | public | `agents/maintainer-direct.md:1` | Declares primary mode and the task allowlist for delegates, implementers, doc-explorer, legacy-curator, and built-in general. |
| `Maintainer Direct` | persona | public | `agents/maintainer-direct.md:19` | Establishes the forward-moving primary variant that interrupts only for genuine choices. |
| `Maintainer Direct.Ground Truth` | section | public | `agents/maintainer-direct.md:27` | Assigns authoritative scope/DoD to `plans/**` and curated navigation to `docs/**`. |
| `Maintainer Direct.Informal Scope Reminder` | policy | public | `agents/maintainer-direct.md:32` | Enforces evidence-backed, objective-bound work without suppressing real defects. |
| `Maintainer Direct.Operating Rules (Meta)` | policy | public | `agents/maintainer-direct.md:41` | Defines documentation-first operation, safety questions, task-based delegation, non-interactive turn endings, and context/tool discipline. |
| `Maintainer Direct.Delegation Anti-Patterns` | table | internal | `agents/maintainer-direct.md:56` | Maps common context-expensive behaviors to the intended self-execution or delegation route. |
| `Maintainer Direct.Delegation Quick-Reference` | table | public | `agents/maintainer-direct.md:69` | Provides standard labels and prompt patterns for exploration, targeted reading, web research, and deep dives. |
| `Maintainer Direct.Delegate Session Reuse` | policy | public | `agents/maintainer-direct.md:82` | Defines when a delegate task continues versus when a fresh task is required. |
| `Maintainer Direct.Delegate Write Boundary` | policy | public | `agents/maintainer-direct.md:97` | Routes code, review remediation, explicit artifacts, documentation, and ad-hoc writes to their owning workflows. |
| `Maintainer Direct.When to Use Which Agent` | section | public | `agents/maintainer-direct.md:107` | Provides the authoritative semantic role-to-persona routing guidance. |
| `Maintainer Direct.Plan-to-Implementation Lifecycle` | workflow | public | `agents/maintainer-direct.md:121` | Defines the ordered plan, optional review, implementation, remediation, update, and handover sequence. |
| `Maintainer Direct.Policy Guardrails` | policy | public | `agents/maintainer-direct.md:144` | Keeps routing defaults proportional and stops automatic review/remediation loops. |
| `Maintainer Direct.Additional skill loops` | section | internal | `agents/maintainer-direct.md:152` | Routes legacy preparation, documentation maintenance, and session resumption. |
| `Maintainer Direct.Execution (Implementation) Summary` | workflow | public | `agents/maintainer-direct.md:158` | Summarizes gated execution prerequisites, valid use cases, and pre/post-change checks. |
| `Maintainer Direct.Work Tracking` | policy | public | `agents/maintainer-direct.md:173` | Requires a single in-progress todo for work with three or more steps. |
| `Maintainer Direct.Testing & Verification Policy` | policy | public | `agents/maintainer-direct.md:179` | Requires root-cause fixes, inter-phase tests, behavior-exercising verification, and E2E where appropriate. |
| `Maintainer Direct.Safety and Change Discipline` | policy | public | `agents/maintainer-direct.md:186` | Requires explicit authority for destructive operations, minimal deltas, and synchronized plan state. |
| `Maintainer frontmatter` | frontmatter | public | `agents/maintainer.md:1` | Declares primary mode and the task allowlist for all supported execution and analysis roles. |
| `Maintainer` | persona | public | `agents/maintainer.md:19` | Establishes the interactive primary orchestrator for planning and implementation. |
| `Maintainer.Ground Truth` | section | public | `agents/maintainer.md:25` | Assigns authoritative scope/DoD to `plans/**` and curated navigation to `docs/**`. |
| `Maintainer.Informal Scope Reminder` | policy | public | `agents/maintainer.md:30` | Enforces evidence-backed, objective-bound work without suppressing real defects. |
| `Maintainer.Operating Rules (Meta)` | policy | public | `agents/maintainer.md:39` | Defines documentation-first operation, safety questions, task-based delegation, interactive turn endings, and context/tool discipline. |
| `Maintainer.Delegation Anti-Patterns` | table | internal | `agents/maintainer.md:54` | Maps common context-expensive behaviors to the intended self-execution or delegation route. |
| `Maintainer.Delegation Quick-Reference` | table | public | `agents/maintainer.md:68` | Provides standard labels and prompt patterns for exploration, targeted reading, web research, and deep dives. |
| `Maintainer.Delegate Session Reuse` | policy | public | `agents/maintainer.md:81` | Defines when a delegate task continues versus when a fresh task is required. |
| `Maintainer.Delegate Write Boundary` | policy | public | `agents/maintainer.md:96` | Routes code, review remediation, explicit artifacts, documentation, and ad-hoc writes to their owning workflows. |
| `Maintainer.When to Use Which Agent` | section | public | `agents/maintainer.md:106` | Provides the authoritative semantic role-to-persona routing guidance. |
| `Maintainer.Plan-to-Implementation Lifecycle` | workflow | public | `agents/maintainer.md:120` | Defines the ordered plan, optional review, implementation, remediation, update, and handover sequence. |
| `Maintainer.Policy Guardrails` | policy | public | `agents/maintainer.md:143` | Keeps routing defaults proportional and stops automatic review/remediation loops. |
| `Maintainer.Additional skill loops` | section | internal | `agents/maintainer.md:151` | Routes legacy preparation, documentation maintenance, and session resumption. |
| `Maintainer.Execution (Implementation) Summary` | workflow | public | `agents/maintainer.md:157` | Summarizes gated execution prerequisites, valid use cases, and pre/post-change checks. |
| `Maintainer.Work Tracking` | policy | public | `agents/maintainer.md:173` | Requires a single in-progress todo for work with three or more steps. |
| `Maintainer.Testing & Verification Policy` | policy | public | `agents/maintainer.md:179` | Requires root-cause fixes, inter-phase tests, behavior-exercising verification, and E2E where appropriate. |
| `Maintainer.Safety and Change Discipline` | policy | public | `agents/maintainer.md:186` | Requires explicit authority for destructive operations, minimal deltas, and synchronized plan state. |

## Data Flow

1. The installer deploys `maintainer.md` and `maintainer-direct.md` as selectable primary agents and installs the four subagent personas. It may add configured model fields or generate `delegate-*` aliases without changing the canonical persona body.
2. A primary agent begins from persistent `docs/**` and `plans/**` artifacts, loads the matching workflow skill, and selects a role according to the task's risk and context cost.
3. Task permissions admit only declared personas. The primary sends paths and a focused objective; the receiving persona loads the skill that owns the task contract rather than relying on pasted history.
4. `delegate` returns analysis or writes an explicitly templated artifact, `doc-explorer` maintains allowed documentation/planning files, `implementer` performs approved code execution, and `legacy-curator` writes only the legacy archive.
5. Subagents return compact status or digests. Durable state stays in repository files; follow-up work resumes the same task only when the objective and context remain continuous.
6. Selected subagent bodies are also consumed by the [Cursor Adapter](cursor-adapter.md), which strips OpenCode frontmatter and maps the canonical personas onto Cursor Task types.

## Configuration

- Every persona uses YAML frontmatter for runtime metadata. `mode` selects `primary` or `subagent`, `hidden` controls discoverability, and `permission` constrains tools, nested tasks, edits, and skill loading.
- Model choice is intentionally absent from the canonical files. `config.yaml` can set models and reasoning effort for named agents, and `install.sh` applies those settings to installed copies; see [Installation → Model Configuration](../installation.md#model-configuration).
- `additional_delegates` creates model-specific aliases from `agents/delegate.md`; the repository keeps one behavioral source of truth. See [Installation → Additional Delegate Variants](../installation.md#additional-delegate-variants).
- Persona behavior depends on the installed skill set. Changing a workflow contract or artifact schema belongs in its skill, not in these personas.

## Inventory Notes

- **Coverage**: full
- **Notes**: Structure was derived from `git ls-files agents` and includes all six tracked files plus the module directory. Key Symbols cover every frontmatter manifest and every named behavioral section or workflow in the Markdown personas; line numbers refer to the current repository files. The module contains configuration Markdown rather than language-level symbols.
