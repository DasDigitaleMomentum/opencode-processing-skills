---
type: planning
entity: implementation-plan
plan: "checkpoint-harness-integration"
phase: 4
status: draft
created: "2026-07-27"
updated: "2026-07-27"
---

# Implementation Plan: Phase 4 - Hermes Integration

> Implements [Phase 4](../phases/phase-4.md) of [checkpoint-harness-integration](../plan.md). No prior draft exists; this plan is authored fresh from the Phase 1 revalidation and the gate-(c) user decision (2026-07-27).

## Hermes Integration Decision (recorded per Phase 1 deliverable)

**Decision (gate (c), user, 2026-07-27): native Hermes plugin.** A plugin at `~/.hermes/plugins/agent-checkpoint/` provides the agent-callable `checkpoint`/`checkpoint_path` tools (reusing `packages/checkpoint-core/` contract semantics) plus plugin lifecycle-hook callbacks for session identity/workspace binding, activated through the documented opt-in enablement flow (`hermes plugins enable` → a single additive `plugins.enabled` entry in `~/.hermes/config.yaml`), removable via `hermes plugins disable`.

**Rationale:** Phase 1 revalidation on pinned Hermes v0.19.0 (upstream `e0b9ab5a`) verified a documented native surface: `PluginContext.register_tool()` registers plugin tools alongside built-ins, plugin hook callbacks receive production-identical payloads (`pre_tool_call` carries `session_id`/`task_id`/`tool_call_id`; `on_session_start` carries `session_id`), and user plugins load from `~/.hermes/plugins/<name>/` when listed in `plugins.enabled`. The user ruled this documented opt-in enablement additive-and-opt-in (not forbidden base-config mutation): the single added key is the harness's own supported flow, all other preexisting `config.yaml` content is preserved byte-for-byte. The instruction-only fallback's trigger (no native surface) was not met and is **not taken**; it remains the documented fallback should a future Hermes build remove the plugin surface.

**Documented limits (pinned build; corrected 2026-07-27):** `subagent_start` **exists** on the pinned build — it is in `VALID_HOOKS` (`hermes_cli/plugins.py:164`), fires on `delegate_task` child construction (`tools/delegate_tool.py:1453–1466`) with `parent_session_id`/`child_session_id`/`child_subagent_id`/`child_role`/`child_goal` payloads, and is documented (`website/docs/user-guide/features/hooks.md`, `subagent_start` section). It is **deliberately not adopted**: the gated scope is session-level logging (mirroring the conservative Codex gate-(a) precedent), so subagent checkpoints share the parent session log without start-time injected identity; adoption is a documented follow-up option. `subagent_stop` (`parent_session_id`, `child_role`, `child_status`) remains post-hoc only. Shell-script hooks support block decisions (plus `pre_llm_call` context injection) but no tool-argument rewriting and are not used; MCP-client and project-plugin (`HERMES_ENABLE_PROJECT_PLUGINS=1`) shapes are not taken. Session titles live in the SQLite store (`hermes sessions rename`) but no documented hook/tool surface exposes the current title at checkpoint time; `--pass-session-id` exposes only the session ID (in the system prompt). `hermes checkpoints` is Hermes' shadow-git working-directory rollback store — unrelated to the shared `.agent-checkpoints/` JSONL contract and never a substitute for it.

**Testable acceptance implications:** one real `checkpoint` call in a Hermes session on the pinned build produces a shared-contract JSONL log via the plugin tool with the hook-bound native `session_id`; `checkpoint_path` returns an inspectable path; telemetry is an honest estimate or `null`; installer tests prove `config.yaml` byte-for-byte preservation except the additive enablement entry; `hermes plugins disable` fully deactivates the integration.

## Approach

Ship a Python-native Hermes plugin (Hermes plugins are Python; no Node dependency is introduced for Hermes users) that mirrors the checkpoint-core contract: new records carry all eight fields with Hermes `agent`/`session_title` = `null`; legacy six-field logs remain readable without migration; no derived values enter JSONL. The plugin registers two tools and subscribes to lifecycle hooks: `on_session_start` captures the native `session_id` and the agent process working directory (workspace root); `pre_tool_call` binds the same `session_id` to each checkpoint tool invocation in-process (no model-carried identity, no argument rewriting); `pre_api_request` optionally records `approx_input_tokens` (+ model) into an in-memory latest-value slot used only to derive an approximate occupancy estimate with an explicit `null` fallback when absent/invalid. Identity and telemetry state are process-local and never persisted into JSONL. Installation copies the plugin directory via the existing Hermes installer target (keeping `skills/processing` tidy) and performs the documented enablement; removal uses `hermes plugins disable` plus directory removal.

