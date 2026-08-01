---
type: planning
entity: implementation-plan
plan: "checkpoint-session-status-hardening"
phase: 3
status: draft
created: "2026-07-31"
updated: "2026-08-01"
---

# Implementation Plan: Phase 3 - OpenCode and Codex Status Writers

> Implements [Phase 3](../phases/phase-3.md) of [checkpoint-session-status-hardening](../plan.md)

## Approach

Apply the capability gate before adding either writer. Current OpenCode's generic plugin event callback reliably exposes `session.created` with the new session's identity, so use that verified initial-start event to append `open`. OpenCode still has no resume event: opening an existing pre-status session must not be inferred from a message, tool call, or busy transition, so such checkpoint-only logs remain `UNKNOWN`. It also has no graceful session-close event: `session.status`/`session.idle` are turn-activity signals, `session.deleted` is destructive deletion, and plugin `dispose` is instance-scoped without one session identity. Consequently OpenCode emits `open` only for newly created parent/subagent sessions and never emits `closed` in this phase.

For the repository-pinned codex-cli 0.131.0 surface, extend the existing `SessionStart` command hook to append one shared-contract `open` event using the native `session_id` and hook `cwd` before returning the existing instruction context. Treat every pinned `SessionStart` source (`startup`, `resume`, `clear`, and `compact`) as an observed open/continuation signal; repeated `open` records are intentionally idempotent. Add no Codex close mapping: the pinned build has no `SessionEnd`, and `Stop` carries a `turn_id` and is turn-scoped. Current upstream Codex added a genuine root-thread `SessionEnd` after the pin, but adopting it requires a separately gated re-pin and is not backported here.

Make upgrade quiescence and reader compatibility preconditions rather than assumptions. Before any filesystem-changing install step, print a stable prerequisite that a live old dashboard and every running OpenCode or Codex session using the checkpoint adapter/profile must be stopped before writer files are replaced. Preflight the required OpenCode shared core/watcher reader destinations and the Codex bundled core before installing or activating their dependent status writers. A required reader/core symlink remains untouched, but the installer exits nonzero before the dependent runtime/plugin/hook/profile change and tells the operator to update the user-managed target to the Phase 2-compatible reader/core (or replace/remove the link deliberately) and rerun; marker order or a silent skip is not compatibility evidence.

After successful preflight, copy compatible checkpoint-core/inspector-watch reader assets before any status-capable hook or activation profile. Once installation completes, require the compatible dashboard to be started first with the exact printed command, followed only then by starting/restarting OpenCode or a Codex checkpoint-profile session. Preserve opt-in activation, whole-directory and per-file symlink safety, base configuration bytes, and all six-/eight-field checkpoint behavior; add no daemon, version protocol, or configuration flag.

## Affected Modules

| Module | Change Type | Description |
|--------|-------------|-------------|
| [Checkpoint Core](../../../docs/modules/checkpoint-core.md) | consume only | Use Phase 2's `appendSessionStatus` and mixed-log analysis APIs without changing their contract. |
| [OpenCode Checkpoint Adapter](../../../docs/modules/opencode-checkpoint-adapter.md) | modify | Append `open` on verified `session.created`, retain `UNKNOWN` for resumed checkpoint-only sessions, and add no close writer. |
| Codex checkpoint adapter (`codex/`) | modify | Append `open` from pinned `SessionStart`, ignore turn-level `Stop` for lifecycle closure, and document the lack of pinned graceful-close coverage. |
| Installation and configuration (`install.sh`) | modify | Print the pre-install quiescence prerequisite, preflight required reader/core symlinks with a loud stop and recovery guidance, copy compatible readers before writers, and print the dashboard-first startup sequence while retaining symlink/config guarantees. |
| Adapter and installation tests (`opencode/test/`, `codex/test/`) | modify | Cover capability-gated behavior, mixed logs, required-reader symlink stops, install order, early quiescence/startup guidance, and unchanged checkpoint writes. |
| Checkpoint behavior/install documentation (`docs/agent-checkpoint-heartbeat.md`, `docs/installation.md`, module inventories) | modify | Record OpenCode creation-only `OPEN`/unsupported-resume `UNKNOWN`, Codex `OPEN`-without-close semantics, reader preflight/order, and the stop-before-install/dashboard-before-harness upgrade sequence. |

