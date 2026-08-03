---
type: documentation
entity: module
module: "agent-personas"
version: 1.8
---

# Module: Agent Personas

> Part of [OpenCode Processing Skills](../overview.md)

## Overview

The `agents/` module defines the prompt-level personas that divide orchestration, documentation, analysis, implementation, and legacy-document cleanup responsibilities. These Markdown files are executable configuration: their frontmatter declares the OpenCode role and permissions, while their bodies define routing, workflow, and write-boundary contracts. The installer also derives compatible subagent prompts from selected personas for other harnesses. For the user-facing role guide, see [Agents Reference](../agents.md); for installation and model selection, see [Installation](../installation.md).

### Responsibility

This module is the canonical source for the interactive and non-interactive primary orchestrators and for the five installed subagent personas. It owns role behavior, delegation permissions, workflow boundaries, and compact-return expectations. It does not own task expertise or artifact templates, which live in `skills/`; installation mechanics, which live in `install.sh`; or Cursor-specific orchestration, which is documented in [Cursor Adapter](cursor-adapter.md).

### Dependencies

| Dependency | Type | Purpose |
|-----------|------|---------|
| `skills/` | module | Supplies the workflow instructions and templates that personas load; skills are authoritative for task-specific execution and artifact contracts. |
| `docs/` and `plans/` | module | Provide curated documentation and, when durable coordination is warranted, the proportional persistent planning interface that personas read and maintain. |
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
| `agents/retriever.md` | file | Defines the read-only leaf evidence worker available to maintainers, delegates, and implementers. |

## Key Symbols