## Affected Modules

| Module | Change Type | Description |
|--------|-------------|-------------|
| Hermes Checkpoint Plugin (`hermes/agent-checkpoint/`) | create | `plugin.yaml` manifest, tool/hook plugin module mirroring the contract semantics, README. |
| Checkpoint Core (`packages/checkpoint-core/`) | use | Contract semantics + shared fixtures reused for parity tests; the JS core itself is not executed by Hermes. |
| [Installation and Configuration](../../../docs/modules/installation-and-configuration.md) | modify | Extend the Hermes target with plugin installation + documented enablement; preserve namespaced `skills/processing` behavior and symlinks. |
| Hermes/checkpoint documentation | modify | Installation guide section, concept-doc harness row (capabilities/limits), `config.yaml.example` comments. |

## Required Context

| File | Why |
|------|-----|
| `plans/checkpoint-harness-integration/plan.md` | Contract invariants, KISS, honest telemetry, gate-(c) decision record, amended installer invariant. |
| `plans/checkpoint-harness-integration/phases/phase-4.md` | Gated scope, acceptance criteria, Notes with revalidated Hermes facts. |
| `plans/agent-checkpoint-heartbeat/implementation/phase-1-impl.md` | Core contract semantics and cross-adapter fixtures to mirror. |
| `plans/agent-checkpoint-heartbeat/implementation/phase-3-impl.md` | `checkpoint-inspect` path for the F-4 inspection-parity demonstration. |
| `plans/checkpoint-harness-integration/implementation/phase-2-impl.md` and `phase-3-impl.md` | Cross-phase naming/wording consistency; sequential `install.sh` state (phases 2–3 completed first). |
| `install.sh` / `config.yaml.example` | Existing Hermes target (`~/.hermes/skills/processing`, `DESCRIPTION.md` frontmatter, lines 1014–1030), symlink/override invariants. |
| `packages/checkpoint-core/src/index.js` | Eight-field ground truth mirrored by the Python writer. |
| Pinned Hermes install (`~/.hermes/hermes-agent`) | `hermes_cli/plugins.py` (register_tool, VALID_HOOKS, opt-in loading), `hermes_cli/hooks.py` (payload shapes), `tools/delegate_tool.py` (`subagent_start` fire site), `agent/shell_hooks.py` (block/context-injection contract, no argument rewriting) — revalidation anchors. |

## Implementation Steps

### Step 1: Implement the Hermes plugin package

- **What**: `hermes/agent-checkpoint/plugin.yaml` (kind `standalone`, `provides_tools: [checkpoint, checkpoint_path]`, `provides_hooks: [on_session_start, pre_tool_call, pre_api_request]`) plus the plugin module. `checkpoint(done, next, step_failed=false)` validates inputs, resolves the hook-bound `session_id` and workspace root, evaluates the telemetry slot, and appends an eight-field record (`agent: null`, `session_title: null`) to `<workspace>/.agent-checkpoints/<encoded-session-id>.jsonl`; returns saved/estimated-or-unknown telemetry text. `checkpoint_path(session_id)` returns the shared workspace-root-relative path without writing. The Python writer mirrors `validateCheckpointRecord`/`createCheckpointRecord` semantics exactly (field set, types, ranges, UTC timestamp) and keeps legacy six-field reads valid.
- **Where**: `hermes/agent-checkpoint/plugin.yaml`; `hermes/agent-checkpoint/agent_checkpoint.py` (`register(ctx)`, `checkpoint`, `checkpoint_path`, `_validate_record`, `_encode_session_id`).
- **Authorized By**: phase-4 Scope (native plugin per gate-(c) decision); Acceptance Criterion (real call produces shared-contract JSONL; inspectable path); plan eight-field contract.
- **Why**: Python-native keeps the integration dependency-free for Hermes users while the shared fixtures guarantee cross-adapter parity.
- **Considerations**: Reject unknown sessions rather than inventing identity; malformed records fail without partial append; no inspection/percentage/recovery/restart tools; never read or write Hermes' shadow-git `checkpoints` store.

### Step 2: Bind session identity, workspace, and telemetry via plugin hooks

