---
type: documentation
entity: module
module: "checkpoint-core"
version: 1.4
---

# Module: Checkpoint Core

> Part of [OpenCode Processing Skills](../overview.md); behavior guide: [Agent Checkpoint / Heartbeat](../agent-checkpoint-heartbeat.md)

## Overview

`packages/checkpoint-core/` is a private, dependency-free ESM package for the shared checkpoint contract. It validates exact legacy six-field checkpoints, current eight-field checkpoints, and four-field `session_status` events in one append-only JSONL stream; maps session IDs to safe workspace-relative paths; calculates checkpoint-only chain/work/exact-three-word metrics; reduces explicit lifecycle state; inspects one selected log; and provides an adaptive live/one-shot terminal dashboard. It has no daemon, recovery schema, recursive discovery, or build step.

### Responsibility

The module owns harness-neutral persistence and analysis. Harness adapters supply native session identity, workspace root, nullable agent/title snapshots, and honest telemetry. Current checkpoints contain `agent` and `session_title` in addition to the original six fields; parsing a legacy checkpoint adds both as `null` in memory without rewriting source bytes. A status event contains exactly `timestamp`, `session_id`, `event: "session_status"`, and `status: "open" | "closed"`. Status events never contribute to checkpoint metrics. OpenCode, Codex, Claude Code, and Hermes now consume the same append primitive only for lifecycle hooks their pinned surfaces actually observe. `remainingKTokens` may be returned by `checkpoint` but is never persisted.

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
| `checkpoint` | async function | public | `packages/checkpoint-core/src/index.js` | Appends one compact eight-field checkpoint line. |
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
| `parseArgs` | function | public | `packages/checkpoint-core/bin/checkpoint-watch.js:60` | Resolves modes and positive refresh/stale values from environment and CLI. |
| `listSessionFiles` | async function | public | `packages/checkpoint-core/bin/checkpoint-watch.js:90` | Lists only direct regular `.agent-checkpoints/*.jsonl` files. |
| `loadSessionRows` | async function | public | `packages/checkpoint-core/bin/checkpoint-watch.js:122` | Builds newest-first rows and isolates malformed files as `ERROR` rows. |
| `formatDashboard` | function | public | `packages/checkpoint-core/bin/checkpoint-watch.js:202` | Formats metadata/count columns and deterministically allocates remaining terminal width to title/done/next. |
| `runLiveDashboard` | async function | public | `packages/checkpoint-core/bin/checkpoint-watch.js:265` | Redraws by timer/event and cleans resources/cursor on exit. |
| `main` (dashboard) | async function | public/CLI | `packages/checkpoint-core/bin/checkpoint-watch.js:318` | Runs help, one-shot, or live mode from the current workspace. |

## Data Flow

1. An adapter calls `checkpoint` with session ID, worktree, labels, outcome, telemetry, and nullable agent/title metadata. Capability-gated lifecycle hooks call `appendSessionStatus`: OpenCode and Codex append observed opens, Claude appends parent/subagent opens and a parent graceful close, and Hermes appends only a new parent's open.
2. The core validates the exact variant and appends one compact line below the worktree's `.agent-checkpoints/` directory without rewriting prior bytes.
3. `parseCheckpointLogJsonl` preserves physical line order. The compatibility `parseCheckpointJsonl` facade filters status events and normalizes only legacy checkpoint metadata.
4. `analyzeCheckpointLog` separates `latestEvent`, `latestStatusEvent`, and `latestCheckpoint`; lifecycle reduction follows physical status-event order, while metrics use filtered checkpoints only.
5. `checkpoint-inspect` renders explicit state plus separated event/status/checkpoint details. `checkpoint-watch` uses latest-event age as information and renders `OPEN`, `CLOSED`, or `UNKNOWN`; only its per-file read/parse catch path creates an `ERROR` row.

## Configuration

Direct inspection is `node packages/checkpoint-core/bin/checkpoint-inspect.js .agent-checkpoints/<encoded-session>.jsonl`. The dashboard is `node packages/checkpoint-core/bin/checkpoint-watch.js` (live) or the same command with `--once`. Defaults are a 1,000 ms refresh and a 120,000 ms informational age-reference threshold; CLI flags override `CHECKPOINT_WATCH_REFRESH_MS`/`CHECKPOINT_WATCH_STALE_MS`. Age never selects lifecycle state. `OPEN` means an observed open without a later close, `CLOSED` means an observed graceful close, and `UNKNOWN` means no status event; none proves current process liveness.

The dashboard reserves fixed widths for identity/status fields, lets rendered metric counts determine metric widths, and divides remaining terminal columns across `NAME/TITLE`, `DONE`, and `NEXT`. Remainder columns go to those fields in that order. Each value and final line is deterministically truncated to its assigned width, using a trailing ellipsis where at least two characters fit (`packages/checkpoint-core/bin/checkpoint-watch.js:184-245`).

## Inventory Notes

- **Coverage**: full
- **Notes**: Inventory includes the package manifest, implementation/bin files, shared cases, pilot/status fixtures, and all three test files. Tests cover exact variants, append-prefix integrity, mixed compatibility filtering, physical-order status reduction, neutral status-only analysis, explicit reader states, isolated failures, retained deterministic layout/CLI behavior, and adapter-produced mixed/status-only parity across all four installed harness integrations.