| Symbol | Kind | Visibility | Location | Purpose |
|--------|------|------------|----------|---------|
| `Delegate frontmatter` | frontmatter | public | `agents/delegate.md:1` | Declares the canonical delegate and permits level-2 child tasks only to `retriever` and `doc-explorer`. |
| `Delegate` | persona | public | `agents/delegate.md:14` | Establishes the shared persona used for skill-driven analysis, reviews, verification, and explicit template-governed artifacts. |
| `Delegate.What You Do` | section | internal | `agents/delegate.md:18` | Enumerates the supported analysis, review, remediation, command, and artifact-writing task categories. |
| `Delegate.Informal Scope Reminder` | policy | public | `agents/delegate.md:31` | Prevents gold-plating and adversarial scope expansion while preserving evidence-backed defect discovery. |
| `Delegate.How You Work` | workflow | public | `agents/delegate.md:42` | Makes retriever delegation the default for separable evidence while keeping synthesis and decisive verification with the parent. |
| `Delegate.Tool Preferences` | policy | internal | `agents/delegate.md:53` | Allows direct scoped reads and compact targeted evidence, routes uncurated bulk or coherent multi-file evidence to retriever, and requires verbose command output to be spooled under `/tmp/opencode/`. |
| `Delegate.Constraints` | policy | public | `agents/delegate.md:69` | Sets the write/Git boundary and requires checkpoints after bounded investigation, synthesis, or artifact units with lag-aware input-budget guidance. |
| `Retriever frontmatter` | frontmatter | public | `agents/retriever.md:1` | Denies edits and further tasks while leaving read, search, Bash, crawl, and other evidence tools available. |
| `Retriever` | persona | public | `agents/retriever.md:11` | Establishes focused evidence retrieval for maintainers, delegates, and implementers. |
| `Retriever.How You Work` | workflow | public | `agents/retriever.md:15` | Authorizes complete large raw-artifact consumption and coherent evidence assembly across definitions, call sites, configuration, tests, and behavior, while returning referenced synthesis and routing open-ended web research back to delegates. |
| `Retriever.Constraints` | policy | public | `agents/retriever.md:29` | Leaves judgment, Blueprints, changes, verification, and final artifacts with the parent. |
| `Doc Explorer frontmatter` | frontmatter | public | `agents/doc-explorer.md:1` | Declares subagent mode, permits only doc-explorer self-delegation, and allowlists documentation/planning skills. |
| `Doc Explorer` | persona | public | `agents/doc-explorer.md:19` | Establishes the codebase-anchored writer for documentation and selected skill-governed planning artifacts. |
| `Doc Explorer.Core Responsibilities` | section | internal | `agents/doc-explorer.md:25` | Defines module/symbol mapping, staleness checks, grounded references, and handoff boundaries to other personas. |
| `Doc Explorer.How You Work` | workflow | public | `agents/doc-explorer.md:34` | Specifies repository assessment, module analysis, dependency tracing, symbol extraction, and documentation comparison. |
| `Doc Explorer.Working Mode` | workflow | public | `agents/doc-explorer.md:45` | Requires a relevant skill, template-compliant writes, bounded paths, and a short status return. |
| `Doc Explorer.Self-Delegation for Large Codebases` | workflow | public | `agents/doc-explorer.md:52` | Defines per-module doc-explorer delegation thresholds and the orchestrator/child split. |
| `Doc Explorer.Write Early, Flush Often` | policy | internal | `agents/doc-explorer.md:70` | Limits unwritten source context by persisting partial documentation throughout exploration. |
| `Doc Explorer.Constraints` | policy | public | `agents/doc-explorer.md:80` | Enforces documentation/planning write boundaries, symbol line references, supported search methods, and preservation of manual additions. |
| `Implementer frontmatter` | frontmatter | public | `agents/implementer.md:1` | Declares execution-only subagent mode, broad edit permission, leaf-retriever access, and exclusive skill access to `execute-work-package`. |
| `Implementer` | persona | public | `agents/implementer.md:18` | Establishes the execution-only role used by the primary orchestrator. |
| `Implementer.Ground Truth` | section | public | `agents/implementer.md:22` | Makes the execution skill and its templates authoritative for the gated protocol. |
| `Implementer.Inputs` | section | public | `agents/implementer.md:31` | Accepts persistent plan references or an authoritative inline gated brief, routes uncurated bulk evidence to retriever, and spools verbose EXECUTE output under `/tmp/opencode/`. |
| `Implementer.Modes` | workflow | public | `agents/implementer.md:40` | Separates Blueprint and Execute into distinct primary task calls. |
| `Implementer.MODE: BLUEPRINT` | workflow | public | `agents/implementer.md:44` | Produces the execution step list and optional non-binding Package Sizing Note without commands, edits, or autonomous splitting. |
| `Implementer.MODE: EXECUTE` | workflow | public | `agents/implementer.md:58` | Applies an approved Blueprint in the retained session, requires an approval token, stages targeted tests before the broad/full final gate, and emits the canonical digest. |
| `Implementer.Hard Constraints` | policy | public | `agents/implementer.md:81` | Prohibits Git, preserves the final gate, and checkpoints after approved steps or bounded parts while treating input telemetry as lagging soft guidance. |
| `Implementer.Failure / BLOCKED` | workflow | public | `agents/implementer.md:83` | Defines the minimum execute action and the structured blocked response when execution cannot proceed. |
| `Legacy Curator frontmatter` | frontmatter | public | `agents/legacy-curator.md:1` | Declares subagent mode, edit permission, denied delegation, and exclusive access to `archive-legacy-docs`. |
| `Legacy Curator` | persona | public | `agents/legacy-curator.md:17` | Establishes the repository-hygiene role for legacy documentation onboarding. |
| `Legacy Curator.Ground Truth` | section | public | `agents/legacy-curator.md:21` | Makes `archive-legacy-docs` authoritative and defines the clean-state objective. |
| `Legacy Curator.What you do` | workflow | public | `agents/legacy-curator.md:27` | Defines discovery, git-aware moves, and summary generation for legacy documents. |
| `Legacy Curator.Hard Constraints` | policy | public | `agents/legacy-curator.md:33` | Restricts writes to `docs-legacy/**` and prohibits commits, pushes, code refactors, and risky ambiguous moves. |
| `Maintainer Direct frontmatter` | frontmatter | public | `agents/maintainer-direct.md:1` | Declares primary mode and the task allowlist, including level-1 access to `retriever`. |
| `Maintainer Direct` | persona | public | `agents/maintainer-direct.md:20` | Establishes the forward-moving primary variant that interrupts only for genuine choices. |
| `Maintainer Direct.Ground Truth` | section | public | `agents/maintainer-direct.md:28` | Assigns scope/DoD authority to persistent plans when present or an approved inline brief for self-contained work, with curated navigation in `docs/**`. |
| `Maintainer Direct.Informal Scope Reminder` | policy | public | `agents/maintainer-direct.md:33` | Enforces evidence-backed, objective-bound work without suppressing real defects. |
| `Maintainer Direct.Operating Rules (Meta)` | policy | public | `agents/maintainer-direct.md:42` | Defines documentation-first operation, safety questions, task-based delegation, non-interactive turn endings, and the uncurated-evidence and `/tmp/opencode/` spooling boundary. |
| `Maintainer Direct.Delegation Anti-Patterns` | table | internal | `agents/maintainer-direct.md:57` | Maps common context-expensive behaviors to the intended self-execution or delegation route. |
| `Maintainer Direct.Delegation Quick-Reference` | table | public | `agents/maintainer-direct.md:70` | Provides standard labels and prompt patterns for exploration, targeted reading, web research, and deep dives. |
| `Maintainer Direct.Delegate Session Reuse` | policy | public | `agents/maintainer-direct.md:83` | Chooses continuation from retained reasoning value versus context cost and favors fresh lean work for self-contained checks or fixes. |
| `Maintainer Direct.Aborted Delegate Recovery` | policy | public | `agents/maintainer-direct.md:97` | Uses `checkpoint_path(task_id)`, the selected log, current tree, and Blueprint or delegated objective to issue a smaller fresh recovery task. |
| `Maintainer Direct.Delegate Write Boundary` | policy | public | `agents/maintainer-direct.md:101` | Routes code, review remediation, explicit artifacts, documentation, and ad-hoc writes to their owning workflows. |
| `Maintainer Direct.When to Use Which Agent` | section | public | `agents/maintainer-direct.md:111` | Provides the authoritative semantic role-to-persona routing guidance. |
| `Maintainer Direct.Persistent Plan-to-Implementation Lifecycle` | workflow | public | `agents/maintainer-direct.md:126` | Applies proportional durable planning and routes multiple implementation plans through one dependency-ordered reviewer session by default, with contiguous partitioning only when combined review context is impractical. |
| `Maintainer Direct.Policy Guardrails` | policy | public | `agents/maintainer-direct.md:153` | Keeps routing defaults proportional and stops automatic review/remediation loops. |
| `Maintainer Direct.Additional skill loops` | section | internal | `agents/maintainer-direct.md:161` | Routes legacy preparation, documentation maintenance, and session resumption. |
| `Maintainer Direct.Execution (Implementation) Summary` | workflow | public | `agents/maintainer-direct.md:167` | Accepts plan references or inline briefs and mandates same-session BLUEPRINT → EXECUTE reuse for approval context. |
| `Maintainer Direct.Work Tracking` | policy | public | `agents/maintainer-direct.md:183` | Requires a single in-progress todo for work with three or more steps. |
| `Maintainer Direct.Testing & Verification Policy` | policy | public | `agents/maintainer-direct.md:189` | Requires targeted iterative tests followed by the unchanged approved broad/full final gate and separates ownership from raw-output ingestion. |
| `Maintainer Direct.Safety and Change Discipline` | policy | public | `agents/maintainer-direct.md:199` | Requires explicit authority for destructive operations, minimal deltas, and synchronized state when a persistent plan exists. |
| `Maintainer frontmatter` | frontmatter | public | `agents/maintainer.md:1` | Declares primary mode and the task allowlist for all supported execution and analysis roles. |
| `Maintainer` | persona | public | `agents/maintainer.md:22` | Establishes the interactive primary orchestrator for planning and implementation. |
| `Maintainer.Ground Truth` | section | public | `agents/maintainer.md:30` | Assigns scope/DoD authority to persistent plans when present or an approved inline brief for self-contained work, with curated navigation in `docs/**`. |
| `Maintainer.Informal Scope Reminder` | policy | public | `agents/maintainer.md:35` | Enforces evidence-backed, objective-bound work without suppressing real defects. |
| `Maintainer.Operating Rules (Meta)` | policy | public | `agents/maintainer.md:45` | Defines documentation-first operation, safety questions, task-based delegation, interactive turn endings, and the uncurated-evidence and `/tmp/opencode/` spooling boundary. |
| `Maintainer.Delegation Anti-Patterns` | table | internal | `agents/maintainer.md:60` | Maps common context-expensive behaviors to the intended self-execution or delegation route. |
| `Maintainer.Delegation Quick-Reference` | table | public | `agents/maintainer.md:74` | Provides standard labels and prompt patterns for exploration, targeted reading, web research, and deep dives. |
| `Maintainer.Delegate Session Reuse` | policy | public | `agents/maintainer.md:87` | Chooses continuation from retained reasoning value versus context cost and favors fresh lean work for self-contained checks or fixes. |
| `Maintainer.Aborted Delegate Recovery` | policy | public | `agents/maintainer.md:101` | Uses `checkpoint_path(task_id)`, the selected log, current tree, and Blueprint or delegated objective to issue a smaller fresh recovery task. |
| `Maintainer.Delegate Write Boundary` | policy | public | `agents/maintainer.md:105` | Routes code, review remediation, explicit artifacts, documentation, and ad-hoc writes to their owning workflows. |
| `Maintainer.When to Use Which Agent` | section | public | `agents/maintainer.md:115` | Provides the authoritative semantic role-to-persona routing guidance. |
| `Maintainer.Persistent Plan-to-Implementation Lifecycle` | workflow | public | `agents/maintainer.md:130` | Applies proportional durable planning and routes multiple implementation plans through one dependency-ordered reviewer session by default, with contiguous partitioning only when combined review context is impractical. |
| `Maintainer.Policy Guardrails` | policy | public | `agents/maintainer.md:157` | Keeps routing defaults proportional and stops automatic review/remediation loops. |
| `Maintainer.Additional skill loops` | section | internal | `agents/maintainer.md:167` | Routes legacy preparation, documentation maintenance, and session resumption. |
| `Maintainer.Execution (Implementation) Summary` | workflow | public | `agents/maintainer.md:173` | Accepts plan references or inline briefs and mandates same-session BLUEPRINT → EXECUTE reuse for approval context. |
| `Maintainer.Work Tracking` | policy | public | `agents/maintainer.md:190` | Requires a single in-progress todo for work with three or more steps. |
| `Maintainer.Testing & Verification Policy` | policy | public | `agents/maintainer.md:196` | Requires targeted iterative tests followed by the unchanged approved broad/full final gate and separates ownership from raw-output ingestion. |
| `Maintainer.Safety and Change Discipline` | policy | public | `agents/maintainer.md:206` | Requires explicit authority for destructive operations, minimal deltas, and synchronized state when a persistent plan exists. |