- **What**: `on_session_start` stores `{session_id, cwd}` in process-local state (cwd = agent process working directory = workspace root; `--no-restore-cwd` sessions use the launch cwd). `pre_tool_call` matches this plugin's tool names and binds the payload `session_id` to the invocation (rejecting mismatches with a visible error, never silently merging sessions). `pre_api_request` records `approx_input_tokens` and model into the latest-value telemetry slot; the tool maps it to an approximate `context_used` only when a defensible model context limit is known, else `null` with unknown returns. No `subagent_start` subscription: the hook exists on the pinned build and fires with child identity payloads, but start-time subagent identity is deliberately not adopted (session-level gated scope; documented follow-up option).
- **Where**: `hermes/agent-checkpoint/agent_checkpoint.py` (`_on_session_start`, `_on_pre_tool_call`, `_on_pre_api_request`, `_telemetry`).
- **Authorized By**: phase-4 Scope (lifecycle hooks for identity/workspace injection); Acceptance Criterion (honest estimate-or-`null` telemetry); revalidated payload shapes (Phase 1 research).
- **Why**: In-process hook payloads carry host identity, so no model-carried IDs or argument rewriting are needed.
- **Considerations**: Hook/telemetry state is process-local and ephemeral — never written to JSONL, never recovery state. Subagent checkpoints share the parent session log (`subagent_start` exists but is not adopted — session-level gated scope); documented honestly.

### Step 3: Install the plugin and perform documented enablement

- **What**: When the Hermes target is enabled in global installer mode, copy `hermes/agent-checkpoint/` to `~/.hermes/plugins/agent-checkpoint/` preserving symlinked destinations, then perform the documented opt-in enablement (`hermes plugins enable agent-checkpoint`, adding a single additive `plugins.enabled` entry), leaving all other preexisting `config.yaml` content byte-for-byte intact. Keep the existing `skills/processing` category behavior unchanged. Summary output documents activation state and the `hermes plugins disable` removal path.
- **Where**: `install.sh` (Hermes enabled flag, `install_hermes_checkpoint`, post-skill install sequence, summary); `config.yaml.example` Hermes target comments.
- **Authorized By**: phase-4 Scope (installer extension + documented enablement); Acceptance Criterion (byte-for-byte preservation except the additive entry; removable via `hermes plugins disable`); plan amended installer invariant (2026-07-27).
- **Why**: The documented enablement flow is the ruled-additive opt-in path; everything else about the Hermes target stays as installed today.
- **Considerations**: If `plugins.enabled` already exists, append without reordering existing entries; if the plugin is already enabled, the step is idempotent. Never hand-edit unrelated config keys; never enable project-plugin shapes.

### Step 4: Document operation and limits

- **What**: Hermes section of `docs/installation.md` (prerequisites: pinned Hermes, enablement flow, removal), concept-doc harness row (native plugin tools; session-level + post-hoc subagent limits; telemetry estimate-or-`null`; `agent`/`session_title` always `null`), `hermes/agent-checkpoint/README.md`, `config.yaml.example` comments, and the `hermes checkpoints` name-collision disambiguation.
- **Where**: `docs/installation.md`; `docs/agent-checkpoint-heartbeat.md`; `hermes/agent-checkpoint/README.md`; `config.yaml.example`.
- **Authorized By**: phase-4 Docs scope; Acceptance Criterion (concept-doc matrix lists actual capabilities); plan DoD.
- **Why**: Users must see exactly which surface is used and which capabilities are honestly unsupported on the pinned build.
- **Considerations**: Do not document MCP server, shell-hook, or project-plugin shapes as part of this integration; mark the instruction-only path as the not-taken fallback.

### Step 5: Add contract-parity, installer-isolation, pinned-CLI, and inspection-parity verification

- **What**: Dependency-free Python `unittest` suite driving the plugin's writer/tools/hook handlers: eight-field records with `agent`/`session_title` `null`, safe encoded paths, repeated appends, failed-step behavior, telemetry estimate and `null` fallback, legacy six-field read compatibility, and parity against the shared cross-adapter fixtures. Installer smoke: temporary `HERMES_HOME`, preexisting `config.yaml` snapshot verified byte-for-byte except the additive `plugins.enabled` entry, symlink protection, unchanged skills output, disable/removal path. Pinned-CLI smoke in an isolated home: `hermes plugins list` shows the plugin enabled, one real `checkpoint` call in a Hermes session produces the session log, and both `checkpoint-inspect` and checkpoint-watch read logs from all installed harnesses unchanged (F-4 cross-adapter parity demonstration).
- **Where**: `hermes/test/test_agent_checkpoint.py`; `hermes/agent-checkpoint/` (self-test helpers); OS temporary `HERMES_HOME` and workspace; existing core/opencode/codex/claude suites.
- **Authorized By**: phase-4 Deliverables + Acceptance Criteria (incl. inspection parity); plan Testing Strategy (full regression + Hermes suite); plan changelog F-4.
- **Why**: Fixture parity proves contract equality without sharing a runtime; the pinned-CLI smoke proves the documented plugin surface and enablement flow.
- **Considerations**: Fail clearly rather than skip when Hermes is absent; no real `~/.hermes` state, credentials, or inference calls; preserve all earlier suites. After Phase 4 completes, reconcile plan status via `update-plan` (plan DoD).