## Required Context

| File | Why |
|------|-----|
| `plans/checkpoint-session-status-hardening/plan.md` | Authoritative lifecycle vocabulary, reader-first rule, no-fabrication constraints, and rollout DoD. |
| `plans/checkpoint-session-status-hardening/phases/phase-3.md` | Gated objective, capability fallback, acceptance criteria, and exclusions. |
| `plans/checkpoint-session-status-hardening/reviews/plan-review.md` | Remediated OpenCode no-hook fallback and operational install/restart obligations. |
| `plans/checkpoint-session-status-hardening/reviews/impl-plan-review-phase-3.md` and `impl-plan-review-phase-4.md` | Accepted required-reader symlink and in-place hook activation findings whose remediation makes the gated rollout enforceable without changing lifecycle scope. |
| `plans/checkpoint-session-status-hardening/implementation/phase-1-impl.md` | Required Codex whole-directory symlink fix and unchanged adapter identity/config invariants. |
| `plans/checkpoint-session-status-hardening/implementation/phase-2-impl.md` | Exact status append/analyze APIs, `UNKNOWN` semantics, metric exclusion, and reader-first phase boundary. |
| `packages/checkpoint-core/src/index.js` | Post-Phase-2 shared `appendSessionStatus`, mixed parser, reduction, and checkpoint compatibility APIs consumed here. |
| `opencode/checkpoint-plugin.ts` and `opencode/checkpoint-runtime.mjs` | Current tool-only return shape, worktree/session binding, metadata/telemetry, and concrete plugin return object to extend with one event writer. |
| `opencode/test/checkpoint-plugin.test.mjs` | Existing tool, mixed core, global/project installer, output, and symlink assertions to extend without weakening. |
| `codex/checkpoint-hook.mjs` | Current `SessionStart`/`PreToolUse` dispatch and process failure boundary; the only Codex writer target. |
| `codex/checkpoint-mcp-runtime.mjs` and `codex/checkpoint-mcp-server.mjs` | Existing checkpoint tool path and stdio behavior that must remain checkpoint-only and byte-compatible. |
| `codex/test/checkpoint-codex.test.mjs` | Existing hook wire, MCP, installer/profile, pin, config-byte, and symlink coverage to extend. |
| `codex/README.md` | Pinned 0.131.0 activation and capability contract requiring an honest lifecycle update. |
| `install.sh` | `install_opencode_checkpoint`, `install_codex_checkpoint`, top-level preflight/target order, and early/final operator output. |
| `docs/modules/opencode-checkpoint-adapter.md`, `docs/modules/installation-and-configuration.md` | Curated inventories affected by creation-only status writing, resume/close limits, and copy-order changes. |
| `docs/agent-checkpoint-heartbeat.md` and `docs/installation.md` | Canonical user-facing status semantics, dashboard operation, harness matrix, and upgrade sequence. |
| OpenCode plugin/API source (`Hooks.event`, `session.created/status/idle/deleted`, plugin disposal) | Primary evidence for creation-only `open`, unsupported resume/close, and the no-writer fallback if creation cannot be trusted. |
| Codex 0.131.0 revalidation evidence in `plans/checkpoint-harness-integration/implementation/phase-2-impl.md` | Pinned event registry and wire constraints; distinguishes supported `SessionStart` from turn-level `Stop`. |

## Implementation Steps

### Step 1: Append OpenCode open only on session creation

