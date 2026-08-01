---
type: planning
entity: implementation-plan
plan: "checkpoint-session-status-hardening"
phase: 1
status: completed
created: "2026-07-31"
updated: "2026-08-01"
---

# Implementation Plan: Phase 1 - Adapter Correctness Hardening

> Implements [Phase 1](../phases/phase-1.md) of [checkpoint-session-status-hardening](../plan.md)

## Approach

Correct only the five accepted Hermes/Codex defects before changing the shared JSONL contract. Replace Hermes' three process-global binding/telemetry slots with lock-protected state keyed by the host's native session ID. Use the verified `subagent_start(parent_session_id, child_session_id, ...)` relation only to resolve each child to its parent-owned persisted log; a child keeps its own invocation and telemetry state, but its checkpoint file and record continue to carry the resolved parent session ID. No child ID, relationship, role, or telemetry cache is added to JSONL.

Deliver the complete heartbeat text through Hermes' supported `pre_llm_call` context-injection hook, narrowly extend the existing validation-only installer parser to recognize quoted exact disabled entries, guard the whole Codex adapter directory before `mkdir` or file installation, and clamp Hermes' displayed remaining context-window headroom at zero. Preserve the exact six-/eight-field checkpoint behavior, append-only writes, opt-in activation, unrelated configuration, and all later-phase status work unchanged.

## Affected Modules

| Module | Change Type | Description |
|--------|-------------|-------------|
| Hermes checkpoint adapter (`hermes/agent-checkpoint/`) | modify | Add per-native-session binding/telemetry state, parent-log resolution, complete instruction injection, and non-negative headroom; update manifest and truthful adapter guidance. |
| Hermes adapter tests (`hermes/test/test_agent_checkpoint.py`) | modify | Add focused parent/child/interleaving, instruction, quoted-disabled, and headroom regressions while preserving contract and installer coverage. |
| Installation and configuration (`install.sh`) | modify | Recognize quoted exact Hermes disabled entries and preserve a symlinked whole Codex adapter directory. |
| Codex checkpoint adapter (`codex/`) | modify | Add whole-directory symlink regression coverage and clarify the existing symlink guarantee in its README. |
| Checkpoint behavior and installation docs (`docs/agent-checkpoint-heartbeat.md`, `docs/installation.md`, `config.yaml.example`) | modify | Describe the corrected Hermes parent-owned log mapping, instruction delivery, installer stop behavior, and Codex whole-directory symlink preservation. |

## Required Context

| File | Why |
|------|-----|
| `plans/checkpoint-session-status-hardening/plan.md` | Global constraints, the five-fix boundary, and the parent-owned Hermes log decision. |
| `plans/checkpoint-session-status-hardening/phases/phase-1.md` | Gated objective, acceptance criteria, and explicit exclusions for this phase. |
| `plans/checkpoint-session-status-hardening/reviews/plan-review.md` | Review history and the remediated Hermes identity semantics that must not be reopened. |
| `plans/checkpoint-harness-integration/implementation/phase-4-impl.md` | Original Hermes integration decisions, pinned-host hook evidence, and contract invariants. |
| `plans/checkpoint-harness-integration/reviews/impl-review-phase-4.md` | Existing installer/telemetry findings, remediation history, and test-gate precedent. |
| `hermes/agent-checkpoint/agent_checkpoint.py` | Current process-global state, hooks, writer, telemetry calculation, tool handlers, and registration targets. |
| `hermes/agent-checkpoint/plugin.yaml` | Declared Hermes hook surface that must include the newly used supported hooks. |
| `hermes/agent-checkpoint/README.md` | Current deliberately-unmapped subagent and instruction limitations that become stale in this phase. |
| `hermes/test/test_agent_checkpoint.py` | Existing registration, binding, telemetry, installer-isolation, and host-smoke tests to extend without weakening. |
| `install.sh` | `install_codex_checkpoint`, `hermes_enable_plugin_entry`, and `install_hermes_checkpoint` are the two installer change areas. |
| `codex/test/checkpoint-codex.test.mjs` | Existing per-file/profile symlink coverage and the correct isolated-home pattern for the directory-symlink regression. |
| `codex/README.md` | Current user-facing symlink guarantee. |
| `opencode/checkpoint-instruction.md`, `codex/checkpoint-instruction.md`, `claude/agent-checkpoint/instructions/checkpoint.md` | Canonical heartbeat clauses to keep Hermes instruction content complete and consistent. |
| `docs/agent-checkpoint-heartbeat.md`, `docs/installation.md`, `config.yaml.example` | Current cross-harness behavior and installation claims that are directly affected. |

