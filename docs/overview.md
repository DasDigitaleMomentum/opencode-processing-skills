---
type: documentation
entity: project-overview
version: 1.0
---

# OpenCode Processing Skills

## Purpose

OpenCode Processing Skills is a distributable collection of agent personas, workflow skills, and artifact templates for documentation, persistent planning, independent review, and gated implementation. It keeps durable project knowledge in `docs/` and `plans/`, while focused subagents perform exploration or execution without making chat history the system of record.

## Architecture

The repository has two cooperating planes. The workflow plane defines skills, artifact templates, and agent responsibilities; the distribution plane resolves local configuration and installs those definitions into supported AI-development harnesses. OpenCode and Claude receive native agent personas, Cursor receives an adapter layer, and skills-only targets receive the reusable workflow packages without unsupported persona semantics.

The module inventories cover every tracked operational source under `agents/`, `skills/`, `cursor/`, and the root distribution boundary. Tracked `plans/**` files are project-management artifacts rather than an implementation module; `docs/agents.md`, `docs/installation.md`, and `docs/skills.md` are manually maintained source references and are intentionally not re-inventoried as implementation.

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
                                      +-> docs/ or plans/ artifact
                                      +-> gated code change + digest
```

### Tech Stack

- **Bash** provides the dependency-light installer, configuration parsing, target detection, file synchronization, and generated agent variants.
- **Markdown with YAML frontmatter** defines agent personas, skills, templates, and durable artifacts.
- **YAML** in `config.yaml` selects targets, homes, models, and optional agent variants; the tracked `config.yaml.example` documents the supported subset.
- **Core Unix tools** (`grep`, `awk`, `sed`, and coreutils) are the installer's only runtime dependencies.

## Modules

| Module | Description | Documentation |
|--------|-------------|---------------|
| Agent Personas | Native maintainer, delegate, documentation, execution, and legacy-curation role contracts. | [Detail](modules/agent-personas.md) |
| Workflow Skills | Self-contained workflows and normative templates for documentation, planning, review, execution, and handover. | [Detail](modules/workflow-skills.md) |
| Cursor Adapter | Cursor-specific orchestration skills, subagent mapping, bootstrap guidance, and project-rule template. | [Detail](modules/cursor-adapter.md) |
| Installation and Configuration | Multi-target synchronization, target/model resolution, variant generation, and repository-level distribution metadata. | [Detail](modules/installation-and-configuration.md) |

## Key Features

| Feature | Description | Documentation |
|---------|-------------|---------------|
| Multi-target installation | Resolves layered configuration and installs skills, agents, or adapters into each supported harness. | [Detail](features/multi-target-installation.md) |
| Documentation lifecycle | Generates structured initial docs and later refreshes only the affected inventories and references. | [Detail](features/documentation-lifecycle.md) |
| Persistent planning lifecycle | Persists objectives, phases, implementation plans, todos, and handovers across sessions. | [Detail](features/persistent-planning-lifecycle.md) |
| Gated work-package execution | Separates an implementation blueprint, explicit gate, stateful execution, and compact result digest. | [Detail](features/gated-work-package-execution.md) |
| Independent review and remediation | Produces optional evidence-backed quality gates and reuses reviewer context for accepted fixes. | [Detail](features/independent-review-and-remediation.md) |

## Development

### Setup

Clone the repository. A local `config.yaml` is optional; copy `config.yaml.example` only when target or model defaults need customization. The complete supported setup and precedence rules live in the [installation guide](installation.md).

### Build & Run

There is no compilation step. `./install.sh` performs a global synchronization, while `./install.sh --project` creates project-local OpenCode output and, when enabled, project-local Cursor output. See [Installation](installation.md) for target-specific behavior and [Agents](agents.md) for the installed roles.

### Testing

The repository currently tracks no automated test suite. Changes should at minimum pass `bash -n install.sh`, Markdown/frontmatter checks appropriate to the changed artifacts, link validation, and an isolated installer smoke test with temporary target homes before release.

## References

- [Installation guide](installation.md) — maintained user-facing target and configuration instructions.
- [Agents reference](agents.md) — maintained role and delegation reference.
- [Skills reference](skills.md) — maintained workflow catalog and planning lifecycle.
- [Architecture rationale](../AGENTS.md) — entity model, ownership rules, and design decisions.
- [Project README](../README.md) — project positioning and quick start.
