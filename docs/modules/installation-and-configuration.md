---
type: documentation
entity: module
module: "installation-and-configuration"
version: 1.1
---

# Module: Installation and Configuration

> Part of [OpenCode Processing Skills](../overview.md)

## Overview

The root distribution surface explains the project, establishes repository-wide conventions, exposes the optional installer schema, and installs skills and agent definitions into supported harness locations. `install.sh` is a dependency-light Bash entry point with environment-over-YAML-over-default precedence, global and project-local modes, model/frontmatter injection, generated agent variants, symlink preservation, and target-specific behavior. The operational walkthrough and compatibility caveats remain in the [Installation Guide](../installation.md).

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

## Structure

| Path | Type | Purpose |
|------|------|---------|
| `.gitignore` | file | Excludes local scratch data, private installer configuration, generated browser/test images, editor state, and local OpenCode state from version control. |
| `AGENTS.md` | file | Repository-wide architecture, entity model, workflow ownership, artifact layout, design rationale, and development conventions for agents. |
| `CHANGELOG.md` | file | Versioned record of added, changed, and fixed distribution, skill, agent, and workflow behavior. |
| `LICENSE` | file | MIT license grant, attribution, conditions, and warranty/liability disclaimer. |
| `README.md` | file | Public project landing page with purpose, quick start, orchestration model, principles, reference links, and project framing. |
| `config.yaml.example` | file | Optional installer schema and example target, base-agent model, delegate-variant, and implementer-variant values. |
| `install.sh` | file | Main distribution program for target detection, configuration parsing, skill/agent copying, model injection, variant generation, Cursor extras, and Hermes category metadata. |

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
| `Design Decisions` | section | public | `AGENTS.md:54` | Records the rationale for phase/implementation-plan separation, workflow-owned writing, one delegate persona, and same-reviewer fixes. |
| `Target Project File Convention` | section | public | `AGENTS.md:99` | Specifies the canonical target-project `docs/` and `plans/` artifact layout. |
| `Development Guidelines` | section | public | `AGENTS.md:124` | Sets repository expectations for entity alignment, modular templates, updateability, phasing, and context limits. |
| `File Conventions` | section | public | `AGENTS.md:133` | Requires Markdown/YAML metadata, plan changelogs, and structured checkbox todos. |
| `0.5.0` | release | public | `CHANGELOG.md:5` | Records the unified delegate, review-fix, Cursor, GPT-5.6, scope-discipline, and macOS installer release. |
| `0.2.0` | release | public | `CHANGELOG.md:26` | Records review workflows, configurable variants, project installs, model injection, and execution-policy changes. |
| `0.1.0` | release | public | `CHANGELOG.md:61` | Records the initial skills, agents, installer, README, and license. |
| `MIT License grant` | license | public | `LICENSE:5` | Grants use, modification, distribution, sublicensing, and sale subject to notice retention. |
| `MIT warranty disclaimer` | license | public | `LICENSE:15` | Disclaims warranties and author/copyright-holder liability. |
| `OpenCode Processing Skills` | section | public | `README.md:1` | Names and summarizes the public project. |
| `Why this exists` | section | public | `README.md:19` | Frames structured docs, multi-session planning, gated execution, persistence, templates, and provider independence. |
| `Quick Start` | section | public | `README.md:34` | Gives the clone, optional config, global/project install, restart, and reference entry points. |
| `How it works` | section | public | `README.md:52` | Summarizes skill activation, role routing, maintainer variants, and file persistence. |
| `Principles` | section | public | `README.md:80` | States deliberate delegation, gated execution, review-context reuse, review discipline, and durable files. |
| `targets` | config | public | `config.yaml.example:48` | Root installer target map; each target uses `enabled` and `home` fields. |
| `targets.opencode` | config | public | `config.yaml.example:49` | Required OpenCode destination, enabled unconditionally by installer policy. |
| `targets.codex` | config | public | `config.yaml.example:53` | Tri-state Codex skills-only destination. |
| `targets.claude` | config | public | `config.yaml.example:57` | Tri-state Claude skills-and-agents destination that also serves Antigravity. |
| `targets.cursor` | config | public | `config.yaml.example:61` | Tri-state Cursor workflow-skill and orchestration destination. |
| `targets.hermes` | config | public | `config.yaml.example:65` | Tri-state Hermes skills-only destination rooted at its home directory. |
| `delegate` | config | public | `config.yaml.example:76` | Base delegate model and provider-option configuration. |
| `retriever` | config | public | `config.yaml.example:79` | Base leaf evidence-worker model and provider-option configuration. |
| `doc-explorer` | config | public | `config.yaml.example:82` | Base doc-explorer model and provider-option configuration. |
| `implementer` | config | public | `config.yaml.example:85` | Base implementer model and provider-option configuration. |
| `legacy-curator` | config | public | `config.yaml.example:88` | Base legacy-curator model configuration using scalar syntax. |
| `additional_delegates` | config | public | `config.yaml.example:116` | Map of suffixes to scalar or object model definitions used to generate delegate aliases. |
| `additional_implementers` | config | public | `config.yaml.example:145` | Map of suffixes to scalar or object model definitions used to generate implementer variants. |
| `PROJECT_MODE` | const | internal | `install.sh:50` | Tracks whether `--project` switches installation from global homes to repository-local OpenCode and optional Cursor paths. |
| `SCRIPT_DIR` | const | internal | `install.sh:72` | Anchors all source and default config paths to the checked-out repository. |
| `CONFIG_FILE` | const | internal | `install.sh:73` | Resolves the YAML source from `OPS_CONFIG_FILE` or the repository-local `config.yaml`. |
| `_yaml_clean` | function | internal | `install.sh:86` | Removes supported inline comments, surrounding whitespace, and matching quotes from scalar values. |
| `yaml_get_root` | function | internal | `install.sh:99` | Reads and cleans an exact root-level scalar key from the optional YAML file. |
| `yaml_get_target` | function | internal | `install.sh:118` | Parses target-field values under `targets` using indentation-aware `awk`. |
| `expand_home` | function | internal | `install.sh:173` | Expands a leading tilde in configured destination paths. |
| `is_enabled` | function | internal | `install.sh:182` | Evaluates true/false/auto target state, with auto based on destination-home existence. |
| `sed_inplace` | function | internal | `install.sh:198` | Provides GNU/BSD-compatible in-place `sed` behavior. |
| `OPENCODE_HOME_RAW / OPENCODE_HOME` | const | internal | `install.sh:222` | Resolves the required OpenCode home from YAML, defaults, and `OPS_OPENCODE_HOME`. |
| `CODEX_HOME_RAW / CODEX_HOME / CODEX_STATE` | const | internal | `install.sh:228` | Resolves Codex destination and tri-state enablement, including `OPS_CODEX_HOME` and `OPS_SYNC_CODEX`. |
| `CLAUDE_HOME_RAW / CLAUDE_HOME / CLAUDE_STATE` | const | internal | `install.sh:237` | Resolves Claude destination and tri-state enablement, including `OPS_CLAUDE_HOME` and `OPS_SYNC_CLAUDE`. |
| `CURSOR_HOME_RAW / CURSOR_HOME / CURSOR_STATE` | const | internal | `install.sh:246` | Resolves Cursor destination and tri-state enablement, including `OPS_CURSOR_HOME` and `OPS_SYNC_CURSOR`. |
| `HERMES_HOME_RAW / HERMES_HOME / HERMES_STATE` | const | internal | `install.sh:255` | Resolves Hermes destination and tri-state enablement, including `OPS_HERMES_HOME` and `OPS_SYNC_HERMES`. |
| `ANTIGRAVITY_PATH` | const | internal | `install.sh:266` | Resolves the detection-only Antigravity path, overridable for tests. |
| `SKILLS_DESTS` | const | internal | `install.sh:269` | Accumulates enabled harness skill destinations for the shared copy loop. |
| `AGENTS_DESTS` | const | internal | `install.sh:270` | Accumulates enabled harness agent destinations for the shared copy and model-injection loop. |
| `HERMES_SKILLS_DEST` | const | internal | `install.sh:301` | Fixes Hermes installation beneath the namespaced `skills/processing` category. |
| `CURSOR_TARGET_HOME` | const | internal | `install.sh:323` | Selects the global or project-local Cursor root that receives orchestration extras. |
| `get_model_for_agent` | function | internal | `install.sh:346` | Returns only the model token from a parsed root-level agent configuration. |
| `get_agent_config` | function | internal | `install.sh:359` | Parses scalar or object agent syntax and emits a model followed by provider options. |
| `inject_agent_config` | function | internal | `install.sh:483` | Rewrites copied agent frontmatter to replace model/options while preserving the rest of the persona. |
| `get_additional_delegates` | function | internal | `install.sh:546` | Parses scalar and object delegate aliases into suffix, model, and option records. |
| `get_additional_implementers` (first definition) | function | internal | `install.sh:612` | Parses additional implementer records; this definition is later replaced by the same-named definition at line 702. |
| `create_delegate_variant` | function | internal | `install.sh:673` | Copies the canonical delegate persona, rewrites alias metadata, injects model/options, and preserves symlink targets. |
| `get_additional_implementers` (effective definition) | function | internal | `install.sh:702` | Re-declares the implementer parser; as the later Bash definition, this is the version called by installation step 4. |
| `create_implementer_variant` | function | internal | `install.sh:764` | Copies and customizes the implementer persona for a named model/options variant. |
| `CURSOR_SUBAGENT_NAMES` | const | internal | `install.sh:791` | Enumerates canonical agent personas adapted into Cursor subagent Markdown. |
| `cursor_strip_frontmatter` | function | internal | `install.sh:793` | Removes YAML frontmatter when adapting an agent Markdown file for Cursor. |
| `cursor_install_subagents` | function | internal | `install.sh:799` | Installs frontmatter-free canonical personas into Cursor's `subagents/` directory. |
| `cursor_install_ops_bootstrap` | function | internal | `install.sh:824` | Copies the Cursor AGENTS bootstrap snippet while preserving existing symlinks. |
| `cursor_install_orchestrator_skills` | function | internal | `install.sh:843` | Refreshes Cursor orchestrator-skill directories and embeds task-delegation guidance. |
| `cursor_install_project_rule` | function | internal | `install.sh:877` | Copies the optional project-local Cursor orchestrator rule. |
| `cursor_install_extras` | function | internal | `install.sh:895` | Coordinates Cursor subagents, bootstrap, orchestrator skills, and project rule installation. |
| `Argument parsing` | workflow | public | `install.sh:49` | Accepts global mode, `--project`, and help; rejects unknown options before filesystem changes. |
| `Target resolution` | workflow | internal | `install.sh:219` | Applies YAML/default/env precedence and decides which harness destinations are enabled. |
| `Project mode override` | workflow | internal | `install.sh:322` | Replaces global OpenCode destinations with `./.opencode/` and optionally adds `./.cursor/`. |
| `Install Skills` | workflow | internal | `install.sh:908` | Copies every skill package to each enabled destination, replacing ordinary directories but skipping symlinks. |
| `Hermes category description` | workflow | internal | `install.sh:937` | Writes global-mode `DESCRIPTION.md` metadata for the Hermes `processing` category unless the path is a symlink. |
| `Install Agents` | workflow | internal | `install.sh:956` | Copies canonical personas to agent destinations and injects configured models/options. |
| `Create delegate variants` | workflow | internal | `install.sh:994` | Generates every configured delegate alias in each agent destination. |
| `Create implementer variants` | workflow | internal | `install.sh:1010` | Generates every configured implementer variant in each agent destination. |
| `Install Cursor orchestration layer` | workflow | internal | `install.sh:1026` | Adds Cursor-specific personas, bootstrap, orchestrator skills, and optional project rule after shared copies. |
| `Nested delegation reminder` | output | public | `install.sh:1048` | Reminds users to set top-level OpenCode `subagent_depth: 2` without modifying runtime JSON/JSONC. |

