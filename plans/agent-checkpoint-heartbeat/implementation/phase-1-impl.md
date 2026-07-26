---
type: planning
entity: implementation-plan
plan: "agent-checkpoint-heartbeat"
phase: 1
status: revised
created: "2026-07-26"
updated: "2026-07-26"
---

# Implementation Plan: Phase 1 - Shared Contract and Monorepo Foundation

> Implements [Phase 1](../phases/phase-1.md) of [agent-checkpoint-heartbeat](../plan.md)

## Approach

Refine the dependency-free ESM package at `packages/checkpoint-core/` without introducing a service, daemon, build system, or repository-wide package manager. The single public module continues to own record validation, stable workspace-relative path mapping, append behavior, JSONL parsing, and read-only analysis. It must preserve strict read compatibility with historical six-field records while making all new writes use the current eight-field schema, whose `agent` and `session_title` metadata fields are nullable.

The core `checkpoint` operation continues to receive harness-owned session/context values through its options, constructs exactly the current eight fields, appends them, and returns supplied context feedback without persisting derived values. Parsing normalizes accepted legacy records in memory by adding null metadata but never rewrites source bytes. Analysis retains the existing scalar compatibility fields and additionally exposes count-based `chain`, `work`, and `threeWord` results as `{ success, count, percent }`; `work` alone reflects `step_failed`, while chain and three-word compliance remain independent of it. Harness-specific metadata discovery remains Phase 2 scope, and inspector/dashboard presentation remains Phase 3 scope.

## Affected Modules

| Module | Change Type | Description |
|--------|-------------|-------------|
| Checkpoint Core (`packages/checkpoint-core/`) | modify | Refine the established schema, backward-compatible parser, count-based analysis contract, fixtures, and focused tests. |
| Root runtime-state handling (`.gitignore`) | preserve | Retain the existing root-local `.agent-checkpoints/` exclusion; installer behavior remains outside this phase. |

## Required Context

| File | Why |
|------|-----|
| `plans/agent-checkpoint-heartbeat/plan.md` | Defines the original six-field contract, global constraints, exclusions, and cross-harness outcome that the refinement must preserve for historical reads. |
| `plans/agent-checkpoint-heartbeat/phases/phase-1.md` | Provides the gated Phase 1 scope, deliverables, and acceptance criteria. |
| `docs/agent-checkpoint-heartbeat.md` | Defines checkpoint chaining, three-word calculation, failed-step semantics, context nullability, and JSONL examples. |
| `docs/overview.md` | Establishes the current dependency-light repository, implemented checkpoint package, and Node test command. |
| `docs/modules/installation-and-configuration.md` | Identifies `.gitignore` ownership and the current later-phase OpenCode installation boundary that Phase 1 must not alter. |
| `.gitignore` | Contains the narrow root-local runtime-state exclusion that must remain intact. |
| `install.sh` | Confirms that adapter/watcher distribution is implemented by later phases and stays outside the Phase 1 core refinement. |
| `plans/agent-checkpoint-heartbeat/phases/phase-2.md` | Establishes the immediate consumer boundary: an OpenCode-native wrapper around the stable Phase 1 contract. |
| `plans/agent-checkpoint-heartbeat/phases/phase-3.md` | Confirms that selected-log display is deferred while raw parsing and calculations must remain reusable. |
| `plans/agent-checkpoint-heartbeat/phases/phase-6.md` | Confirms that shared fixtures and observable behavior, not cross-language code reuse, are the Python adapter boundary. |
| `packages/checkpoint-core/src/index.js` | Grounds the implemented legacy/current field sets, normalization, write path, and count-based analysis return shape. |
| `packages/checkpoint-core/test/checkpoint-core.test.js` | Defines the regression boundary for strict schemas, mixed legacy/current parsing, append behavior, and all three analysis signals. |

## Implementation Steps

### Step 1: Preserve the minimal package boundary

