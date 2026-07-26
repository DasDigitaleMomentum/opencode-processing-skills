---
type: documentation
entity: module
module: "checkpoint-core"
version: 1.1
---

# Module: Checkpoint Core

> Part of [OpenCode Processing Skills](../overview.md); behavior guide: [Agent Checkpoint / Heartbeat](../agent-checkpoint-heartbeat.md)

## Overview

`packages/checkpoint-core/` is a private, dependency-free ESM package for the shared checkpoint contract. It validates exactly six raw fields, maps session IDs to safe workspace-relative paths, appends JSONL without rewriting history, calculates chain and exact-three-word compliance, inspects one explicitly selected log, and provides a live/one-shot terminal dashboard for direct workspace logs. It has no daemon, recovery schema, recursive discovery, or build step.

### Responsibility

The module owns harness-neutral persistence and analysis. Harness adapters supply native session identity, workspace root, and honest telemetry. `remainingKTokens` may be returned by `checkpoint` but is never persisted (`packages/checkpoint-core/src/index.js:132-158`).

### Dependencies

| Dependency | Type | Purpose |
|---|---|---|
| Node.js built-ins | external | Filesystem append/read, paths, URL handling, tests, and temporary workspaces. |
| OpenCode adapter | module | Calls the core with OpenCode session/worktree data; see [OpenCode Checkpoint Adapter](opencode-checkpoint-adapter.md). |

## Structure

| Path | Type | Purpose |
|---|---|---|
| `packages/checkpoint-core/package.json` | file | Private ESM export, inspection/dashboard bins, and package-local scripts. |
| `packages/checkpoint-core/src/index.js` | file | Record, path, append, parse, and analysis implementation. |
| `packages/checkpoint-core/bin/checkpoint-inspect.js` | file | Read-only selected-log command and formatter. |
| `packages/checkpoint-core/bin/checkpoint-watch.js` | file | Dependency-free live/one-shot dashboard for direct workspace JSONL logs. |
| `packages/checkpoint-core/fixtures/checkpoint-cases.json` | file | Shared contract/path/analysis cases. |
| `packages/checkpoint-core/fixtures/pilot/` | directory | Five Phase 3 JSONL scenario fixtures. |
| `packages/checkpoint-core/test/` | directory | Core and inspection behavioral tests. |

## Key Symbols

| Symbol | Kind | Visibility | Location | Purpose |
|---|---|---|---|---|
| `validateCheckpointRecord` | function | public | `packages/checkpoint-core/src/index.js:43` | Requires exactly the six authorized fields and validates their types/ranges. |
| `createCheckpointRecord` | function | public | `packages/checkpoint-core/src/index.js:86` | Creates a timestamped record with false/null defaults. |
| `checkpointPath` | function | public | `packages/checkpoint-core/src/index.js:106` | Percent-encodes a non-empty session ID into `.agent-checkpoints/<id>.jsonl`. |
| `checkpoint` | async function | public | `packages/checkpoint-core/src/index.js:132` | Creates the directory and appends one compact JSON line. |
| `parseCheckpointJsonl` | function | public | `packages/checkpoint-core/src/index.js:161` | Strictly parses non-empty JSONL and validates every record. |
| `analyzeCheckpoints` | function | public | `packages/checkpoint-core/src/index.js:194` | Computes exact-link and three-word percentages independently of `step_failed`. |
| `formatCheckpointSummary` | function | public | `packages/checkpoint-core/bin/checkpoint-inspect.js:17` | Formats latest work state, telemetry, and derived metrics. |
| `main` | async function | public/CLI | `packages/checkpoint-core/bin/checkpoint-inspect.js:32` | Reads exactly one supplied path and exits nonzero on invalid input. |
| `parseArgs` | function | public | `packages/checkpoint-core/bin/checkpoint-watch.js:36` | Resolves modes and positive refresh/stale values from environment and CLI. |
| `listSessionFiles` | async function | public | `packages/checkpoint-core/bin/checkpoint-watch.js:62` | Lists only direct regular `.agent-checkpoints/*.jsonl` files. |
| `loadSessionRows` | async function | public | `packages/checkpoint-core/bin/checkpoint-watch.js:85` | Builds newest-first rows and isolates malformed files as `ERROR` rows. |
| `formatDashboard` | function | public | `packages/checkpoint-core/bin/checkpoint-watch.js:165` | Formats width-aware columns and checkpoint-age state. |
| `runLiveDashboard` | async function | public | `packages/checkpoint-core/bin/checkpoint-watch.js:194` | Redraws by timer/event and cleans resources/cursor on exit. |
| `main` (dashboard) | async function | public/CLI | `packages/checkpoint-core/bin/checkpoint-watch.js:243` | Runs help, one-shot, or live mode from the current workspace. |

## Data Flow

1. An adapter calls `checkpoint` with session ID, worktree, labels, outcome, and telemetry.
2. The core validates the six-field record and appends it below the worktree's `.agent-checkpoints/` directory.
3. A caller obtains the same relative path through `checkpoint_path`/`checkpointPath`.
4. `checkpoint-inspect` reads one selected file and prints its detailed summary; independently, `checkpoint-watch` discovers direct session logs and renders one row per file without modifying bytes.

## Configuration

Direct inspection is `node packages/checkpoint-core/bin/checkpoint-inspect.js .agent-checkpoints/<encoded-session>.jsonl`. The dashboard is `node packages/checkpoint-core/bin/checkpoint-watch.js` (live) or the same command with `--once`. Defaults are 1,000 ms refresh and 120,000 ms stale; CLI flags override `CHECKPOINT_WATCH_REFRESH_MS`/`CHECKPOINT_WATCH_STALE_MS`. ACTIVE/STALE represents checkpoint age only, not process liveness.

## Inventory Notes

- **Coverage**: full
- **Notes**: Inventory includes the package manifest, implementation/bin files, shared fixture, five pilot fixtures, and all three test files, including dashboard coverage.
