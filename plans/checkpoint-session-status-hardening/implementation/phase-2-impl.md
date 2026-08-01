---
type: planning
entity: implementation-plan
plan: "checkpoint-session-status-hardening"
phase: 2
status: draft
created: "2026-07-31"
updated: "2026-07-31"
---

# Implementation Plan: Phase 2 - Status Contract and Readers

> Implements [Phase 2](../phases/phase-2.md) of [checkpoint-session-status-hardening](../plan.md)

## Approach

Extend checkpoint-core with one additive mixed-log variant while freezing both existing checkpoint variants. A mixed parser will preserve physical JSONL order and accept only exact legacy six-field checkpoints, exact current eight-field checkpoints, or exact four-field `{timestamp, session_id, event: "session_status", status: "open" | "closed"}` records. Keep `validateCheckpointRecord`, `createCheckpointRecord`, `checkpoint`, and the existing checkpoint-only parsing/analysis surface checkpoint-specific; expose separate mixed-log helpers plus a compatibility filter so current consumers continue to receive normalized checkpoints and unchanged metrics.

Build one core log-analysis model that separates `latestEvent`, `latestStatusEvent`, and `latestCheckpoint`, reduces lifecycle state only from status records in physical line order, and computes checkpoint metrics only after filtering status events. Inspector and watcher will consume that model. Valid logs can reduce only to `OPEN`, `CLOSED`, or `UNKNOWN`; `ERROR` remains a watcher catch-path row for an unreadable or invalid file and never enters persistence or reduction. The watcher keeps `AGE` based on the latest physical event as independent information and no longer derives state from age. This phase adds and tests the shared status append primitive required by later phases, but no harness, hook, plugin, or adapter calls it yet.

## Affected Modules

| Module | Change Type | Description |
|--------|-------------|-------------|
| [Checkpoint Core](../../../docs/modules/checkpoint-core.md) | modify | Add the strict status-event variant, mixed parsing, checkpoint-only compatibility filtering, one-line append support, physical-order reduction, and mixed-log analysis. |
| Checkpoint Inspector (`packages/checkpoint-core/bin/checkpoint-inspect.js`) | modify | Render explicit lifecycle state and separated latest-event/status/checkpoint data while preserving strict nonzero/stderr failures. |
| Checkpoint Watcher (`packages/checkpoint-core/bin/checkpoint-watch.js`) | modify | Replace age-derived `ACTIVE`/`STALE` with reduced `OPEN`/`CLOSED`/`UNKNOWN`, retain informational age, and preserve per-file `ERROR` isolation. |
| Core fixtures and tests (`packages/checkpoint-core/fixtures/`, `packages/checkpoint-core/test/`) | modify | Cover exact variants, compatibility behavior, metric exclusion, reduction order, status-only logs, deterministic readers, and malformed/unreadable inputs. |
| Contract and dashboard documentation (`docs/agent-checkpoint-heartbeat.md`, `docs/installation.md`) | modify | Document the third exact record variant, conservative lifecycle semantics, compatibility facade, reader output, and reader-first/no-writer phase boundary. |

## Required Context

