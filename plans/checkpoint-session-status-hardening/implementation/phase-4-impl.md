---
type: planning
entity: implementation-plan
plan: "checkpoint-session-status-hardening"
phase: 4
status: completed
created: "2026-08-01"
updated: "2026-08-01"
---

# Implementation Plan: Phase 4 - Claude, Hermes, and Rollout Closure

> Implements [Phase 4](../phases/phase-4.md) of [checkpoint-session-status-hardening](../plan.md)

## Approach

Finish the reader-first rollout without equalizing harness capabilities. Claude Code will use only the lifecycle events already observed on the pinned 2.1.170 surface: `SessionStart` and `SubagentStart` append `open` for the native parent or composite subagent identity, and `SessionEnd` appends `closed` for the native parent session while retaining telemetry-sidecar cleanup. No activity, tool, age, process-exit, or unverified subagent-terminal signal becomes a lifecycle event; a subagent with no observed graceful-end event remains `OPEN`.

Hermes will extend its Python-native contract mirror with the exact Phase 2 four-field status record and append `open` only from the pinned v0.19.0 `on_session_start` event. It will consume Phase 1's corrected native-session binding and root-parent resolution: the persisted status ID and path remain the parent-owned log identity, `subagent_start` remains mapping-only, and continued-session `pre_tool_call` binding does not fabricate a start. Hermes has no adopted trustworthy main-session graceful-end event, so it emits no `closed`; a started session remains `OPEN`, while a continued checkpoint-only session with no observed start remains `UNKNOWN`.

Extend the existing four-harness parity coverage so adapter-produced status-only and mixed logs, plus legacy/current compatibility cases, pass through the same Phase 2 inspector and watcher behavior. Complete rollout closure with a validation-only installer preflight before any filesystem-changing install step: preserve required reader/core symlinks, but stop nonzero before any dependent writer or activation change and give path-specific guidance to update the user-managed target to the Phase 2-compatible reader/core (or deliberately replace/remove the link) and rerun. Carry Phase 3's shared OpenCode core/watcher and Codex bundled-core checks forward, add the Claude bundled-core check, and require the successful shared-reader preflight before Hermes plugin installation or enablement. A silent skip or copy-marker order is never compatibility proof.

Make quiescence an explicit upgrade prerequisite: before installation, stop a live old dashboard and every running OpenCode, Codex, Claude, or Hermes session using the status-writing checkpoint integration. After successful preflight and reader-before-writer copying, launch the compatible dashboard first with the exact printed command, then start/restart harness sessions. Print this prerequisite in stable early installer output and document/test the complete sequence. Add no daemon, version protocol, or configuration flag. Finish by updating the affected inventories and adapter guidance and reconciling only the stale `agent-checkpoint-heartbeat` plan metadata while leaving PydanticAI pending. Phase completion remains blocked until the single repository gate runs in an environment containing the explicitly pinned Claude and Hermes binaries; local unit evidence cannot silently replace that host gate.

## Affected Modules

| Module | Change Type | Description |
|--------|-------------|-------------|
| Claude checkpoint adapter (`claude/agent-checkpoint/`) | modify | Append observed parent/subagent opens and the supported parent graceful close through the shared status primitive; document exact limits. |
| Hermes checkpoint adapter (`hermes/agent-checkpoint/`) | modify | Mirror the exact status record, append parent-owned opens only on observed session starts, and retain mapping-only subagent behavior with no fabricated close. |
| Adapter tests (`claude/test/checkpoint-claude.test.mjs`, `hermes/test/test_agent_checkpoint.py`) | modify | Cover lifecycle writes, identity/path semantics, mixed-log parity, required-reader symlink stops, complete upgrade sequencing, and fail-clearly pinned-host gates. |
| [Checkpoint Core](../../../docs/modules/checkpoint-core.md) | consume/document | Reuse Phase 2's status append/analyze contract unchanged and update its inventory after the completed rollout. |
| [Installation and Configuration](../../../docs/modules/installation-and-configuration.md) | modify | Extend loud required-reader/core symlink preflight through Claude/Hermes, preserve reader-before-writer ordering, and make stop-before-install/dashboard-first startup guidance operational and testable. |
| Checkpoint behavior and installation docs (`docs/agent-checkpoint-heartbeat.md`, `docs/installation.md`, adapter READMEs) | modify | Describe the final record variants, lifecycle matrix, honest capability limits, required-reader recovery, and complete quiesce/install/dashboard-first/harness-start sequence. |
| Legacy checkpoint plan (`plans/agent-checkpoint-heartbeat/`) | modify | Reconcile completed phase checkboxes, stale todo/wording, and active Phase 6 context without marking PydanticAI complete. |

## Required Context