## Data Flow

1. The installer deploys canonical personas and generated `delegate-*`/`implementer-*` aliases without changing source bodies. For OpenCode only, `install_opencode_checkpoint_instruction` then manages one exact start/end-bounded checkpoint block in every ordinary installed persona: absent blocks append once, exact current blocks remain byte-stable, only the exact known legacy block migrates with all surrounding bytes preserved, unknown/customized marked content stops unchanged, and symlinked personas are skipped. Claude/Cursor copies do not receive this OpenCode block.
2. A primary agent begins from `docs/**` and any warranted persistent `plans/**` artifacts, loads the matching workflow skill, and selects a role according to risk and context cost. A bounded self-contained package may instead carry an inline gated brief.
3. Task permissions admit only declared personas. The primary sends paths and a focused objective; the receiving persona loads the skill that owns the task contract rather than relying on pasted history.
4. A maintainer, delegate/reviewer, or implementer may directly read scoped source, docs/plans, symbols, and compact targeted results. It uses a reliable focused filter when sufficient and routes uncurated bulk artifacts, verbose output, mass-search results, or coherent multi-file evidence to leaf `retriever`. Potentially verbose commands spool complete output under `/tmp/opencode/`, leaving only the path, command, exit status, and compact evidence in the owning context. The parent retains judgment, artifact, and execution ownership.
5. `delegate` returns analysis or writes an explicitly templated artifact, `doc-explorer` maintains allowed documentation/planning files, `implementer` performs approved code execution, and `legacy-curator` writes only the legacy archive.
6. Subagents return compact status or digests. Normal BLUEPRINT → EXECUTE reuses one implementer session because approval context is required; an interrupted execution with no usable digest is recovered through its selected checkpoint log and current tree into a smaller fresh package. Optional Blueprint sizing remains advisory and Maintainer-controlled. Capacity decisions use lagging input telemetry. Across providers, approximately 220k input tokens are a soft planning signal; at or above 272k, the remaining budget is reserved for a coherent checkpointed exit before the 372k rejection boundary.
7. Selected subagent bodies are also consumed by the [Cursor Adapter](cursor-adapter.md), which strips OpenCode frontmatter and maps the canonical personas onto Cursor Task types.