## Implementation Steps

### Step 1: Isolate Hermes native sessions while preserving the parent-owned log

- **What**: Replace `_SESSION`, `_PENDING`, and `_TELEMETRY_SLOT` as single mutable slots with lock-protected state keyed by native Hermes session ID. Register a `subagent_start` callback that resolves `child_session_id` through `parent_session_id` to the parent's root log ID and workspace (transitively if the parent is itself a child), initializing an unseen resumed parent from that authoritative parent ID and the process workspace before mapping its child. Resolve each tool invocation from the native `session_id` that Hermes already forwards to the registered handler, and read telemetry only from that same native session's slot. `on_session_start` initializes a parent mapping; `pre_tool_call` continues to bind resumed parents that do not receive another start hook; `pre_api_request` updates or clears only the addressed native session. Persist and append using the resolved parent log ID, not the child's native ID.
- **Where**: `hermes/agent-checkpoint/agent_checkpoint.py` (`_reset_state`, `_on_session_start`, `_on_pre_tool_call`, `_on_pre_api_request`, new `_on_subagent_start`, `_resolve_invocation`, `_telemetry`, `_handle_checkpoint`, `checkpoint`, `register`); `hermes/agent-checkpoint/plugin.yaml`; `hermes/test/test_agent_checkpoint.py`; directly affected Hermes sections in `hermes/agent-checkpoint/README.md`, `docs/agent-checkpoint-heartbeat.md`, and `docs/installation.md`.
- **Authorized By**: Phase 1 Scope item “Correct Hermes parent/subagent and concurrent-session binding”; Acceptance Criterion 1; plan Guiding Decision preserving one parent-owned log, internal child-to-parent mapping through verified `subagent_start`, no persisted child attribution, and per-native-session isolation.
- **Why**: The current process-global slots are overwritten by interleaved native sessions. The host supplies both the invocation session ID and an authoritative child/parent relation, so isolation can be fixed without changing persisted attribution or the checkpoint schema.
- **Considerations**: Keep all maps/cache entries process-local and under `_LOCK`; do not add child IDs, roles, relationship fields, or telemetry details to raw records. Parent, mapped child, and resumed parent must all append records whose `session_id` is the parent root. Two interleaved parent trees must never exchange invocation bindings, workspace/log destinations, or telemetry. Missing/invalid host IDs must remain visible errors rather than being merged into a known parent. Keep `checkpoint_path(session_id)` a write-free shared-contract path function; do not add a new child-attribution API.

### Step 2: Inject the complete Hermes heartbeat instruction

- **What**: Add a plugin-local canonical heartbeat instruction containing all required clauses—meaningful-subtask cadence, checkpoint after completed or failed work, exact three-word labels, verbatim `next`→`done` chaining, parallel checkpoint calls where possible without a checkpoint-only model round trip, `step_failed=true` correction semantics, unknown-telemetry honesty, a final checkpoint plus compact handoff under high context pressure, and the boundary that checkpointing does not prove work quality. Register a `pre_llm_call` callback that returns this text through Hermes' supported context-injection result so every normal parent turn and delegated child turn receives it without model-carried setup or manual prompting. Install the instruction asset with the rest of the plugin and declare the hook in the manifest.
- **Where**: `hermes/agent-checkpoint/checkpoint-instruction.md` (new); `hermes/agent-checkpoint/agent_checkpoint.py` (instruction loading/callback and `register`); `hermes/agent-checkpoint/plugin.yaml`; `install.sh` (`install_hermes_checkpoint`); `hermes/test/test_agent_checkpoint.py`; `hermes/agent-checkpoint/README.md`, `docs/agent-checkpoint-heartbeat.md`, and `docs/installation.md`.
- **Authorized By**: Phase 1 Scope item “Deliver the complete heartbeat instruction”; Acceptance Criterion 2; plan Functional Requirement that Hermes sessions receive the complete cadence/chaining/failure/context-pressure instruction.
- **Why**: Registering tools alone does not tell Hermes parents or children when and how to call them. The pinned host's `pre_llm_call` contract is the supported, cache-safe context injection point and runs for both parent and child `AIAgent` turns.
- **Considerations**: Return instruction context only; do not mutate host system prompts, user history, tool arguments, or JSONL. Keep the content aligned with the existing OpenCode/Codex/Claude instruction clauses. Add focused tests that invoke the registered hook with parent (`platform="cli"`) and child (`platform="subagent"`) payloads and assert every required clause, not merely non-empty output. The installed asset must match the source bytes and remain covered by existing plugin-directory symlink protection.