- **What**: Extend `createOpenCodeCheckpointPlugin` with an `event` callback that accepts only exact `session.created` payloads, takes the native ID from `event.properties.info.id`, and calls Phase 2's shared `appendSessionStatus` with the plugin instance's active `worktree` and `status: "open"`. Ignore all other events. Add focused parent/subagent creation tests plus a resume-gap case: a preexisting checkpoint-only log receives no status merely because the plugin loads or a checkpoint/tool/message/activity event occurs, and remains `UNKNOWN` through Phase 2 readers.
- **Where**: `opencode/checkpoint-plugin.ts` (core composition unchanged); `opencode/checkpoint-runtime.mjs` (`createOpenCodeCheckpointPlugin` return object and event callback); `opencode/test/checkpoint-plugin.test.mjs`; `docs/modules/opencode-checkpoint-adapter.md`; OpenCode rows/sections in `docs/agent-checkpoint-heartbeat.md` and `docs/installation.md`.
- **Authorized By**: Phase 3 Scope item to append `open` on verified start/resume events; Deliverable allowing behavior matching verified plugin events; Acceptance Criteria 1, 3–5; plan capability gate requiring no writer only when no trustworthy start/resume event exists.
- **Why**: Current primary source and tests establish `session.created` as a real, identity-bearing initial-start event. It is sufficient to record a newly observed open transition, while the absence of a resume event limits rather than invalidates that truthful coverage.
- **Considerations**: Validate non-empty identity and use the same worktree root as OpenCode checkpoint writes; no event-supplied title, parent ID, agent, or directory enters the four-field status record. Do not append `open` on plugin load, first checkpoint, chat message, tool call, `session.updated`, busy/idle, or compaction; these cannot identify a resumed session boundary. Do not append `closed` for age, idle, deletion, instance disposal, or errors. Preserve separate parent/subagent IDs and all current metadata/telemetry/checkpoint behavior. If execution-time revalidation shows `session.created` is no longer trustworthy, apply the gated fallback: expose no event writer and keep checkpoint-only logs `UNKNOWN` rather than substituting another signal.

### Step 2: Append Codex open events from pinned SessionStart

- **What**: Import the installed sibling `./checkpoint-core.mjs` in the Codex hook bridge, then have `SessionStart` validate the native `session_id` and `cwd`, await `appendSessionStatus({ workspaceRoot: cwd, sessionId, status: "open" })`, and return the existing exact instruction output. Make `handleSessionStart`/`handleHookInput` and `main` await this path while preserving synchronous-equivalent `PreToolUse` results and the concise stderr/nonzero failure boundary. Update process-level source tests to stage hook, instruction, and core in the same installed layout already used by the MCP-server test; do not introduce a second status schema/writer.
- **Where**: `codex/checkpoint-hook.mjs` (`handleSessionStart`, `handleHookInput`, `main` as needed); `codex/test/checkpoint-codex.test.mjs`; installed `checkpoint-core.mjs` supplied by `install.sh`.
- **Authorized By**: Phase 3 Scope item to append `open` on verified start/resume events; Acceptance Criterion 1; plan Functional Requirement that adapters write only observed transitions and Non-Functional Requirement for one append operation per status line.
- **Why**: Pinned `SessionStart` supplies the authoritative session ID and workspace for startup, resume, clear, and compact lifecycle entries; the shared core supplies the exact timestamp/discriminator/status shape and safe append path.
- **Considerations**: All four documented sources may append `open`; duplicates are valid and idempotent, and `closed` followed by a later pinned `SessionStart` would reopen if a future compatible writer had produced the close. Preserve session-level Codex attribution: no `turn_id`, subagent ID, source, instruction text, telemetry, or internal tool fields enter the status record. Keep `PreToolUse`, MCP checkpoint/path behavior, nullable metadata, and eight-field checkpoint bytes unchanged.

### Step 3: Make unsupported Codex closure explicit and testable

- **What**: Leave `Stop` and every unregistered event on the no-output/no-write branch. Add a regression that writes `open`, feeds a representative `Stop` payload with `turn_id`, proves no `closed` line is appended, and verifies the mixed log remains `OPEN` regardless of age. Also assert that the pinned profile contains no `Stop` or `SessionEnd` registration. Document that crashes and pinned graceful exit both leave the latest persisted state `OPEN`; `OPEN` means only “an open event without a later observed close.”
- **Where**: `codex/checkpoint-hook.mjs`; `codex/test/checkpoint-codex.test.mjs`; `codex/README.md`; Codex capability sections in `docs/agent-checkpoint-heartbeat.md` and `docs/installation.md`.
- **Authorized By**: Phase 3 Exclusion forbidding Codex `Stop`→`closed`; Acceptance Criteria 2–3; plan Guiding Decisions that unsupported close hooks remain unreported and age never fabricates closure.
- **Why**: Pinned `Stop` is tied to one turn and can be followed by another turn or resume. The repository pin predates the genuine upstream root-thread `SessionEnd` hook, so it cannot honestly emit `closed`.
- **Considerations**: Do not adopt app-server `thread/closed`, archive/delete notifications, process exit, MCP stdin closure, or current-main `SessionEnd` while the adapter remains pinned to 0.131.0; those would change the supported host/activation contract. Do not test `OPEN` as process liveness or successful completion.

