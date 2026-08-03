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
- **Claude Desktop** (if `~/Library/Application Support/Claude/` exists): an independent, global-only MCP adapter under `~/Library/Application Support/Claude/agent-checkpoint/` plus one additive `mcpServers.agent-checkpoint` registration in `claude_desktop_config.json`
- **Cursor** (if `~/.cursor/` exists): adapted skills + orchestrator to `~/.cursor/skills/`
- **Hermes** (if `~/.hermes/` exists): skills to `~/.hermes/skills/processing/` (a namespaced category dir — Hermes discovers `SKILL.md` files recursively and shows top-level dirs as categories) + the agent-checkpoint user plugin to `~/.hermes/plugins/agent-checkpoint/` with the documented opt-in enablement as a single additive `plugins.enabled` entry in `~/.hermes/config.yaml` (global installs only; all other config content is preserved byte-for-byte)
- **Antigravity**: served transitively by the Claude Code target (it loads skills through the bundled `anthropic.claude-code` extension, which reads from the same path)

Hermes is a target for installation, parsing, and discovery plus the agent-checkpoint plugin; installing the skills does not port their OpenCode-specific delegate personas, `Task` calls, or `task_id` continuation contracts to Hermes.

For an upgrade, stop every live `checkpoint-watch` process and every running OpenCode, checkpoint-profile Codex Desktop/CLI, Claude Code, or Hermes session using the checkpoint integration before invoking the installer. After installation, run the exact printed dashboard `Launch command` first, then start/restart each enabled harness. This order prevents status-capable writers from reaching an old live reader. After OpenCode restarts, select the `@maintainer` agent; it knows when to load which skill and how to delegate to the right subagent.

### OpenCode checkpoint plugin

| Artifact | Global location | `--project` location |
|---|---|---|
| Auto-loaded plugin | `~/.config/opencode/plugins/checkpoint.ts` | `.opencode/plugins/checkpoint.ts` |
| Runtime/core support | `~/.config/opencode/lib/opencode-processing-skills/` | `.opencode/lib/opencode-processing-skills/` |
| OpenCode-only persona instruction | appended under `~/.config/opencode/agents/` | appended under `.opencode/agents/` |

Restart OpenCode only after starting the newly installed dashboard. The restart loads `checkpoint`, `checkpoint_path`, and the creation-event lifecycle writer. A verified `session.created` event appends `open`; every successful checkpoint also appends `open` before its checkpoint, so a resumed checkpoint-only session becomes `OPEN`. Optional `close_session=true` appends `closed` immediately after that checkpoint. Activity, idle, deletion, disposal, age, and errors never synthesize lifecycle state. Session logs remain below the active worktree. OpenCode persona instructions are a start/end-bounded managed block: fresh installs append it once, exact current blocks remain byte-identical, exact previously current blocks and older known fragments migrate with surrounding bytes preserved, and unknown/customized marked content stops loudly unchanged. Persona symlinks remain untouched; required reader symlinks still stop before writer changes.

### Codex checkpoint adapter

When the Codex target is enabled, global installs also deploy the Codex adapter (never in `--project` mode):

| Artifact | Location |
|---|---|
| Hook bridge, instruction, MCP runtime/server, core | `~/.codex/agent-checkpoint/` |
| Additive layered-profile file | `~/.codex/agent-checkpoint.config.toml` |

Activate per invocation with `codex -p agent-checkpoint` on Codex Desktop 26.727.51351/current runtimes, or `codex --profile-v2 agent-checkpoint` on standalone codex-cli 0.131.0, but only after the compatible dashboard is running. The profile registers `checkpoint`/`checkpoint_path`, grants only those two tools explicit `approval_mode = "approve"`, and registers `SessionStart`/`PreToolUse`; each verified `SessionStart` appends `open`, and every checkpoint then writes `open` → checkpoint → optional declared `closed`. The pin has no `SessionEnd`; `Stop`, process exit, crashes, age, and unsupported events remain write-free. `close_session` is strictly boolean and defaults false. Logging is session-level under the native hook `session_id`, so a child declaration closes that shared row until the next session checkpoint reopens it; no child identity field is added. The base config and existing symlink protections remain unchanged. See [codex/README.md](../codex/README.md) for proof commands and details.