| File | Why |
|------|-----|
| `plans/checkpoint-session-status-hardening/plan.md` | Authoritative exact event shape, no-liveness semantics, parent-owned Hermes identity, reader-first rollout, reconciliation boundary, and final gates. |
| `plans/checkpoint-session-status-hardening/phases/phase-4.md` | Gated objective, deliverables, acceptance criteria, prerequisites, and explicit no-Hermes-close exclusion. |
| `plans/checkpoint-session-status-hardening/reviews/plan-review.md` | Remediated decisions for Hermes identity, install/restart ordering, honest capability fallback, and reader-only `ERROR`. |
| `plans/checkpoint-session-status-hardening/reviews/impl-plan-review-phase-3.md` and `impl-plan-review-phase-4.md` | Accepted cross-phase required-reader symlink and command-hook activation-window findings applied by this remediation. |
| `plans/checkpoint-session-status-hardening/implementation/phase-1-impl.md` | Expected Hermes root-parent mapping, per-native-session isolation, hook registration, instruction delivery, config/symlink preservation, and host-gate precedent. |
| `plans/checkpoint-session-status-hardening/implementation/phase-2-impl.md` | Exact status APIs, physical-order reduction, status-only neutrality, checkpoint compatibility facade, and reader failure behavior consumed here. |
| `plans/checkpoint-session-status-hardening/implementation/phase-3-impl.md` | OpenCode/Codex writer semantics, shared install ordering, restart wording, and cross-phase test expectations that Phase 4 must preserve. |
| `plans/checkpoint-harness-integration/implementation/phase-3-impl.md` and `plans/checkpoint-harness-integration/reviews/impl-review-phase-3.md` | Pinned Claude 2.1.170 hook evidence, identity/workspace bridge, accepted host smoke, and current `SessionEnd` behavior. |
| `plans/checkpoint-harness-integration/implementation/phase-4-impl.md` and `plans/checkpoint-harness-integration/reviews/impl-review-phase-4.md` | Pinned Hermes v0.19.0 / `e0b9ab5a` lifecycle evidence, corrected `subagent_start` facts, additive enablement invariants, and four-harness parity precedent. |
| `packages/checkpoint-core/src/index.js` | Post-Phase-2 `appendSessionStatus`, mixed parser, compatibility filter, reducer, and analysis boundary used by writers/readers. |
| `packages/checkpoint-core/bin/checkpoint-inspect.js` and `packages/checkpoint-core/bin/checkpoint-watch.js` | Final reader outputs and the separate strict-inspector versus per-file-watcher error contracts exercised by parity tests. |
| `claude/agent-checkpoint/scripts/checkpoint-hook.mjs` | Current `SessionStart`, `SubagentStart`, `SessionEnd`, composite identity, sidecar cleanup, dispatch, and process entrypoint to extend. |
| `claude/agent-checkpoint/hooks/hooks.json` | Existing pinned event registrations; no unverified terminal event may be added. |
| `claude/agent-checkpoint/server/checkpoint-mcp-runtime.mjs` | Existing `CLAUDE_PROJECT_DIR` checkpoint destination and parent/composite identity behavior that status paths must match. |
| `claude/test/checkpoint-claude.test.mjs` | Hook, installed-layout, mixed-read, symlink/config, and pinned-CLI assertions to extend without weakening. |
| `claude/agent-checkpoint/README.md` | Current lifecycle/activation wording that becomes incomplete when status writing lands. |
| `hermes/agent-checkpoint/agent_checkpoint.py` | Post-Phase-1 binding maps/hooks plus the Python record/path/append mirror to extend with status events. |
| `hermes/agent-checkpoint/plugin.yaml` and `hermes/agent-checkpoint/README.md` | Declared verified hook surface and parent-owned session-level behavior that lifecycle writing must preserve. |
| `hermes/test/test_agent_checkpoint.py` | Registration, parent/child/interleaving, contract, installer isolation, host CLI, and existing four-harness inspection parity coverage. |
| `install.sh` | `install_opencode_checkpoint`, `install_claude_checkpoint`, `install_hermes_checkpoint`, top-level preflight/target order, activation, symlink guards, and early/final guidance. |
| `docs/agent-checkpoint-heartbeat.md`, `docs/installation.md`, `docs/modules/checkpoint-core.md`, `docs/modules/installation-and-configuration.md` | Canonical contract, reader, lifecycle matrix, operational upgrade, and curated inventory text to reconcile. |
| `plans/agent-checkpoint-heartbeat/plan.md`, `todo.md`, and `phases/phase-1.md` through `phases/phase-6.md` | Stale completed-phase checkboxes/wording and the Phase 6 PydanticAI boundary that must remain pending. |

## Implementation Steps

### Step 1: Add only observed Claude lifecycle writes