### Step 4: Preflight required readers and enforce reader assets before writer assets

- **What**: Add a validation-only preflight before any status-writer installation. For OpenCode, inspect the required shared `checkpoint-core.mjs`, watcher `bin/checkpoint-watch.js`, and watcher `src/index.js` destinations before copying runtime/plugin assets. If any required destination is a symlink, preserve it and exit nonzero before replacing the dependent OpenCode writer, naming the path and explaining that the operator must update its target to the Phase 2-compatible reader/core or deliberately replace/remove the link and rerun. For Codex, perform the same loud stop before replacing the status-capable hook or generating/updating its profile when the bundled `checkpoint-core.mjs` is a symlink; retain Phase 1's whole-adapter-directory symlink preservation, but treat that user-managed directory as an unverified bundled-core dependency and stop before profile activation with the same explicit recovery path. Do not silently withhold a writer or count a skip marker as a successful refresh. After all applicable preflights pass, reorder `install_opencode_checkpoint` so the shared core and complete watcher reader tree are refreshed before runtime/plugin assets. For an ordinary Codex directory, install the bundled core before MCP support and place the status-capable hook and generated activation profile after compatible core/readers. Keep the top-level OpenCode reader installation before the optional Codex adapter. Extend isolated installer tests to assert failure timing, unchanged symlinks/targets, absent dependent writer/profile changes, recovery stderr, ordinary emitted marker order, and installed bytes/profile while retaining every existing symlink and base-config assertion.
- **Where**: `install.sh` (`install_opencode_checkpoint`, `install_codex_checkpoint`, top-level Step 5–7 ordering); `opencode/test/checkpoint-plugin.test.mjs`; `codex/test/checkpoint-codex.test.mjs`; `docs/modules/installation-and-configuration.md`.
- **Authorized By**: Phase 3 Scope item and Acceptance Criteria 6–7; plan Guiding Decision that reader-first rollout applies inside installation; Phase 1 whole-directory symlink decision as a preserved prerequisite; accepted implementation-plan review Phase 3 F-1 and the integrated Phase 4 cross-phase remediation.
- **Why**: A status-capable hook must never be copied or activated ahead of the parser/dashboard version that understands its output.
- **Considerations**: Preflight is validation-only and must run before any dependent writer/profile mutation, ideally before any installer filesystem mutation so a loud stop leaves no partial upgrade. A protected symlink and its target stay byte-identical: never follow, replace, chmod, or probe-write them. The recovery message must identify the required path and rerun action; no version protocol, daemon, compatibility sidecar, or new config flag is introduced. Preserve global/project modes, opt-in Codex profile activation, idempotency, unrelated per-file symlink behavior, and byte-identical base `config.toml`. Instruction and ordinary MCP files are not lifecycle writers, but ordering them after core avoids ambiguous partial installs.

### Step 5: Operationalize stop-before-install and dashboard-first startup guidance