- **What**: Keep `packages/checkpoint-core/package.json` and `packages/checkpoint-core/src/index.js` as one private, dependency-free ESM package with an explicit public export and package-local behavioral tests. Do not add a root workspace manifest, transpiler, bundler, generated lockfile, or new runtime dependency as part of the metadata refinement.
- **Where**: `packages/checkpoint-core/package.json`; `packages/checkpoint-core/src/index.js`
- **Authorized By**: Phase 1 Scope → Includes “Monorepo package/module boundary for the shared checkpoint behavior and fixtures”; Phase 1 Notes requiring the smallest structure compatible with this repository; Plan Scope-Bounding Assumptions permitting harness-native wrappers.
- **Why**: A self-contained package gives later adapters a concrete contract boundary while matching the repository's current dependency-light design and avoiding premature monorepo tooling.
- **Considerations**: Keep runtime code on stable Node built-ins and plain JavaScript so the phase has no install/build prerequisite. Python and other adapters may consume fixtures rather than this module.

### Step 2: Enforce strict legacy and current schemas

- **What**: Keep `validateCheckpointRecord` strict rather than accepting arbitrary supersets: accept either all and only the historical six fields (`timestamp`, `session_id`, `done`, `next`, `step_failed`, `context_used`) or all and only the current eight fields with `agent` and `session_title`. Validate both metadata values as `null` or non-blank strings. Make `createCheckpointRecord` and `checkpoint` always emit all eight current fields, defaulting both metadata values to `null`, while retaining the existing timestamp, session, label, failure, and context validation and non-persisted feedback behavior.
- **Where**: `packages/checkpoint-core/src/index.js` (`LEGACY_RECORD_FIELDS`, `METADATA_FIELDS`, `RECORD_FIELDS`, `validateCheckpointRecord`, `createCheckpointRecord`, `checkpoint`)
- **Authorized By**: Plan Guiding Decisions lines 24–31; Functional Requirements for raw records and context feedback; Phase 1 Acceptance Criteria for exact schema validation, missing context, and independent failed-step handling; requested backward-compatible metadata/schema refinement; existing invariant in `docs/agent-checkpoint-heartbeat.md` that three-word and chain expectations are non-blocking.
- **Why**: Explicit dual-schema validation preserves historical logs without allowing malformed partial metadata records, while eight-field-only writes converge every new record on the richer schema.
- **Considerations**: Do not mutate a historical JSON object during validation, accept a seven-field hybrid, make metadata mandatory/non-null, or persist remaining tokens, paths, percentages, or other derived values. The injectable clock remains only a deterministic test seam.

### Step 3: Implement safe path lookup and append-only persistence