- **What**: Revalidate that the execution host is the supported Claude Code 2.1.170 build and that the already registered `SessionStart`, `SubagentStart`, and `SessionEnd` payloads still provide the identities/workspace used by the adapter. Wire the hook bridge to the installed Phase 2 `appendSessionStatus` implementation and make its dispatch/process boundary await writes. On every valid `SessionStart`, append one exact `open` record under the native `session_id` before returning the unchanged instruction output; on every valid `SubagentStart`, append `open` under `compositeCheckpointId(input)` before returning the unchanged composite instruction; on valid `SessionEnd`, append `closed` under the native parent `session_id` and retain best-effort cleanup of only that session's telemetry sidecar. Resolve the status workspace to the same project root used by MCP checkpoints (the hook environment's `CLAUDE_PROJECT_DIR`, with the verified hook `cwd` as the bounded fallback) so status and checkpoint lines share one file. Keep process failures concise/nonzero and stage the installed hook/core layout in process tests rather than creating a second status implementation.
- **Where**: `claude/agent-checkpoint/scripts/checkpoint-hook.mjs` (`compositeCheckpointId`, lifecycle handlers, dispatch, `main`, installed-core loading/workspace resolution); `claude/agent-checkpoint/hooks/hooks.json`; `claude/test/checkpoint-claude.test.mjs`; lifecycle sections of `claude/agent-checkpoint/README.md`, `docs/agent-checkpoint-heartbeat.md`, and `docs/installation.md`.
- **Authorized By**: Phase 4 Scope item “Append Claude parent/subagent `open` and supported graceful `closed` events using verified start/end hooks”; Acceptance Criteria 1–2; plan Functional Requirement that adapters persist only observed transitions and Non-Functional Requirement for one append operation per status line.
- **Why**: The current hook already observes authoritative parent/subagent starts and a genuine graceful parent `SessionEnd`; using the shared primitive records those observations without changing checkpoint tools or inventing liveness.
- **Considerations**: Preserve the existing hook output shapes, instruction bytes, MCP input rewriting, native/composite checkpoint IDs, statusline telemetry, and eight-field checkpoint bytes. Repeated start/resume opens are valid idempotent assignments. Do not append from `PreToolUse`, plugin load/reload, statusline updates, activity/idle, age, errors, process exit, or any unregistered/unverified subagent terminal event. `SessionEnd` is the supported parent close; a subagent that has only `SubagentStart` remains unclosed. Missing identity/workspace must fail visibly without writing a guessed record, and sidecar cleanup must never delete JSONL or another session's cache.

### Step 2: Add conservative Hermes parent-log lifecycle writing

- **What**: After Phase 1's keyed binding/root-parent mapping is present, add a Python-native exact status-event validator/creator mirroring Phase 2 (`timestamp`, resolved parent `session_id`, `event: "session_status"`, `status: "open" | "closed"`) and reuse the existing containment-checked path plus one-line append path. Have only `on_session_start` append `open`, after it establishes the native parent binding, to that binding's resolved parent-owned log. Keep `subagent_start` solely for authoritative child-to-parent mapping, keep `pre_tool_call` solely for invocation/continued-session binding, and register no close callback. Revalidate v0.19.0 / `e0b9ab5a` before execution; if the supported surface differs, stop rather than substituting `subagent_stop`, process exit, tool completion, or another event.
- **Where**: `hermes/agent-checkpoint/agent_checkpoint.py` (status constants/validation/creation, append reuse, Phase-1 session binding, `_on_session_start`, `_on_subagent_start`); `hermes/agent-checkpoint/plugin.yaml`; `hermes/test/test_agent_checkpoint.py`; `hermes/agent-checkpoint/README.md`; Hermes sections of `docs/agent-checkpoint-heartbeat.md` and `docs/installation.md`.
- **Authorized By**: Phase 4 Scope item “Append Hermes events only for verified lifecycle hooks, using the corrected per-session binding from Phase 1”; Acceptance Criteria 1–2; plan Guiding Decision preserving one parent-owned Hermes log with internal child mapping and no persisted child attribution.
- **Why**: Pinned Hermes observes a new main-session start but exposes no adopted trustworthy main-session end. The parent-owned log is the gated persisted identity, so recording only that observed start is the narrow truthful lifecycle delta.
- **Considerations**: A brand-new parent becomes `OPEN`; a continued session that binds only through `pre_tool_call` receives no fabricated event and remains `UNKNOWN` if its log is checkpoint-only. A child creates no child status file or persisted child ID, and its mapping hook does not reopen the parent merely because a child started. Emit no Hermes `closed`; `subagent_stop` is post-hoc child information, not main-session graceful closure. Preserve Phase 1's separate parent/child/resumed/interleaved binding and telemetry state, full instruction delivery, config loud stops, nonnegative headroom, Python-only runtime, and exact six-/eight-field checkpoint behavior.

### Step 3: Prove cross-adapter mixed-log reader parity

