---
type: documentation
entity: module
module: "checkpoint-core"
version: 1.5
---

# Module: Checkpoint Core

> Part of [OpenCode Processing Skills](../overview.md); behavior guide: [Agent Checkpoint / Heartbeat](../agent-checkpoint-heartbeat.md)

## Overview

`packages/checkpoint-core/` is a private, dependency-free ESM package for the shared checkpoint contract. It validates exact legacy six-field checkpoints, current eight-field checkpoints, and four-field `session_status` events in one append-only JSONL stream; maps session IDs to safe workspace-relative paths; calculates checkpoint-only chain/work/exact-three-word metrics; reduces explicit lifecycle state; inspects one selected log; and provides an adaptive live/one-shot terminal dashboard with fixed old-row visibility controls. It has no daemon, recovery schema, recursive discovery, or required build step. Optional global installation may compile a disposable staged watcher with scriptc, but the Node ESM source remains canonical.

### Responsibility

The module owns harness-neutral persistence and analysis. Harness adapters supply native session identity, workspace root, nullable agent/title snapshots, honest telemetry, and strict optional `closeSession`. Current checkpoints contain `agent` and `session_title`; legacy parsing adds both as `null` in memory without rewriting bytes. Status events remain exactly `timestamp`, `session_id`, `event: "session_status"`, and `status: "open" | "closed"`. Every checkpoint validates all records from one timestamp before writing and appends `open` → checkpoint → optional `closed` as separate lines. Status events never contribute to metrics; `remainingKTokens` and `closeSession` are never persisted.

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
| `packages/checkpoint-core/fixtures/pilot/` | directory | Five legacy pilot JSONL scenario fixtures. |
| `packages/checkpoint-core/fixtures/status/` | directory | Mixed, status-only, duplicate, reopen/physical-order, and malformed lifecycle fixtures. |
| `packages/checkpoint-core/test/` | directory | Core and inspection behavioral tests. |
| `packages/checkpoint-core/test/native-checkpoint-watch-smoke.py` | file | Standard-library non-TTY and PTY smoke driver for the exact scriptc-produced live watcher. |

## Key Symbols

| Symbol | Kind | Visibility | Location | Purpose |
|---|---|---|---|---|
| `validateCheckpointRecord` | function | public | `packages/checkpoint-core/src/index.js:61` | Accepts exactly the legacy six or current eight fields and validates metadata types/ranges. |
| `validateSessionStatusRecord` | function | public | `packages/checkpoint-core/src/index.js` | Accepts only the exact four-field event and lowercase `open`/`closed` values. |
| `normalizeCheckpointRecord` | function | private | `packages/checkpoint-core/src/index.js` | Adds nullable metadata to legacy checkpoints in memory without rewriting bytes. |
| `normalizeLogRecord` | function | private | `packages/checkpoint-core/src/index.js` | Dispatches each mixed record to the strict status or checkpoint validator. |
| `createCheckpointRecord` | function | public | `packages/checkpoint-core/src/index.js` | Creates a timestamped current checkpoint with false/null defaults. |
| `createSessionStatusRecord` | function | public | `packages/checkpoint-core/src/index.js` | Creates an exact timestamped lifecycle event. |
| `checkpointPath` | function | public | `packages/checkpoint-core/src/index.js` | Percent-encodes a non-empty session ID into `.agent-checkpoints/<id>.jsonl`. |
| `checkpoint` | async function | public | `packages/checkpoint-core/src/index.js:230` | Strictly validates optional `closeSession` and appends exact `open` → checkpoint → optional `closed` lines from one captured timestamp. |
| `appendSessionStatus` | async function | public | `packages/checkpoint-core/src/index.js` | Appends one compact status line through the same path/containment boundary. |
| `parseCheckpointLogJsonl` | function | public | `packages/checkpoint-core/src/index.js` | Strictly parses all three exact variants in physical line order. |
| `filterCheckpointRecords` | function | public | `packages/checkpoint-core/src/index.js` | Returns normalized checkpoint copies from an already parsed mixed array. |
| `parseCheckpointJsonl` | function | public | `packages/checkpoint-core/src/index.js` | Compatibility facade that parses mixed JSONL and returns checkpoints only. |
| `analyzeCheckpoints` | function | public | `packages/checkpoint-core/src/index.js` | Computes checkpoint-only chain, work, and exact-three-word metrics. |
| `reduceSessionStatus` | function | public | `packages/checkpoint-core/src/index.js` | Reduces physical event order to `OPEN`, `CLOSED`, or `UNKNOWN`. |
| `analyzeCheckpointLog` | function | public | `packages/checkpoint-core/src/index.js` | Separates latest event/status/checkpoint and supplies neutral status-only metrics. |
| `formatMetric` | function | public | `packages/checkpoint-core/bin/checkpoint-inspect.js:18` | Formats a metric as `success/count (percent)`. |
| `formatCheckpointSummary` | function | public | `packages/checkpoint-core/bin/checkpoint-inspect.js:22` | Formats latest agent/title, work state, telemetry, and count-based metrics. |
| `main` | async function | public/CLI | `packages/checkpoint-core/bin/checkpoint-inspect.js:55` | Reads exactly one supplied path and exits nonzero on invalid input. |
| `parseArgs` | function | public | `packages/checkpoint-core/bin/checkpoint-watch.js:165` | Resolves modes and positive refresh/stale values from environment and CLI. |
| `OLD_ROW_MS` | constant | public | `packages/checkpoint-core/bin/checkpoint-watch.js` | Fixed 10,800,000 ms presentation boundary, independent of lifecycle and stale compatibility inputs. |
| `listSessionFiles` | async function | public | `packages/checkpoint-core/bin/checkpoint-watch.js:195` | Lists only direct regular `.agent-checkpoints/*.jsonl` files. |
| `loadSessionRows` | async function | public | `packages/checkpoint-core/bin/checkpoint-watch.js:540` | Builds lifecycle-ranked/latest-event-sorted rows, compact metrics, and isolated `ERROR` rows while retaining session ID internally. |
| `formatDashboard` | function | public | `packages/checkpoint-core/bin/checkpoint-watch.js` | Formats agent-priority compact columns and current-unclosed/old-unclosed/closed/error paragraphs while hiding old valid rows by default. |
| `runLiveDashboard` | async function | public | `packages/checkpoint-core/bin/checkpoint-watch.js` | Serializes timer/event/key redraws and owns lowercase-`v`, raw Ctrl-C, signal, input-state, watcher, timer, and cursor cleanup. |
| `main` (dashboard) | async function | public/CLI | `packages/checkpoint-core/bin/checkpoint-watch.js:984` | Runs help, one-shot, or live mode from the current workspace. |

