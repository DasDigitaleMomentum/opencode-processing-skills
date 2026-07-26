---
type: planning
entity: implementation-plan
plan: "agent-checkpoint-heartbeat"
phase: 1
status: draft
created: "2026-07-26"
updated: "2026-07-26"
---

# Implementation Plan: Phase 1 - Shared Contract and Monorepo Foundation

> Implements [Phase 1](../phases/phase-1.md) of [agent-checkpoint-heartbeat](../plan.md)

## Approach

Add one dependency-free ESM package at `packages/checkpoint-core/` rather than introducing a service, daemon, build system, or repository-wide package manager. The package will use Node built-ins for JSONL append and `node:test` for focused behavioral coverage. A single public module will define record validation, stable workspace-relative path mapping, append behavior, JSONL parsing, and read-only chain/three-word calculations. Shared fixtures will make the observable contract reusable by later native adapters even when they do not reuse the JavaScript implementation.

The core `checkpoint` operation will receive harness-owned session/context values through its internal options, construct exactly the six-field raw record, append it, and return the supplied context feedback without persisting derived values. Harness-specific discovery of session identity, context use, and remaining K-tokens remains deferred to the adapter phases. Label length is measured externally and never used to reject a checkpoint.

## Affected Modules

| Module | Change Type | Description |
|--------|-------------|-------------|
| Checkpoint Core (`packages/checkpoint-core/`) | create | Add the repository's first self-contained runtime package, contract fixtures, and behavioral tests. |
| [Installation and Configuration](../../../docs/modules/installation-and-configuration.md) | modify | Extend the root `.gitignore` with the local `.agent-checkpoints/` runtime directory; installer behavior is unchanged in this phase. |

## Required Context

| File | Why |
|------|-----|
| `plans/agent-checkpoint-heartbeat/plan.md` | Defines the six-field raw contract, global constraints, exclusions, and cross-harness outcome. |
| `plans/agent-checkpoint-heartbeat/phases/phase-1.md` | Provides the gated Phase 1 scope, deliverables, and acceptance criteria. |
| `docs/agent-checkpoint-heartbeat.md` | Defines checkpoint chaining, three-word calculation, failed-step semantics, context nullability, and JSONL examples. |
| `docs/overview.md` | Establishes the current Bash/Markdown repository reality and absence of an existing automated test suite. |
| `docs/modules/installation-and-configuration.md` | Identifies `.gitignore` ownership and confirms that runtime packages/tests are outside the existing installer module. |
| `.gitignore` | Must gain the root-local runtime-state exclusion without disturbing existing local-state rules. |
| `install.sh` | Confirms that current distribution copies only skills/personas and that harness installation is deferred to Phase 2. |
| `plans/agent-checkpoint-heartbeat/phases/phase-2.md` | Establishes the immediate consumer boundary: an OpenCode-native wrapper around the stable Phase 1 contract. |
| `plans/agent-checkpoint-heartbeat/phases/phase-3.md` | Confirms that selected-log display is deferred while raw parsing and calculations must remain reusable. |
| `plans/agent-checkpoint-heartbeat/phases/phase-6.md` | Confirms that shared fixtures and observable behavior, not cross-language code reuse, are the Python adapter boundary. |

## Implementation Steps

### Step 1: Create the minimal package boundary

- **What**: Create `packages/checkpoint-core/package.json` and `packages/checkpoint-core/src/index.js` as one private, dependency-free ESM package with an explicit public export and a package-local behavioral test script. Do not add a root workspace manifest, transpiler, bundler, or generated lockfile.
- **Where**: `packages/checkpoint-core/package.json`; `packages/checkpoint-core/src/index.js`
- **Authorized By**: Phase 1 Scope → Includes “Monorepo package/module boundary for the shared checkpoint behavior and fixtures”; Phase 1 Notes requiring the smallest structure compatible with this repository; Plan Scope-Bounding Assumptions permitting harness-native wrappers.
- **Why**: A self-contained package gives later adapters a concrete contract boundary while matching the repository's current dependency-light design and avoiding premature monorepo tooling.
- **Considerations**: Keep runtime code on stable Node built-ins and plain JavaScript so the phase has no install/build prerequisite. Python and other adapters may consume fixtures rather than this module.

### Step 2: Define and validate the raw contract