- **What**: Emit a stable upgrade prerequisite near the beginning of installer output, before the first filesystem-changing install step: stop any live `checkpoint-watch` and every running OpenCode or `codex --profile-v2 agent-checkpoint` session before writer files can be replaced. After successful installation, print one ordered startup sequence: launch the compatible dashboard with the exact printed `Launch command`, then start/restart OpenCode, then start/restart Codex with the checkpoint profile. Mirror the complete stop-before-install and dashboard-first sequence in the dashboard quickstart, update instructions, lifecycle concept, OpenCode module guide, and Codex README. Add output/documentation assertions that the early quiescence prerequisite precedes installation markers and that dashboard launch precedes both harness startup instructions.
- **Where**: `install.sh` (early upgrade prerequisite, `Next steps`, and Codex summary); `opencode/test/checkpoint-plugin.test.mjs`; `codex/test/checkpoint-codex.test.mjs`; `docs/installation.md`; `docs/agent-checkpoint-heartbeat.md`; `docs/modules/opencode-checkpoint-adapter.md`; `codex/README.md`.
- **Authorized By**: Phase 3 Scope item requiring the dashboard/harness restart sequence; Acceptance Criterion 7; plan Testing Strategy requiring this sequence to be documented and tested; accepted implementation-plan review Phase 4 F-2 as the cross-phase operational correction.
- **Why**: Copying a new parser does not update an already-running Node dashboard process, while an already-running Codex process can execute a replaced command-hook script on a later `SessionStart`. Quiescing writer-enabled harnesses before installation closes that in-place activation window; starting the compatible dashboard before harnesses reopen prevents new status lines from reaching an old reader.
- **Considerations**: This is an explicit operator prerequisite, not automatic process detection or shutdown. Do not claim the installer makes the upgrade atomic. Keep the exact configured/project-local watcher path in the printed command. Both the OpenCode plugin and Codex hook are status-capable after this phase, so they stay stopped throughout replacement and neither harness starts ahead of the refreshed live dashboard. Add no daemon, version protocol, or configuration flag.

## Testing Plan

Single phase verify command:

```bash
node --test packages/checkpoint-core/test/*.test.js opencode/test/*.test.mjs codex/test/*.test.mjs && bash -n install.sh
```

| Test Type | What to Test | Expected Outcome |
|-----------|-------------|-----------------|
| OpenCode creation writer and resume gap | Parent/subagent `session.created`, ignored activity/deletion events, and a resumed preexisting checkpoint-only log | Creation appends separate exact `open` records; no close is emitted; unsupported resume remains `UNKNOWN`; checkpoint bytes/metrics stay unchanged. |
| Codex SessionStart writer | `startup`, `resume`, `clear`, and `compact` inputs using installed hook/core layout | Each observed event appends one exact four-field `open` record to the hook `cwd`/native-session log and preserves exact instruction output. |
| Codex unsupported close | `Stop` with `turn_id`, unknown/end-like events, old timestamps, and mixed open/checkpoint data | No `closed` is appended; profile registers no terminal hook; state remains `OPEN` and checkpoint metrics/bytes are unchanged. |
| Mixed-log adapter parity | Codex `open` followed/interleaved with ordinary MCP checkpoints | Physical order parses; lifecycle uses status only; checkpoint chain/work/three-word metrics ignore status lines. |
| Installer preflight and order | Global and project OpenCode installs plus enabled Codex install, ordinary and required-reader/core-symlink destinations | Required reader/core symlinks remain untouched and cause a pre-writer nonzero stop with path-specific recovery guidance; ordinary reader/core/watch markers precede plugin/hook/profile writers; installed assets are compatible and all unrelated symlink/config guarantees remain intact. |
| Upgrade sequencing | Early/final installer output and directly affected docs | Live dashboard and writer-enabled OpenCode/Codex sessions are stopped before installation; after installation the exact dashboard launch precedes OpenCode and Codex startup/restart. |
| Existing regression | Core, OpenCode tools/telemetry/metadata, Codex MCP/hook/profile, and Bash syntax | Six-/eight-field checkpoints, tool outputs, identity limits, opt-in activation, and prior Phase 1/2 behavior remain green. |

### Test Integrity Constraints