| File | Why |
|------|-----|
| `plans/checkpoint-session-status-hardening/plan.md` | Authoritative event shape, state vocabulary, physical-order semantics, metric boundary, and reader-first constraints. |
| `plans/checkpoint-session-status-hardening/phases/phase-2.md` | Gated Phase 2 scope, deliverables, acceptance criteria, and explicit writer exclusions. |
| `plans/checkpoint-session-status-hardening/reviews/plan-review.md` | Remediated distinction between lifecycle reduction and watcher-only failure presentation. |
| `plans/checkpoint-session-status-hardening/implementation/phase-1-impl.md` | Interface continuity: unchanged six-/eight-field records, parent-owned Hermes logs, and the corrected baseline this phase consumes. |
| `packages/checkpoint-core/src/index.js` | Current exact checkpoint validators/creators, append path, strict parser, and checkpoint-only analysis APIs to preserve or extend. |
| `packages/checkpoint-core/bin/checkpoint-inspect.js` | Current latest-record assumptions and nonzero/stderr failure contract. |
| `packages/checkpoint-core/bin/checkpoint-watch.js` | Current age-derived state, per-file `ERROR` path, sorting, age, and deterministic formatting behavior. |
| `packages/checkpoint-core/fixtures/checkpoint-cases.json` and `packages/checkpoint-core/fixtures/pilot/*.jsonl` | Existing path/analysis cases and immutable checkpoint-only scenario bytes. |
| `packages/checkpoint-core/test/checkpoint-core.test.js` | Exact-schema, append-integrity, parser, normalization, and analysis compatibility assertions. |
| `packages/checkpoint-core/test/checkpoint-inspect.test.js` | Selected-path output, neutral formatting, read-only behavior, and concise failure assertions. |
| `packages/checkpoint-core/test/checkpoint-watch.test.js` | Existing age/state, error isolation, sorting, width, CLI option, once/live, and symlink-main coverage. |
| `docs/modules/checkpoint-core.md` | Curated core inventory and current six/eight-only, `ACTIVE`/`STALE` descriptions to update. |
| `docs/agent-checkpoint-heartbeat.md` | Canonical raw contract, metric semantics, inspector example, dashboard semantics, and adapter boundary. |
| `docs/installation.md` | User-facing dashboard options/state wording that currently treats stale age as row state. |

## Implementation Steps

### Step 1: Add the exact status-event contract and append primitive

- **What**: Define the exact four status fields and two allowed raw status values. Add `validateSessionStatusRecord` and `createSessionStatusRecord` alongside—not inside—the checkpoint validator/creator. Add a mixed-record dispatcher used by `parseCheckpointLogJsonl`, which retains physical line order and validates every line as exactly one of the three authorized variants. Add `appendSessionStatus` using the existing encoded path/containment logic and exactly one `appendFile` call for one compact JSON line. Factor a private append helper only if needed to keep checkpoint and status writes behaviorally identical.
- **Where**: `packages/checkpoint-core/src/index.js` (field constants, timestamp/session validation reuse, new status validator/creator, `resolveCheckpointFile`, append path, new mixed parser); `packages/checkpoint-core/test/checkpoint-core.test.js`; status fixtures under `packages/checkpoint-core/fixtures/`.
- **Authorized By**: Phase 2 Scope item “Exact four-field status-event validation, creation, append support, mixed parsing”; Acceptance Criteria 1–2; plan Guiding Decisions for the exact third variant, same append-only file, and one append operation per line.
- **Why**: Later writers need one shared primitive, but readers must understand it first. Separate validators prevent the new discriminator from changing either existing discriminator-free checkpoint shape.
- **Considerations**: Require exactly `timestamp`, `session_id`, `event`, and `status`; require `event === "session_status"`; require status to be exactly lowercase `open` or `closed`. Reject missing, partial, extra, unknown-event, wrong-case, non-object, invalid timestamp, and empty-session forms. Do not add `event` to checkpoint records, normalize status records with checkpoint metadata, rewrite existing bytes, sort by timestamp, enforce stronger cross-process ordering, or expose any harness writer in this phase.

### Step 2: Preserve checkpoint-only APIs and add physical-order lifecycle analysis

