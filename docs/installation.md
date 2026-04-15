# Installation

## Quick Start

```bash
git clone git@github.com:DasDigitaleMomentum/opencode-processing-skills.git
cd opencode-processing-skills
cp config.yaml.example config.yaml   # optional: configure models
./install.sh
```

This copies skills to `~/.config/opencode/skills/` and agents to `~/.config/opencode/agents/`.

If Codex is installed (`~/.codex` exists), the installer also syncs skills to `~/.codex/skills/`.
Antigravity uses the same OpenCode paths, so no separate Antigravity target is needed.

After installation, restart OpenCode and select the `@maintainer` agent. It knows when to load which skill and how to delegate to the right subagent.

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

`./install.sh` auto-detects Claude Code: if `~/.claude/` exists, skills are copied to `~/.claude/skills/` and agents to `~/.claude/agents/` alongside the OpenCode targets. Override with environment variables:

```bash
SYNC_CLAUDE=0 ./install.sh                  # skip Claude even if ~/.claude exists
SYNC_CLAUDE=1 ./install.sh                  # force Claude install
CLAUDE_HOME=~/work/.claude ./install.sh     # install into a non-default location
```

**Symlink safety.** If a destination path is already a symlink — common when you've linked the repo into `~/.claude/skills/` yourself so `git pull` keeps everything fresh — the installer skips it and logs `Symlink (skipping): <name>`. This lets you mix copy-based targets (OpenCode, where model injection rewrites files) with symlink-based targets (Claude, where you want live updates from the repo).

**Antigravity.** Antigravity is a VS Code fork that ships the `anthropic.claude-code` extension, which reads from `CLAUDE_HOME`. It has no config path of its own, so the Claude Code target covers it automatically — if `~/Library/Application Support/Antigravity/` is present, the installer logs `Antigravity detected: served by Claude Code target`. If you have Antigravity but no `~/.claude/`, run once with `SYNC_CLAUDE=1` to bootstrap the directory.

---

## Updating

To update to the latest version:

```bash
cd opencode-processing-skills
git pull
./install.sh
```

Your `config.yaml` is preserved (gitignored). The installer will re-apply your model settings to the updated agent files. All detected targets (OpenCode, Codex, Claude Code) are synced in the same run.
