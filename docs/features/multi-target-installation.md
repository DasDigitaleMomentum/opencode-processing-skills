---
type: documentation
entity: feature
feature: "multi-target-installation"
version: 1.0
---

# Feature: Multi-Target Installation

> Part of [OpenCode Processing Skills](../overview.md)

## Summary

Users run one installer to synchronize the repository's skills and compatible agent/orchestration assets into OpenCode, Codex, Claude Code, Cursor, and Hermes. Target selection can be automatic, pinned in a local configuration file, or overridden for one invocation through `OPS_*` environment variables.

## How It Works

The installer treats OpenCode as the required base target, then adds optional destinations according to each target's tri-state setting and home-directory presence. Shared workflow skills are copied to every enabled destination, while native agents, Cursor adapters, and the Hermes category descriptor are emitted only where their host semantics support them.

### User Flow

1. The user optionally copies `config.yaml.example` to the gitignored `config.yaml` and selects target homes, enablement states, or agent models.
2. The user runs `./install.sh` for global destinations or `./install.sh --project` for repository-local OpenCode and optional Cursor output.
3. The installer reports enabled targets, copied assets, generated variants, preserved symlinks, and target-specific extras.
4. The user restarts or refreshes the target harness so it discovers the installed skills and agents.

### Technical Flow

1. Argument parsing and `CONFIG_FILE` resolution select global or project mode and enforce an explicitly named configuration file (`install.sh:49`, `install.sh:72`).
2. `yaml_get_target` and `is_enabled` combine built-in defaults, `config.yaml`, and `OPS_*` overrides into concrete target homes and states (`install.sh:118`, `install.sh:182`, `install.sh:219`).
3. Destination arrays are built by capability: skills for all enabled targets, agents for OpenCode and Claude, a namespaced `skills/processing` destination for Hermes, and a Cursor home for adapter output (`install.sh:268`, `install.sh:296`, `install.sh:322`).
4. The shared install loops replace ordinary destination directories, preserve symlinks, copy skills and agents, and inject configured model options (`install.sh:908`, `install.sh:956`).
5. `cursor_install_extras` installs stripped subagent personas, bootstrap material, orchestrator skills, and the project rule where applicable (`install.sh:895`).
6. Global Hermes installs add `DESCRIPTION.md` to label the `processing` category in Hermes discovery (`install.sh:937`).

## Implementation

| Module | Symbols | Role |
|--------|---------|------|
| [Installation and Configuration](../modules/installation-and-configuration.md) | `yaml_get_target` (`install.sh:118`), `is_enabled` (`install.sh:182`), target resolution (`install.sh:219`), shared install loops (`install.sh:908`, `install.sh:956`) | Resolves layered settings and synchronizes shared skills and native agents. |
| [Installation and Configuration](../modules/installation-and-configuration.md) | `get_agent_config` (`install.sh:359`), `create_delegate_variant` (`install.sh:673`), `create_implementer_variant` (`install.sh:764`) | Parses model settings and generates configured model variants from canonical personas. |
| [Cursor Adapter](../modules/cursor-adapter.md) | `cursor_install_extras` (`install.sh:895`), Role to Task mapping (`cursor/task-delegation.md:5`) | Adapts native responsibilities and delegation to Cursor's skills, subagents, and rules layout. |
| [Workflow Skills](../modules/workflow-skills.md) | `generate-docs` (`skills/generate-docs/SKILL.md:2`), `create-plan` (`skills/create-plan/SKILL.md:2`), `execute-work-package` (`skills/execute-work-package/SKILL.md:2`) | Represents the self-contained workflow packages copied with the rest of `skills/` to every enabled skills destination. |

## Configuration

The tracked `config.yaml.example` defines each target's `enabled` and `home` fields, per-agent model/options blocks, `additional_delegates`, and `additional_implementers`. Matching `OPS_*` variables take precedence for one run. Exact keys, target defaults, and examples are maintained in [Installation](../installation.md#configuration-layers).

## Edge Cases & Limitations

- `auto` enables a target only when its configured home already exists; an unknown state warns and falls back to the same behavior.
- `--project` deliberately suppresses global Codex, Claude, and Hermes synchronization; Cursor project output is added only when its target is enabled.
- Existing destination symlinks are preserved, but ordinary skill directories are replaced during synchronization.
- The built-in YAML reader supports the documented scalar/object shapes and requires the documented indentation; it is not a general YAML parser.
- Hermes receives parseable, discoverable skill packages only. OpenCode-specific agents, `Task` calls, and `task_id` continuation semantics are not ported.
- Antigravity has no independent destination and depends on the Claude target used by its Claude Code extension.

## Related Features

- [Documentation Lifecycle](documentation-lifecycle.md)
- [Persistent Planning Lifecycle](persistent-planning-lifecycle.md)
- [Gated Work-Package Execution](gated-work-package-execution.md)