- **What**: Extend the existing adapter and `InspectionParityTests` coverage to drive Phase 3 OpenCode/Codex writers plus the new Claude/Hermes hook writers, then inspect their outputs through the Phase 2 mixed parser, `checkpoint-inspect`, and `checkpoint-watch --once`. Cover each adapter's actual capability result and common reader shapes: adapter-produced status-only logs, status interleaved before/between/after current checkpoints, legacy-only logs, mixed legacy/current/status logs, and unchanged checkpoint metrics/details. Assert Claude parent start→end is `CLOSED`, Claude subagent start without a verified end is `OPEN`, OpenCode/Codex/Hermes observed starts are `OPEN`, and a checkpoint-only continued/no-observed-start case is `UNKNOWN`; age never changes those states. Keep malformed/unreadable behavior in the existing core reader suites: inspector nonzero/stderr, watcher per-file `ERROR` isolation.
- **Where**: `claude/test/checkpoint-claude.test.mjs`; `hermes/test/test_agent_checkpoint.py` (`InspectionParityTests` and neighboring lifecycle tests); consume post-Phase-3 helpers/tests in `opencode/test/checkpoint-plugin.test.mjs` and `codex/test/checkpoint-codex.test.mjs`; Phase 2 fixtures/readers under `packages/checkpoint-core/` remain authoritative.
- **Authorized By**: Phase 4 Scope item “Cross-adapter mixed/status-only/legacy inspection and dashboard parity”; Deliverable “Cross-harness fixtures/tests”; Acceptance Criteria 3 and 6; plan DoD requiring all four adapters to match verified capabilities and readers to preserve metrics/API behavior.
- **Why**: Per-adapter writer tests prove event generation, while one shared reader matrix proves that no harness-specific line ordering or runtime changes the common interpretation.
- **Considerations**: Compare semantics rather than forcing equal terminal states across unequal capabilities. Status events must never alter chain/work/three-word counts, latest checkpoint fields, raw checkpoint bytes, or checkpoint-only APIs. Keep physical JSONL order authoritative, status-only metrics `0/0 (n/a)`, valid reduction limited to `OPEN`/`CLOSED`/`UNKNOWN`, and `ERROR` presentation-only. Do not replace Phase 2's strict malformed cases or existing Phase 3 lifecycle tests with a looser aggregate test.

### Step 4: Finish required-reader preflight and safe rollout sequencing

- **What**: Preserve Phase 3's OpenCode shared core/watcher and Codex bundled-core validation-only preflights and run the complete enabled-target preflight before the first filesystem-changing installer step. Extend it to Claude's required installed `server/checkpoint-core.mjs`: if that destination is a symlink, leave the link and target byte-identical, exit nonzero before replacing the Claude hook/config/manifest or settings activation, name the path, and tell the operator to update its target to the Phase 2-compatible core (or deliberately replace/remove the link) and rerun. A successful shared OpenCode reader preflight is an explicit prerequisite for installing the Hermes plugin module or applying `plugins.enabled`; if any shared core/watcher reader destination is a symlink, stop before Hermes code or enablement changes with the same recovery guidance. Never silently withhold a writer, follow/overwrite the link, or count a skip marker as compatibility. After every applicable preflight passes, copy Claude's bundled core before the status-capable plugin manifest, MCP/hook configuration, and hook script; at the top level, prove the shared core/watcher readers precede both the Claude hook and Hermes plugin module/enablement. Keep Hermes activation last within its plugin step.

  Emit a stable prerequisite before preflight and before any installation mutation: stop any running `checkpoint-watch` and every OpenCode, Codex, Claude, or Hermes session using the checkpoint status writer. After successful installation, print one startup order: launch the compatible dashboard with the exact printed `Launch command`, then start/restart OpenCode, Codex with its profile, Claude, and Hermes. Add behavioral preflight/failure and stable output/order assertions while retaining all target, project-mode, idempotency, opt-in, disabled-entry, base-config, and unrelated symlink tests.