- Extend the OpenCode native-tools test or add neighboring lifecycle tests; do not change its parent/subagent identity, metadata, telemetry, append, path, or checkpoint-field expectations merely to accommodate mixed logs.
- Preserve `createOpenCodeCheckpointPlugin`'s exact two-tool registration while adding the real `event` callback. Assert that only `session.created` writes status and that the callback uses event identity plus plugin worktree rather than model/tool-supplied fields.
- Update Codex `SessionStart` tests for the intentional filesystem side effect and asynchronous completion while retaining exact deny-unknown-fields output-key assertions and instruction/session-ID content.
- Keep `PreToolUse` allow+`updatedInput`, stale internal-ID replacement, MCP protocol, flush-before-exit, legacy-log, and exact eight-field checkpoint tests unchanged except where mixed-log readers now intentionally filter status events.
- Add `Stop` as a focused no-write case alongside existing ignored-event coverage; never change its expectation to a `closed` line or register it in the profile.
- Extend installer tests with required-reader/core symlink failures; prove nonzero-before-writer behavior, unchanged links/targets, absent dependent writer/profile changes, and explicit recovery stderr. Do not replace whole-directory/per-file symlink, base-config byte equality, target-disabled, project-mode, idempotency, installed-byte, or profile assertions with ordering-only checks.
- Assert upgrade sequencing from stable early/final installer labels and bounded documentation phrases: quiescence before the first install mutation, then dashboard launch before harness startup. Do not weaken the requirement to an unordered mention of dashboard and harness restarts.
- No existing test may be deleted, skipped, focused out, or changed to derive lifecycle state from age or checkpoint records.

## Rollback Strategy

Revert the OpenCode `session.created` and Codex `SessionStart` append integrations, install ordering/output, focused tests, and Phase 3 capability documentation together. Existing logs need no migration: removing the writers leaves valid mixed files readable by the already-landed Phase 2 readers, and added `open` lines remain truthful historical observations. Do not roll back Phase 2 readers before any deployed mixed log can be encountered.

## Open Decisions

| Decision | Options | Chosen | Rationale |
|----------|---------|--------|-----------|
| OpenCode lifecycle output | `session.created` only; activity/deletion heuristics; no writer | `session.created` → `open` only | Creation is a verified initial-start event with native identity; unsupported resume remains `UNKNOWN`, and no available event qualifies as graceful close. |
| Codex pinned open source handling | Only startup/resume; every host `SessionStart` source | Every pinned `SessionStart` source | The host classifies startup/resume/clear/compact as `SessionStart`; duplicate `open` is explicitly idempotent and no extra source field is persisted. |
| Codex close signal | Turn-level `Stop`; process/MCP exit; post-pin `SessionEnd`; none on 0.131.0 | None on the repository pin | `Stop` is turn-scoped, process exits can be ungraceful, and adopting the newer hook requires a separately verified re-pin. |
| Status persistence path | Reimplement JSONL in hook; use Phase 2 shared core | Use shared core | Preserves one exact validator/path/append implementation and reader/writer compatibility. |
| Required reader/core symlink | Follow/overwrite; silently skip and continue; preserve and stop before dependent writer | Preserve and stop loudly | Preserves user ownership while preventing a status writer/profile from activating against an unverified Phase 2 reader/core; recovery is explicit and requires a rerun. |
| Upgrade process order | Install then restart readers; quiesce writers/readers before install and start reader first afterward | Quiesce before install; dashboard first after install | Command-hook scripts can become effective in an existing process immediately after replacement, so post-install restart wording alone leaves an incompatible-reader window. |

## Reality Check

### Code Anchors Used

