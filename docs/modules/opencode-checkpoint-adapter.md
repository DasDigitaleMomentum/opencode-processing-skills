---
type: documentation
entity: module
module: "opencode-checkpoint-adapter"
version: 1.4
---

# Module: OpenCode Checkpoint Adapter

> Part of [OpenCode Processing Skills](../overview.md); behavior guide: [Agent Checkpoint / Heartbeat](../agent-checkpoint-heartbeat.md)

## Overview

`opencode/` supplies the native OpenCode adapter. A minimal TypeScript plugin composes the installed core with OpenCode's `tool` helper or its dependency-free JSON-Schema compatibility path. The runtime binds identity, exposes strict optional `close_session`, snapshots title/telemetry, preserves verified `session.created`, and delegates lazy open/final close ordering to the core. A bounded managed instruction block is installed only into OpenCode personas.

### Responsibility

The adapter owns OpenCode tool schemas, metadata/telemetry derivation, and feedback, not raw-record validation. Every call snapshots nullable `agent` from `ToolContext.agent` and nullable `session_title` from SDK `session.get`. The title is point-in-time display metadata: it may change in later records, while `session_id` remains definitive (`opencode/checkpoint-runtime.mjs:16-41`, `opencode/checkpoint-runtime.mjs:157-193`). A missing/empty title, SDK error response, thrown title lookup, or rejected metadata promise becomes `null`; title lookup and telemetry run independently with `Promise.allSettled`, so failures do not block the write.

The generic event callback still accepts only verified `session.created`; plugin load, activity, update/status/idle, deletion, disposal, and malformed events remain write-free. Every successful checkpoint independently appends `open` first, so a resumed checkpoint-only log becomes `OPEN`; `close_session=true` appends `closed` only after that checkpoint. This is agent-declared closure, not a host-idle or graceful-end inference.

`createOpenCodeContextTelemetry` queries session messages and provider models through `PluginInput.client`, selects the latest previous assistant step with positive output tokens, sums the same five token categories as the TUI, and resolves that message's provider/model context limit (`opencode/checkpoint-runtime.mjs:43-113`). It returns a clamped estimated context fraction and remaining context-window K-tokens. The active assistant step invoking the tool is not finalized, so the values are previous-completed-step estimates, not live occupancy or compaction headroom. Missing, invalid, unmatched, or failed SDK data returns null/unknown without blocking persistence.

### Dependencies

| Dependency | Type | Purpose |
|---|---|---|
| `@opencode-ai/plugin` | optional host package | Supplies the native `tool` helper when a matching published version is resolvable; the shim has a no-dependency JSON-Schema fallback for local development builds. |
| Checkpoint Core | module | Owns persistence, path mapping, parsing, and analysis. |
| `install.sh` | module | Deploys shim/support files, optionally installs a verified global native watcher, and appends the instruction to OpenCode-installed personas. |

## Structure

| Path | Type | Purpose |
|---|---|---|
| `opencode/checkpoint-plugin.ts` | file | Auto-loaded plugin composition shim. |
| `opencode/checkpoint-runtime.mjs` | file | Tool factory, native context binding, and telemetry feedback. |
| `opencode/checkpoint-instruction.md` | file | Start/end-bounded OpenCode-only parent/subagent instruction with final-close role guidance. |
| `opencode/test/checkpoint-plugin.test.mjs` | file | Native-tool and isolated installer integration tests. |

## Key Symbols

| Symbol | Kind | Visibility | Location | Purpose |
|---|---|---|---|---|
| `CheckpointPlugin` | plugin export | public | `opencode/checkpoint-plugin.ts:53` | Composes helper/core/runtime and creates title/telemetry readers from `pluginContext.client`. |
| `createOpenCodeSessionTitle` | function | public | `opencode/checkpoint-runtime.mjs:16` | Calls `session.get` for the active ID/directory and returns a non-empty title or `null`. |
| `createOpenCodeContextTelemetry` | function | public | `opencode/checkpoint-runtime.mjs:43` | Derives TUI-equivalent previous-completed-step estimates with null fallback. |
| `createOpenCodeCheckpointPlugin` | function | public | `opencode/checkpoint-runtime.mjs:122` | Builds the two native tools plus the creation-only lifecycle event callback. |
| `event` | plugin callback | public | `opencode/checkpoint-runtime.mjs` | Maps only verified `session.created` identity to shared-core `open`; ignores unsupported resume/close signals. |
| `checkpoint.execute` | tool executor | public | `opencode/checkpoint-runtime.mjs:171` | Strictly validates raw `close_session`, settles metadata/telemetry, and forwards identity plus optional close to the core. |
| `checkpoint_path.execute` | tool executor | public | `opencode/checkpoint-runtime.mjs:221` | Returns only the workspace-relative encoded JSONL path. |
| `Checkpoint Heartbeat` | instruction | installed | `opencode/checkpoint-instruction.md:3` | Directs chaining/failures/context handling and limits `close_session=true` to a subagent's final checkpoint or intentional parent-session end. |

## Data Flow

1. OpenCode auto-loads installed `plugins/checkpoint.ts`.
2. On verified `session.created`, the event callback uses the event's native ID and the plugin worktree to append `open`. Unsupported activity/resume/close candidates are ignored.
3. The shim exposes `checkpoint(done, next, step_failed=false, close_session=false)`; the native schema or fallback executor rejects a supplied non-boolean before persistence, then starts title/telemetry lookups.
4. `session.get` supplies the point-in-time title while `context.agent` supplies the current persona. Either normalizes to `null` when absent/empty; title lookup failure is isolated and cannot prevent persistence.
5. The runtime scans backward to the latest assistant message with positive output, sums input/output/reasoning/cache-read/cache-write, and matches `providerID`/`modelID` to its context limit. The output-zero active tool-calling step is not selected.
6. The core persists exact `open` → eight-field checkpoint → optional exact `closed`; feedback and checkpoint-only metrics remain unchanged.
7. Missing or malformed telemetry and SDK failures persist `context_used: null` and report both values as `unknown`; metadata failures likewise persist `null` without blocking the record.
8. Global installation always refreshes the portable Node reader before writer assets and may select a separately staged, smoke-tested scriptc executable as the preferred watcher command. Optional build failure leaves writer installation and the Node reader available; project mode remains Node-only and global-bin isolated.
9. `checkpoint_path(session_id)` returns the selected relative path for direct reading or core inspection. The stable ID, not mutable title text, selects the log.

## Configuration

No new YAML key exists. `targets.opencode.home` is also the global checkpoint plugin home; project mode uses `./.opencode/`. During upgrades, stop readers/writers, install reader-first, start the dashboard, then restart OpenCode. Required reader symlinks still stop installation. Global scriptc detection is opportunistic and configuration-free; only a verified native build changes that run's preferred launch, while the exact Node fallback remains printed. Project mode never probes scriptc or touches `$HOME/.local/bin`. Ordinary persona symlinks remain untouched. Non-symlink personas receive one exact start/end-bounded block: exact current bytes are stable, only the exact known legacy fragment migrates with prefix/suffix preservation, and unknown/customized marked content stops path-specifically without mutation.

## Inventory Notes

- **Coverage**: full
- **Notes**: The adapter has three runtime/instruction source files and one integration test. Metadata coverage verifies parent/subagent personas, renamed title snapshots, exact `session.get` arguments, and non-blocking null fallback (`opencode/test/checkpoint-plugin.test.mjs:348-454`). It does not alter canonical cross-harness `agents/*.md` sources.
