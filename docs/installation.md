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
- **Antigravity**: served transitively by the Claude Code target (it loads skills through the bundled `anthropic.claude-code` extension, which reads from the same path)

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
| `OPS_OPENCODE_HOME` | `targets.opencode.home` |
| `OPS_CODEX_HOME` | `targets.codex.home` |
| `OPS_CLAUDE_HOME` | `targets.claude.home` |
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
delegate: openai/gpt-5.3-codex
doc-explorer: openai/gpt-5.3-codex
implementer: openai/gpt-5.3-codex
legacy-curator: openai/gpt-5.3-codex
```

Leave an agent out (or set it to empty) to keep the provider default. Re-run `./install.sh` after changing the config.

`config.yaml` is gitignored – it's your local choice, not the repo's.

---

## Additional Delegate Variants

You can create delegate variants with different models for specific use cases:

```yaml
additional_delegates:
  codex: azure/gpt-5.3-codex         # Code-specialized
  fast: github-copilot/gpt-5.4-mini  # Lightweight for quick lookups
  opus: anthropic/claude-opus-4      # Frontier for thorough reviews
```

This creates `delegate-codex`, `delegate-fast`, `delegate-opus` agents during installation. Tell the maintainer which variant to use:

```
> use delegate-opus for this review
> delegate to delegate-fast for a quick lookup
```

### Why multiple delegate variants?

The default `delegate` agent handles most tasks at a predictable cost. But sometimes you want:

- **A frontier model for reviews** — thorough analysis benefits from stronger reasoning
- **A fast model for simple lookups** — no need for heavy reasoning when checking a file path
- **Different model perspectives** — cross-check results using models with different training

The variant system lets you configure these once and switch on demand, without editing config files mid-session.

---

## Rate Limits and Model Choice

If you're using GitHub Copilot as your provider, be aware that GHCP enforces rate limits on frontier models — and has been tightening them over time, including for subagent usage.

**Recommendations:**

- **Use a capable but non-frontier model for subagents.** Many tasks (exploration, research, doc generation) don't need frontier reasoning. A model like GPT-5.3-Codex or GPT-5.4-Mini handles them well at lower cost and without rate-limit pressure.

- **Reserve frontier models for the primary agent** (where planning decisions and user interaction happen) or for specific tasks where you explicitly want a second opinion.

- **The `delegate` vs `general` split exists for this reason.** `delegate` runs on your configured model (cheap, fast, predictable). The built-in `general` uses the provider default — use it when you want the provider's best model for a specific task.

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

## Updating

To update to the latest version:

```bash
cd opencode-processing-skills
git pull
./install.sh
```

Your `config.yaml` is preserved (gitignored). The installer will re-apply your model settings to the updated agent files. All detected targets (OpenCode, Codex, Claude Code) are synced in the same run.
