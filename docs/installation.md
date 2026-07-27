# Installation

## Quick Start

```bash
git clone git@github.com:DasDigitaleMomentum/opencode-processing-skills.git
cd opencode-processing-skills
cp config.yaml.example config.yaml         # optional: configure targets and models
./install.sh
```

The installer auto-detects which harnesses to sync into. Out of the box:

- **OpenCode** (always): skills + agents + checkpoint plugin/support files to `~/.config/opencode/`
- **Codex** (if `~/.codex/` exists): skills to `~/.codex/skills/` + the agent-checkpoint adapter to `~/.codex/agent-checkpoint/` with an additive `agent-checkpoint.config.toml` profile (global installs only; the base `config.toml` is never modified)
- **Claude Code** (if `~/.claude/` exists): skills + agents to `~/.claude/` + the agent-checkpoint plugin to `~/.claude/skills/agent-checkpoint/` with an opt-in `agent-checkpoint.settings.json` statusline file (global installs only; the base `settings.json` and `~/.claude.json` are never modified)
- **Cursor** (if `~/.cursor/` exists): adapted skills + orchestrator to `~/.cursor/skills/`
- **Hermes** (if `~/.hermes/` exists): skills to `~/.hermes/skills/processing/` (a namespaced category dir — Hermes discovers `SKILL.md` files recursively and shows top-level dirs as categories) + the agent-checkpoint user plugin to `~/.hermes/plugins/agent-checkpoint/` with the documented opt-in enablement as a single additive `plugins.enabled` entry in `~/.hermes/config.yaml` (global installs only; all other config content is preserved byte-for-byte)
- **Antigravity**: served transitively by the Claude Code target (it loads skills through the bundled `anthropic.claude-code` extension, which reads from the same path)

Hermes is a target for installation, parsing, and discovery plus the agent-checkpoint plugin; installing the skills does not port their OpenCode-specific delegate personas, `Task` calls, or `task_id` continuation contracts to Hermes.

After installation, restart OpenCode and select the `@maintainer` agent. It knows when to load which skill and how to delegate to the right subagent.

### OpenCode checkpoint plugin

| Artifact | Global location | `--project` location |
|---|---|---|
| Auto-loaded plugin | `~/.config/opencode/plugins/checkpoint.ts` | `.opencode/plugins/checkpoint.ts` |
| Runtime/core support | `~/.config/opencode/lib/opencode-processing-skills/` | `.opencode/lib/opencode-processing-skills/` |
| OpenCode-only persona instruction | appended under `~/.config/opencode/agents/` | appended under `.opencode/agents/` |

Restart OpenCode after installation to load `checkpoint` and `checkpoint_path`. Session logs are written below the active worktree as `.agent-checkpoints/<encoded-session-id>.jsonl`, not below the OpenCode config directory. Existing symlinked plugin, support, or persona destinations are preserved.

### Codex checkpoint adapter

When the Codex target is enabled, global installs also deploy the Codex adapter (never in `--project` mode):

| Artifact | Location |
|---|---|
| Hook bridge, instruction, MCP runtime/server, core | `~/.codex/agent-checkpoint/` |
| Additive profile-v2 file | `~/.codex/agent-checkpoint.config.toml` |

Activate per invocation with `codex --profile-v2 agent-checkpoint`. Verify registration with the proof set from [codex/README.md](../codex/README.md): the generated `agent-checkpoint.config.toml` parses, profile layering is accepted (`codex --profile-v2 agent-checkpoint debug prompt-input` exits 0), and the credential-free stdio E2E (SessionStart hook → PreToolUse hook → installed MCP → `checkpoint-inspect` exact eight-field record) passes. Pinned codex-cli 0.131.0 rejects `codex --profile-v2 agent-checkpoint mcp list` — `--profile-v2` only applies to runtime commands and `codex mcp list` has no profile support. The profile enables `[features] hooks = true`, registers the stdio MCP server exposing `checkpoint`/`checkpoint_path`, and adds `SessionStart`/`PreToolUse` command hooks that inject the heartbeat instruction and the native session/workspace identity. New hooks require Codex's hook trust review on first use. The base `~/.codex/config.toml` is left byte-for-byte unchanged, and symlinked destinations are preserved. Logging is session-level under the native hook `session_id`; the pinned build (codex-cli 0.131.0) exposes no subagent identity, so subagent checkpoints share the session log, and context telemetry is honestly `null`/`unknown`. See [codex/README.md](../codex/README.md) for prerequisites, semantics, and uninstall.

### Claude Code checkpoint plugin

When the Claude target is enabled, global installs also deploy the Claude Code plugin (never in `--project` mode):