- **Where**: `install.sh` (`install_claude_checkpoint`, `install_hermes_checkpoint`, top-level preflight and Step 5–9 order, early prerequisite, `Next steps`, and target summaries); `claude/test/checkpoint-claude.test.mjs`; `hermes/test/test_agent_checkpoint.py` (`InstallerIsolationTests`); `docs/installation.md`; `docs/modules/installation-and-configuration.md`; adapter READMEs and the operational section of `docs/agent-checkpoint-heartbeat.md`.
- **Authorized By**: Phase 4 Scope item for reader-restart/adapter-restart installation guidance; Acceptance Criteria 4–5; plan Guiding Decision that reader-first applies inside installation and operators restart the dashboard before status-writing harnesses; accepted implementation-plan review Phase 4 F-1/F-2 and Phase 3 F-1.
- **Why**: Replacing files does not update a live old watcher process. Required reader/core symlinks can prevent a compatible reader from landing, and already-running Codex/Claude processes can execute newly replaced command-hook scripts before a post-install dashboard restart. Loud preflight plus pre-install harness quiescence closes both paths before any writer can emit the new record shape.
- **Considerations**: Preflight is validation-only; on failure no dependent status writer, activation profile/settings, or Hermes enablement may have changed. Preserve Claude's base `settings.json`/`~/.claude.json`, Hermes' unrelated `config.yaml` bytes and existing disabled-entry loud stops, whole-directory/per-file symlinks, global-only Claude/Hermes adapters, opt-in settings/enablement, and idempotent reruns. Required symlinks remain untouched but fail with explicit recovery; unrelated protected symlinks retain their existing skip behavior. Quiescence is an operator prerequisite, not process detection or automatic shutdown, and installation is not claimed atomic. Add no daemon, version protocol, compatibility file, or config flag.

### Step 5: Reconcile final lifecycle documentation and inventories

- **What**: Update the canonical contract docs for the exact third record variant, physical-order lifecycle semantics, status-only neutrality, `OPEN`/`CLOSED`/`UNKNOWN` meanings, informational age, and watcher-only `ERROR`. Record the final harness matrix: OpenCode creation-only open/no close, pinned Codex `SessionStart` open/no close, Claude parent/subagent opens plus parent `SessionEnd` close, and Hermes new-parent open only with parent-owned mapping and no close. Document that crashes and unsupported endings remain unclosed; update Claude/Hermes READMEs and the checkpoint-core/install module inventories for new symbols/files/ordering, required-reader symlink recovery, and the complete stop-writers-and-dashboard-before-install/dashboard-first-after-install procedure.
- **Where**: `docs/agent-checkpoint-heartbeat.md`; `docs/installation.md`; `docs/modules/checkpoint-core.md`; `docs/modules/installation-and-configuration.md`; `claude/agent-checkpoint/README.md`; `hermes/agent-checkpoint/README.md`; directly affected adapter/module cross-references.
- **Authorized By**: Phase 4 Scope and Deliverable for user-facing docs and module inventories; Acceptance Criteria 2–5; plan DoD requiring docs to match final code and honest lifecycle limitations.
- **Why**: Current docs still describe six/eight-only logs and age-derived `ACTIVE`/`STALE`, and the adapter guides do not yet describe status-writing capability limits or the safe upgrade order.
- **Considerations**: Do not describe `OPEN` as live, `CLOSED` as success, `ERROR` as persisted, or stale age as terminal. Keep the exact pin/evidence boundary, opt-in activation, telemetry semantics, checkpoint identity, and PydanticAI deferral visible. Update inventories to current symbols/locations rather than retaining known-stale line numbers.

### Step 6: Reconcile only the stale checkpoint plan state

- **What**: Reconcile `agent-checkpoint-heartbeat` to the already completed and reviewed work. Mark the prerequisite, deliverable, and acceptance checkboxes in completed phase files 1–5 as complete and replace obsolete “later colleague/pending” wording with concise completion/evidence references. Update `todo.md` so Phase 6 PydanticAI is the sole active/pending phase, remove the stale Phase 4/Codex revalidation task, and record completed Codex/Claude rollout entries. In `plan.md`, remove obsolete future-execution wording and annotate combined unchecked requirements/DoD/tests as remaining open only because PydanticAI is pending; keep plan status active and Phase 6 pending. Leave the superseded Phase 4/5 research implementation plans and unrelated plans unchanged unless a statement directly and falsely represents current completion state.
- **Where**: `plans/agent-checkpoint-heartbeat/plan.md`; `plans/agent-checkpoint-heartbeat/todo.md`; `plans/agent-checkpoint-heartbeat/phases/phase-1.md` through `phases/phase-5.md`; use `plans/checkpoint-harness-integration/plan.md`, `todo.md`, and implementation reviews as completion evidence; do not alter `phases/phase-6.md` beyond any necessary cross-reference correction.
- **Authorized By**: Phase 4 Scope item for relevant stale plan/todo/phase metadata reconciliation; Acceptance Criterion 6; plan Functional Requirement that completed work no longer appears pending while PydanticAI remains pending.
- **Why**: The phase table already marks phases 1–5 completed, but the todo still points to Phase 4 and completed phase files retain unchecked criteria, producing contradictory execution state.
- **Considerations**: This is reconciliation, not retroactive scope change. Do not mark PydanticAI, combined all-adapter requirements, all-harness integration tests, or the overall plan complete. Preserve historical changelogs and superseded banners; append a dated reconciliation entry rather than erasing history. Do not clean unrelated plans or convert lifecycle rollout work into the older plan's scope.