## Testing Plan

Verify command: `node --test packages/checkpoint-core/test/*.test.js opencode/test/*.test.mjs codex/test/*.test.mjs claude/test/*.test.mjs && python3 -m unittest discover -s hermes/test && bash -n install.sh`

| Test Type | What to Test | Expected Outcome |
|-----------|-------------|-----------------|
| Plugin contract | Eight-field writes, validation, encoded paths, fixture parity, legacy reads | Hermes records are byte-compatible shared-contract JSONL. |
| Hook binding | `on_session_start`, `pre_tool_call` match/mismatch, `pre_api_request` slot | Native session ID bound per call; mismatches rejected visibly; telemetry estimate-or-`null`. |
| Installer isolation | Temporary Hermes home, config snapshot, additive enablement only, symlinks, skills unchanged, disable path | `config.yaml` preserved byte-for-byte except the `plugins.enabled` entry; removal clean. |
| Pinned CLI | Plugin enabled, one real checkpoint, path inspection | v0.19.0 proves the documented plugin surface end-to-end. |
| Inspection parity (F-4) | `checkpoint-inspect` + checkpoint-watch over all harness logs | All harness logs read unchanged. |

### Test Integrity Constraints

- All existing core/opencode/codex/claude tests and shared fixtures remain enabled and pass; Hermes conforms to the common raw/analysis behavior, no adapter-specific expected records.
- Writer tests assert eight-field JSONL for new writes and reject persisted hook/telemetry state, filenames, remaining tokens, or derived percentages; legacy six-field logs remain readable without migration.
- Telemetry tests require explicit unknown/`null` on absent or invalid `pre_api_request` data; no fabricated occupancy.
- Installer tests snapshot a temporary `config.yaml` and prove byte-for-byte preservation of all preexisting content except the additive `plugins.enabled` entry; all effects stay inside temporary homes.
- No tests skipped, focused, deleted, or weakened for version drift.

## Rollback Strategy

`hermes plugins disable agent-checkpoint`, remove `~/.hermes/plugins/agent-checkpoint/`, remove `hermes/agent-checkpoint/` + tests, and revert installer/documentation additions. The enablement entry is the only config delta; skills, other targets, shared fixtures, and raw JSONL need no migration.

## Open Decisions

| Decision | Options | Chosen | Rationale |
|----------|---------|--------|-----------|
| Integration shape | Native plugin; MCP server + shell hooks; project plugin; instruction-only | Native plugin | Gate-(c) user decision 2026-07-27: documented surface exists; documented enablement ruled additive/opt-in; fallback trigger not met. |
| Contract runtime | Shell out to Node core; Python-native mirror | Python-native mirror | Hermes is Python-guaranteed; Node is not; fixture parity preserves the single contract. |
| Workspace root | Hook payload field; process cwd; config lookup | Agent process cwd | Hook payloads carry no cwd field on the pinned build; the plugin executes in the agent process, whose cwd is the session workspace. |
| Telemetry | Always `null`; `pre_api_request` estimate with `null` fallback | Estimate with honest `null` fallback | `approx_input_tokens` is documented on the pinned build; defensible only with a known model context limit. |
| `agent`/`session_title` sourcing | Hook fields; SQLite title lookup; `subagent_start`/`subagent_stop` role; honest `null` | Both `null` | No documented surface exposes persona/agent identity or the current session title at checkpoint time; `subagent_start` carries `child_role` at start time but is deliberately not adopted (session-level gated scope; follow-up option); honesty forbids inventing values. |

## Reality Check

### Code Anchors Used