### Claude Code checkpoint plugin

When the Claude target is enabled, global installs also deploy the Claude Code plugin (never in `--project` mode):

| Artifact | Location |
|---|---|
| Skills-directory plugin (manifest, `.mcp.json`, hooks, scripts, instruction, MCP server, core) | `~/.claude/skills/agent-checkpoint/` |
| Opt-in statusline settings file | `~/.claude/agent-checkpoint.settings.json` |

The plugin auto-loads as `agent-checkpoint@skills-dir` on the next session and retains its pinned host hooks and parent/composite-subagent identities. Every checkpoint writes `open` → checkpoint → optional declared `closed`; `SessionStart`, `SubagentStart`, and native-parent `SessionEnd` remain additive observed events. `close_session` is strictly boolean in both `PreToolUse` rewriting and the MCP runtime. A later checkpoint reopens the same persisted identity. No child-end hook, host-idle heuristic, or parent-child field is added; required-core symlink behavior remains unchanged.

Activate the statusline telemetry bridge explicitly — `--settings` **merges** with the base configuration on the pinned build, it never replaces it:

```bash
CLAUDE_CONFIG_DIR=<claude-home> claude --settings <claude-home>/agent-checkpoint.settings.json
```

The generated file contains only the `statusLine` command; the base `~/.claude/settings.json` and `~/.claude.json` are left byte-for-byte unchanged, and symlinked destinations are preserved. Telemetry is honest: the statusline wrapper atomically caches the latest-response `context_window.total_input_tokens` snapshot under `.agent-checkpoints/.runtime/claude/`. Claude Code documents that value as fresh input plus cache-creation and cache-read input. Input usage is `min(total_input_tokens / 372000, 1)`, input K-tokens are `total_input_tokens / 1000`, and remaining input K-tokens use the same 372k limit. Missing input makes all three values `unknown`, and feedback does not claim to include the active turn. `agent` records the subagent `agent_type` (else `null`), `session_title` the statusline `session_name` (else `null`). See [claude/agent-checkpoint/README.md](../claude/agent-checkpoint/README.md) for prerequisites, semantics, and uninstall.

### Claude Desktop checkpoint adapter

Claude Desktop is detected, configured, and installed independently from Claude Code, and only during a global installation:

| Artifact | Location |
|---|---|
| MCP server, runtime, shared core, config helper, README | `~/Library/Application Support/Claude/agent-checkpoint/` |
| Additive Desktop configuration | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| MCP diagnostic log | `~/Library/Logs/Claude/mcp-server-agent-checkpoint.log` |

The installer registers exactly `mcpServers.agent-checkpoint` with the absolute resolved Node executable and one absolute server-path argument. It preserves unrelated top-level values and other MCP servers semantically; an identical registration is an idempotent no-op. Malformed or non-object JSON, a conflicting registration, or a symlinked adapter/config destination stops fail-closed without replacing the conflicting or symlinked target. The installer does not terminate the app: fully quit and restart Claude Desktop after installation, then use the MCP log above if the connector or its `checkpoint` and `checkpoint_path` tools do not load. Claude Code configuration remains unchanged by this target.

Desktop has no Claude Code hook identity or project-directory injection. Every tool call therefore requires an existing absolute `workspace_root` and a non-empty, conversation-stable `session_id`; create the ID once per Desktop conversation, reuse it, and ask for the absolute workspace when it is unknown. Successful final calls persist `open` → checkpoint → declared `closed` with `close_session=true`; `context_used`, `agent`, and `session_title` remain honest `null` values. A real Claude Desktop 1.24012.9 model run with embedded commit `03c61d06f8e01a4db2273b9514e225f21d2ba62e` verified this full restart, connected-tool, model-issued checkpoint, JSONL, inspector, and unchanged-watcher boundary. Direct MCP calls or synthetic JSONL do not establish that model E2E. See [claude-desktop/agent-checkpoint/README.md](../claude-desktop/agent-checkpoint/README.md) for the focused tool contract, troubleshooting, and removal procedure.