### Step 7: Enforce the pinned-host completion gate

- **What**: Make the existing fail-clearly host checks assert the explicitly supported binaries—Claude Code 2.1.170 and Hermes Agent v0.19.0—and retain their disposable-home strict validation/plugin enable-disable smoke paths. Run the single phase command only after Phases 1–3 have landed and in an environment containing both pins. Record absence, wrong version, or unavailable host behavior as a blocking gate failure; do not skip, loosen to an unverified newer build, split the command to report partial success as completion, or substitute source-only/unit evidence.
- **Where**: `claude/test/checkpoint-claude.test.mjs` (pinned CLI requirement and strict plugin validation); `hermes/test/test_agent_checkpoint.py` (pinned version requirement and isolated plugin CLI behavior); final execution/review evidence for this phase.
- **Authorized By**: Phase 4 Scope item “Final targeted, broad, and available pinned-host verification”; Acceptance Criterion 7; plan Scope-Bounding Assumption and Testing Strategy requiring unavailable pinned binaries to remain explicit blockers.
- **Why**: Lifecycle payloads and plugin loading are host-owned surfaces; the phase is not complete until both repository pins exercise the shipped adapter/install paths.
- **Considerations**: Use disposable `CLAUDE_CONFIG_DIR`, `HERMES_HOME`, and workspaces; never touch real credentials, settings, plugin config, or checkpoint logs. The gate may be developed with focused local tests, but final completion requires the one unsplit command below to pass with no skipped host requirement.

## Testing Plan

Single phase verify command:

```bash
node --test packages/checkpoint-core/test/*.test.js opencode/test/*.test.mjs codex/test/*.test.mjs claude/test/*.test.mjs && python3 -m unittest discover -s hermes/test && bash -n install.sh
```

| Test Type | What to Test | Expected Outcome |
|-----------|-------------|-----------------|
| Claude lifecycle | Parent `SessionStart`→`SessionEnd`, subagent `SubagentStart`, repeats, missing identity/workspace, ignored events, installed hook/core layout, sidecar cleanup | Exact parent open/closed and subagent open records share checkpoint paths; unsupported child close is absent; existing hook outputs/checkpoints/sidecars remain correct. |
| Hermes lifecycle and binding | New parent start, mapping-only child start, continued parent without start, parent/child/resumed/interleaved trees, absent close hook | Only observed parent starts append exact parent-attributed `open`; no child file/ID or `closed` appears; Phase 1 isolation remains intact. |
| Cross-adapter reader parity | Actual OpenCode/Codex/Claude/Hermes status writers plus status-only, current, legacy-only, and mixed logs through inspector/watcher | Capability-appropriate `OPEN`/`CLOSED`/`UNKNOWN`; identical parsing/metrics; age informational; malformed files retain reader-specific failure behavior. |
| Installer preflight, order, and isolation | Global enabled installs, project/disabled branches, ordinary and required-reader/core-symlink destinations, repeated runs, config snapshots, emitted marker order | Shared/OpenCode, Codex, and Claude required reader/core symlinks remain untouched and fail before dependent writer/activation changes with path-specific recovery; successful readers precede Claude/Hermes status writers/activation; install remains additive, opt-in, idempotent, and otherwise symlink/config preserving. |
| Upgrade sequencing and docs | Stable early/final installer output, adapter READMEs, canonical concept/install docs, module inventories | Live dashboard and all writer-enabled harness sessions are stopped before installation; after installation the exact compatible-dashboard launch appears before every harness start/restart; capability and schema claims match code. |
| Plan reconciliation | Older plan/table/todo/phases 1–6 and completion evidence | Phases 1–5 no longer have unchecked completed criteria or pending wording; Phase 6 and all PydanticAI-dependent aggregate criteria remain pending. |
| Pinned host gate | Exact Claude 2.1.170 strict validation/lifecycle layout and Hermes v0.19.0 isolated plugin lifecycle/enable-disable behavior | Both pins are present and pass inside the single gate; absence/version drift fails visibly and blocks completion rather than skipping. |

### Test Integrity Constraints

