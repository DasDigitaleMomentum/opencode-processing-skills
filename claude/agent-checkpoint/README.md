# Claude Code checkpoint plugin (agent-checkpoint)

Dependency-free Claude Code integration for the agent-checkpoint heartbeat,
packaged as a personal skills-directory plugin and installed by `./install.sh`
when the Claude target is enabled (global mode only).

## Prerequisites

- Pinned `claude` CLI **2.1.170** (`claude --version`). The plugin targets the
  revalidated plugin/hook/statusline surface of that build.
- `node` on `PATH` (the MCP server and hook/statusline scripts are Node
  scripts; the installer fails clearly when `node` is absent).

## What gets installed

| Path | Installed to | Purpose |
|------|--------------|---------|
| `.claude-plugin/plugin.json` | `$CLAUDE_HOME/skills/agent-checkpoint/` | Plugin manifest (name `agent-checkpoint`; loads as `agent-checkpoint@skills-dir`) |
| `.mcp.json` | `$CLAUDE_HOME/skills/agent-checkpoint/` | Bundled stdio MCP server registration (`${CLAUDE_PLUGIN_ROOT}`-relative) |
| `hooks/hooks.json` | `$CLAUDE_HOME/skills/agent-checkpoint/` | `SessionStart`/`SubagentStart`/`PreToolUse`/`SessionEnd` command hooks |
| `scripts/checkpoint-hook.mjs` | `$CLAUDE_HOME/skills/agent-checkpoint/` | Lifecycle hook bridge (identity injection, instruction, sidecar cleanup) |
| `scripts/checkpoint-statusline.mjs` | `$CLAUDE_HOME/skills/agent-checkpoint/` | Statusline wrapper (atomic telemetry sidecar) |
| `instructions/checkpoint.md` | `$CLAUDE_HOME/skills/agent-checkpoint/` | Heartbeat instruction injected via `SessionStart`/`SubagentStart` |
| `server/checkpoint-mcp-runtime.mjs` | `$CLAUDE_HOME/skills/agent-checkpoint/` | Tool/protocol runtime for the stdio MCP server |
| `server/checkpoint-mcp-server.mjs` | `$CLAUDE_HOME/skills/agent-checkpoint/` | Executable stdio MCP server (NDJSON JSON-RPC) |
| `server/checkpoint-core.mjs` | `$CLAUDE_HOME/skills/agent-checkpoint/` | Shared checkpoint-core (eight-field contract) |
| generated settings | `$CLAUDE_HOME/agent-checkpoint.settings.json` | Opt-in `statusLine` command only; base `settings.json` and `~/.claude.json` are never modified |

Existing symlinks at any destination are preserved. Removing
`$CLAUDE_HOME/skills/agent-checkpoint/` and
`$CLAUDE_HOME/agent-checkpoint.settings.json` uninstalls the plugin; all other
Claude configuration is untouched.

Validate the source plugin strictly (warnings are errors):

```bash
claude plugin validate --strict claude/agent-checkpoint
```

## Activation

The plugin auto-loads from the skills directory on the next session. The
statusline telemetry bridge is opt-in through the generated settings file
(`--settings` **merges** with the base configuration on the pinned build — it
never replaces it):

```bash
CLAUDE_CONFIG_DIR=<claude-home> claude --settings <claude-home>/agent-checkpoint.settings.json
```

Restart Claude Code (or run `/reload-plugins`) after installation. New or
changed hooks require Claude Code's hook trust approval on first use.

Once loaded, the plugin-scoped MCP tools are callable as
`mcp__plugin_agent-checkpoint_checkpoint__checkpoint` and
`mcp__plugin_agent-checkpoint_checkpoint__checkpoint_path`.

## How it works

- `SessionStart` injects the checkpoint heartbeat instruction as
  `additionalContext` and announces `Session checkpoint ID: <session_id>`.
- `SubagentStart` injects the same instruction with the composite ID
  `Session checkpoint ID: <session_id>--<agent_id>`.
- `PreToolUse` matching either scoped tool returns
  `permissionDecision: "allow"` paired with a full-input `updatedInput`:
  - `checkpoint` receives `_checkpoint_session_id` (native `session_id` for the
    parent, composite `<session_id>--<agent_id>` inside a subagent),
    `_telemetry_session_id` (always the native `session_id`), and `_agent_type`
    when the call originates inside a subagent. Caller-supplied internal fields
    are validated against the current hook session/agent and overwritten on
    mismatch — never trusted.
  - `checkpoint_path` takes only the public `session_id` and is allowed
    unchanged.
- The MCP `checkpoint` tool requires the hook-injected fields and otherwise
  returns an error without writing; identity is never invented. The workspace
  root comes from `CLAUDE_PROJECT_DIR`, never from caller input.
  `checkpoint_path` returns the workspace-relative
  `.agent-checkpoints/<encoded-session-id>.jsonl` path without writing.
- `SessionEnd` removes only the matching telemetry sidecar.

Parent checkpoints log under `.agent-checkpoints/<session_id>.jsonl`;
subagent checkpoints log separately under
`.agent-checkpoints/<session_id>--<agent_id>.jsonl` (URL-encoded filename).

## Telemetry semantics and limits

- The configured statusline wrapper atomically replaces the **latest**
  snapshot at `.agent-checkpoints/.runtime/claude/<native-session-id>.json`
  (session/project identity, update timestamp, `used_percentage`,
  `context_window_size`, `total_input_tokens`, `session_name` when present).
- `context_used` = `used_percentage / 100`; remaining K-tokens are
  **approximate**: `max(0, context_window_size - total_input_tokens) / 1000`.
- Values are **latest-response** and **input-only**: `used_percentage` is
  `null` before the first response and after compaction; the sidecar may be
  absent entirely. Every absent/null/mismatched case yields
  `context_used: null` and an explicit `unknown` in the tool feedback.
- `agent` = subagent `agent_type` from the hook when present, else `null`;
  `session_title` = statusline `session_name` when present, else `null`.
- The sidecar is ignored local runtime state — never JSONL, recovery data, or
  a second log — and never enters raw logs or inspection. The statusline does
  not fire in `-p` print mode (interactive sessions only).
- No mutable plugin state lives under `${CLAUDE_PLUGIN_ROOT}`.

## Inspection and uninstall

Inspect a selected log from this repository with
`node packages/checkpoint-core/bin/checkpoint-inspect.js <path>` or use the
`checkpoint-watch` dashboard from the OpenCode install. To uninstall, delete
`$CLAUDE_HOME/skills/agent-checkpoint/` and
`$CLAUDE_HOME/agent-checkpoint.settings.json`; `.agent-checkpoints/` logs and
`.agent-checkpoints/.runtime/claude/` sidecars may be removed separately.

## Tests

```bash
node --test claude/test/checkpoint-claude.test.mjs
```

Covers plugin manifest/config shape, strict validation on the pinned CLI, MCP
protocol round-trips, parent/subagent hook rewriting, statusline
valid/null/compaction/mismatch cases, atomic replacement, eight-field records
with sourcing rules, installer isolation (byte-for-byte base-config
preservation, symlink safety, disabled and project modes).
