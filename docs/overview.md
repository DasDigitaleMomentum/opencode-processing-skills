---
type: documentation
entity: project-overview
version: 1.7
---

# OpenCode Processing Skills

## Purpose

OpenCode Processing Skills is a distributable collection of agent personas, workflow skills, and artifact templates for documentation, persistent planning, independent review, and gated implementation. It keeps durable project knowledge in `docs/` and `plans/`, while focused subagents perform exploration or execution without making chat history the system of record.

## Architecture

The repository has three cooperating planes. The workflow plane defines skills, artifact templates, and agent responsibilities; the distribution plane resolves local configuration and installs those definitions into supported AI-development harnesses; the checkpoint plane provides a dependency-free eight-field current JSONL contract, backward-compatible six-field parsing, selected-log inspection, and adapters for OpenCode, Codex, Claude Code, and Hermes. Current records add nullable `agent` and point-in-time `session_title` metadata; legacy records normalize both to `null` when read. Adapter feedback reports input usage against the common 372k operational limit, input K-tokens, and remaining input K-tokens wherever defensible, with explicit previous-step/latest-snapshot lag semantics and honest unknowns. The historical `context_used` key stores the current input fraction; older logs may retain its former context-fraction meaning.

The module inventories cover operational source under `agents/`, `skills/`, `cursor/`, `packages/checkpoint-core/`, `opencode/`, and the root distribution boundary. Tracked `plans/**` files are project-management artifacts rather than an implementation module; `docs/agents.md`, `docs/installation.md`, and `docs/skills.md` are manually maintained source references and are intentionally not re-inventoried as implementation.

### System Diagram

```text
                     source repository
       +-------------------------------------------+
       | skills/ + agents/ + cursor/ + config     |
       +---------------------+---------------------+
                             |
                       install.sh
                             |
       +----------+----------+----------+----------+
       |          |          |          |          |
    OpenCode    Codex     Claude      Cursor     Hermes
    skills +    skills    skills +    skills +   skills
    agents                 agents      adapter    category

user request -> orchestrator -> matching skill -> scoped subagent
                                      |
                                      +-> leaf evidence retrieval
                                      +-> docs/ or plans/ artifact
                                      +-> gated code change + digest
```

### Tech Stack

- **Bash** provides the dependency-light installer, configuration parsing, target detection, file synchronization, and generated agent variants.
- **Markdown with YAML frontmatter** defines agent personas, skills, templates, and durable artifacts.
- **YAML** in `config.yaml` selects targets, homes, models, and optional agent variants; the tracked `config.yaml.example` documents the supported subset.
- **Core Unix tools** (`grep`, `awk`, `sed`, and coreutils) are the installer's only runtime dependencies.
- **Node.js ESM and built-ins** implement the dependency-free checkpoint core, inspection command, and `node:test` coverage; no repository-wide build or package installation is required.
- **scriptc** is an optional experimental global-install enhancement. When already available with its compiler prerequisites, it builds the staged watcher into a smoke-tested native executable; Node remains the portable source and fallback.
- **TypeScript/JavaScript OpenCode plugin APIs** expose `checkpoint` and `checkpoint_path` through the installed shim.

## Modules

| Module | Description | Documentation |
|--------|-------------|---------------|
| Agent Personas | Native maintainer, retrieval, delegate, documentation, execution, and legacy-curation role contracts. | [Detail](modules/agent-personas.md) |
| Workflow Skills | Self-contained workflows and normative templates for documentation, planning, review, execution, and handover. | [Detail](modules/workflow-skills.md) |
| Cursor Adapter | Cursor-specific orchestration skills, subagent mapping, bootstrap guidance, and project-rule template. | [Detail](modules/cursor-adapter.md) |
| Installation and Configuration | Multi-target synchronization, target/model resolution, variant generation, and repository-level distribution metadata. | [Detail](modules/installation-and-configuration.md) |
| Checkpoint Core | Eight-field current/six-field legacy JSONL contract, safe paths, append-only persistence, count-based analysis, selected-log inspection, old-row-aware live/one-shot dashboard, optional native smoke coverage, fixtures, and tests. | [Detail](modules/checkpoint-core.md) |
| OpenCode Checkpoint Adapter | Native tools, agent/title snapshots, previous-completed-step input usage/K-tokens/headroom, honest fallback, and OpenCode-only persona instruction. | [Detail](modules/opencode-checkpoint-adapter.md) |

## Key Features

| Feature | Description | Documentation |
|---------|-------------|---------------|
| Multi-target installation | Resolves layered configuration and installs skills, agents, or adapters into each supported harness. | [Detail](features/multi-target-installation.md) |
| Documentation lifecycle | Generates structured initial docs and later refreshes only the affected inventories and references. | [Detail](features/documentation-lifecycle.md) |
| Persistent planning lifecycle | Confirms and persists the smallest complete plan, then authors traceable implementation plans and creates downstream artifacts on demand. | [Detail](features/persistent-planning-lifecycle.md) |
| Gated work-package execution | Separates an implementation blueprint, explicit gate, stateful execution, and compact result digest. | [Detail](features/gated-work-package-execution.md) |
| Independent review and remediation | Produces optional exception-only reviews of gaps and unnecessary work that become binding once invoked, then routes accepted findings through one bounded remediation pass without automatic re-review. | [Detail](features/independent-review-and-remediation.md) |
| Agent checkpoint heartbeat | Records chained progress and failed attempts, inspects one selected log, and watches direct workspace logs in a checkpoint-age dashboard. | [Detail](agent-checkpoint-heartbeat.md) |

## Development

### Setup

Clone the repository. A local `config.yaml` is optional; copy `config.yaml.example` only when target or model defaults need customization. The complete supported setup and precedence rules live in the [installation guide](installation.md).

### Build & Run

There is no required compilation step. `./install.sh` performs a global synchronization and installs the OpenCode checkpoint plugin/support/dashboard files; if an existing `scriptc` passes disposable coverage/build plus native snapshot and live smokes, it also atomically installs `$HOME/.local/bin/checkpoint-watch`. `./install.sh --project` creates project-local OpenCode output and, when enabled, project-local Cursor output without probing scriptc or changing the global binary. The installer prints the exact preferred dashboard launch command and, after native success, the exact Node fallback; source-tree live mode is `node packages/checkpoint-core/bin/checkpoint-watch.js`. See the [dashboard quickstart](installation.md#checkpoint-dashboard-quickstart) and [Agents](agents.md).

### Testing

Checkpoint behavior and OpenCode installation have automated Node tests. Run `node --test packages/checkpoint-core/test/*.test.js opencode/test/*.test.mjs` and `bash -n install.sh`; the suite uses temporary worktrees/homes and covers the five pilot scenarios, raw-log immutability, global/project installs, persona instructions, and symlink preservation.

## References

- [Installation guide](installation.md) — maintained user-facing target and configuration instructions.
- [Agents reference](agents.md) — maintained role and delegation reference.
- [Skills reference](skills.md) — maintained workflow catalog and planning lifecycle.
- [Architecture rationale](../AGENTS.md) — entity model, ownership rules, and design decisions.
- [Project README](../README.md) — project positioning and quick start.
