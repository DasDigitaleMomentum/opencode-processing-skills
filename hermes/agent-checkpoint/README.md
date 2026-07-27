# agent-checkpoint (Hermes plugin)

Session-heartbeat checkpoints for the shared `.agent-checkpoints/` JSONL
contract, as a native Hermes plugin. It provides the agent-callable tools
`checkpoint` and `checkpoint_path` and binds the native Hermes `session_id`,
the session workspace, and honest context telemetry through lifecycle hooks —
no model-carried identity, no configuration beyond opt-in enablement.

## Prerequisites

- Pinned **Hermes Agent v0.19.0** (upstream `e0b9ab5a`; the plugin tool/hook
  surface — `PluginContext.register_tool()`, plugin hook callbacks, and the
  `plugins.enabled` opt-in flow — is verified against this build).
- The plugin directory installed at `~/.hermes/plugins/agent-checkpoint/`
  (the `install.sh` Hermes target of opencode-processing-skills does this).

## Enablement and removal

Hermes loads user plugins only when they are listed in `plugins.enabled` in
`~/.hermes/config.yaml` (opt-in by default):

```bash
hermes plugins enable agent-checkpoint    # activate (single additive entry)
hermes plugins list                       # verify: agent-checkpoint = enabled
hermes plugins disable agent-checkpoint   # deactivate
```

Full removal: `hermes plugins disable agent-checkpoint`, then delete
`~/.hermes/plugins/agent-checkpoint/`. The installer performs the same
documented enablement as one additive `plugins.enabled` text edit and leaves
all other `config.yaml` content byte-for-byte intact; `hermes plugins
disable` is the documented way back. A restart starts a session with the
changed plugin set.

## Usage

Inside a Hermes session the agent can call:

- `checkpoint(done, next, step_failed=false)` — appends an eight-field record
  (`timestamp`, `session_id`, `done`, `next`, `step_failed`, `context_used`,
  `agent`, `session_title`) to
  `<workspace>/.agent-checkpoints/<encoded-session-id>.jsonl`.
- `checkpoint_path(session_id)` — returns the shared workspace-relative path
  without writing.

Inspect logs with the shared tooling from this repository:
`node packages/checkpoint-core/bin/checkpoint-inspect.js <path>` or the
`checkpoint-watch` dashboard.

## Limits (honest, pinned build)

- **Session-level logging only.** `on_session_start`/`pre_tool_call` bind the
  native `session_id` (`on_session_start` fires only for brand-new sessions
  on the pinned build; continued sessions bind via `pre_tool_call`);
  subagent checkpoints share the parent session log.
  The `subagent_start` hook exists on the pinned build (fired on
  `delegate_task` child construction with parent/child identity payloads) but
  start-time subagent identity is **deliberately not adopted** — adoption is
  a documented follow-up option. `subagent_stop` remains post-hoc only.
- **Telemetry is an estimate or `null`.** `pre_api_request` records the
  latest `approx_input_tokens` and model into a process-local slot;
  `context_used` is the approximate share only when a defensible model
  context limit is known (small built-in table, overridable via
  `AGENT_CHECKPOINT_CONTEXT_LIMIT_TOKENS`); otherwise the record honestly
  carries `null` and the tool reports `unknown`.
- **`agent`/`session_title` are always `null`.** No documented surface
  exposes persona identity or the current session title at checkpoint time
  (titles live in the SQLite store via `hermes sessions rename`;
  `--pass-session-id` exposes only the ID).
- **Hook/telemetry state is process-local** and never persisted into JSONL;
  no filenames, remaining tokens, or derived percentages are stored.
- **Name collision:** `hermes checkpoints` is Hermes' shadow-git
  working-directory rollback store — unrelated to this contract and never a
  substitute for it.
