# Installation

## Quick Start

```bash
git clone git@github.com:DasDigitaleMomentum/opencode-processing-skills.git
cd opencode-processing-skills
cp config.yaml.example config.yaml         # optional: configure targets and models
./install.sh
```

The installer auto-detects which harnesses to sync into. Out of the box:

- **OpenCode** (always): skills + agents to `~/.config/opencode/`
- **Codex** (if `~/.codex/` exists): skills to `~/.codex/skills/`
- **Claude Code** (if `~/.claude/` exists): skills + agents to `~/.claude/`
- **Cursor** (if `~/.cursor/` exists): adapted skills + orchestrator to `~/.cursor/skills/`
- **Hermes** (if `~/.hermes/` exists): skills to `~/.hermes/skills/processing/` (a namespaced category dir — Hermes discovers `SKILL.md` files recursively and shows top-level dirs as categories)
- **Antigravity**: served transitively by the Claude Code target (it loads skills through the bundled `anthropic.claude-code` extension, which reads from the same path)

Hermes is a target for installation, parsing, and discovery only; installing the skills does not port their OpenCode-specific delegate personas, `Task` calls, or `task_id` continuation contracts to Hermes.

After installation, restart OpenCode and select the `@maintainer` agent. It knows when to load which skill and how to delegate to the right subagent.

---

## Configuration Layers

The installer resolves settings in this order (highest wins):

| Layer | What it's for | Persistence |
|---|---|---|
| `OPS_*` env vars | Test/CI overrides, one-shot runs | session-local |
| `config.yaml` | Your persistent setup | committed to *your* machine (gitignored) |
| Built-in defaults | Works on a fresh clone with zero config | n/a |

`config.yaml` is optional. A freshly cloned repo without any config still does the right thing via auto-detect. Use `config.yaml` when you want to pin a specific state (e.g. "always install Claude, never install Codex regardless of directory presence").

### Targets in `config.yaml`

```yaml
targets:
  opencode:
    enabled: true            # required target
    home: ~/.config/opencode
  codex:
    enabled: auto            # true | false | auto (= on iff dir exists)
    home: ~/.codex
  claude:
    enabled: auto
    home: ~/.claude          # also serves Antigravity via claude-code ext
```

### `OPS_*` environment overrides

Use these when you need to override `config.yaml` for one run — typically in tests, CI, or when debugging. They all take the same tri-state as the YAML: `true | false | auto`.

| Variable | Overrides |
|---|---|
| `OPS_SYNC_CODEX` | `targets.codex.enabled` |
| `OPS_SYNC_CLAUDE` | `targets.claude.enabled` |
| `OPS_SYNC_CURSOR` | `targets.cursor.enabled` |
| `OPS_SYNC_HERMES` | `targets.hermes.enabled` |
| `OPS_OPENCODE_HOME` | `targets.opencode.home` |
| `OPS_CODEX_HOME` | `targets.codex.home` |
| `OPS_CLAUDE_HOME` | `targets.claude.home` |
| `OPS_CURSOR_HOME` | `targets.cursor.home` |
| `OPS_HERMES_HOME` | `targets.hermes.home` |
| `OPS_CONFIG_FILE` | path to an alternate `config.yaml` |
| `OPS_ANTIGRAVITY_PATH` | Antigravity detection path (test-only) |

All env vars use an `OPS_` prefix to avoid name collisions with tool-native variables like `CLAUDE_HOME` (which Claude Code CLI itself may set).

Examples:

```bash
OPS_SYNC_CLAUDE=false ./install.sh                    # skip Claude for this run
OPS_CLAUDE_HOME=$(mktemp -d) ./install.sh             # install into a sandbox
OPS_CONFIG_FILE=/tmp/test.yaml ./install.sh           # use an alternate config
```

---

## Model Configuration

By default, subagents use whatever model your OpenCode provider assigns. To run subagents on a specific model, copy `config.yaml.example` to `config.yaml` and set a model per agent:

```yaml
delegate:
  model: openai/gpt-5.6-sol
  reasoningEffort: medium
retriever:
  model: openai/gpt-5.6-luna
  reasoningEffort: high
doc-explorer:
  model: openai/gpt-5.6-sol
  reasoningEffort: medium
implementer:
  model: openai/gpt-5.6-sol
  reasoningEffort: medium
legacy-curator: openai/gpt-5.6-luna
```

Leave an agent out (or set it to empty) to keep the provider default. Re-run `./install.sh` after changing the config.

`config.yaml` is gitignored – it's your local choice, not the repo's.

### Nested Delegation (OpenCode)

