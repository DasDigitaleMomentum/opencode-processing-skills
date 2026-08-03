# Codex checkpoint adapter

Dependency-free Codex Desktop integration for the agent-checkpoint heartbeat,
installed by `./install.sh` when the Codex target is enabled (global mode only).

## What gets installed

| Path | Installed to | Purpose |
|------|--------------|---------|
| `checkpoint-hook.mjs` | `$CODEX_HOME/agent-checkpoint/` | Lifecycle hook bridge (`SessionStart`, `PreToolUse`) |
| `checkpoint-instruction.md` | `$CODEX_HOME/agent-checkpoint/` | Heartbeat instruction injected via `SessionStart` |
| `checkpoint-mcp-runtime.mjs` | `$CODEX_HOME/agent-checkpoint/` | Tool/protocol runtime for the stdio MCP server |
| `checkpoint-mcp-server.mjs` | `$CODEX_HOME/agent-checkpoint/` | Executable stdio MCP server (NDJSON JSON-RPC) |
| `checkpoint-core.mjs` | `$CODEX_HOME/agent-checkpoint/` | Shared mixed-log checkpoint/status contract and append implementation |
| generated profile | `$CODEX_HOME/agent-checkpoint.config.toml` | Additive layered-profile file; base `config.toml` is never modified |

Existing symlinks are never overwritten. Because the status-capable hook depends
on a compatible bundled core, a symlinked `checkpoint-core.mjs` or whole
`$CODEX_HOME/agent-checkpoint` directory stops installation before hook/profile
activation. The diagnostic identifies the path and requires the operator to
update the user-managed target to the compatible core, or deliberately
remove/replace the link and rerun. Removing the
`agent-checkpoint/` directory and `agent-checkpoint.config.toml` uninstalls the
adapter; all other Codex configuration is untouched.

## Prerequisites

- Codex Desktop **26.727.51351** with bundled runtime `codex-cli
  0.146.0-alpha.9.2`. The hook, MCP, profile, transcript, and model-call path
  are verified together for this pin.
- `node` on `PATH` (the MCP server and hook are Node scripts; the installer
  fails clearly when `node` is absent).

The standalone `codex-cli` 0.131.0 is not supported. Its isolated live model
run loaded the MCP server but did not deliver the configured `SessionStart` or
`PreToolUse` hooks, so the tool could not receive host-owned identity or
telemetry. Config parsing and direct hook/MCP calls do not override that live
failure.

## Activation

The adapter is opt-in per invocation through the additive profile file. Start it
only after the compatible `checkpoint-watch` dashboard is running:

```bash
# Codex Desktop 26.727.51351
codex -p agent-checkpoint
```