- **What**: Keep `parseCheckpointJsonl` as the checkpoint-only compatibility facade: parse through the strict mixed parser, filter status records, and return legacy checkpoints normalized exactly as today plus unchanged current checkpoints. Add an explicit `filterCheckpointRecords` helper for already parsed mixed arrays. Preserve `analyzeCheckpoints`' existing checkpoint-only return shape and rejection of zero checkpoint records while making status records harmless when present around checkpoints. Add `reduceSessionStatus` returning only `OPEN`, `CLOSED`, or `UNKNOWN`, and add `analyzeCheckpointLog` for readers; it returns the physically ordered mixed records, filtered checkpoints, `latestEvent`, `latestStatusEvent`, `latestCheckpoint`, reduced state, and checkpoint analysis. Its status-only path supplies zero-count/null-percent chain, work, and three-word metrics without changing `analyzeCheckpoints([])` compatibility behavior.
- **Where**: `packages/checkpoint-core/src/index.js` (`parseCheckpointJsonl`, new `parseCheckpointLogJsonl`, `filterCheckpointRecords`, `analyzeCheckpoints`, new `reduceSessionStatus` and `analyzeCheckpointLog`); `packages/checkpoint-core/fixtures/checkpoint-cases.json`; `packages/checkpoint-core/test/checkpoint-core.test.js`.
- **Authorized By**: Phase 2 Scope items for checkpoint-only compatibility filtering and session-state reduction; Acceptance Criteria 1, 3–5; plan Functional Requirement for a checkpoint-only compatibility API and Guiding Decisions for physical-order reduction, duplicate idempotence, reopen, and metric exclusion.
- **Why**: Existing adapters and external callers already use `parseCheckpointJsonl`/`analyzeCheckpoints`. A new mixed layer lets readers see status events without contaminating or breaking those consumers.
- **Considerations**: Filter before calculating checkpoint adjacency so a status line between two checkpoints neither creates nor breaks a chain transition. Reduction must iterate array order and ignore timestamps: no status → `UNKNOWN`; last effective `open` → `OPEN`; last effective `closed` → `CLOSED`; repeated identical assignments are idempotent; `closed` followed later in the file by `open` is `OPEN`. `step_failed` remains work outcome only. Never return `ERROR` from this helper. Do not mutate caller arrays or records.

### Step 3: Make checkpoint-inspect mixed-log aware without adding an ERROR state

- **What**: Parse and analyze through `analyzeCheckpointLog`, then format lifecycle state from the reducer, latest-event/status timestamps and raw status, and checkpoint detail/metrics from `latestCheckpoint` only. Keep selected path and session identity visible. For status-only logs, render explicit neutral checkpoint fields (`-`, with context `unknown`) and `0/0 (n/a)` for all three metrics. Preserve the current `main` catch boundary: malformed, empty, unreadable, or invalid logs write one concise `checkpoint-inspect: ...` message to stderr, produce no summary on stdout, and return `1`; the inspector must never print or synthesize lifecycle `ERROR`.
- **Where**: `packages/checkpoint-core/bin/checkpoint-inspect.js` (`formatCheckpointSummary`, imports, `main`); `packages/checkpoint-core/test/checkpoint-inspect.test.js`; mixed/status-only fixtures.
- **Authorized By**: Phase 2 Scope item separating latest event/status/checkpoint and metrics; Acceptance Criteria 4 and 6; plan Non-Functional Requirement preserving inspector nonzero/stderr failures and restricting `ERROR` to reader failure presentation.
- **Why**: The current formatter assumes the physical last record has checkpoint fields, which would misrender or crash when the latest or only record is a status event.
- **Considerations**: Preserve deterministic/read-only selected-file behavior and existing checkpoint-only labels/values where their meaning has not changed. Use the latest physical event for the overall timestamp and latest checkpoint for agent/title/done/next/work/context. Show raw `open`/`closed` separately from uppercase reduced state; show `-` when no status or checkpoint exists. Do not compute state from timestamp age or turn malformed input into a valid summary.

### Step 4: Replace watcher liveness inference with explicit lifecycle state

