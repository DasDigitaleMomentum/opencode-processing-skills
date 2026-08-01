---
type: documentation
entity: module
module: "installation-and-configuration"
version: 1.5
---

# Module: Installation and Configuration

> Part of [OpenCode Processing Skills](../overview.md)

## Overview

The root distribution surface explains the project, establishes repository-wide conventions, exposes the optional installer schema, and installs skills, agent definitions, and checkpoint assets into supported locations. `install.sh` is a dependency-light Bash entry point with environment-over-YAML-over-default precedence, global and project-local modes, model/frontmatter injection, generated agent variants, symlink preservation, reader-before-writer checkpoint installation, and target-specific behavior. The operational walkthrough and compatibility caveats remain in the [Installation Guide](../installation.md).

### Responsibility

This module owns the public repository entry points and the mechanics that turn checked-in workflow packages and personas into an installed setup. It includes only `.gitignore`, `AGENTS.md`, `CHANGELOG.md`, `LICENSE`, `README.md`, `config.yaml.example`, and `install.sh`. It does not own the skill definitions, agent/persona source files, Cursor source assets, tests, plans, generated project artifacts, or manually maintained reference pages; it reads or distributes those inputs without redefining their behavior.

### Dependencies

| Dependency | Type | Purpose |
|-----------|------|---------|
| Workflow Skills | module | Supplies the self-contained `skills/*` directories copied to every enabled skill destination. |
| Agent definitions under `agents/` | module | Supply canonical personas copied to OpenCode and Claude targets and adapted for Cursor. |
| Cursor integration assets under `cursor/` | module | Supply orchestrator skills, task-delegation guidance, bootstrap text, and the optional project rule. |
| POSIX-like shell and core command-line tools | external | Bash executes the installer using `grep`, `awk`, `sed`, `cp`, `mkdir`, `rm`, `mktemp`, `tr`, and related core utilities. |
| Git | external | Supports cloning/updating the repository and supplies the tracked release and source context; installation itself performs no Git mutation. |
| Harness home directories | external | OpenCode, Codex, Claude Code, Cursor, Hermes, and Antigravity presence determine auto-enabled destinations and compatibility behavior. |
| Manual reference documentation | module | [Installation](../installation.md), [Skills](../skills.md), and [Agents](../agents.md) provide user-facing procedures and architecture detail without being part of this module's inventory. |
| Checkpoint Core and OpenCode Adapter | modules | Supply the core/runtime/plugin sources copied into the effective OpenCode target and the instruction appended to installed personas. |

## Structure

| Path | Type | Purpose |
|------|------|---------|
| `.gitignore` | file | Excludes local scratch data, private installer configuration, generated artifacts, local OpenCode state, and root runtime `.agent-checkpoints/` logs. |
| `AGENTS.md` | file | Repository-wide architecture, entity model, workflow ownership, artifact layout, design rationale, and development conventions for agents. |
| `CHANGELOG.md` | file | Versioned record of added, changed, and fixed distribution, skill, agent, and workflow behavior. |
| `LICENSE` | file | MIT license grant, attribution, conditions, and warranty/liability disclaimer. |
| `README.md` | file | Public project landing page with purpose, quick start, orchestration model, principles, reference links, and project framing. |
| `config.yaml.example` | file | Optional installer schema; the existing OpenCode home also receives checkpoint plugin/support assets and no new checkpoint key is required. |
| `install.sh` | file | Main distribution program for target detection, skill/agent copying, variants, Cursor extras, and OpenCode checkpoint plugin/instruction installation. |

## Key Symbols