| File | Symbol/Area | Why it matters |
|------|-------------|----------------|
| `install.sh` | Hermes category handling (1014–1030); target header map (20–37) | Existing namespaced `skills/processing` behavior and invariants to preserve. |
| `config.yaml.example` | `targets.hermes` | Existing enable/home interface; comments extended for the plugin. |
| `packages/checkpoint-core/src/index.js` | `RECORD_FIELDS`/`METADATA_FIELDS` (4–13), `validateCheckpointRecord` (59–115), `createCheckpointRecord` (126–148) | Contract mirrored by the Python writer. |
| `~/.hermes/hermes-agent/hermes_cli/plugins.py` | `register_tool` (391), `VALID_HOOKS` (135–215; incl. `subagent_start` at 164, no `stop`), opt-in loading via `plugins.enabled` (243–270) | Documented tool/hook surface and the ruled-additive enablement path. |
| `~/.hermes/hermes-agent/hermes_cli/hooks.py` | `_DEFAULT_PAYLOADS` (112–194) | Production-identical payload shapes (`pre_tool_call` session_id/task_id/tool_call_id; `on_session_start` session_id; `pre_api_request` `approx_input_tokens`; `subagent_stop` post-hoc entry; no synthetic `subagent_start` entry here — its fire site is the authoritative evidence). |
| `~/.hermes/hermes-agent/tools/delegate_tool.py` | `subagent_start` fire site (1453–1466) | Hook exists and fires on `delegate_task` child construction with `parent_session_id`/`child_session_id`/`child_subagent_id`/`child_role`/`child_goal`; documented at `website/docs/user-guide/features/hooks.md` (`subagent_start` section). Available but not adopted (session-level scope). |
| `~/.hermes/hermes-agent/agent/shell_hooks.py` | stdout JSON contract (41–51) | Shell hooks: block decisions + `pre_llm_call` context injection; no tool-argument rewriting; not used by this integration. |
| `~/.hermes/hermes-agent/cli.py` / `agent/system_prompt.py` | `--pass-session-id` (3780–3983; 512) | Session-ID exposure channel (ID only, no title). |

### Revalidation Summary (Phase 1, 2026-07-27)

Pinned build: `Hermes Agent v0.19.0 (2026.7.20)`, upstream `e0b9ab5a`, git install `~/.hermes/hermes-agent`. Evidence: `/tmp/opencode/checkpoint-harness-integration-phase1/hermes-research.md` + `hermes-research/` (machine-local). Four-question outcome: (a) tool surface YES (plugin `register_tool`; MCP client); (b) hook surface YES (plugin callbacks + shell hooks limited to block decisions / `pre_llm_call` context injection — no tool-argument rewriting); (c) session model = SQLite store, `session_id` in hook payloads, titles via `sessions rename`, `--pass-session-id`; (d) telemetry PARTIAL (`pre_api_request`/`post_api_request` token counts; estimate path, `null` valid). Name collision resolved: `hermes checkpoints` = shadow-git rollback store, never a contract substitute. Research gap corrected 2026-07-27 (pin unchanged): `subagent_start` is in `VALID_HOOKS` and documented; `stop` is not — see Stop-and-Revise Log below.

### Mismatches / Notes

- Subagent start-time identity is available on the pinned build (`subagent_start` fires with child identity payloads) but deliberately not adopted; subagent checkpoints share the parent session log — a scope decision parallel to the Codex gate-(a) session-level precedent, not a missing surface. Adoption is a documented follow-up option.
- The fallback (instruction-only via installed skills + documented external logging) is recorded as not taken; it revives only if a future build removes the plugin surface.
- Enablement is the single sanctioned `config.yaml` delta; all other Hermes configuration is out of scope.

### Stop-and-Revise Log

- **2026-07-27 (stop-and-revise):** Phase 1 research gap corrected — the pin did not drift (still `e0b9ab5a`, clean tree); the research mis-enumerated `VALID_HOOKS`. Facts corrected in place: `subagent_start` exists (`plugins.py:164`; fired from `tools/delegate_tool.py:1453–1466` with `parent_session_id`/`child_session_id`/`child_subagent_id`/`child_role`/`child_goal`; documented in `website/docs/user-guide/features/hooks.md`); `stop` is absent from `VALID_HOOKS` — no plan hook usage relied on it (the plugin subscribes only to `on_session_start`/`pre_tool_call`/`pre_api_request`, all verified present in `VALID_HOOKS`); `VALID_HOOKS` also contains `pre_gateway_dispatch`, `pre_approval_request`/`post_approval_response`, and `kanban_task_*` (omitted by the research enumeration; unused here). Primary decision (recorded, not re-opened): the gated session-level design is kept; `subagent_start` is documented as available-but-not-adopted (follow-up option), mirroring the conservative Codex gate-(a) precedent. All remaining Reality Check anchors re-verified against the pinned tree on 2026-07-27 (payload shapes, shell-hook contract, SQLite titles/`sessions rename`, `--pass-session-id`, `pre_api_request` approx tokens, `plugins.enabled` enablement path); no contradiction with the session-level design found.

### Blocking Decisions

- None. Gate (c) resolved by user decision 2026-07-27 (native plugin via documented opt-in enablement; amended installer invariant). Execution stops for primary if a future re-pin removes `register_tool`, plugin hook callbacks, or the `plugins.enabled` opt-in flow.