| File | Symbol/Area | Why it matters |
|------|-------------|----------------|
| `opencode/checkpoint-plugin.ts` | `CheckpointPlugin` | Current composition passes core/client readers into a runtime that returns tools only. |
| `opencode/checkpoint-runtime.mjs` | `createOpenCodeCheckpointPlugin` | Identifies the concrete plugin return object to extend while preserving both tools and all checkpoint behavior. |
| `opencode/test/checkpoint-plugin.test.mjs` | native-tools and installer tests | Provides exact parent/subagent, metadata, telemetry, symlink, installed-asset, and output assertions to extend. |
| OpenCode source `packages/plugin/src/index.ts` | `Hooks.event`, `Hooks.dispose`, `PluginInput` | Current primary plugin surface supplies the generic event callback and worktree context; disposal remains instance-scoped. |
| OpenCode source `packages/opencode/src/session/session.ts` | `createNext`, `remove`, `Session.Event` | `session.created` is emitted with identity at creation; `session.deleted` is emitted during explicit recursive removal, not graceful session exit. |
| OpenCode SDK `types.gen.ts` | `EventSessionCreated`, `EventSessionStatus`, `EventSessionIdle`, `EventSessionDeleted` | Payloads prove creation/activity/deletion meanings and available session IDs; none identifies a resumed session or graceful close. |
| `codex/checkpoint-hook.mjs` | `handleSessionStart`, `handleCheckpointPreToolUse`, `handleHookInput`, `main` | Existing pinned bridge already receives authoritative session/workspace identity and has a concise nonzero failure boundary. |
| `codex/test/checkpoint-codex.test.mjs` | SessionStart/ignored-event/MCP/installer tests | Defines exact hook output wires, no-output behavior, installed layout, profile registration, config preservation, and identity limits. |
| `install.sh` | `install_opencode_checkpoint` | Currently copies plugin/runtime before core/watch reader assets, contrary to the remediated reader-first gate. |
| `install.sh` | `install_codex_checkpoint` | Currently copies the hook before bundled core and generates the profile last. Phase 1's directory-symlink preservation remains, but an unverified user-managed bundled core must now stop profile activation rather than silently continue. |
| `install.sh` | early/final operator output | Currently has no pre-install quiescence prerequisite; final output prints the watcher launch command but does not require the compatible dashboard to start before harness sessions. Replaced Codex command-hook scripts can be executed by an already-running profile session. |
| `plans/checkpoint-harness-integration/implementation/phase-2-impl.md` | Codex Revalidation Addendum | Pinned 0.131.0 evidence lists `SessionStart` and turn-level `Stop`, with no `SessionEnd`. |
| OpenAI Codex commit `7bd44085e1650c406533745348e3c54f072ce5f6` | post-pin `SessionEnd` addition | Confirms genuine root-thread graceful teardown support now exists upstream, but was added after the repository pin and is not available to this adapter contract. |

### Mismatches / Notes

- The current OpenCode primary source (`dev` checked at `19231fce4b70aa5f7894a0a0eb20ff29bd417db5`; local build source `27734409e42ac3d03dd4a2438687cae44efe23d5`) exposes an identity-bearing `session.created` event suitable for initial `open`, but no dedicated resume or graceful-close event. Open issue `anomalyco/opencode#5409` explicitly confirms that `session.created` works while resume is UI navigation with no event. Newly created sessions can therefore become `OPEN`; resumed pre-status checkpoint-only sessions honestly remain `UNKNOWN`.
- Current upstream Codex added `SessionEnd` on 2026-07-17 in `7bd44085e1650c406533745348e3c54f072ce5f6`; its schema is a genuine root-thread teardown event. The repository intentionally supports pinned codex-cli 0.131.0, whose revalidated event set lacks it. Re-pinning the CLI, profile syntax, trust behavior, and hook wire is outside Phase 3; this phase writes only `open`.
- Current Codex `Stop` schema includes mandatory `turn_id` and `stop_hook_active`, confirming turn/continuation semantics. It must remain ignored for session closure even on newer builds.
- The local `codex --version` reports development placeholder `0.0.0` and the local OpenCode binary reports `0.0.0-dev-202607131615`; neither replaces the repository's supported Codex 0.131.0 pin. Local generated Codex app-server schemas do contain `ThreadClosedNotification`, but the shipped adapter is a profile command-hook/MCP integration, not an app-server client.
- Current repository source still has no Phase 1 or Phase 2 implementation changes. Phase 3 execution is therefore blocked on those phases landing: it expects the Codex whole-directory symlink guard plus core `appendSessionStatus`/mixed readers. This is a prerequisite, not an unresolved design decision.
- The single verify command passed the current 41-test baseline plus Bash syntax check; evidence is `/tmp/opencode/checkpoint-session-status-hardening-phase3-baseline.log`. It exercises no pinned-host process and does not substitute for the recorded 0.131.0 revalidation evidence.
- Phase 3 changes only OpenCode/Codex capability behavior, their focused documentation, and common install ordering/guidance. Claude/Hermes writers, cross-harness final parity, stale-plan reconciliation, and any Codex re-pin remain deferred.

### Blocking Decisions

- None. Current evidence selects OpenCode creation-only `open` plus the explicit no-writer fallback if that event fails revalidation; Codex pinned open-only behavior, required-reader symlink loud stops, reader-first ordering, and the quiesce-before-install/dashboard-first sequence are gated. Phase 1 and Phase 2 completion are execution prerequisites rather than product decisions.