- **What**: Have `loadSessionRows` consume the mixed-log analysis. Set `state` from the reducer and calculate `activityMs`, sorting, and `AGE` from `latestEvent.timestamp`; populate checkpoint detail/context and all metrics from the latest/filtered checkpoints. A valid status-only row must show its explicit state, `0/0 (n/a)` metrics, and neutral checkpoint details. Retain the existing per-file catch path as the only source of `state: "ERROR"`, leaving valid rows visible when another file is malformed or unreadable. Update state-column width and help/banner text so `UNKNOWN` is not truncated and age/reference-threshold options are explicitly informational.
- **Where**: `packages/checkpoint-core/bin/checkpoint-watch.js` (`HELP`, `loadSessionRows`, state/age/sort row construction, `formatDashboard` widths/banner); `packages/checkpoint-core/test/checkpoint-watch.test.js`; dashboard fixtures.
- **Authorized By**: Phase 2 Scope items for lifecycle states, informational age, and watcher-only errors; Acceptance Criteria 4–6; plan Target Outcome replacing `ACTIVE`/`STALE` inference and Guiding Decision that age never fabricates a terminal state.
- **Why**: The watcher currently assigns `ACTIVE`/`STALE` solely from checkpoint age, contradicting the accepted persisted-state model.
- **Considerations**: An old `open` event remains `OPEN`; a fresh `closed` event remains `CLOSED`; checkpoint-only logs remain `UNKNOWN` at every age. Keep `--stale-ms` and `CHECKPOINT_WATCH_STALE_MS` accepted for CLI compatibility, but describe/use the threshold only as an age reference—it must not select row state. Preserve shallow regular-file discovery, newest-event-first sorting, deterministic truncation/layout, once/live behavior, refresh events, cursor cleanup, and concise `ERROR` rows. `ERROR` must not be serialized or passed through lifecycle analysis.

### Step 5: Add comprehensive fixtures/tests and update contract documentation

- **What**: Extend shared cases and add compact status fixtures for mixed legacy/current/status logs, status-only, duplicate assignments, reopen, physical order that contradicts timestamp order, and malformed variants. Test exact creation/validation, append-prefix preservation, mixed parser order, compatibility filtering, no-mutation behavior, empty checkpoint metrics through mixed-log analysis, and all reader outcomes. Update the module inventory and concept/install docs for the third exact variant, status meaning, checkpoint-only facade, latest-event versus latest-checkpoint data, metric exclusion, explicit states, watcher-only errors, and the fact that adapters still emit no status in this reader-first phase.
- **Where**: `packages/checkpoint-core/fixtures/checkpoint-cases.json`; new focused files under `packages/checkpoint-core/fixtures/status/`; all three `packages/checkpoint-core/test/*.test.js`; `docs/modules/checkpoint-core.md`; `docs/agent-checkpoint-heartbeat.md`; `docs/installation.md`.
- **Authorized By**: Phase 2 Deliverable “Comprehensive fixtures/tests and updated core/concept documentation”; Acceptance Criteria 1–7; plan Testing Strategy for strict validation, mixed/status-only parsing, duplicates, reopen, malformed readers, and unchanged metrics.
- **Why**: Shared fixtures make the contract and reduction order explicit before any adapter is allowed to emit the new record.
- **Considerations**: Do not alter existing pilot JSONL bytes or checkpoint analysis expectations. Include unreadable-file injection as well as malformed JSON for watcher error isolation, and assert inspector stderr/nonzero separately. Do not edit OpenCode, Codex, Claude, or Hermes runtime/hook/plugin files, installer order, or any lifecycle writer in this phase.

## Testing Plan

Single phase verify command:

```bash
node --test packages/checkpoint-core/test/*.test.js
```

| Test Type | What to Test | Expected Outcome |
|-----------|-------------|-----------------|
| Exact contract | Six-field, eight-field, and four-field creation/validation plus missing/extra/partial/unknown variants | Only the three exact authorized shapes pass; checkpoint output bytes/shapes remain unchanged. |
| Append integrity | Checkpoint then status and status then checkpoint in one encoded session path | Each call performs one line append; prior bytes remain an exact prefix and the resulting mixed log parses in physical order. |
| Compatibility and metrics | Mixed logs through mixed parser, `parseCheckpointJsonl`, filtering, `analyzeCheckpoints`, and status-only log analysis | Existing facade returns only normalized checkpoints; status lines never affect chain/work/three-word counts; status-only metrics are all `0/0 (n/a)`. |
| Lifecycle reduction | No event, open, closed, duplicates, reopen, and timestamps intentionally out of order | Reducer returns only `UNKNOWN`, `OPEN`, or `CLOSED` from physical order; duplicate assignments are idempotent. |
| Inspector | Mixed, status-only, checkpoint-only, reopen, duplicate, malformed, empty, and unreadable selected logs | Valid summaries separate state/event/status/checkpoint data; invalid input remains nonzero/stderr with no `ERROR` lifecycle output. |
| Watcher | Old/fresh open/closed, status-only, checkpoint-only, malformed and unreadable files, sorting and layout | Age never changes state; valid rows remain visible; only failed files become `ERROR`; `UNKNOWN` renders in full. |
| Existing regression | Pilot fixtures, path encoding, metadata, metrics, read-only inspection, shallow discovery, widths, once/live, and symlink entry points | All preexisting checkpoint-only behavior remains green and source fixture bytes remain untouched. |

