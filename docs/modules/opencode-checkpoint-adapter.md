---
type: documentation
entity: module
module: "opencode-checkpoint-adapter"
version: 1.2
---

# Module: OpenCode Checkpoint Adapter

> Part of [OpenCode Processing Skills](../overview.md); behavior guide: [Agent Checkpoint / Heartbeat](../agent-checkpoint-heartbeat.md)

## Overview

`opencode/` supplies the native OpenCode pilot. A minimal TypeScript plugin composes the installed core with OpenCode's `tool` helper when available and otherwise uses the host's dependency-free JSON-Schema compatibility path; a testable runtime binds `ToolContext.sessionID`, `worktree`, and `agent`, snapshots the session title through `PluginInput.client`, and derives telemetry through the same client; one instruction fragment is appended only to installed OpenCode personas.

### Responsibility

The adapter owns OpenCode tool schemas, metadata/telemetry derivation, and feedback, not raw-record validation. Every call snapshots nullable `agent` from `ToolContext.agent` and nullable `session_title` from SDK `session.get`. The title is point-in-time display metadata: it may change in later records, while `session_id` remains definitive (`opencode/checkpoint-runtime.mjs:16-41`, `opencode/checkpoint-runtime.mjs:157-193`). A missing/empty title, SDK error response, thrown title lookup, or rejected metadata promise becomes `null`; title lookup and telemetry run independently with `Promise.allSettled`, so failures do not block the write.

`createOpenCodeContextTelemetry` queries session messages and provider models through `PluginInput.client`, selects the latest previous assistant step with positive output tokens, sums the same five token categories as the TUI, and resolves that message's provider/model context limit (`opencode/checkpoint-runtime.mjs:43-113`). It returns a clamped estimated context fraction and remaining context-window K-tokens. The active assistant step invoking the tool is not finalized, so the values are previous-completed-step estimates, not live occupancy or compaction headroom. Missing, invalid, unmatched, or failed SDK data returns null/unknown without blocking persistence.

### Dependencies

| Dependency | Type | Purpose |
|---|---|---|
| `@opencode-ai/plugin` | optional host package | Supplies the native `tool` helper when a matching published version is resolvable; the shim has a no-dependency JSON-Schema fallback for local development builds. |
| Checkpoint Core | module | Owns persistence, path mapping, parsing, and analysis. |
| `install.sh` | module | Deploys shim/support files and appends the instruction to OpenCode-installed personas. |

## Structure

| Path | Type | Purpose |
|---|---|---|
| `opencode/checkpoint-plugin.ts` | file | Auto-loaded plugin composition shim. |
| `opencode/checkpoint-runtime.mjs` | file | Tool factory, native context binding, and telemetry feedback. |
| `opencode/checkpoint-instruction.md` | file | Idempotently marked OpenCode-only parent/subagent instruction. |
| `opencode/test/checkpoint-plugin.test.mjs` | file | Native-tool and isolated installer integration tests. |

## Key Symbols

| Symbol | Kind | Visibility | Location | Purpose |
|---|---|---|---|---|
| `CheckpointPlugin` | plugin export | public | `opencode/checkpoint-plugin.ts:53` | Composes helper/core/runtime and creates title/telemetry readers from `pluginContext.client`. |
| `createOpenCodeSessionTitle` | function | public | `opencode/checkpoint-runtime.mjs:16` | Calls `session.get` for the active ID/directory and returns a non-empty title or `null`. |
| `createOpenCodeContextTelemetry` | function | public | `opencode/checkpoint-runtime.mjs:43` | Derives TUI-equivalent previous-completed-step estimates with null fallback. |
| `createOpenCodeCheckpointPlugin` | function | public | `opencode/checkpoint-runtime.mjs:122` | Builds `checkpoint` and `checkpoint_path` native tools. |
| `checkpoint.execute` | tool executor | public | `opencode/checkpoint-runtime.mjs:157` | Settles title/telemetry independently and writes session/worktree plus nullable agent/title snapshots. |
| `checkpoint_path.execute` | tool executor | public | `opencode/checkpoint-runtime.mjs:203` | Returns only the workspace-relative encoded JSONL path. |
| `Checkpoint Heartbeat` | instruction | installed | `opencode/checkpoint-instruction.md:3` | Directs parents/subagents on chaining, failed steps, and unknown telemetry. |

## Data Flow

1. OpenCode auto-loads installed `plugins/checkpoint.ts`.
2. The shim creates session-title and telemetry readers with `PluginInput.client`; `checkpoint(done, next, step_failed=false)` starts both lookups for `context.sessionID`/`directory`.
3. `session.get` supplies the point-in-time title while `context.agent` supplies the current persona. Either normalizes to `null` when absent/empty; title lookup failure is isolated and cannot prevent persistence.
4. The runtime scans backward to the latest assistant message with positive output, sums input/output/reasoning/cache-read/cache-write, and matches `providerID`/`modelID` to its context limit. The output-zero active tool-calling step is not selected.
5. The core persists an eight-field record containing metadata and the estimated fraction; feedback reports the estimated percentage and remaining context-window K-tokens. Remaining K-tokens are not persisted and are not compaction headroom.
6. Missing or malformed telemetry and SDK failures persist `context_used: null` and report both values as `unknown`; metadata failures likewise persist `null` without blocking the record.
7. `checkpoint_path(session_id)` returns the selected relative path for direct reading or core inspection. The stable ID, not mutable title text, selects the log.

## Configuration

No new YAML key exists. `targets.opencode.home` is also the global checkpoint plugin home; project mode uses `./.opencode/`. Restart OpenCode after installation.

## Inventory Notes

- **Coverage**: full
- **Notes**: The adapter has three runtime/instruction source files and one integration test. Metadata coverage verifies parent/subagent personas, renamed title snapshots, exact `session.get` arguments, and non-blocking null fallback (`opencode/test/checkpoint-plugin.test.mjs:348-454`). It does not alter canonical cross-harness `agents/*.md` sources.
