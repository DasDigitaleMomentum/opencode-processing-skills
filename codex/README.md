# Codex checkpoint adapter

Dependency-free Codex (codex-cli) integration for the agent-checkpoint heartbeat,
installed by `./install.sh` when the Codex target is enabled (global mode only).

## What gets installed

| Path | Installed to | Purpose |
|------|--------------|---------|
| `checkpoint-hook.mjs` | `$CODEX_HOME/agent-checkpoint/` | Lifecycle hook bridge (`SessionStart`, `PreToolUse`) |
| `checkpoint-instruction.md` | `$CODEX_HOME/agent-checkpoint/` | Heartbeat instruction injected via `SessionStart` |
| `checkpoint-mcp-runtime.mjs` | `$CODEX_HOME/agent-checkpoint/` | Tool/protocol runtime for the stdio MCP server |
| `checkpoint-mcp-server.mjs` | `$CODEX_HOME/agent-checkpoint/` | Executable stdio MCP server (NDJSON JSON-RPC) |
| `checkpoint-core.mjs` | `$CODEX_HOME/agent-checkpoint/` | Shared mixed-log checkpoint/status contract and append implementation |
| generated profile | `$CODEX_HOME/agent-checkpoint.config.toml` | Additive profile-v2 file; base `config.toml` is never modified |

Existing symlinks are never overwritten. Because the status-capable hook depends
on a compatible bundled core, a symlinked `checkpoint-core.mjs` or whole
`$CODEX_HOME/agent-checkpoint` directory stops installation before hook/profile
activation. The diagnostic identifies the path and requires the operator to
update the user-managed target to the compatible core, or deliberately
remove/replace the link and rerun. Removing the
`agent-checkpoint/` directory and `agent-checkpoint.config.toml` uninstalls the
adapter; all other Codex configuration is untouched.

## Prerequisites

- Pinned `codex` CLI **0.131.0** (`codex --version`). The adapter targets the
  revalidated hook/MCP/profile-v2 surface of that build.
- `node` on `PATH` (the MCP server and hook are Node scripts; the installer
  fails clearly when `node` is absent).

## Activation

The adapter is opt-in per invocation through the additive profile file. Start it
only after the compatible `checkpoint-watch` dashboard is running:

```bash
codex --profile-v2 agent-checkpoint
```

Verify the registration with this proof set — pinned codex-cli 0.131.0 rejects
`codex --profile-v2 agent-checkpoint mcp list` (`--profile-v2` only applies to
runtime commands; `codex mcp list` has no profile support):

1. The generated `agent-checkpoint.config.toml` parses as TOML.
2. Profile layering is accepted:
   `codex --profile-v2 agent-checkpoint debug prompt-input` exits 0.
3. The credential-free stdio E2E passes: `SessionStart` hook → `PreToolUse`
   hook → installed MCP server → `checkpoint-inspect` reads the exact
   eight-field record.

The profile enables `[features] hooks = true` and registers
`[mcp_servers.agent_checkpoint]` plus `[[hooks.SessionStart]]` and
`[[hooks.PreToolUse]]` groups. New or changed hooks require Codex's hook trust
review on first use; approve the two `checkpoint-hook.mjs` command hooks to let
them run. Sandboxed/test installations may use the documented trust bypass only
inside an isolated `CODEX_HOME`.

## How it works

- `SessionStart` first appends one shared-contract `open` event using the native
  `session_id` and hook `cwd`, then injects the checkpoint heartbeat instruction
  as `additionalContext` and announces `Session checkpoint ID: <session_id>`.
  The pinned `startup`, `resume`, `clear`, and `compact` sources all represent an
  observed open/continuation; repeated `open` events are intentionally idempotent.
- `PreToolUse` matching `mcp__agent_checkpoint__checkpoint` returns
  `permissionDecision: "allow"` paired with `updatedInput` (a mandatory pairing
  on the pinned build) that injects `_workspace_root` (hook `cwd`) and
  `_checkpoint_session_id` (hook `session_id`), replacing any caller-supplied
  values. All other tools and events produce no output and no lifecycle write.
- The MCP `checkpoint` tool requires the hook-injected fields and otherwise
  returns an error without writing. It accepts optional strict-boolean
  `close_session=false`; every successful call appends exact `open`, then the
  unchanged eight-field checkpoint, then exact `closed` only when requested.
  A later checkpoint reopens the row. `checkpoint_path` returns the
  workspace-relative `.agent-checkpoints/<encoded-session-id>.jsonl` path
  without writing.

## Semantics and limits (pinned 0.131.0)

- **Session-level logging.** Every checkpoint in a Codex session writes under
  the native hook-provided `session_id`. The pinned build has no
  `SubagentStart` hook and no `agent_id` on any hook input, so subagent
  checkpoints land in the same session log (documented build limit, not an
  adapter choice). A future build that documents subagent identity may restore
  per-subagent logs via a new gated phase.
- **No host-derived close on the pin.** codex-cli 0.131.0 has no `SessionEnd`. Its `Stop`
  event carries a `turn_id` and is turn-scoped, so it is never mapped to
  `closed`; process/MCP exit, age, deletion-like signals, crashes, and post-pin
  upstream events are not substitutes. A subagent may declare normal closure
  only on its final checkpoint with `close_session=true`; because Codex logging
  is session-level, this closes the shared row until the next session checkpoint
  reopens it. Closure is independent of `step_failed` and is not success.
- **Honest telemetry.** Context percentage, used K-tokens, and remaining
  K-tokens are all reported as `unknown`; no documented occupancy or token-use
  channel exists on the CLI/MCP path. Feedback labels it as latest harness
  telemetry without claiming a live active-turn reading.
  `agent` and `session_title` are always `null` for Codex records.
- **Workspace.** Logs live below the hook-provided working directory as
  `.agent-checkpoints/`, i.e. the project root — never inside `$CODEX_HOME`.
- Inspect a selected log with
  `node packages/checkpoint-core/bin/checkpoint-inspect.js <path>` (from this
  repository) or the `checkpoint-watch` dashboard from the OpenCode install.

## Upgrade order

1. Stop every live `checkpoint-watch`, OpenCode, and
   `codex --profile-v2 agent-checkpoint` session.
2. Run `./install.sh`; compatible reader/core assets are installed before the
   hook and generated profile. Resolve any required-core symlink diagnostic and
   rerun rather than continuing with an unverified target.
3. Start the dashboard with the installer's exact `Launch command`.
4. Restart OpenCode, then start/restart Codex with the profile command above.

The installer prints this order but does not detect or stop processes.

## Tests

```bash
node --test codex/test/checkpoint-codex.test.mjs
```

Includes all pinned `SessionStart` sources, turn-level `Stop` no-write behavior,
mixed-log metrics, MCP protocol round-trips, hook input/output wires, installer isolation
(byte-for-byte base `config.toml` preservation, symlink safety, disabled and
project modes), and shared-contract record shape.