### Step 3: Recognize quoted exact Hermes disabled entries

- **What**: Extend only the validation pass in `hermes_enable_plugin_entry` so block and inline `plugins.disabled` lists recognize `agent-checkpoint`, `'agent-checkpoint'`, and `"agent-checkpoint"` as the same exact scalar. Retain delimiter/comment boundaries so quoted or unquoted near-matches such as `agent-checkpoint-extra` do not abort. For every exact form, return the existing loud-stop status and manual `hermes plugins enable agent-checkpoint` guidance before the edit pass runs.
- **Where**: `install.sh` (`hermes_enable_plugin_entry` validation-only `awk` expressions); `hermes/test/test_agent_checkpoint.py` (`InstallerIsolationTests`); affected enablement guidance in `hermes/agent-checkpoint/README.md`, `docs/installation.md`, and `config.yaml.example`.
- **Authorized By**: Phase 1 Scope item “Detect quoted and unquoted exact `agent-checkpoint` entries”; Acceptance Criterion 3; plan Functional Requirement for quoted/unquoted loud stops with unchanged configuration.
- **Why**: Hermes accepts quoted YAML scalars, but the current exact-name expressions recognize only the unquoted spelling and can proceed with a misleading enabled entry that the deny-list still vetoes.
- **Considerations**: Add the four missing focused cases (single- and double-quoted, each in block and inline lists) while retaining the two unquoted cases and exact-name false-positive protection. Each stop test must snapshot and compare config bytes, assert nonzero exit, and assert both `plugins.disabled` and the manual enablement command in stderr. Do not introduce a YAML parser, remove disabled entries, broaden supported inline forms, or alter the additive edit pass.

### Step 4: Preserve a symlinked Codex adapter directory as one unit

- **What**: Test `$CODEX_HOME/agent-checkpoint` itself with `-L` before `mkdir -p` or any adapter-file installation. If it is a symlink, emit the existing symlink-skip style message and skip the entire adapter-directory copy block so no write follows the link. Preserve the independent profile-file behavior and all non-symlink installation behavior.
- **Where**: `install.sh` (`install_codex_checkpoint`); `codex/test/checkpoint-codex.test.mjs`; `codex/README.md` and the Codex section of `docs/installation.md`.
- **Authorized By**: Phase 1 Scope item “Preserve a symlinked Codex adapter destination directory”; Acceptance Criterion 4; plan Functional Requirement for whole-directory symlink preservation and Non-Functional Requirement for additive/idempotent installation.
- **Why**: Per-file symlink guards run too late when the directory itself is a symlink: the current `mkdir -p` succeeds through it and ordinary child paths are written into its target.
- **Considerations**: The focused test must create a symlink to a sentinel directory, snapshot the link target, run the isolated installer, and prove the link and every target byte remain unchanged with no adapter artifact written through it. Keep the separately located `agent-checkpoint.config.toml` handling and its existing symlink test intact; a whole-directory skip means the linked adapter content is user-managed.

### Step 5: Clamp Hermes context headroom at zero

- **What**: Keep the existing `context_used` clamp and apply a zero lower bound to the derived `remaining_k` value before formatting tool feedback. Extend telemetry tests with over-limit inputs that assert `context_used == 1.0`, remaining headroom equals/reports zero, and no negative K-token text is produced.
- **Where**: `hermes/agent-checkpoint/agent_checkpoint.py` (`_telemetry`, feedback in `checkpoint`); `hermes/test/test_agent_checkpoint.py` (`TelemetryTests`); telemetry wording in `hermes/agent-checkpoint/README.md` and `docs/agent-checkpoint-heartbeat.md` if needed for exact behavior.
- **Authorized By**: Phase 1 Scope item “Clamp Hermes remaining context-window headroom to zero”; Acceptance Criterion 5; plan Functional Requirement that Hermes headroom never reports below zero.
- **Why**: `context_used` currently saturates at `1.0`, but `round((limit - approx) / 1000)` can still return a contradictory negative headroom.
- **Considerations**: Preserve unknown telemetry as `(None, None)`, existing rounding for non-negative values, and the invariant that remaining K-tokens are feedback only and never persisted. Exercise both just-over-limit and substantially-over-limit values; do not infer a stop threshold or change context-limit selection.

