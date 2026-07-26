---
type: documentation
entity: module
module: "opencode-checkpoint-adapter"
version: 1.1
---

# Module: OpenCode Checkpoint Adapter

> Part of [OpenCode Processing Skills](../overview.md); behavior guide: [Agent Checkpoint / Heartbeat](../agent-checkpoint-heartbeat.md)

## Overview

`opencode/` supplies the native OpenCode pilot. A minimal TypeScript plugin composes the installed core with OpenCode's `tool` helper when available and otherwise uses the host's dependency-free JSON-Schema compatibility path; a testable runtime binds `ToolContext.sessionID` and `worktree` and derives telemetry through `PluginInput.client`; one instruction fragment is appended only to installed OpenCode personas.

### Responsibility

The adapter owns OpenCode tool schemas, telemetry derivation, and feedback, not the raw six-field contract. `createOpenCodeContextTelemetry` queries session messages and provider models through `PluginInput.client`, selects the latest previous assistant step with positive output tokens, sums the same five token categories as the TUI, and resolves that message's provider/model context limit (`opencode/checkpoint-runtime.mjs:12-78`). It returns a clamped estimated context fraction and remaining context-window K-tokens. The active assistant step invoking the tool is not finalized, so the values are previous-completed-step estimates, not live occupancy or compaction headroom. Missing, invalid, unmatched, or failed SDK data returns null/unknown without blocking persistence (`opencode/checkpoint-runtime.mjs:14-80`).

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
| `CheckpointPlugin` | plugin export | public | `opencode/checkpoint-plugin.ts:52` | Composes the helper/core/runtime and creates telemetry from `pluginContext.client`. |
| `createOpenCodeContextTelemetry` | function | public | `opencode/checkpoint-runtime.mjs:12` | Derives TUI-equivalent previous-completed-step estimates with null fallback. |
| `createOpenCodeCheckpointPlugin` | function | public | `opencode/checkpoint-runtime.mjs:91` | Builds `checkpoint` and `checkpoint_path` native tools. |
| `checkpoint.execute` | tool executor | public | `opencode/checkpoint-runtime.mjs:122` | Queries telemetry and writes using `context.sessionID` and `context.worktree` (plugin worktree fallback). |
| `checkpoint_path.execute` | tool executor | public | `opencode/checkpoint-runtime.mjs:162` | Returns only the workspace-relative encoded JSONL path. |
| `Checkpoint Heartbeat` | instruction | installed | `opencode/checkpoint-instruction.md:3` | Directs parents/subagents on chaining, failed steps, and unknown telemetry. |

## Data Flow

1. OpenCode auto-loads installed `plugins/checkpoint.ts`.
2. The shim creates telemetry with `PluginInput.client`; `checkpoint(done, next, step_failed=false)` queries session messages and provider models for `context.sessionID`/`directory`.
3. The runtime scans backward to the latest assistant message with positive output, sums input/output/reasoning/cache-read/cache-write, and matches `providerID`/`modelID` to its context limit. The output-zero active tool-calling step is not selected.
4. The core persists the estimated fraction as `context_used`; feedback reports the estimated percentage and remaining context-window K-tokens. Remaining K-tokens are not persisted and are not compaction headroom.
5. Missing or malformed data and SDK failures persist `context_used: null` and report both values as `unknown`.
6. `checkpoint_path(session_id)` returns the selected relative path for direct reading or core inspection.

## Configuration

No new YAML key exists. `targets.opencode.home` is also the global checkpoint plugin home; project mode uses `./.opencode/`. Restart OpenCode after installation.

## Inventory Notes

- **Coverage**: full
- **Notes**: The adapter has three runtime/instruction source files and one integration test. It does not alter canonical cross-harness `agents/*.md` sources.