### Hermes checkpoint plugin

When the Hermes target is enabled, global installs also deploy the Hermes user plugin (never in `--project` mode):

| Artifact | Location |
|---|---|
| User plugin (manifest, tools/hooks module, heartbeat instruction, README) | `~/.hermes/plugins/agent-checkpoint/` |
| Opt-in enablement | additive `plugins.enabled` entry in `~/.hermes/config.yaml` |

The plugin is unit- and live-E2E-verified against pinned Hermes Agent v0.19.1. Hermes loads user plugins only when listed in `plugins.enabled`; the installer performs the documented enablement flow's additive config delta as a text edit (idempotent, everything else preserved byte-for-byte, symlinked destinations skipped), while `hermes plugins enable|disable agent-checkpoint` remains the documented user-facing flow. An exact single-quoted, double-quoted, or unquoted `agent-checkpoint` under block or inline `plugins.disabled` stops installation before any config edit and prints that manual enablement command. Removal: `hermes plugins disable agent-checkpoint`, then delete `~/.hermes/plugins/agent-checkpoint/`; a restart starts sessions with the changed plugin set.

The plugin registers `checkpoint`/`checkpoint_path`, injects the complete role-aware instruction through `pre_llm_call`, and preserves native binding through `on_session_start`/`pre_tool_call`. New-parent start appends `open`; every checkpoint mirrors strict `open` → checkpoint → optional declared `closed` ordering. Continued sessions therefore become `OPEN` on their next checkpoint. `subagent_start` only maps native children to the root-parent log; a child declaration closes that shared row until any later parent/child checkpoint reopens it, without persisting child identity or relationship metadata. The pinned host still supplies no adopted main-session end hook, so process exit, age, and tool completion remain write-free. A valid latest `pre_api_request` estimate supplies input usage/K-tokens/headroom against 372k; absent input makes all three unknown. K-token feedback does not expand JSONL.

### Checkpoint dashboard quickstart

The installer always deploys the dependency-free Node `checkpoint-watch` terminal dashboard. Install globally or into the current project, then run the **exact `Launch command:` printed by that installer run**. The following commands are the portable Node source/fallback paths; a verified optional global native build can make `$HOME/.local/bin/checkpoint-watch` the printed launch instead:

```bash
# Global installation (default OpenCode home shown)
./install.sh
node "$HOME/.config/opencode/lib/opencode-processing-skills/checkpoint-watch/bin/checkpoint-watch.js"

# Project-local installation
./install.sh --project
node "$PWD/.opencode/lib/opencode-processing-skills/checkpoint-watch/bin/checkpoint-watch.js"
```

The printed command reflects a configured OpenCode home or the absolute project path, so prefer it over reconstructing the path. For upgrades, follow this complete order:

1. Before `./install.sh`, stop every live dashboard plus every OpenCode, checkpoint-profile Codex, Claude Code, and Hermes session using the integration.
2. Run the installer. It preflights every component of required reader/core paths before any target mutation, then installs compatible OpenCode core/watcher readers before any writer, each bundled core before its harness hook/configuration, and Hermes plugin code before enablement.
3. Run the exact printed `Launch command` to start the compatible dashboard.
4. Restart OpenCode.
5. If enabled, start/restart Codex with the printed Desktop/current-runtime or pinned-CLI profile command.
6. If enabled, start/restart Claude Code with its opt-in settings.
7. If enabled, start/restart Hermes.

Do not leave a writer-enabled harness running while its command/plugin files are replaced, and do not start one ahead of the refreshed dashboard. The installer prints this same quiesce → install readers/writers → start dashboard → restart harness sequence; it does not detect or stop processes automatically. From this repository's source tree, use `node packages/checkpoint-core/bin/checkpoint-watch.js`.