### Test Integrity Constraints

- Keep `validateCheckpointRecord` tests exact for six/eight fields; status acceptance belongs to a separate validator and mixed parser, not relaxed checkpoint expectations.
- Keep existing `createCheckpointRecord`, `checkpoint`, encoded-path, append-prefix, legacy normalization, metadata, and pilot fixture assertions unchanged except for additive mixed-log coverage.
- Preserve `parseCheckpointJsonl` as a checkpoint-only facade for all current adapter call sites; add assertions that mixed input filters status while pure checkpoint input returns the same values and key order as before.
- Preserve `analyzeCheckpoints([])` rejection and existing result shape. Zero-checkpoint neutral metrics belong to `analyzeCheckpointLog`'s valid status-only path, not a weakened old precondition.
- Replace watcher assertions for `ACTIVE`/`STALE` only because the gated lifecycle contract intentionally removes those states. Retain age, sorting, option parsing, formatting, and stale-threshold compatibility assertions independently.
- Keep inspector malformed/unreadable tests asserting status `1`, empty stdout, and prefixed stderr. Do not change them to accept a printed `ERROR` state.
- Keep watcher malformed-file isolation and add unreadable-file isolation; do not let one failed file abort valid rows or let valid reduction return `ERROR`.
- Do not delete, skip, focus out, or weaken existing tests or mutate existing fixture bytes to make mixed parsing pass.

## Rollback Strategy

Revert the core mixed-event helpers, reader formatting, added fixtures/tests, and documentation as one unit. No migration or log repair is needed because this phase enables no adapter writers and never rewrites existing logs. If rolled back before later writer phases, all persisted files remain checkpoint-only and readable by the prior readers.

## Open Decisions

| Decision | Options | Chosen | Rationale |
|----------|---------|--------|-----------|
| Existing parser compatibility | Change `parseCheckpointJsonl` to return unions; keep it checkpoint-only and add a mixed parser | Keep checkpoint-only; add `parseCheckpointLogJsonl` | Existing adapters consume checkpoint arrays; the gated plan explicitly requires a checkpoint-only compatibility API. |
| Empty checkpoint analysis | Change `analyzeCheckpoints([])`; add a mixed-log analysis path | Add `analyzeCheckpointLog` neutral status-only path | Preserves the old precondition while satisfying status-only reader metrics. |
| Lifecycle reduction output | Add `ERROR`; return only persisted lifecycle states | Only `OPEN`, `CLOSED`, `UNKNOWN` | `ERROR` is explicitly watcher presentation, never persisted or reduced. |
| Ordering | Sort status events by timestamp; consume physical JSONL order | Physical order | Gated user decision and the only ordering the append-only multi-process file can promise. |
| Watch stale options | Remove them; retain as compatibility age reference | Retain as informational compatibility | Avoids an unrelated CLI break while preventing age from changing lifecycle state. |

## Reality Check

### Code Anchors Used