- Extend Claude's exact hook-event/config assertion; do not remove `SessionEnd`, add an unverified terminal event, weaken strict validation, or replace process-level installed-layout checks with mocked success.
- Update Claude start/end tests only for the intentional status filesystem side effects and asynchronous completion. Preserve instruction/output shapes, parent/composite identity, PreToolUse rewriting, telemetry degradation, sidecar isolation, exact eight-field records, and base-configuration snapshots.
- Update Hermes registration expectations only for hooks introduced by Phase 1; Phase 4 adds status behavior to `on_session_start`, not a fabricated close registration. Preserve parent-owned log, per-native-session isolation, instruction, telemetry, disabled-entry, negative-branch, idempotency, and symlink assertions.
- Extend `InspectionParityTests` alongside the Phase 2/3 suites; do not replace strict schema, malformed/unreadable, reopen/duplicate, compatibility-API, metric-exclusion, or adapter-specific lifecycle tests with one broad smoke.
- Retain exact config-byte and unrelated symlink assertions for OpenCode, Codex, Claude, and Hermes. Add isolated required-reader/core cases proving nonzero-before-writer behavior, unchanged links/targets/config, absent dependent hook/profile/settings/enablement changes, and explicit path/rerun recovery stderr. Ordering assertions supplement rather than replace installed-byte, activation, project/disabled, and repeat-run coverage.
- Assert stable operator sequencing from early and final output plus bounded documentation phrases: quiescence precedes the first filesystem mutation, and the compatible dashboard launch precedes every harness start/restart.
- No test may be deleted, skipped, focused out, or changed to infer close/liveness from age, checkpoints, process exit, tool completion, or an unsupported event.
- Pinned Claude/Hermes checks must fail clearly on absence or wrong version. A local environment without either binary may not mark the phase gate green or the phase complete.

## Rollback Strategy

Revert the Claude/Hermes lifecycle integrations, parity/order tests, installer guidance/order changes, final docs/inventories, and stale-plan reconciliation as one Phase 4 unit while retaining Phases 1–3 readers and earlier writers. Existing status lines require no migration or deletion: they remain valid historical observations for Phase 2 readers, and removing a writer only stops future events. Do not roll back compatible readers ahead of any deployed mixed log. Restoring planning artifacts is a textual rollback only; it must not be used to claim completed adapter work became unimplemented.

## Open Decisions

| Decision | Options | Chosen | Rationale |
|----------|---------|--------|-----------|
| Claude open signals | Session/tool/activity heuristics; verified starts only | `SessionStart` and `SubagentStart` only | Both are observed identity-bearing starts on the pinned surface; other signals do not establish a lifecycle boundary. |
| Claude close signal | `SessionEnd`; child/tool/process/age inference; none | Native parent `SessionEnd` only | It is the strongest verified graceful end; no verified subagent terminal event is adopted, so child logs remain unclosed. |
| Hermes lifecycle signals | Start + inferred continuation/child/stop; verified parent start only | `on_session_start` → parent-owned `open`; no close | Pinned start is observed; continuation, child mapping, post-hoc child stop, and process exit do not prove main-session open/close. |
| Hermes child status attribution | Persist child ID/file; write child start as parent status; mapping only | Mapping only, no child status record | The gated identity model persists one parent-owned log and adopts `subagent_start` only to map invocations, not to add child attribution or reinterpret parent lifecycle. |
| Required reader/core symlink | Follow/overwrite; silently skip and continue; preserve and stop before dependent writer | Preserve and stop loudly | User-owned links stay intact, but no writer/profile/settings/Hermes enablement may proceed against an unverified Phase 2 reader/core; recovery names the path and requires a rerun. |
| Rollout activation order | Writer first; install then restart readers; quiesce before install and start the reader first afterward | Stop writer sessions and dashboard before install; dashboard first after install | A running old Node process does not acquire refreshed parsing, and command-hook scripts can become effective in existing Codex/Claude processes immediately after replacement. |
| Stale-plan outcome | Mark old plan completed; leave contradictions; select pending PydanticAI phase | Keep plan active with Phase 6 pending | PydanticAI remains explicitly out of this phase; only completed Phase 1–5 state is reconciled. |

## Reality Check

### Code Anchors Used