## Testing Plan

Single phase verify command:

```bash
node --test packages/checkpoint-core/test/*.test.js opencode/test/*.test.mjs codex/test/*.test.mjs claude/test/*.test.mjs && python3 -m unittest discover -s hermes/test && bash -n install.sh
```

| Test Type | What to Test | Expected Outcome |
|-----------|-------------|-----------------|
| Hermes binding regression | Parent → mapped child → resumed parent, plus two interleaved parent/child trees with distinct telemetry and out-of-order invocation binding | Every write lands only in its resolved parent log; child log/attribution is absent; each native session receives only its own binding and telemetry. |
| Hermes instruction regression | Registered `pre_llm_call` callback under parent and child payloads; installed instruction bytes | Both contexts contain every cadence/chaining/failure/context-pressure clause without manual prompting; installed bytes match source. |
| Hermes installer regression | Unquoted, single-quoted, and double-quoted exact names in block and inline disabled lists, plus near-match controls | Exact entries abort before edits with manual guidance and byte-identical config; near-matches do not false-positive. |
| Codex installer regression | Whole adapter destination is a symlink to a sentinel directory | Link and target remain untouched; no child artifact is written through the link; skip is reported. |
| Hermes telemetry regression | Token counts just and far above a known context limit | Persisted `context_used` is `1.0`; returned remaining headroom is `~0k`, never negative. |
| Repository regression | Existing core/OpenCode/Codex/Claude/Hermes suites and installer syntax | Unchanged contract, adapters, installation modes, and symlink/config safeguards remain green when required host binaries are present. |

### Test Integrity Constraints

- Update `RegistrationTests.test_register_wires_two_tools_and_three_hooks` only for the intentional addition of `subagent_start` and `pre_llm_call`; keep exact tool and hook assertions rather than weakening them.
- Replace the assumptions in affected `CheckpointWriteTests` only where the gated parent-log mapping supersedes the single-session global mismatch model. Retain visible rejection for missing/invalid identity and all exact-record/no-state-persistence assertions.
- Extend `TelemetryTests.test_estimate_clamped_to_unit_interval`; do not relax unknown-model, invalid-payload clearing, model-limit, or raw-record assertions.
- Parameterize/extend the existing Hermes disabled-entry tests; retain byte-for-byte config comparisons, nonzero exit, stderr guidance, idempotency, inline-form loud stops, project/disabled-target branches, and whole-plugin-directory symlink coverage.
- Add Codex whole-directory coverage alongside—not instead of—the existing per-file hook symlink, profile symlink, disabled-target, project-mode, and base-config preservation assertions.
- No existing test may be skipped, deleted, focused out, or changed to accept child attribution, cross-session telemetry leakage, config mutation, writes through symlinks, or negative headroom.
- The pinned-host checks must continue to fail clearly rather than silently skip when their binaries are absent.

## Rollback Strategy

Revert the five bounded source/test/documentation changes together. No log migration or cleanup is required: this phase does not change the six-/eight-field JSONL schemas, and child checkpoints produced after the fix are ordinary parent-attributed records. Existing symlinked destinations and user configuration are never rewritten, so rollback has no filesystem repair step beyond restoring the prior adapter files.

## Open Decisions

| Decision | Options | Chosen | Rationale |
|----------|---------|--------|-----------|
| Hermes persisted identity | Child-specific records/logs; parent-owned record/log with internal mapping | Parent-owned record/log | Gated plan decision: adopt `subagent_start` only to map native children to the parent log; persist no child attribution. |
| Hermes instruction channel | Tool description only; system-prompt mutation; `pre_llm_call` context injection | `pre_llm_call` context injection | The pinned host documents and implements it for parent and child turns; it is additive and does not mutate the cached system prompt. |
| Hermes state isolation key | One process-global latest value; agent label; native session ID | Native session ID | The host supplies this ID on tool, API, and child/parent hook paths; it directly satisfies per-native-session isolation. |
| Codex whole-directory symlink | Follow and populate; replace; preserve and skip directory copy | Preserve and skip directory copy | Matches repository-wide symlink safety and the phase acceptance criterion while leaving the separate opt-in profile behavior intact. |