Maintainers can call `retriever` at level 1; delegates, reviewers, and implementers can call `retriever` at level 2. Delegates may also call documentation-oriented `doc-explorer` at level 2. Enable this with the top-level OpenCode runtime setting `subagent_depth: 2` (the JSON/JSONC equivalent is `"subagent_depth": 2`).

`install.sh` only prints this reminder after installation. It does not locate or modify OpenCode runtime JSON/JSONC.

When supported by the runtime, agents prefer a batch/CodeMode facility or a small read-only extraction script, then use `retriever` when a separate context helps. Parallel tool calls are the fallback. Current OpenCode versions expose an optional batch tool through `experimental.batch_tool`.

---

## Additional Delegate Variants

You can create delegate variants with different models for specific use cases:

```yaml
additional_delegates:
  strong:
    model: openai/gpt-5.6-sol
    reasoningEffort: xhigh
  fast:
    model: openai/gpt-5.6-luna
    reasoningEffort: medium
  qwen: alibaba-eu/qwen3.7-max
  ds: deepseek/deepseek-v4-pro
```

This creates `delegate-strong`, `delegate-fast`, `delegate-qwen`, and `delegate-ds` agents during installation. Tell the maintainer which variant to use:

```
> use delegate-strong for this review
> use delegate-fast for this routine analysis
```

### Why multiple delegate variants?

The default `delegate` agent handles most tasks at a predictable cost. But sometimes you want:

- **A frontier model for reviews** — thorough analysis benefits from stronger reasoning
- **A lighter model for focused evidence** — use `retriever` for scoped files, tool output, commands, or known-URL crawling; use a delegate variant when web research needs search and source judgment
- **Different model perspectives** — cross-check results using models with different training

The variant system lets you configure these once and switch on demand, without editing config files mid-session.

---

## Rate Limits and Model Choice

The framework grew out of working within GitHub Copilot's frontier-model restrictions. The same routing remains useful with direct provider access: use model capacity where it changes the outcome instead of spending it on every lookup.

**Recommendations:**

- **Match the model to the role.** GPT-5.6 Sol at medium reasoning effort is a capable default for maintainers and synthesis-heavy subagents. GPT-5.6 Luna remains a cost-efficient `retriever` option at medium or high reasoning effort.

- **Reserve maximum reasoning effort for the hard gates.** Independent reviews and genuinely difficult decisions benefit more from the strongest configuration than routine exploration does.

- **Keep alternative perspectives available.** Delegate aliases make it easy to route selected work to DeepSeek V4 Pro, Qwen 3.7 Max, or another configured model without changing the workflow.

If you have direct API access to a model provider (Azure, OpenAI, etc.), rate limits are typically more generous, and you can configure more powerful models for subagents without concern.

---

## Claude Code Compatibility

These skills are designed for OpenCode but can also work with Claude Code, with some adaptations.

### Agent Teams (required for stateful execution)

The `execute-work-package` skill relies on **session resumption** — the ability to continue a subagent conversation across multiple calls (BLUEPRINT → EXECUTE). In Claude Code, this requires **Agent Teams**, which are experimental and disabled by default.

**Enable Agent Teams** by setting the environment variable or adding it to your Claude Code `settings.json`:

```bash
# Shell environment
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
```

```json
// ~/.claude/settings.json (or project-level .claude/settings.json)
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

With Agent Teams enabled, session resumption uses `SendMessage(to="<agent_id>")` instead of OpenCode's `task(task_id=...)`. See `skills/execute-work-package/SKILL.md` for the full platform compatibility table.

**Without Agent Teams**, each `Agent` call starts a fresh context. The workaround is to persist the Blueprint to a file and start a new `Agent` call that reads it — functional but the subagent loses conversational context.

### Other differences

| Aspect | OpenCode | Claude Code |
|--------|----------|-------------|
| Subagent tool | `task()` | `Agent()` (was `Task()` before v2.1.63) |
| Session resumption | `task_id` parameter | `SendMessage` (Agent Teams) |
| Agent definitions | `~/.config/opencode/agents/` | `.claude/agents/` or `~/.claude/agents/` |
| Skill loading | Built-in `skill` tool | Via `skills` frontmatter or CLAUDE.md |

> **Note:** Claude Code requires v2.1.32+ for Agent Teams. Check with `claude --version`.

### Installing into Claude Code

`./install.sh` auto-detects Claude Code: if `~/.claude/` exists, skills are copied to `~/.claude/skills/` and agents to `~/.claude/agents/` alongside the OpenCode targets. Pin the choice in `config.yaml` or override per-run with `OPS_*` env vars:

```bash
OPS_SYNC_CLAUDE=false ./install.sh              # skip Claude even if ~/.claude exists
OPS_SYNC_CLAUDE=true  ./install.sh              # force Claude install
OPS_CLAUDE_HOME=~/work/.claude ./install.sh     # install into a non-default location
```

Or in `config.yaml`:

```yaml
targets:
  claude:
    enabled: true          # auto | true | false
    home: ~/work/.claude