#### Optional native global watcher

Global installation checks for an already executable `scriptc`; it never installs the compiler or changes `PATH`. When present, the installer copies only the watcher entry and shared core into a disposable directory under `${TMPDIR:-/tmp}`, runs ordinary `scriptc coverage` and `scriptc build`, and requires native `--help`, `--once`, non-TTY live filesystem-refresh/signal/cursor-restoration, and Python-standard-library PTY smokes at 80 and 120 columns. The PTY gate exercises raw input, lowercase-`v` refreshes, Ctrl-C, cursor restoration, and exact terminal-flag restoration. Only a binary that passes every check is copied to a same-directory temporary file and atomically renamed to `$HOME/.local/bin/checkpoint-watch`. A user-managed symlink at that path is preserved.

On native success, the summary prints that executable as `Launch command:` and prints the installed Node invocation as `Node fallback:`. If scriptc is absent, coverage/build is unsupported, a runtime-deferred fence is reached, or any smoke fails, installation still succeeds, any previous native destination remains unchanged, and the Node invocation stays the launch command with concise fallback guidance. `./install.sh --project` does not probe scriptc and does not inspect, create, or modify `$HOME/.local/bin`.

scriptc support is experimental and evidenced only by the successful local build and smokes. Compilation currently requires scriptc's supported Node.js compiler version (Node 20 or newer), clang/toolchain availability, Python 3 for the PTY gate, and a platform supported by the installed scriptc release; macOS arm64 is its primary documented platform and other platforms remain qualified. The produced executable does not require Node, but Node source remains authoritative and installed on every path. No compilation is required to use this project.

With no mode flag it stays live, redraws on checkpoint-directory changes and on a timer, and exits cleanly on raw Ctrl-C, SIGINT, or SIGTERM: input and signal listeners are removed, prior stdin raw/flow state is restored, queued rendering drains, its watcher and timer are closed, and the terminal cursor is restored. Non-TTY live input remains signal-driven. For scripts or one deterministic non-ANSI rendering that never enters raw mode or installs a key listener, add `--once`.

```bash
node packages/checkpoint-core/bin/checkpoint-watch.js --once
CHECKPOINT_WATCH_REFRESH_MS=500 CHECKPOINT_WATCH_STALE_MS=300000 node packages/checkpoint-core/bin/checkpoint-watch.js
node packages/checkpoint-core/bin/checkpoint-watch.js --refresh-ms 500 --stale-ms 300000
```

Refresh values are positive integer milliseconds. `--stale-ms` and `CHECKPOINT_WATCH_STALE_MS` remain accepted and positively validated for compatibility but are output-neutral no-ops; they do not configure old-row visibility. The fixed presentation cutoff is exactly 10,800,000 ms from the latest physical event. Rows below it remain visible, while valid rows at or above it are hidden initially in both live and `--once` output. Lowercase `v` alone toggles all old rows in live mode; uppercase `V` and unrelated input do nothing. When shown, current open/unknown rows come first, old open/unknown rows form a separate paragraph, closed rows form one paragraph, and errors remain last and always visible because they have no trustworthy event age.

The exact columns are `AGENT`, `NAME`, `AGE`, `STATE`, `CP`, `C/W/3 %`, `INPUT`, `DONE`, and `CURRENT`; session IDs appear only in paths/raw logs and the detailed inspector. At the ordinary 120-column width, complete known agent identities such as `maintainer-direct` take priority and long `NAME` values ellipsize first; genuinely narrow output remains deterministic and bounded. `C/W/3 %` is slash-separated, for example `100/66.7/100%`, while `CP` carries checkpoint count. Valid rows stay newest-first inside each paragraph; closed `CURRENT` is `—`, while unclosed rows show raw `next`. Age filtering never changes lifecycle state or proves liveness.