## Data Flow

1. An adapter calls `checkpoint` with session ID, worktree, labels, outcome, strict optional close, telemetry, and nullable metadata. Capability-gated lifecycle hooks remain additive.
2. The core validates strict close type, destination, and every exact record before the first write, then sequentially appends one compact line each in `open` → checkpoint → optional `closed` order without rewriting prior bytes. An I/O failure may leave only that truthful prefix.
3. `parseCheckpointLogJsonl` preserves physical line order. The compatibility `parseCheckpointJsonl` facade filters status events and normalizes only legacy checkpoint metadata.
4. `analyzeCheckpointLog` separates `latestEvent`, `latestStatusEvent`, and `latestCheckpoint`; lifecycle reduction follows physical status-event order, while metrics use filtered checkpoints only.
5. `checkpoint-inspect` renders explicit state plus separated event/status/checkpoint details. `checkpoint-watch` uses latest-event age as information and renders `OPEN`, `CLOSED`, or `UNKNOWN`; only its per-file read/parse catch path creates an `ERROR` row. Valid rows at or above the fixed three-hour boundary are presentation-filtered initially without changing loaded data or lifecycle.
6. Live TTY input uses lowercase `v` to toggle old rows. Current unclosed, old unclosed, closed, and error paragraphs retain deterministic newest-first ordering, while one cleanup path restores all owned terminal/process resources.

## Configuration

Direct inspection is `node packages/checkpoint-core/bin/checkpoint-inspect.js .agent-checkpoints/<encoded-session>.jsonl`. The dashboard is `node packages/checkpoint-core/bin/checkpoint-watch.js` (live) or `--once`. Refresh defaults to 1,000 ms. `--stale-ms`/`CHECKPOINT_WATCH_STALE_MS` remain positively validated compatibility-only no-ops and do not configure the fixed three-hour visibility boundary. Age never selects lifecycle state; no state proves current process liveness or work success.

The dashboard renders only `AGENT | NAME | AGE | STATE | CP | C/W/3 % | CONTEXT | DONE | CURRENT`; session ID stays internal and remains visible in the unchanged inspector. Old valid rows are hidden initially in live and one-shot views. Lowercase live `v` reveals current open/unknown, old open/unknown, closed, and error paragraphs in that order; errors are never age-filtered. Valid rows sort newest-first. At 120 columns complete known agent identities are reserved before `NAME`, which shrinks to its four-character header width before `AGENT`; genuinely narrow lines remain deterministically bounded. Closed rows show `CURRENT=—`.

## Inventory Notes

- **Coverage**: full
- **Notes**: Inventory includes the package manifest, implementation/bin files, shared cases, pilot/status fixtures, all Node test files, and the native Python smoke helper. Tests cover exact variants, append-prefix integrity, mixed compatibility filtering, physical-order status reduction, neutral status-only analysis, explicit reader states, isolated failures, fixed-boundary filtering, agent-priority widths, live input cleanup, real native refresh/toggle/termination, and adapter-produced mixed/status-only parity across all four installed harness integrations.