```

**Symlink safety.** If a destination path is already a symlink — common when you've linked the repo into `~/.claude/skills/` yourself so `git pull` keeps everything fresh — the installer skips it and logs `Symlink (skipping): <name>`. This lets you mix copy-based targets (OpenCode, where model injection rewrites files) with symlink-based targets (Claude, where you want live updates from the repo).

**Antigravity.** Antigravity is a VS Code fork that ships the `anthropic.claude-code` extension, which reads from the same path as the Claude Code CLI. It has no config path of its own, so the Claude Code target covers it automatically — if `~/Library/Application Support/Antigravity/` is present, the installer logs `Antigravity detected: served by Claude Code target`. If you have Antigravity but no `~/.claude/`, run once with `OPS_SYNC_CLAUDE=true` to bootstrap the directory.

---

## Cursor Compatibility

The Cursor target installs **workflow skills** (same files as OpenCode) plus a thin **orchestration layer** that maps OpenCode agents to Cursor `Task` delegation. Workflow skills are not transformed at install time.

### What gets installed

| Artifact | Cursor location | Installed? |
|----------|-----------------|------------|
| Workflow skills + templates | `~/.cursor/skills/<skill>/` | Yes (from `skills/`) |
| Orchestrator skills | `~/.cursor/skills/ops-orchestrator/` (+ `-direct`) | Yes (from `cursor/skills/`) |
| Subagent personas | `~/.cursor/subagents/*.md` | Yes (from `agents/`, frontmatter stripped) |
| AGENTS bootstrap | `~/.cursor/ops/AGENTS.snippet.md` | Yes |
| Project rule (`--project`) | `.cursor/rules/ops-orchestrator.mdc` | Yes |
| `maintainer` as agent picker | — | No — use `ops-orchestrator` skill instead |
| `config.yaml` model settings | — | No — OpenCode agents only |

Model configuration in `config.yaml` does not apply to Cursor; the IDE uses its own model settings.

### Installing into Cursor

`./install.sh` auto-detects Cursor when `~/.cursor/` exists:

```yaml
targets:
  cursor:
    enabled: auto          # auto | true | false
    home: ~/.cursor
```

```bash
OPS_SYNC_CURSOR=false ./install.sh              # skip Cursor even if ~/.cursor exists
OPS_SYNC_CURSOR=true  ./install.sh              # force Cursor install
OPS_CURSOR_HOME=/tmp/cursor-test ./install.sh   # sandbox install (tests/CI)
```

**Per-project install:** `./install.sh --project` also syncs skills to `./.cursor/skills/` when the Cursor target is enabled.

**Symlink safety.** Same as other targets — existing symlinks under `~/.cursor/skills/<name>` are preserved.

### Subagent activation

The orchestrator skills (`ops-orchestrator`) and `task-delegation.md` define how framework roles map to Cursor's `Task` tool:

| Framework role | `subagent_type` | Persona file |
|----------------|-----------------|--------------|
| `delegate-fast` | `explore` | `subagents/delegate.md` |
| `delegate-strong` | `generalPurpose` | `subagents/delegate.md` |
| `doc-explorer` | `generalPurpose` | `subagents/doc-explorer.md` |
| `implementer` | `generalPurpose` | `subagents/implementer.md` |
| `legacy-curator` | `generalPurpose` | `subagents/legacy-curator.md` |

Gated implementation: two `Task` calls with `resume` between blueprint and execute (see `execute-work-package` skill).

### Workflow skills vs orchestration

**Workflow skills** (`create-plan`, `execute-work-package`, …) still contain some OpenCode naming (`task()`, `task_id`). The orchestrator skill and `task-delegation.md` tell the primary how to map these to Cursor. Subagent persona files are synced from `agents/` at install time — no duplicate maintenance in `cursor/subagents/`.

**Optional:** merge `ops/AGENTS.snippet.md` into your project `AGENTS.md` for persistent orchestration without relying on skill auto-load.

---

## Updating

To update to the latest version:

```bash
cd opencode-processing-skills
git pull
./install.sh
```

Your `config.yaml` is preserved (gitignored). The installer will re-apply your model settings to the updated agent files. All detected targets (OpenCode, Codex, Claude Code, Cursor) are synced in the same run.