The dashboard divides adaptive width among `NAME`, `DONE`, and `CURRENT`, deterministically truncates overlong values, and caps every line at terminal width. The detailed inspector is unchanged: it still shows selected-path session identity, raw `Next announced`, detailed metric counts, and strict stderr/nonzero failure behavior.

Discovery is deliberately shallow: only direct regular `.agent-checkpoints/*.jsonl` files under the current workspace are read. Nested files and other extensions are ignored. A malformed, unreadable, or changing JSONL file becomes a watcher-only `ERROR` row with a concise parse/read message while valid sessions remain visible; `ERROR` is never persisted or returned by lifecycle reduction. This multi-session dashboard differs from `checkpoint-inspect`, which accepts exactly one explicitly selected log path, does not discover sessions, prints separated latest-event/status/checkpoint details, and retains stderr plus nonzero exit behavior for invalid input.

The shim prefers OpenCode's published `@opencode-ai/plugin` helper when it is resolvable. Local development builds can request an unpublished matching helper version; in that case the shim uses OpenCode's built-in JSON-Schema compatibility path, so both tools still load without adding or pinning a runtime dependency.

The plugin writes current eight-field records. In addition to the original six fields, each write snapshots nullable `agent` from `ToolContext.agent` and nullable `session_title` from SDK `session.get`; a title can change between checkpoints, so `session_id` remains the definitive identity. A missing/empty title or failed `session.get` becomes `null` and does not block persistence. Readers accept exact legacy six-field checkpoints, current eight-field checkpoints, and four-field `{timestamp, session_id, event: "session_status", status: "open" | "closed"}` records in one physical-order stream. The checkpoint-only compatibility API filters status events, so lifecycle lines never affect chain, work, or three-word metrics.

Reader-first rollout is active across all five adapters: compatible shared readers and bundled cores are installed before status-capable plugin/hook/MCP assets. Existing host-observed events remain additive, and every adapter now performs lazy open plus optional declared close at checkpoint time. Required reader/core symlinks and their symlinked path components still stop installation. `OPEN` and `CLOSED` are physical-order lifecycle reductions, not liveness or success claims.

The plugin uses OpenCode's `PluginInput.client` to query session messages and selects the latest previous assistant step with positive output tokens. Complete request input is `tokens.input + tokens.cache.read + tokens.cache.write`; this prevents cached prompt content from disappearing from occupancy. Persisted `context_used` is `min(input / 372000, 1)`, runtime input K-tokens are `input / 1000`, and runtime remaining input K-tokens are `max(372000 - input, 0) / 1000`. Provider/model context metadata, output, and reasoning are ignored. The assistant step currently calling the tool is not finalized, so all values may lag the active turn. Missing or invalid input components produce honest unknowns and never block the checkpoint; K-token values do not enter the exact JSONL schema. See [Agent Checkpoint / Heartbeat](agent-checkpoint-heartbeat.md) for the record contract and selected-log inspection command.

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
  claude_desktop:
    enabled: auto
    home: "~/Library/Application Support/Claude"
```

### `OPS_*` environment overrides

Use these when you need to override `config.yaml` for one run — typically in tests, CI, or when debugging. They all take the same tri-state as the YAML: `true | false | auto`.

| Variable | Overrides |
|---|---|
| `OPS_SYNC_CODEX` | `targets.codex.enabled` |
| `OPS_SYNC_CLAUDE` | `targets.claude.enabled` |
| `OPS_SYNC_CLAUDE_DESKTOP` | `targets.claude_desktop.enabled` |
| `OPS_SYNC_CURSOR` | `targets.cursor.enabled` |
| `OPS_SYNC_HERMES` | `targets.hermes.enabled` |
| `OPS_OPENCODE_HOME` | `targets.opencode.home` |
| `OPS_CODEX_HOME` | `targets.codex.home` |
| `OPS_CLAUDE_HOME` | `targets.claude.home` |
| `OPS_CLAUDE_DESKTOP_HOME` | `targets.claude_desktop.home` |
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
