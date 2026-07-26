---
type: documentation
entity: module
module: "checkpoint-core"
version: 1.2
---

# Module: Checkpoint Core

> Part of [OpenCode Processing Skills](../overview.md); behavior guide: [Agent Checkpoint / Heartbeat](../agent-checkpoint-heartbeat.md)

## Overview

`packages/checkpoint-core/` is a private, dependency-free ESM package for the shared checkpoint contract. It writes and validates the current eight-field schema, accepts legacy six-field records, maps session IDs to safe workspace-relative paths, appends JSONL without rewriting history, calculates count-based chain/work/exact-three-word metrics, inspects one explicitly selected log, and provides an adaptive live/one-shot terminal dashboard for direct workspace logs. It has no daemon, recovery schema, recursive discovery, or build step.

### Responsibility

The module owns harness-neutral persistence and analysis. Harness adapters supply native session identity, workspace root, nullable agent/title snapshots, and honest telemetry. New records contain `agent` and `session_title` in addition to the original six fields; each is either a non-empty string or `null`. Parsing a legacy record adds both as `null` in memory without rewriting its source bytes (`packages/checkpoint-core/src/index.js:4-13`, `packages/checkpoint-core/src/index.js:59-123`). `remainingKTokens` may be returned by `checkpoint` but is never persisted (`packages/checkpoint-core/src/index.js:176-207`).

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
| `validateCheckpointRecord` | function | public | `packages/checkpoint-core/src/index.js:59` | Accepts exactly the legacy six or current eight fields and validates metadata types/ranges. |
| `normalizeCheckpointRecord` | function | private | `packages/checkpoint-core/src/index.js:117` | Normalizes absent legacy `agent`/`session_title` metadata to `null`. |
| `createCheckpointRecord` | function | public | `packages/checkpoint-core/src/index.js:126` | Creates a timestamped current record with false/null defaults. |
| `checkpointPath` | function | public | `packages/checkpoint-core/src/index.js:150` | Percent-encodes a non-empty session ID into `.agent-checkpoints/<id>.jsonl`. |
| `checkpoint` | async function | public | `packages/checkpoint-core/src/index.js:176` | Creates the directory and appends one compact eight-field JSON line. |
| `parseCheckpointJsonl` | function | public | `packages/checkpoint-core/src/index.js:209` | Strictly parses non-empty current, legacy, or mixed JSONL and returns normalized records. |
| `analyzeCheckpoints` | function | public | `packages/checkpoint-core/src/index.js:241` | Computes `success`, `count`, and percent for chain, work, and exact-three-word checks. |
| `formatMetric` | function | public | `packages/checkpoint-core/bin/checkpoint-inspect.js:17` | Formats a metric as `success/count (percent)`. |
| `formatCheckpointSummary` | function | public | `packages/checkpoint-core/bin/checkpoint-inspect.js:21` | Formats latest agent/title, work state, telemetry, and count-based metrics. |
| `main` | async function | public/CLI | `packages/checkpoint-core/bin/checkpoint-inspect.js:39` | Reads exactly one supplied path and exits nonzero on invalid input. |
| `parseArgs` | function | public | `packages/checkpoint-core/bin/checkpoint-watch.js:36` | Resolves modes and positive refresh/stale values from environment and CLI. |
| `listSessionFiles` | async function | public | `packages/checkpoint-core/bin/checkpoint-watch.js:62` | Lists only direct regular `.agent-checkpoints/*.jsonl` files. |
| `loadSessionRows` | async function | public | `packages/checkpoint-core/bin/checkpoint-watch.js:85` | Builds newest-first rows and isolates malformed files as `ERROR` rows. |
| `formatDashboard` | function | public | `packages/checkpoint-core/bin/checkpoint-watch.js:170` | Formats metadata/count columns and deterministically allocates remaining terminal width to title/done/next. |
| `runLiveDashboard` | async function | public | `packages/checkpoint-core/bin/checkpoint-watch.js:221` | Redraws by timer/event and cleans resources/cursor on exit. |
| `main` (dashboard) | async function | public/CLI | `packages/checkpoint-core/bin/checkpoint-watch.js:270` | Runs help, one-shot, or live mode from the current workspace. |

## Data Flow

1. An adapter calls `checkpoint` with session ID, worktree, labels, outcome, telemetry, and nullable agent/title metadata.
2. The core validates the current eight-field record and appends it below the worktree's `.agent-checkpoints/` directory.
3. A caller obtains the same relative path through `checkpoint_path`/`checkpointPath`.
4. Readers accept current, legacy, and mixed logs; missing legacy metadata normalizes to `null` in memory.
5. `checkpoint-inspect` reads one selected file and prints latest `Agent`/`Name/title` plus `Chain`, `Work`, and `Three-word compliance` as `success/count (percent)`. Independently, `checkpoint-watch` discovers direct session logs and renders `AGENT`, `NAME/TITLE`, `CHAIN`, `WORK`, and `3-WORD` in one row per file without modifying bytes.

## Configuration

Direct inspection is `node packages/checkpoint-core/bin/checkpoint-inspect.js .agent-checkpoints/<encoded-session>.jsonl`. The dashboard is `node packages/checkpoint-core/bin/checkpoint-watch.js` (live) or the same command with `--once`. Defaults are 1,000 ms refresh and 120,000 ms stale; CLI flags override `CHECKPOINT_WATCH_REFRESH_MS`/`CHECKPOINT_WATCH_STALE_MS`. ACTIVE/STALE represents checkpoint age only, not process liveness.

The dashboard reserves fixed widths for identity/status fields, lets rendered metric counts determine metric widths, and divides remaining terminal columns across `NAME/TITLE`, `DONE`, and `NEXT`. Remainder columns go to those fields in that order. Each value and final line is deterministically truncated to its assigned width, using a trailing ellipsis where at least two characters fit (`packages/checkpoint-core/bin/checkpoint-watch.js:152-213`).

## Inventory Notes

- **Coverage**: full
- **Notes**: Inventory includes the package manifest, implementation/bin files, shared fixture, five pilot fixtures, and all three test files. Tests cover legacy/current mixed parsing, null normalization, metadata/count displays, and deterministic adaptive widths (`packages/checkpoint-core/test/checkpoint-core.test.js:40-63`, `packages/checkpoint-core/test/checkpoint-core.test.js:162-172`, `packages/checkpoint-core/test/checkpoint-watch.test.js:32-116`).
