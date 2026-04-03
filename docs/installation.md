# Installation

## Quick Start

```bash
git clone git@github.com:DasDigitaleMomentum/opencode-processing-skills.git
cd opencode-processing-skills
cp config.yaml.example config.yaml   # optional: configure models
./install.sh
```

This copies skills to `~/.config/opencode/skills/` and agents to `~/.config/opencode/agents/`.

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

## Updating

To update to the latest version:

```bash
cd opencode-processing-skills
git pull
./install.sh
```

Your `config.yaml` is preserved (gitignored). The installer will re-apply your model settings to the updated agent files.