| Symbol | Kind | Visibility | Location | Purpose |
|--------|------|------------|----------|---------|
| `Local scratch / transcripts` | config section | internal | `.gitignore:1` | Ignores the repository-local `tmp/` scratch tree. |
| `User-specific model config` | config section | public | `.gitignore:4` | Keeps the optional, machine-specific `config.yaml` out of version control. |
| `Playwright MCP artifacts` | config section | internal | `.gitignore:7` | Excludes local `.playwright-mcp/` browser artifacts. |
| `Test screenshots` | config section | internal | `.gitignore:10` | Excludes generated PNG screenshots. |
| `OS / editor` | config section | internal | `.gitignore:13` | Excludes macOS, IDE, editor, and local `.opencode/` state. |
| `Project Overview` | section | public | `AGENTS.md:3` | Defines the repository as a meta-project for reusable AI-assisted development workflows. |
| `Core Entities` | section | public | `AGENTS.md:19` | Establishes workspace, planning, and documentation vocabulary used by every workflow. |
| `Architecture Principles` | section | public | `AGENTS.md:39` | Defines file-based persistence, skill-driven delegation, ownership, scalability, and scope discipline. |
| `Design Decisions` | section | public | `AGENTS.md:56` | Records the rationale for phase/implementation-plan separation, workflow-owned writing, one delegate persona, and same-reviewer fixes. |
| `Target Project File Convention` | section | public | `AGENTS.md:101` | Specifies the canonical target-project `docs/` and `plans/` artifact layout. |
| `Development Guidelines` | section | public | `AGENTS.md:126` | Sets repository expectations for entity alignment, modular templates, updateability, phasing, and context limits. |
| `File Conventions` | section | public | `AGENTS.md:135` | Requires Markdown/YAML metadata, plan changelogs, and structured checkbox todos. |
| `0.5.0` | release | public | `CHANGELOG.md:5` | Records the unified delegate, review-fix, Cursor, GPT-5.6, scope-discipline, and macOS installer release. |
| `0.2.0` | release | public | `CHANGELOG.md:26` | Records review workflows, configurable variants, project installs, model injection, and execution-policy changes. |
| `0.1.0` | release | public | `CHANGELOG.md:61` | Records the initial skills, agents, installer, README, and license. |
| `MIT License grant` | license | public | `LICENSE:5` | Grants use, modification, distribution, sublicensing, and sale subject to notice retention. |
| `MIT warranty disclaimer` | license | public | `LICENSE:15` | Disclaims warranties and author/copyright-holder liability. |
| `OpenCode Processing Skills` | section | public | `README.md:1` | Names and summarizes the public project. |
| `Why this exists` | section | public | `README.md:19` | Frames structured docs, multi-session planning, gated execution, persistence, templates, and provider independence. |
| `Quick Start` | section | public | `README.md:35` | Gives the clone, optional config, global/project install, restart, and reference entry points. |
| `How it works` | section | public | `README.md:60` | Summarizes skill activation, role routing, maintainer variants, and file persistence. |
| `Principles` | section | public | `README.md:124` | States deliberate delegation, gated execution, review-context reuse, review discipline, and durable files. |
| `targets` | config | public | `config.yaml.example:64` | Root installer target map; each target uses `enabled` and `home` fields. |
| `targets.opencode` | config | public | `config.yaml.example:65` | Required OpenCode destination, enabled unconditionally by installer policy. |
| `targets.codex` | config | public | `config.yaml.example:69` | Tri-state Codex skills-only destination. |
| `targets.claude` | config | public | `config.yaml.example:73` | Tri-state Claude skills-and-agents destination that also serves Antigravity. |
| `targets.cursor` | config | public | `config.yaml.example:77` | Tri-state Cursor workflow-skill and orchestration destination. |
| `targets.hermes` | config | public | `config.yaml.example:81` | Tri-state Hermes skills-only destination rooted at its home directory. |
| `delegate` | config | public | `config.yaml.example:92` | Base delegate model and provider-option configuration. |
| `retriever` | config | public | `config.yaml.example:95` | Base leaf evidence-worker model and provider-option configuration. |
| `doc-explorer` | config | public | `config.yaml.example:98` | Base doc-explorer model and provider-option configuration. |
| `implementer` | config | public | `config.yaml.example:101` | Base implementer model and provider-option configuration. |
| `legacy-curator` | config | public | `config.yaml.example:104` | Base legacy-curator model configuration using scalar syntax. |
| `additional_delegates` | config | public | `config.yaml.example:132` | Map of suffixes to scalar or object model definitions used to generate delegate aliases. |
| `additional_implementers` | config | public | `config.yaml.example:161` | Map of suffixes to scalar or object model definitions used to generate implementer variants. |
| `PROJECT_MODE` | const | internal | `install.sh:54` | Tracks whether `--project` switches installation from global homes to repository-local OpenCode and optional Cursor paths. |
| `SCRIPT_DIR` | const | internal | `install.sh:76` | Anchors all source and default config paths to the checked-out repository. |
| `CONFIG_FILE` | const | internal | `install.sh:77` | Resolves the YAML source from `OPS_CONFIG_FILE` or the repository-local `config.yaml`. |
| `_yaml_clean` | function | internal | `install.sh:90` | Removes supported inline comments, surrounding whitespace, and matching quotes from scalar values. |
| `yaml_get_root` | function | internal | `install.sh:103` | Reads and cleans an exact root-level scalar key from the optional YAML file. |
| `yaml_get_target` | function | internal | `install.sh:122` | Parses target-field values under `targets` using indentation-aware `awk`. |
| `expand_home` | function | internal | `install.sh:177` | Expands a leading tilde in configured destination paths. |
| `is_enabled` | function | internal | `install.sh:186` | Evaluates true/false/auto target state, with auto based on destination-home existence. |
| `sed_inplace` | function | internal | `install.sh:202` | Provides GNU/BSD-compatible in-place `sed` behavior. |
| `OPENCODE_HOME_RAW / OPENCODE_HOME` | const | internal | `install.sh:226` | Resolves the required OpenCode home from YAML, defaults, and `OPS_OPENCODE_HOME`. |
| `CODEX_HOME_RAW / CODEX_HOME / CODEX_STATE` | const | internal | `install.sh:232` | Resolves Codex destination and tri-state enablement, including `OPS_CODEX_HOME` and `OPS_SYNC_CODEX`. |
| `CLAUDE_HOME_RAW / CLAUDE_HOME / CLAUDE_STATE` | const | internal | `install.sh:241` | Resolves Claude destination and tri-state enablement, including `OPS_CLAUDE_HOME` and `OPS_SYNC_CLAUDE`. |
| `CURSOR_HOME_RAW / CURSOR_HOME / CURSOR_STATE` | const | internal | `install.sh:250` | Resolves Cursor destination and tri-state enablement, including `OPS_CURSOR_HOME` and `OPS_SYNC_CURSOR`. |
| `HERMES_HOME_RAW / HERMES_HOME / HERMES_STATE` | const | internal | `install.sh:259` | Resolves Hermes destination and tri-state enablement, including `OPS_HERMES_HOME` and `OPS_SYNC_HERMES`. |
| `ANTIGRAVITY_PATH` | const | internal | `install.sh:270` | Resolves the detection-only Antigravity path, overridable for tests. |
| `SKILLS_DESTS` | const | internal | `install.sh:273` | Accumulates enabled harness skill destinations for the shared copy loop. |
| `AGENTS_DESTS` | const | internal | `install.sh:274` | Accumulates enabled harness agent destinations for the shared copy and model-injection loop. |
| `HERMES_SKILLS_DEST` | const | internal | `install.sh:307` | Fixes Hermes installation beneath the namespaced `skills/processing` category. |
| `CURSOR_TARGET_HOME` | const | internal | `install.sh:329` | Selects the global or project-local Cursor root that receives orchestration extras. |
| `OPENCODE_TARGET_HOME` | const | internal | `install.sh:330` | Selects configured global OpenCode home or project-local `./.opencode` for checkpoint assets and personas. |
| `get_model_for_agent` | function | internal | `install.sh:354` | Returns only the model token from a parsed root-level agent configuration. |
| `get_agent_config` | function | internal | `install.sh:367` | Parses scalar or object agent syntax and emits a model followed by provider options. |
| `inject_agent_config` | function | internal | `install.sh:491` | Rewrites copied agent frontmatter to replace model/options while preserving the rest of the persona. |
| `get_additional_delegates` | function | internal | `install.sh:554` | Parses scalar and object delegate aliases into suffix, model, and option records. |
| `get_additional_implementers` (first definition) | function | internal | `install.sh:620` | Parses additional implementer records; this definition is later replaced by the same-named definition at line 710. |
| `create_delegate_variant` | function | internal | `install.sh:681` | Copies the canonical delegate persona, rewrites alias metadata, injects model/options, and preserves symlink targets. |
| `get_additional_implementers` (effective definition) | function | internal | `install.sh:710` | Re-declares the implementer parser; as the later Bash definition, this is the version called by installation step 4. |
| `create_implementer_variant` | function | internal | `install.sh:772` | Copies and customizes the implementer persona for a named model/options variant. |
| `CURSOR_SUBAGENT_NAMES` | const | internal | `install.sh:799` | Enumerates canonical agent personas adapted into Cursor subagent Markdown. |
| `cursor_strip_frontmatter` | function | internal | `install.sh:801` | Removes YAML frontmatter when adapting an agent Markdown file for Cursor. |
| `cursor_install_subagents` | function | internal | `install.sh:807` | Installs frontmatter-free canonical personas into Cursor's `subagents/` directory. |
| `cursor_install_ops_bootstrap` | function | internal | `install.sh:832` | Copies the Cursor AGENTS bootstrap snippet while preserving existing symlinks. |
| `cursor_install_orchestrator_skills` | function | internal | `install.sh:851` | Refreshes Cursor orchestrator-skill directories and embeds task-delegation guidance. |
| `cursor_install_project_rule` | function | internal | `install.sh:885` | Copies the optional project-local Cursor orchestrator rule. |
| `cursor_install_extras` | function | internal | `install.sh:903` | Coordinates Cursor subagents, bootstrap, orchestrator skills, and project rule installation. |
| `install_opencode_checkpoint_file` | function | internal | `install.sh:916` | Copies one checkpoint asset while preserving an existing symlink. |
| `required_checkpoint_reader_symlink_error` | function | internal | `install.sh` | Stops loudly with path-specific recovery guidance for a user-managed required reader/core link. |
| `preflight_required_checkpoint_reader` | function | internal | `install.sh` | Performs one validation-only required-path symlink check. |
| `preflight_required_checkpoint_reader_components` | function | internal | `install.sh` | Checks every component below a target base so a symlinked reader ancestor cannot redirect a later copy. |
| `preflight_checkpoint_reader_dependencies` | function | internal | `install.sh` | Checks OpenCode core/watcher plus enabled Codex and Claude bundled-core dependencies before Step 1 mutates targets; its successful shared-reader result also gates Hermes installation. |
| `install_opencode_checkpoint` | function | internal | `install.sh` | Installs shared core and complete watcher readers before runtime/plugin writers. |
| `install_opencode_checkpoint_instruction` | function | internal | `install.sh:1037` | Appends the marked instruction once to ordinary installed OpenCode persona files and aliases. |
| `install_codex_checkpoint` | function | internal | `install.sh` | Installs bundled core before MCP support, status hook, and opt-in profile while preserving base configuration. |
| `install_claude_checkpoint` | function | internal | `install.sh` | Installs the bundled mixed-log core before status-capable hooks/configuration and preserves Claude base settings. |
| `install_hermes_checkpoint` | function | internal | `install.sh` | Installs the Python plugin before applying its additive, opt-in `plugins.enabled` entry. |
| `Argument parsing` | workflow | public | `install.sh:53` | Accepts global mode, `--project`, and help; rejects unknown options before filesystem changes. |
| `Target resolution` | workflow | internal | `install.sh:223` | Applies YAML/default/env precedence and decides which harness destinations are enabled. |
| `Project mode override` | workflow | internal | `install.sh:328` | Replaces global OpenCode destinations with `./.opencode/` and optionally adds `./.cursor/`. |
| `Install Skills` | workflow | internal | `install.sh:1438` | Copies every skill package to each enabled destination, replacing ordinary directories but skipping symlinks. |
| `Hermes category description` | workflow | internal | `install.sh:1467` | Writes global-mode `DESCRIPTION.md` metadata for the Hermes `processing` category unless the path is a symlink. |
| `Install Agents` | workflow | internal | `install.sh:1486` | Copies canonical personas to agent destinations and injects configured models/options. |
| `Create delegate variants` | workflow | internal | `install.sh:1524` | Generates every configured delegate alias in each agent destination. |
| `Create implementer variants` | workflow | internal | `install.sh:1540` | Generates every configured implementer variant in each agent destination. |
| `Install OpenCode checkpoint` | workflow | internal | `install.sh:1556` | Deploys plugin/runtime/dashboard assets and applies the OpenCode-only instruction after aliases exist. |
| `Install Cursor orchestration layer` | workflow | internal | `install.sh:1575` | Adds Cursor-specific personas, bootstrap, orchestrator skills, and optional project rule after shared copies. |
| `Checkpoint upgrade prerequisite` | output | public | `install.sh` | Requires the live dashboard and writer-enabled OpenCode, Codex, Claude Code, and Hermes sessions to quiesce before the first mutation. |
| `Checkpoint watcher launch` | output | public | `install.sh` | Prints the installed watcher path and exact quoted Node launch command before every enabled harness restart instruction. |
| `Nested delegation reminder` | output | public | `install.sh:1604` | Gives version-aware guidance: v1.18.2+ uses top-level `subagent_depth: 2`; older versions omit the unsupported setting. |