The [official hook documentation](https://learn.chatgpt.com/docs/hooks.md)
provides `transcript_path` for convenience but explicitly treats the transcript
format as unstable. This adapter is therefore pinned to the runtime above and
fails closed when the expected event is absent or malformed.

The acceptance gate is a real two-turn model session in an isolated
`CODEX_HOME`, not only a protocol test:

1. The generated `agent-checkpoint.config.toml` parses as TOML.
2. `codex -p agent-checkpoint exec --skip-git-repo-check ...` performs a real
   model-issued checkpoint. Its telemetry must match the latest complete
   `token_count` event available when `PreToolUse` runs.
3. Resume the same session and issue another checkpoint. Its hook-injected
   input must equal the transcript's last prior `token_count` value, and the
   persisted `context_used` must equal that input divided by 372000 (clamped to
   1).
4. `checkpoint-inspect` and `checkpoint-watch --once` must read the resulting
   JSONL row. A direct MCP call, synthetic transcript, or mocked model response
   is useful for contract tests but does not satisfy this E2E gate.

The profile enables `[features] hooks = true`, registers
`[mcp_servers.agent_checkpoint]` plus `[[hooks.SessionStart]]` and
`[[hooks.PreToolUse]]` groups, and explicitly sets per-tool
`approval_mode = "approve"` for only `checkpoint` and `checkpoint_path`.
The explicit entries preserve unattended heartbeat calls on the Desktop runtime;
the broader MCP approval policy remains unchanged. New or changed hooks require
Codex's hook trust review on first use; approve the two `checkpoint-hook.mjs`
command hooks to let them run. Sandboxed/test installations may use the
documented trust bypass only inside an isolated `CODEX_HOME`.

## How it works

- `SessionStart` first appends one shared-contract `open` event using the native
  `session_id` and hook `cwd`, then injects the checkpoint heartbeat instruction
  as `additionalContext` and announces `Session checkpoint ID: <session_id>`.
  The pinned `startup`, `resume`, `clear`, and `compact` sources all represent an
  observed open/continuation; repeated `open` events are intentionally idempotent.
- `PreToolUse` matching `mcp__agent_checkpoint__checkpoint` reads the native
  JSONL transcript and scans backward for the last prior `token_count` event.
  `last_token_usage.input_tokens` already includes cached input, so the hook
  validates `cached_input_tokens` as a non-negative subset but does not add it
  again. It then returns
  `permissionDecision: "allow"` paired with `updatedInput` (a mandatory pairing
  on the verified build) and injects `_workspace_root` (hook `cwd`),
  `_checkpoint_session_id` (hook `session_id`), and
  `_checkpoint_input_tokens`, replacing any caller-supplied values. A missing,
  unreadable, or malformed transcript snapshot injects `null`. All other tools
  and events produce no output and no lifecycle write.
- The MCP `checkpoint` tool requires the hook-injected fields and otherwise
  returns an error without writing. It accepts optional strict-boolean
  `close_session=false`; every successful call appends exact `open`, then the
  unchanged eight-field checkpoint, then exact `closed` only when requested.
  Input feedback uses `min(input / 372000, 1)`, `input / 1000`, and
  `max(372000 - input, 0) / 1000`. A missing, unreadable, or malformed latest
  `token_count` snapshot honestly reports `unknown`; otherwise the hook uses
  the preceding completed model-call snapshot available at tool time. A later
  checkpoint reopens the row. `checkpoint_path` returns the
  workspace-relative `.agent-checkpoints/<encoded-session-id>.jsonl` path
  without writing.

## Semantics and limits (verified Desktop pin)

- **Session-level logging.** Every checkpoint in a Codex session writes under
  the native hook-provided `session_id`. The verified build has no adopted
  `SubagentStart` hook and no `agent_id` on any hook input, so subagent
  checkpoints land in the same session log (documented build limit, not an
  adapter choice). A future build that documents subagent identity may restore
  per-subagent logs via a new gated phase.
- **No host-derived close on the pin.** The verified Desktop hook surface has
  no adopted `SessionEnd`. Its `Stop` event is turn-scoped, so it is never mapped to
  `closed`; process/MCP exit, age, deletion-like signals, crashes, and post-pin
  upstream events are not substitutes. A subagent may declare normal closure
  only on its final checkpoint with `close_session=true`; because Codex logging
  is session-level, this closes the shared row until the next session checkpoint
  reopens it. Closure is independent of `step_failed` and is not success.
- **Honest telemetry.** Input usage, input K-tokens, and remaining input
  K-tokens describe the previous completed model call, never the active tool
  call. The adapter accepts only safe non-negative integer transcript values
  whose cached subset does not exceed total input; otherwise all three values
  remain `unknown`. The transcript format is not a stable public API, so this
  behavior is pin-bound and must be reverified when the bundled runtime changes.
  `agent` and `session_title` remain `null` for Codex records.
- **Workspace.** Logs live below the hook-provided working directory as
  `.agent-checkpoints/`, i.e. the project root — never inside `$CODEX_HOME`.
- Inspect a selected log with
  `node packages/checkpoint-core/bin/checkpoint-inspect.js <path>` (from this
  repository) or the `checkpoint-watch` dashboard from the OpenCode install.

## Upgrade order

1. Stop every live `checkpoint-watch`, OpenCode, and checkpoint-profile Codex
   Desktop/CLI session.
2. Run `./install.sh`; compatible reader/core assets are installed before the
   hook and generated profile. Resolve any required-core symlink diagnostic and
   rerun rather than continuing with an unverified target.
3. Start the dashboard with the installer's exact `Launch command`.
4. Restart OpenCode, then start/restart the verified Codex Desktop runtime with
   `codex -p agent-checkpoint`.

The installer prints this order but does not detect or stop processes.

## Tests

```bash
node --test codex/test/checkpoint-codex.test.mjs
```

Includes all verified `SessionStart` sources, turn-level `Stop` no-write behavior,
mixed-log metrics, MCP protocol round-trips, transcript telemetry validation,
cache non-double-counting, hook input/output wires, installer isolation
(byte-for-byte base `config.toml` preservation, symlink safety, disabled and
project modes), and shared-contract record shape. These automated tests do not
replace the credentialed two-turn model E2E described above.