| File | Symbol/Area | Why it matters |
|------|-------------|----------------|
| `claude/agent-checkpoint/scripts/checkpoint-hook.mjs` | `compositeCheckpointId`, `handleSessionStart`, `handleSubagentStart`, `handleSessionEnd`, `handleHookInput`, `main` | Confirms authoritative identity helpers and existing start/end hook handling, plus the async/process boundary to extend. |
| `claude/agent-checkpoint/hooks/hooks.json` | `SessionStart`, `SubagentStart`, `SessionEnd` registrations | Confirms the currently shipped observed lifecycle surface; no new close hook is needed or authorized. |
| `claude/agent-checkpoint/server/checkpoint-mcp-runtime.mjs` | `CLAUDE_PROJECT_DIR` workspace and hook-injected identity | Defines where status lines must co-locate with Claude checkpoint records. |
| `claude/test/checkpoint-claude.test.mjs` | pinned manifest/hook test, lifecycle process tests, installer isolation, strict CLI validation | Supplies exact assertions to extend and currently fails clearly when Claude is absent. |
| `hermes/agent-checkpoint/agent_checkpoint.py` | record/path append primitives and lifecycle hooks | Confirms Hermes mirrors the JS contract locally and currently has no status variant or terminal callback. |
| `hermes/agent-checkpoint/plugin.yaml` | `provides_hooks` | Current baseline declares start/tool/API hooks only; Phase 1 adds mapping/instruction hooks, while Phase 4 must not invent a close. |
| `hermes/test/test_agent_checkpoint.py` | `RegistrationTests`, `CheckpointWriteTests`, `InstallerIsolationTests`, `InspectionParityTests` | Existing focused suites cover the exact binding/install/parity boundaries to preserve and extend. |
| `install.sh` | `install_claude_checkpoint`, `install_hermes_checkpoint`, Steps 5–9, early output, `Next steps` | Claude currently copies hook assets before bundled core; required reader/core symlinks are silently skipped; shared reader installation precedes optional adapters, but output has no pre-install quiescence prerequisite or dashboard-first post-install startup order. |
| `plans/checkpoint-harness-integration/implementation/phase-3-impl.md` | Claude Revalidation Addendum | Records pinned Claude 2.1.170 start/subagent/end-capable hook surface and accepted disposable-host evidence. |
| `plans/checkpoint-harness-integration/implementation/phase-4-impl.md` | Hermes Revalidation Summary and Stop-and-Revise Log | Records pinned v0.19.0 / `e0b9ab5a`, verified `on_session_start`/`subagent_start`, and absence of an adopted main-session close. |
| `plans/checkpoint-harness-integration/reviews/impl-review-phase-4.md` | remediation and parity evidence | Confirms 44-test Hermes baseline, additive enablement protections, and existing four-harness inspector/watcher parity. |
| `plans/agent-checkpoint-heartbeat/plan.md`, `todo.md`, `phases/phase-1.md`–`phase-5.md` | phase table versus todo/checklists | Plan table says phases 1–5 completed, while the todo still selects Phase 4 and completed phase criteria remain unchecked. |

### Mismatches / Notes

- Current repository source is still the pre-Phase-1/2/3 baseline: Hermes uses process-global state and no status contract exists; core readers and docs still describe six/eight-only records and age-derived `ACTIVE`/`STALE`; OpenCode/Codex writers and reader-first installer changes have not landed. Phase 4 execution is therefore blocked on Phases 1–3 completing, but this does not block implementation-plan authoring.
- Claude's current `SessionEnd` removes only the native session telemetry sidecar. Phase 4 deliberately adds a parent `closed` write there; no repository evidence verifies a graceful subagent-end event, so a Claude subagent receives `open` only and remains unclosed.
- Pinned Hermes evidence confirms `subagent_start`, but the remediated global plan narrows its adoption to internal child→parent mapping. Writing a child start as a parent lifecycle record would blur that boundary, so this plan keeps the hook mapping-only and uses only `on_session_start` for persisted Hermes open state.
- `install.sh` currently copies Claude hook/config assets before its bundled core and silently skips protected required reader/core paths. Hermes is installed after the shared OpenCode reader tree, but successful shared-reader preflight is not a gate on plugin enablement. The installer also gives no early instruction to quiesce existing command-hook harnesses, so newly replaced Codex/Claude scripts could emit before a live old watcher is relaunched. These are the authorized Phase 4 installation deltas.
- The older checkpoint plan is internally contradictory: its phase table marks 1–5 completed, phase files 1–5 retain unchecked prerequisites/deliverables/acceptance criteria, and `todo.md` still calls Phase 4 “next, not started.” Phase 6 PydanticAI is genuinely pending and keeps aggregate all-adapter requirements and the overall plan open.
- On this Linux authoring host, `node` 24.16.0 and Python 3.13.7 are available, but neither `claude` nor `hermes` is on `PATH`. Therefore the final single-command host gate cannot pass here. This is an explicit execution-completion blocker, not permission to skip, weaken, split, or claim the pinned smokes from source evidence alone.

### Blocking Decisions

- None. Event mappings, persisted identities, required-reader symlink loud stops, quiesce-before-install/dashboard-first startup order, reconciliation scope, and exact host pins are gated. Completion still requires Phases 1–3 and an environment containing Claude Code 2.1.170 plus Hermes Agent v0.19.0; those are execution prerequisites/blockers, not unresolved design decisions.

## Completion Record

- Phase 4 implementation and same-session review remediation completed on 2026-08-01.
- The initial implementation review returned Needs Rework with Major F-1 and Minor F-2/F-3. The review-fix resolved all three findings; none remain unresolved.
- Focused Claude verification passed 3/3. The current Node gate passed 81/82, with the sole missing check requiring the unavailable exact Claude Code 2.1.170 binary.
- The separate Hermes gate passed 53/54, with the sole missing check requiring the unavailable exact Hermes v0.19.0 binary.
- `bash -n install.sh`, scoped diff checks, and source-anchor checks passed.
- This record does not claim the full phase command passed. Exact two-pin host verification remains the blocker to overall plan completion.