| Artifact | Location |
|---|---|
| Skills-directory plugin (manifest, `.mcp.json`, hooks, scripts, instruction, MCP server, core) | `~/.claude/skills/agent-checkpoint/` |
| Opt-in statusline settings file | `~/.claude/agent-checkpoint.settings.json` |

The plugin auto-loads as `agent-checkpoint@skills-dir` on the next session (restart Claude Code or run `/reload-plugins`) and passes `claude plugin validate --strict` on the pinned claude 2.1.170 build. It bundles a dependency-free stdio MCP server exposing `checkpoint`/`checkpoint_path` as the scoped tools `mcp__plugin_agent-checkpoint_checkpoint__checkpoint` / `..._checkpoint_path`. `SessionStart`/`SubagentStart` hooks inject the heartbeat instruction with the session checkpoint ID, and `PreToolUse` hooks inject the parent (native `session_id`) or composite subagent (`<session_id>--<agent_id>`) identity into tool calls; new hooks require Claude Code's hook trust approval on first use.

Activate the statusline telemetry bridge explicitly — `--settings` **merges** with the base configuration on the pinned build, it never replaces it:

```bash
CLAUDE_CONFIG_DIR=<claude-home> claude --settings <claude-home>/agent-checkpoint.settings.json
```

The generated file contains only the `statusLine` command; the base `~/.claude/settings.json` and `~/.claude.json` are left byte-for-byte unchanged, and symlinked destinations are preserved. Telemetry is honest: the statusline wrapper atomically caches the latest snapshot under `.agent-checkpoints/.runtime/claude/`, `context_used` maps the latest-response, input-only `used_percentage` (null before the first response and after compaction), remaining K-tokens are approximate, and every absent/null/mismatched case degrades to `null`/`unknown`. `agent` records the subagent `agent_type` (else `null`), `session_title` the statusline `session_name` (else `null`). See [claude/agent-checkpoint/README.md](../claude/agent-checkpoint/README.md) for prerequisites, semantics, and uninstall.

### Hermes checkpoint plugin

When the Hermes target is enabled, global installs also deploy the Hermes user plugin (never in `--project` mode):

| Artifact | Location |
|---|---|
| User plugin (manifest, tools/hooks module, README) | `~/.hermes/plugins/agent-checkpoint/` |
| Opt-in enablement | additive `plugins.enabled` entry in `~/.hermes/config.yaml` |

The plugin is verified against the pinned Hermes Agent v0.19.0 build (upstream `e0b9ab5a`). Hermes loads user plugins only when listed in `plugins.enabled`; the installer performs the documented enablement flow's additive config delta as a text edit (idempotent, everything else preserved byte-for-byte, symlinked destinations skipped), while `hermes plugins enable|disable agent-checkpoint` remains the documented user-facing flow. Removal: `hermes plugins disable agent-checkpoint`, then delete `~/.hermes/plugins/agent-checkpoint/`; a restart starts sessions with the changed plugin set.

The plugin registers the agent-callable `checkpoint`/`checkpoint_path` tools and binds the native `session_id` plus the session workspace through `on_session_start`/`pre_tool_call` hooks. Limits on the pinned build: logging is session-level (subagent checkpoints share the parent session log; the `subagent_start` hook exists but start-time subagent identity is deliberately not adopted — a documented follow-up option); `context_used` is an estimate from `pre_api_request` `approx_input_tokens` only when a defensible model context limit is known, otherwise honestly `null`; `agent`/`session_title` are always `null`. Note the name collision: `hermes checkpoints` is Hermes' shadow-git rollback store, unrelated to the `.agent-checkpoints/` contract. See [hermes/agent-checkpoint/README.md](../hermes/agent-checkpoint/README.md) for prerequisites, semantics, and uninstall.

### Checkpoint dashboard quickstart

The installer also deploys the dependency-free `checkpoint-watch` terminal dashboard. Install globally or into the current project, then run the **exact `Launch command:` printed by that installer run**:

```bash
# Global installation (default OpenCode home shown)
./install.sh
node "$HOME/.config/opencode/lib/opencode-processing-skills/checkpoint-watch/bin/checkpoint-watch.js"

# Project-local installation
./install.sh --project
node "$PWD/.opencode/lib/opencode-processing-skills/checkpoint-watch/bin/checkpoint-watch.js"
```

The printed command reflects a configured OpenCode home or the absolute project path, so prefer it over reconstructing the path. Restart OpenCode after either installation to load the **plugin tools**; the standalone dashboard itself can be launched immediately. From this repository's source tree, use `node packages/checkpoint-core/bin/checkpoint-watch.js`.