- **What**: Export `checkpointPath(sessionId)` to return only the POSIX-style workspace-root-relative `.agent-checkpoints/<encoded-session-id>.jsonl` path; every consumer resolves that result against the same active workspace root used by `checkpoint`. Encode the UTF-8 session ID with uppercase percent escapes using the JavaScript `encodeURIComponent` safe set (`A-Z`, `a-z`, `0-9`, `-`, `_`, `.`, `!`, `~`, `*`, `'`, `(`, `)`), so `/`, `\`, `%`, spaces, control characters, and non-ASCII bytes are encoded without lossy collisions while ordinary IDs such as `ses_123` remain unchanged. Resolve the returned relative path beneath the caller's workspace root, verify containment, create only `.agent-checkpoints/` as needed, and append one compact serialized record plus one newline without reading or rewriting prior content.
- **Where**: `packages/checkpoint-core/src/index.js` (`checkpointPath`, append path resolution, and append helper)
- **Authorized By**: Phase 1 Scope → Includes safe workspace-root resolution, append semantics, and `checkpoint_path`; Acceptance Criteria for repeated independently parseable appends, stable relative lookup, and escape prevention; Plan Non-Functional Requirement that caller identifiers cannot escape `.agent-checkpoints/`.
- **Why**: One deterministic path function keeps lookup and writing aligned while append mode preserves the complete session history.
- **Considerations**: Reject an empty session identifier because it cannot identify a stable per-session file. Do not claim cross-process locking or create recovery/read-side state; each call appends exactly one line.

### Step 4: Normalize reads and expose count-based analysis

- **What**: Keep strict, non-mutating JSONL parsing, but normalize each valid historical six-field record in the returned in-memory representation with `agent: null` and `session_title: null`; mixed legacy/current files must parse without rewriting their source bytes. Have `analyzeCheckpoints` validate and clone records, retain the scalar compatibility fields, and return `chain`, `work`, and `threeWord` objects in the shape `{ success, count, percent }`. Compute chain success over exact adjacent `previous.next === current.done` transitions (`0/0/null` for one record), work success from records where `step_failed === false`, and three-word success across all `done` and `next` labels using trimmed whitespace-separated words. Preserve the language-neutral path and analysis fixtures.
- **Where**: `packages/checkpoint-core/src/index.js` (`parseCheckpointJsonl`, `analyzeCheckpoints`); `packages/checkpoint-core/fixtures/checkpoint-cases.json`
- **Authorized By**: Phase 1 Scope → Includes read-only calculations and shared fixtures; Deliverable “External chain/three-word calculation behavior that ignores `step_failed`”; Acceptance Criteria for matching/broken chains, label compliance, failed steps, and missing context; Plan Functional Requirement that analysis remain external to raw logs; requested count-based Chain/Work/Three-word refinement.
- **Why**: Explicit numerators and denominators make all three signals auditable while preserving the distinction between Canary compliance (`chain`, `threeWord`) and work outcome (`work`).
- **Considerations**: Empty input must fail rather than inventing metrics. `step_failed` changes only work success. Parsing may normalize returned objects but must not write to or alter the source log, and analysis must not mutate caller-owned records.

### Step 5: Extend behavioral regression coverage

- **What**: Maintain one focused `node:test` suite that exercises strict six-or-eight-field validation, rejection of partial metadata and invalid nullable values, eight-field creation/appends, mixed legacy/current parsing with null normalization and unchanged source bytes, deterministic path mapping, append preservation, fixture calculations, count objects for all three metrics, failed-step separation, and missing context. Preserve the existing anchored `/.agent-checkpoints/` ignore rule so package fixtures remain tracked.
- **Where**: `packages/checkpoint-core/test/checkpoint-core.test.js`; `.gitignore`
- **Authorized By**: Phase 1 Deliverable “Focused automated tests”; all Phase 1 Acceptance Criteria; Plan Testing Strategy for serialization, safe mapping, exact append behavior, external calculations, and controlled failure; Plan Scope → Includes root runtime ignore and test-fixture handling.
- **Why**: Temporary-workspace behavioral tests verify the actual filesystem contract without creating repository-local logs, and the anchored ignore rule protects local runtime state without hiding fixtures elsewhere.
- **Considerations**: Tests must assert that a traversal-shaped identifier remains under the temporary `.agent-checkpoints/` directory, that Chain and Three-word results are unchanged by `step_failed`, and that Work changes independently.

## Testing Plan

Verify command: `node --test packages/checkpoint-core/test/checkpoint-core.test.js`

| Test Type | What to Test | Expected Outcome |
|-----------|-------------|-----------------|
| Contract unit | Exact legacy six-field and current eight-field validation, metadata null/default/type rules, current record creation, timestamps, and non-three-word labels | Historical records remain readable, new records always carry both metadata keys, partial/extra schemas fail, and word-count drift remains recordable. |
| Filesystem integration | Shared exact encoding cases, safe and traversal-shaped IDs, workspace-root-relative lookup, directory creation, first/repeated appends, and prior-byte preservation in a temporary workspace | Every adapter can reproduce the same relative path, every line parses independently, history is unchanged, and no path escapes `.agent-checkpoints/`. |
| Parsing and analysis unit/fixture | Legacy/current/mixed JSONL, first/matching/broken chains, successful/failed work, compliant/non-compliant labels, and missing context | Reads normalize nullable metadata without rewriting bytes; each signal exposes matching `success/count/percent`; only work changes with `step_failed`; a first-record chain is `0/0/null`. |

### Test Integrity Constraints

- `packages/checkpoint-core/test/checkpoint-core.test.js` is intentionally updated for the schema and metric refinements; its path safety, append-only, timestamp, context, and non-blocking label assertions must remain intact.
- New tests must not be skipped, focused with `.only`, deleted, or have schema/path/append assertions weakened to make implementation pass.
- Tests must use OS temporary directories and deterministic injected timestamps; they must not write under the repository's real `.agent-checkpoints/` directory.
- The legacy six-field fixture records remain contract evidence for later adapters and must not be rewritten to eight fields merely to make parsing tests pass.

## Rollback Strategy

Revert the metadata and count-based analysis refinements in `packages/checkpoint-core/src/index.js` and their focused assertions while retaining the established package, fixtures, safe path mapping, append-only behavior, and anchored ignore entry. Existing eight-field logs would then require compatibility consideration before rollback; no installer change belongs to this phase.

## Open Decisions

| Decision | Options | Chosen | Rationale |
|----------|---------|--------|-----------|
| Initial package shape | Root JavaScript workspace; self-contained package; service/daemon | Self-contained `packages/checkpoint-core/` ESM package | It establishes a reusable monorepo boundary with no root toolchain or service, matching the phase's KISS constraint. |
| Unsafe identifier mapping | Reject all non-allowlisted IDs; lossy replacement; deterministic UTF-8 percent encoding | `encodeURIComponent` safe set with uppercase percent escapes | Stable lookup remains usable for native IDs, cross-language fixtures define exact outputs, separators cannot create nested/escaping paths, and lossy collisions are avoided. |
| Shared-language strategy | Force every adapter through JavaScript; duplicate all behavior; share observable fixtures with optional code reuse | Shared JavaScript core plus authoritative fixtures | Phase 6 explicitly permits native Python code while requiring contract parity. |
| Schema evolution | Rewrite legacy logs; permissive optional keys; exact dual read schema with current-only writes | Exact six-or-eight-field reads and eight-field writes | It preserves historical bytes, rejects ambiguous hybrids, and converges new records on nullable metadata. |
| Metric representation | Percent-only values; independent scalar counts; `{ success, count, percent }` objects plus compatibility scalars | Count-based objects plus existing scalars | Inspectors can render auditable ratios without breaking existing scalar consumers. |

## Reality Check

### Code Anchors Used

| File | Symbol/Area | Why it matters |
|------|-------------|----------------|
| `.gitignore` | Root-local `/.agent-checkpoints/` rule | Confirms runtime state is already narrowly ignored while package fixtures remain trackable. |
| `install.sh` | `install_opencode_checkpoint`; watcher/core support copies | Confirms harness-specific installation was added by later phases and remains outside the Phase 1 core contract. |
| `docs/overview.md` | Tech Stack; Build & Run; Testing | Confirms the current dependency-free JavaScript core, no compilation step, and focused Node test suite. |
| `docs/modules/installation-and-configuration.md` | Responsibility; Structure → `.gitignore`; Install Skills/Agents inventory | Confirms `.gitignore` ownership and the current distribution boundary. |
| `plans/agent-checkpoint-heartbeat/phases/phase-2.md` | Scope and prerequisite | Confirms OpenCode must wrap the Phase 1 contract rather than being introduced in this package. |
| `plans/agent-checkpoint-heartbeat/phases/phase-6.md` | Notes | Confirms that cross-language code reuse is optional and fixtures/observable behavior are authoritative. |
| `packages/checkpoint-core/src/index.js` | `validateCheckpointRecord`; `normalizeCheckpointRecord`; `createCheckpointRecord`; `parseCheckpointJsonl`; `analyzeCheckpoints` | Confirms exact six/eight-field reads, eight-field writes, null normalization, and count-based Chain/Work/Three-word results. |
| `packages/checkpoint-core/test/checkpoint-core.test.js` | Schema, mixed JSONL, append, fixture, and failed-step tests | Confirms backward compatibility, strict hybrid rejection, source-byte preservation, and metric independence. |

### Mismatches / Notes

- The original gated phase describes exactly six raw fields, while the implemented refinement writes eight. This revised implementation plan treats six-field logs as a strict legacy read schema and preserves every original field and invariant; the two added metadata fields are nullable and no historical bytes are migrated.
- The local authoring environment provides Node v24.16.0, but the repository does not currently declare a supported Node version. The implementation deliberately uses only stable built-ins; release/runtime version policy is not needed for this phase's behavioral contract.
- `docs/agent-checkpoint-heartbeat.md` now documents OpenCode as the implemented first harness and describes the metadata refinement; Phase 1 still owns only the harness-neutral schema, persistence, and analysis behavior.
- `install.sh` now distributes the OpenCode plugin/core/watcher assets implemented by later phases. Phase 1 remains harness-neutral and does not alter those installation mappings during this refinement.
- Phase 1 analysis now includes work outcome counts in addition to the gated chain and three-word calculations. This is a derived, read-only view of the existing `step_failed` field and does not add persisted data or reinterpret Canary quality.

### Blocking Decisions

- None.