- **What**: Export record construction/validation and a `checkpoint` operation that accepts adapter-supplied `sessionId`, `done`, `next`, `stepFailed`, `contextUsed`, optional non-persisted `remainingKTokens`, clock, and workspace root. Construct records in the authorized field set and validate exact keys/types, an ISO UTC timestamp, non-empty session identity, boolean failure state, and `context_used` as `null` or a finite value from `0.0` through `1.0`. Default `step_failed` to `false` and `context_used` to `null`; do not reject labels based on word count or chain continuity. Return the supplied context utilization and optional remaining-K-token feedback, but never add remaining tokens, path, percentages, or other derived data to the JSONL record.
- **Where**: `packages/checkpoint-core/src/index.js` (`createCheckpointRecord`, `validateCheckpointRecord`, `checkpoint` public areas)
- **Authorized By**: Plan Guiding Decisions lines 24–31; Functional Requirements for six-field records and context feedback; Phase 1 Acceptance Criteria for exactly six fields, missing context, and independent failed-step handling; existing invariant in `docs/agent-checkpoint-heartbeat.md` that three-word and chain expectations are non-blocking.
- **Why**: Central validation fixes the observable raw schema before harness wrappers are introduced and prevents derived or fabricated telemetry from leaking into persistent logs.
- **Considerations**: The injectable clock is only a deterministic test seam. Adapter-specific acquisition of IDs/context and conversion from a model limit to remaining K-tokens are not implemented here.

### Step 3: Implement safe path lookup and append-only persistence