With no mode flag it stays live, redraws on checkpoint-directory changes and on a timer, and exits cleanly on Ctrl-C (or SIGTERM): its watcher and timer are closed and the terminal cursor is restored. For scripts or one deterministic non-ANSI rendering, add `--once`.

```bash
node packages/checkpoint-core/bin/checkpoint-watch.js --once
CHECKPOINT_WATCH_REFRESH_MS=500 CHECKPOINT_WATCH_STALE_MS=300000 node packages/checkpoint-core/bin/checkpoint-watch.js
node packages/checkpoint-core/bin/checkpoint-watch.js --refresh-ms 500 --stale-ms 300000
```

Refresh and stale thresholds are positive integer milliseconds. Defaults are 1,000 ms refresh and 120,000 ms stale; CLI values override the `CHECKPOINT_WATCH_REFRESH_MS` and `CHECKPOINT_WATCH_STALE_MS` environment defaults. The columns are `SESSION`, `AGENT`, `NAME/TITLE`, `AGE`, `STATE`, `CHAIN`, `WORK`, `3-WORD`, `CONTEXT`, `DONE`, and `NEXT`. The three metrics use `success/count (percent)`, for example `CHAIN 1/1 (100%)`, `WORK 2/3 (66.7%)`, and `3-WORD 6/6 (100%)`; an uncheckable first-record chain is `0/0 (n/a)`. **ACTIVE and STALE describe only whether the latest checkpoint age is below or at/above the stale threshold. They do not establish process liveness.** `WORK` counts records with `step_failed=false` rather than proving correct work.

The dashboard keeps the identity/status columns at fixed widths, sizes metric columns to their rendered counts, and divides the remaining terminal width as evenly as possible among `NAME/TITLE`, `DONE`, and `NEXT`. Extra characters are assigned in that order, so the same rows and terminal width always produce the same layout. Overlong values are deterministically right-truncated with `…` (or hard-cut when only one character fits), and every rendered line is capped at the detected terminal width.

Discovery is deliberately shallow: only direct regular `.agent-checkpoints/*.jsonl` files under the current workspace are read. Nested files and other extensions are ignored. A malformed or changing JSONL file becomes an `ERROR` row with a concise parse/read message while valid sessions remain visible. This multi-session dashboard differs from `checkpoint-inspect`, which accepts exactly one explicitly selected log path, does not discover sessions, and prints that log's detailed summary.

The shim prefers OpenCode's published `@opencode-ai/plugin` helper when it is resolvable. Local development builds can request an unpublished matching helper version; in that case the shim uses OpenCode's built-in JSON-Schema compatibility path, so both tools still load without adding or pinning a runtime dependency.

The plugin writes current eight-field records. In addition to the original six fields, each write snapshots nullable `agent` from `ToolContext.agent` and nullable `session_title` from SDK `session.get`; a title can change between checkpoints, so `session_id` remains the definitive identity. A missing/empty title or failed `session.get` becomes `null` and does not block persistence. Readers still accept legacy six-field logs and normalize their missing metadata to `null` in memory.

The plugin also uses OpenCode's `PluginInput.client` to query session messages and provider models. It selects the latest previous assistant step with positive output tokens, sums the TUI-equivalent input, output, reasoning, cache-read, and cache-write fields, and divides by that message's matching provider/model context limit. The resulting estimate is stored as `context_used`; tool feedback reports its approximate percentage and the remaining context-window K-tokens (`limit - token total`). The assistant step currently calling the tool is not finalized, so these are previous-completed-step estimates—not live active-step values and not compaction headroom. Missing methods or completed steps, invalid message/model data, response errors, and SDK failures still write `context_used: null` and report `unknown` without blocking the checkpoint. See [Agent Checkpoint / Heartbeat](agent-checkpoint-heartbeat.md) for the record contract and selected-log inspection command.

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

Maintainers can call `retriever` at level 1; delegates, reviewers, and implementers can call `retriever` at level 2. Delegates may also call documentation-oriented `doc-explorer` at level 2.

- **OpenCode v1.18.2 and newer:** set the top-level runtime option `"subagent_depth": 2`; v1.18.2 introduced the depth limit and defaults to blocking subagent-to-subagent calls.
- **Older OpenCode versions:** omit the unsupported setting; nested tasks generally follow agent task permissions without a depth option.

`install.sh` prints this version-aware reminder after installation. It does not locate or modify OpenCode runtime JSON/JSONC.

Agents use a focused read-only extraction script when results can be filtered in one operation, native parallel calls for compact independent results, and `retriever` by default for broad, large, exploratory, or mostly irrelevant raw evidence. Direct reads stay limited to authoritative scope and decisive evidence.

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