## Data Flow

1. A user clones or updates the repository, optionally copies `config.yaml.example` to the ignored `config.yaml`, and invokes `install.sh` globally or with `--project`; the [README quick start](../installation.md#quick-start) is the supported entry path.
2. The installer validates arguments and any explicit `OPS_CONFIG_FILE`, then reads settings with precedence `OPS_*` environment variables, optional YAML, and built-in defaults. It expands homes and evaluates each tri-state target.
3. Enabled targets populate shared skill and agent destination arrays. Project mode replaces global agent/skill paths with `./.opencode/` and may add `./.cursor/`; Hermes stays global-only and uses its `processing` category; Antigravity is detected but served through Claude.
4. Every checked-in skill package is copied to each skill destination. Agent personas are copied only to agent-capable targets, then `get_agent_config` and `inject_agent_config` apply base model/provider options. Configured delegate aliases and implementer variants are generated from canonical personas.
5. Cursor receives its additional adapted subagents, bootstrap, orchestrator skills, and optional project rule. Hermes receives category metadata. Existing destination symlinks are skipped throughout, and the installer prints the applied config, target-specific next steps, and an OpenCode nested-delegation reminder; it does not edit runtime JSON/JSONC.

## Configuration

`config.yaml.example` is optional and becomes active only after it is copied to the ignored `config.yaml` or selected through `OPS_CONFIG_FILE`. `targets` entries accept `enabled: true | false | auto` and `home`; OpenCode is always included, while auto enables another target only when its home exists. The parser expects the documented two-space target indentation and four-space field indentation.

Root agent keys accept either `agent: provider/model` or an object with `model` plus arbitrary provider option scalars. `additional_delegates` and `additional_implementers` use the same scalar/object forms, keyed by the suffix added to the generated persona name. The example exposes `reasoningEffort`, `temperature`, `top_p`, and `maxTokens`, while the installer forwards any non-empty option key/value it parses.

Environment entry points are `OPS_CONFIG_FILE`, `OPS_OPENCODE_HOME`, `OPS_CODEX_HOME`, `OPS_CLAUDE_HOME`, `OPS_CURSOR_HOME`, `OPS_HERMES_HOME`, `OPS_SYNC_CODEX`, `OPS_SYNC_CLAUDE`, `OPS_SYNC_CURSOR`, `OPS_SYNC_HERMES`, and the test-oriented `OPS_ANTIGRAVITY_PATH`. Detailed target behavior, Claude/Antigravity prerequisites, Cursor adaptation, Hermes limitations, symlink handling, and examples remain canonical in the [Installation Guide](../installation.md).

## Inventory Notes

- **Coverage**: full
- **Notes**: The Structure inventory is restricted to the seven explicitly assigned tracked root files and was checked with `git ls-files`; repository subdirectories and other root files are outside this module. Key Symbols enumerate the meaningful Markdown/config entry points plus every Bash function definition, both occurrences of the duplicated `get_additional_implementers` definition, the important resolved-path/destination constants, and each top-level installation phase with exact 1-based locations. Manual pages under `docs/` were used as source references but intentionally excluded from the inventory.