## Configuration

- Every persona uses YAML frontmatter for runtime metadata. `mode` selects `primary` or `subagent`, `hidden` controls discoverability, and `permission` constrains tools, nested tasks, edits, and skill loading.
- Model choice is intentionally absent from the canonical files. `config.yaml` can set models and reasoning effort for named agents, and `install.sh` applies those settings to installed copies; see [Installation → Model Configuration](../installation.md#model-configuration).
- On OpenCode v1.18.2+, level-2 retriever/doc-explorer calls require top-level `subagent_depth: 2`; older versions do not support the setting. The installer prints a version-aware reminder without modifying runtime JSON/JSONC. See [Installation → Nested Delegation](../installation.md#nested-delegation-opencode).
- `additional_delegates` creates model-specific aliases from `agents/delegate.md`; the repository keeps one behavioral source of truth. See [Installation → Additional Delegate Variants](../installation.md#additional-delegate-variants).
- Persona behavior depends on the installed skill set. Changing a workflow contract or artifact schema belongs in its skill, not in these personas.
- OpenCode-installed personas receive the bounded shared instruction from `opencode/checkpoint-instruction.md`. It adds proportional cadence, lag honesty, universal input-based 220k/272k guidance, and the 372k emergency-headroom boundary while preserving final-close lifecycle semantics. Role-specific cadence and interrupted-digest recovery remain in canonical personas. See [OpenCode Checkpoint Adapter](opencode-checkpoint-adapter.md).

## Inventory Notes

- **Coverage**: full
- **Notes**: Structure includes all seven agent source files plus the module directory. Key Symbols cover every frontmatter manifest and every named behavioral section or workflow in the Markdown personas; line numbers refer to the current repository files. The module contains configuration Markdown rather than language-level symbols.