| File | Symbol/Area | Why it matters |
|------|-------------|----------------|
| `packages/checkpoint-core/src/index.js` | `LEGACY_RECORD_FIELDS`, `RECORD_FIELDS`, `validateCheckpointRecord` | Current exact checkpoint variants must remain unchanged and discriminator-free. |
| `packages/checkpoint-core/src/index.js` | `createCheckpointRecord`, `checkpoint`, `resolveCheckpointFile` | Supplies the creation/path/one-line append behavior the status primitive must mirror without changing checkpoint writes. |
| `packages/checkpoint-core/src/index.js` | `parseCheckpointJsonl`, `normalizeCheckpointRecord` | Current public parser is checkpoint-only and normalizes only legacy metadata; it is the compatibility facade to preserve. |
| `packages/checkpoint-core/src/index.js` | `analyzeCheckpoints` | Currently requires at least one checkpoint and analyzes every supplied record, so mixed/status-only handling needs a separate filtered layer. |
| `packages/checkpoint-core/bin/checkpoint-inspect.js` | `formatCheckpointSummary`, `main` | Formatter assumes the last record is a checkpoint; `main` already has the required nonzero/stderr failure boundary. |
| `packages/checkpoint-core/bin/checkpoint-watch.js` | `loadSessionRows` | Lines 96–115 currently use the latest checkpoint for every field and derive `ACTIVE`/`STALE` from age. |
| `packages/checkpoint-core/bin/checkpoint-watch.js` | `loadSessionRows` catch path | Already isolates malformed files into `ERROR` rows; this behavior should remain presentation-only. |
| `packages/checkpoint-core/bin/checkpoint-watch.js` | `formatDashboard`, `HELP`, `parseArgs` | State width/help/banner and stale-threshold wording currently encode age-derived state while age/options/layout are independently reusable. |
| `packages/checkpoint-core/test/checkpoint-core.test.js` | Exact schema, parser, append, and `analyzeCheckpoints([])` tests | Defines compatibility behavior that the mixed layer must not weaken. |
| `packages/checkpoint-core/test/checkpoint-inspect.test.js` | Summary and failure tests | Defines deterministic read-only output plus inspector-specific failure semantics. |
| `packages/checkpoint-core/test/checkpoint-watch.test.js` | Row-state and malformed-file tests | Shows the exact `ACTIVE`/`STALE` assertions to replace and `ERROR` isolation assertions to retain. |
| `docs/modules/checkpoint-core.md`, `docs/agent-checkpoint-heartbeat.md`, `docs/installation.md` | Contract/dashboard descriptions | All currently document only six/eight records and age-derived `ACTIVE`/`STALE`. |

### Mismatches / Notes

- Current source and docs have no status-event variant, mixed parser, reducer, or status-only analysis. This is the authorized Phase 2 delta, not a scope mismatch.
- `parseCheckpointJsonl` is used by current OpenCode, Codex, Claude, Hermes parity tests, inspector, and watcher. Keeping that name checkpoint-only while moving updated readers to `analyzeCheckpointLog` provides the least disruptive continuity with Phase 1 and existing adapters.
- Current watcher `--stale-ms`/`CHECKPOINT_WATCH_STALE_MS` controls `ACTIVE`/`STALE`. After this phase it remains accepted only as an informational age-reference threshold; tests must prove it cannot alter `OPEN`, `CLOSED`, or `UNKNOWN`.
- Phase 1's implementation-plan artifact is complete, but Phase 2's gated execution prerequisite remains Phase 1 implementation plus focused green regressions. This does not block authoring; execution must not start from an uncorrected adapter baseline.
- The phase verify command is currently feasible and passed its 23-test baseline (`/tmp/opencode/checkpoint-session-status-hardening-phase2-baseline.log`). No pinned Claude or Hermes binary is needed for this core/readers-only gate.
- Core append support is intentionally present for later phases, but no adapter imports or calls it here. OpenCode, Codex, Claude, and Hermes continue to emit checkpoint records only until their gated writer phases.

### Blocking Decisions

- None. The exact variant, compatibility boundary, reduction vocabulary/order, reader-specific failure behavior, and no-adapter-writer boundary are all gated. Phase 1 completion is an execution prerequisite rather than an unresolved design decision.