## Reality Check

### Code Anchors Used

| File | Symbol/Area | Why it matters |
|------|-------------|----------------|
| `hermes/agent-checkpoint/agent_checkpoint.py` | `_SESSION`, `_PENDING`, `_TELEMETRY_SLOT`, `_resolve_invocation` | Confirms all current Hermes identity, invocation, and telemetry state is process-global. |
| `hermes/agent-checkpoint/agent_checkpoint.py` | `_on_session_start`, `_on_pre_tool_call`, `_on_pre_api_request`, `register` | Confirms there is no current child relation or instruction hook and identifies the concrete extension points. |
| `hermes/agent-checkpoint/agent_checkpoint.py` | `_telemetry` | Confirms `context_used` is clamped but `remaining_k` is not. |
| `hermes/test/test_agent_checkpoint.py` | `RegistrationTests`, `CheckpointWriteTests`, `TelemetryTests`, `InstallerIsolationTests` | Existing focused suites expose the exact assertions to extend and the pinned-host fail-clearly policy. |
| `install.sh` | `install_codex_checkpoint` | `mkdir -p "$adapter_dir"` currently precedes all child-file symlink guards, so a directory symlink is followed. |
| `install.sh` | `hermes_enable_plugin_entry` validation pass | Current `item_re`/`bound_re` accept only unquoted `agent-checkpoint`. |
| `codex/test/checkpoint-codex.test.mjs` | Codex installer test | Covers child-file/profile symlinks but not `$CODEX_HOME/agent-checkpoint` as a symlink. |
| `plans/checkpoint-harness-integration/implementation/phase-4-impl.md` | Hermes pinned-build anchors | Records the verified `subagent_start` payload and native plugin surface consumed here. |
| Hermes Agent `e0b9ab5a`: `tools/delegate_tool.py` | `_build_child_agent` `subagent_start` invocation | Verified host source forwards `parent_session_id` and allocated `child_session_id` before the child runs. |
| Hermes Agent `e0b9ab5a`: `model_tools.py` / `tools/registry.py` | `handle_function_call` → `registry.dispatch` | Verified host source forwards native `session_id` to the registered tool handler, allowing invocation resolution without one global pending slot. |
| Hermes Agent `e0b9ab5a`: `agent/turn_context.py` / `hermes_cli/plugins.py` | `pre_llm_call` and `invoke_hook` | Verified host source accepts a string or `{context: ...}` and appends it to the current turn's API-bound user context for parent and child agents. |

### Mismatches / Notes

- Current `hermes/agent-checkpoint/README.md`, `docs/agent-checkpoint-heartbeat.md`, and `docs/installation.md` say `subagent_start` is deliberately not adopted. Phase 1 deliberately supersedes only that statement: the hook is adopted solely for internal child→parent log mapping, while session-level persisted attribution remains unchanged.
- No dedicated Hermes or Codex module inventory exists under `docs/modules/`; the current authoritative adapter descriptions are the concept/install docs and per-adapter READMEs listed above. `packages/checkpoint-core/` is context only and receives no Phase 1 source change.
- The exact pinned Hermes source contract was rechecked at upstream commit `e0b9ab5a`, but `hermes` v0.19.0 is not on `PATH` in this Linux environment. The pinned Claude Code 2.1.170 binary is also absent. A baseline run of the single verify command reached 57/58 Node tests and failed only at the existing fail-clearly Claude host validation before the Hermes suite could run (`/tmp/opencode/checkpoint-session-status-hardening-phase1-baseline.log`). This is an explicit host-smoke evidence limitation, not permission to skip, weaken, or mark those gates passing; rerun the same command in an environment containing both pinned binaries before final plan completion.
- `node` and the Codex CLI are present, so the dependency-free focused Codex/Hermes unit and installer behavior can still be developed and exercised locally; the unavailable pinned Hermes process remains the unverified host boundary.
- Phase 1 introduces no `session_status` records, lifecycle writers, reader/dashboard changes, new persisted child attribution, or broader installer refactor. Those remain excluded or deferred exactly as gated.

### Blocking Decisions

- None. The parent-owned Hermes identity model and supported instruction mechanism are resolved. Missing pinned host binaries block final host-smoke evidence, not implementation-plan authoring or the bounded source/test work.