- **What**: Export `checkpointPath(sessionId)` to return only the POSIX-style workspace-root-relative `.agent-checkpoints/<encoded-session-id>.jsonl` path; every consumer resolves that result against the same active workspace root used by `checkpoint`. Encode the UTF-8 session ID with uppercase percent escapes using the JavaScript `encodeURIComponent` safe set (`A-Z`, `a-z`, `0-9`, `-`, `_`, `.`, `!`, `~`, `*`, `'`, `(`, `)`), so `/`, `\`, `%`, spaces, control characters, and non-ASCII bytes are encoded without lossy collisions while ordinary IDs such as `ses_123` remain unchanged. Resolve the returned relative path beneath the caller's workspace root, verify containment, create only `.agent-checkpoints/` as needed, and append one compact serialized record plus one newline without reading or rewriting prior content.
- **Where**: `packages/checkpoint-core/src/index.js` (`checkpointPath`, append path resolution, and append helper)
- **Authorized By**: Phase 1 Scope → Includes safe workspace-root resolution, append semantics, and `checkpoint_path`; Acceptance Criteria for repeated independently parseable appends, stable relative lookup, and escape prevention; Plan Non-Functional Requirement that caller identifiers cannot escape `.agent-checkpoints/`.
- **Why**: One deterministic path function keeps lookup and writing aligned while append mode preserves the complete session history.
- **Considerations**: Reject an empty session identifier because it cannot identify a stable per-session file. Do not claim cross-process locking or create recovery/read-side state; each call appends exactly one line.

### Step 4: Add reusable parsing, calculations, and fixtures

- **What**: Add strict non-mutating JSONL parsing and an analysis function that validates each record, computes exact-link chain percentage from adjacent `previous.next === current.done` transitions (`null` for a single record), and computes three-word percentage across every `done` and `next` label using trimmed whitespace-separated words. Add a compact language-neutral fixture matrix covering first record, matching and broken transitions, compliant and non-compliant labels, failed steps, `null` context, and exact session-ID-to-relative-path cases for safe IDs, traversal separators, percent signs, spaces, and Unicode. Ensure `step_failed` is returned as raw progress data but never enters either percentage calculation.
- **Where**: `packages/checkpoint-core/src/index.js` (`parseCheckpointJsonl`, `analyzeCheckpoints`); `packages/checkpoint-core/fixtures/checkpoint-cases.json`
- **Authorized By**: Phase 1 Scope → Includes read-only chain and three-word calculations and shared fixtures; Deliverable “External chain/three-word calculation behavior that ignores `step_failed`”; Acceptance Criteria for matching/broken chains, label compliance, failed steps, and missing context; Plan Functional Requirement that analysis remain external to raw logs.
- **Why**: Shared expected inputs/outputs prevent later JavaScript and Python wrappers from adopting incompatible Canary semantics.
- **Considerations**: Empty input should fail as having no session record rather than inventing percentages. Parsing and analysis must not write to or normalize the source log.

### Step 5: Add behavioral tests and ignore runtime state

- **What**: Create one `node:test` suite that exercises exact schema rejection (missing/extra/invalid fields), non-blocking label rules, deterministic safe/unsafe path mapping, first and repeated appends in a temporary workspace, independently parseable lines, lookup/write path agreement, all fixture calculations, failed-step independence, missing context, and preservation of prior bytes. Add `/.agent-checkpoints/` to `.gitignore` so only repository-root runtime state is excluded while package fixtures remain tracked.
- **Where**: `packages/checkpoint-core/test/checkpoint-core.test.js`; `.gitignore`
- **Authorized By**: Phase 1 Deliverable “Focused automated tests”; all Phase 1 Acceptance Criteria; Plan Testing Strategy for serialization, safe mapping, exact append behavior, external calculations, and controlled failure; Plan Scope → Includes root runtime ignore and test-fixture handling.
- **Why**: Temporary-workspace behavioral tests verify the actual filesystem contract without creating repository-local logs, and the anchored ignore rule protects local runtime state without hiding fixtures elsewhere.
- **Considerations**: Tests must assert that a traversal-shaped identifier remains under the temporary `.agent-checkpoints/` directory and that analysis produces the same metrics with `step_failed` true or false.

## Testing Plan

Verify command: `node --test packages/checkpoint-core/test/checkpoint-core.test.js`

| Test Type | What to Test | Expected Outcome |
|-----------|-------------|-----------------|
| Contract unit | Exact six-key validation, types/ranges, defaults, UTC timestamps, and labels with other than three words | Only schema-invalid records fail; word-count drift remains recordable. |
| Filesystem integration | Shared exact encoding cases, safe and traversal-shaped IDs, workspace-root-relative lookup, directory creation, first/repeated appends, and prior-byte preservation in a temporary workspace | Every adapter can reproduce the same relative path, every line parses independently, history is unchanged, and no path escapes `.agent-checkpoints/`. |
| Analysis unit/fixture | First/matching/broken chains, compliant/non-compliant labels, failed steps, and missing context | Percentages follow exact raw semantics and are independent of `step_failed`; a first-record chain is `null`. |

### Test Integrity Constraints

- No existing automated tests are affected because the repository currently tracks no test suite; existing installer behavior must remain untouched by this phase.
- New tests must not be skipped, focused with `.only`, deleted, or have schema/path/append assertions weakened to make implementation pass.
- Tests must use OS temporary directories and deterministic injected timestamps; they must not write under the repository's real `.agent-checkpoints/` directory.
- The shared fixture expectations are contract evidence for later adapters and may change only if the gated common contract changes, not to accommodate an adapter discrepancy.

## Rollback Strategy

Remove `packages/checkpoint-core/` and the single anchored `/.agent-checkpoints/` ignore entry. No migration or cleanup of installed harness state is required because Phase 1 does not modify `install.sh` or install an adapter.

## Open Decisions

| Decision | Options | Chosen | Rationale |
|----------|---------|--------|-----------|
| Initial package shape | Root JavaScript workspace; self-contained package; service/daemon | Self-contained `packages/checkpoint-core/` ESM package | It establishes a reusable monorepo boundary with no root toolchain or service, matching the phase's KISS constraint. |
| Unsafe identifier mapping | Reject all non-allowlisted IDs; lossy replacement; deterministic UTF-8 percent encoding | `encodeURIComponent` safe set with uppercase percent escapes | Stable lookup remains usable for native IDs, cross-language fixtures define exact outputs, separators cannot create nested/escaping paths, and lossy collisions are avoided. |
| Shared-language strategy | Force every adapter through JavaScript; duplicate all behavior; share observable fixtures with optional code reuse | Shared JavaScript core plus authoritative fixtures | Phase 6 explicitly permits native Python code while requiring contract parity. |

## Reality Check

### Code Anchors Used

| File | Symbol/Area | Why it matters |
|------|-------------|----------------|
| `.gitignore` | Existing root-local state rules | Confirms `.agent-checkpoints/` is not yet ignored and provides the narrow place for the runtime exclusion. |
| `install.sh` | `SCRIPT_DIR`; Step 1 skill copy; Step 2 agent copy | Confirms there is no runtime-package installation path today and that changing installation belongs to the OpenCode phase. |
| `docs/overview.md` | Tech Stack; Development → Testing | Confirms the repository currently has Bash/Markdown/YAML sources, no build step, and no tracked automated suite. |
| `docs/modules/installation-and-configuration.md` | Responsibility; Structure → `.gitignore`; Install Skills/Agents inventory | Confirms `.gitignore` ownership and the current distribution boundary. |
| `plans/agent-checkpoint-heartbeat/phases/phase-2.md` | Scope and prerequisite | Confirms OpenCode must wrap the Phase 1 contract rather than being introduced in this package. |
| `plans/agent-checkpoint-heartbeat/phases/phase-6.md` | Notes | Confirms that cross-language code reuse is optional and fixtures/observable behavior are authoritative. |

### Mismatches / Notes

- The repository currently has no `packages/` directory, package manifest, runtime source tree, or automated test suite. This plan therefore introduces one isolated package without changing the existing installer or declaring a root-wide JavaScript toolchain.
- The local authoring environment provides Node v24.16.0, but the repository does not currently declare a supported Node version. The implementation deliberately uses only stable built-ins; release/runtime version policy is not needed for this phase's behavioral contract.
- `docs/agent-checkpoint-heartbeat.md` still lists selection of the first harness as undecided, while the gated plan selects OpenCode. Phase 1 does not edit that concept document; the gated plan controls sequencing.
- `install.sh` currently distributes only skills, agents, and Cursor orchestration assets. Package/plugin installation is intentionally not planned until Phase 2.

### Blocking Decisions

- None.