## Data Flow

1. A user clones or updates the repository, optionally copies `config.yaml.example` to the ignored `config.yaml`, and invokes `install.sh` globally or with `--project`; the [README quick start](../installation.md#quick-start) is the supported entry path.
2. The installer validates arguments and any explicit `OPS_CONFIG_FILE`, then reads settings with precedence `OPS_*` environment variables, optional YAML, and built-in defaults. It expands homes and evaluates each tri-state target.
3. Enabled targets populate shared skill and agent destination arrays. Project mode replaces global agent/skill paths with `./.opencode/` and may add `./.cursor/`; Hermes stays global-only and uses its `processing` category; Antigravity is detected but served through Claude.
4. Before any target mutation, the installer prints the quiescence prerequisite and validates every component of the required OpenCode core/watcher plus enabled Codex and Claude bundled-core destinations. A symlink at one of those dependencies is preserved but aborts with path-specific update-or-replace-and-rerun guidance; it is never counted as a compatible refresh. Hermes installation and enablement require that same successful shared-reader preflight.
5. Every checked-in skill package is copied to each enabled destination. Agent personas are copied only to agent-capable targets, then configured aliases/variants are generated as before.
6. The effective OpenCode target receives compatible shared core and the complete `checkpoint-watch/{bin,src}` reader tree before the status-capable runtime/plugin. Enabled Codex and Claude targets receive their bundled cores before hooks and activation assets; Hermes plugin files precede its additive enablement. Ordinary unrelated symlink/config guarantees remain unchanged.
7. The summary prints the exact dashboard launch command first, then OpenCode, Codex, Claude Code, and Hermes startup instructions for enabled targets. This completes the enforced operator sequence: quiesce → install readers/writers → start dashboard → restart harnesses. Cursor installation behavior is otherwise unchanged, and the installer does not edit OpenCode runtime JSON/JSONC.

## Configuration

`config.yaml.example` is optional and becomes active only after it is copied to the ignored `config.yaml` or selected through `OPS_CONFIG_FILE`. `targets` entries accept `enabled: true | false | auto` and `home`; OpenCode is always included, and its existing `home` also controls global checkpoint installation. Project mode uses `./.opencode`. No checkpoint-specific setting was added.

Root agent keys accept either `agent: provider/model` or an object with `model` plus arbitrary provider option scalars. `additional_delegates` and `additional_implementers` use the same scalar/object forms, keyed by the suffix added to the generated persona name. The example exposes `reasoningEffort`, `temperature`, `top_p`, and `maxTokens`, while the installer forwards any non-empty option key/value it parses.

Environment entry points are `OPS_CONFIG_FILE`, `OPS_OPENCODE_HOME`, `OPS_CODEX_HOME`, `OPS_CLAUDE_HOME`, `OPS_CURSOR_HOME`, `OPS_HERMES_HOME`, `OPS_SYNC_CODEX`, `OPS_SYNC_CLAUDE`, `OPS_SYNC_CURSOR`, `OPS_SYNC_HERMES`, and the test-oriented `OPS_ANTIGRAVITY_PATH`. Detailed target behavior, Claude/Antigravity prerequisites, Cursor adaptation, Hermes limitations, symlink handling, and examples remain canonical in the [Installation Guide](../installation.md).

## Inventory Notes

- **Coverage**: full
- **Notes**: The Structure inventory is restricted to the seven explicitly assigned tracked root files and was checked with `git ls-files`; repository subdirectories and other root files are outside this module. Key Symbols enumerate the meaningful Markdown/config entry points plus every Bash function definition, both occurrences of the duplicated `get_additional_implementers` definition, the important resolved-path/destination constants, and each top-level installation phase with exact 1-based locations. Manual pages under `docs/` were used as source references but intentionally excluded from the inventory.
