---
type: planning
entity: implementation-plan
plan: "checkpoint-harness-integration"
phase: 3
status: draft
created: "2026-07-27"
updated: "2026-07-27"
---

# Implementation Plan: Phase 3 - Claude Code Integration

> Implements [Phase 3](../phases/phase-3.md) of [checkpoint-harness-integration](../plan.md). Supersedes [agent-checkpoint-heartbeat phase-5-impl](../../agent-checkpoint-heartbeat/implementation/phase-5-impl.md) as execution authority.

## Approach

Package the Claude Code adapter as a personal skills-directory plugin at `$CLAUDE_CONFIG_DIR/skills/agent-checkpoint/` (default `~/.claude/skills/agent-checkpoint/`), revalidated on pinned claude 2.1.170: any skills-directory child with `.claude-plugin/plugin.json` auto-loads next session as `<name>@skills-dir`, no marketplace/cache mutation. The plugin bundles one dependency-free stdio MCP server, command hooks, the shared checkpoint instruction, and statusline/bridge scripts, reusing the Phase-1 core and the eight-field raw JSONL contract.

The documented hook payload supplies `session_id`, `cwd`, optional `permission_mode`, and — when firing inside a subagent — `agent_id` plus `agent_type` (base hook input schema on the pinned build). A `PreToolUse` hook matching the plugin-scoped MCP tools (`mcp__plugin_agent-checkpoint_checkpoint__checkpoint` / `..._checkpoint_path`) injects an internal checkpoint ID — native `session_id` for the parent, `<session_id>--<agent_id>` for a subagent — via `permissionDecision: allow` + full-input `updatedInput`. The MCP child independently receives the stable project root as `CLAUDE_PROJECT_DIR`; MCP carries no automatic session identity, so the hook is the identity bridge.

Statusline input is the documented context source on the pinned build: `session_id`, optional `session_name`, `workspace.project_dir`, `context_window_size`, `used_percentage`, `remaining_percentage`, current input/cache token counts, `exceeds_200k_tokens`. The configured statusline wrapper atomically writes only the latest validated snapshot to `.agent-checkpoints/.runtime/claude/<native-session-id>.json`; the MCP tool reads it by hook-injected native session ID. The sidecar is ignored local runtime state — never JSONL, recovery data, or a second log. Missing/null/mismatched/unreadable telemetry yields `context_used: null` and unknown returns. Plugins cannot declare `statusLine`; the installer generates an opt-in `$CLAUDE_CONFIG_DIR/agent-checkpoint.settings.json` used with `claude --settings` (revalidated: `--settings` MERGES with base settings — both hook sets fired in a live disposable-home probe), never editing `settings.json` or `~/.claude.json`.

## Affected Modules

| Module | Change Type | Description |
|--------|-------------|-------------|
| Claude Code Checkpoint Plugin (`claude/agent-checkpoint/`) | create | Plugin manifest, bundled MCP, hooks, instruction, statusline bridge, runtime, macOS guidance. |
| Checkpoint Core (`packages/checkpoint-core/`) | use | Shared record/path/append/inspection implementation and fixtures, unchanged. |
| [Installation and Configuration](../../../docs/modules/installation-and-configuration.md) | modify | Extend the Claude skills/agents target with in-place plugin + opt-in settings file; preserve destinations/symlinks. |
| Claude/checkpoint documentation | modify | Plugin activation, statusline semantics, sidecar, session mapping, macOS verification, volatility notes. |

## Required Context

| File | Why |
|------|-----|
| `plans/checkpoint-harness-integration/plan.md` | Contract invariants, KISS, honest telemetry, additive/opt-in, gate-(b) assessment record. |
| `plans/checkpoint-harness-integration/phases/phase-3.md` | Gated scope, deliverables, acceptance criteria. |
| `plans/agent-checkpoint-heartbeat/implementation/phase-1-impl.md` | Core API, safe paths, fixtures, append behavior. |
| `plans/agent-checkpoint-heartbeat/implementation/phase-3-impl.md` | Selected-path inspection for parity checks. |
| `plans/checkpoint-harness-integration/implementation/phase-2-impl.md` | Preceding MCP/hook boundary and cross-phase naming/test continuity (no Codex assumptions authoritative for Claude). |
| `docs/agent-checkpoint-heartbeat.md` | Chain, word-count, failed-step, context, handoff, harness-parity semantics. |
| `install.sh` / `config.yaml.example` | Existing Claude target (skills+agents), `CLAUDE_HOME`/`OPS_CLAUDE_HOME`, tri-state enablement, symlink behavior. |
| `packages/checkpoint-core/src/index.js` | Eight-field ground truth: `RECORD_FIELDS` incl. nullable `agent`/`session_title`; `createCheckpointRecord`. |
| `docs/installation.md` | Canonical target/env-override docs to extend. |

## Implementation Steps

### Step 1: Create the in-place Claude Code plugin package

- **What**: Plugin root with `.claude-plugin/plugin.json`, `.mcp.json`, `hooks/hooks.json`, scripts, `README.md`. Plugin name `agent-checkpoint`, MCP server key `checkpoint` → callable names `mcp__plugin_agent-checkpoint_checkpoint__checkpoint` / `..._checkpoint_path` (revalidated pattern `mcp__plugin_<name>_<server>__<tool>`). Reference executables via `${CLAUDE_PLUGIN_ROOT}` (exec-form hooks/MCP config) and the project root via `${CLAUDE_PROJECT_DIR}`. Validate strictly: `claude plugin validate --strict` (present on the pinned build).
- **Where**: `claude/agent-checkpoint/.claude-plugin/plugin.json`; `.mcp.json`; `hooks/hooks.json`; `README.md`.
- **Authorized By**: phase-3 Scope (plugin/MCP integration); Acceptance Criterion (strict validation passes on the pinned build); revalidated skills-dir discovery (Addendum items 4–6).
- **Why**: In-place personal plugin fits the existing Claude skills destination; no marketplace/cache writes or duplicated user MCP config.
- **Considerations**: Only the checkpoint capability in this plugin; no bundled framework agents/skills, monitors/channels, or experimental components; no mutable state under `${CLAUDE_PLUGIN_ROOT}`.

### Step 2: Implement the shared-contract MCP server

- **What**: Dependency-free line-oriented stdio MCP runtime/server exposing only `checkpoint` and `checkpoint_path`. Advertise `done`, `next`, optional/default-false `step_failed`, and adapter-only optional `_checkpoint_session_id`/`_telemetry_session_id` marked hook-injected. Require valid injected identity; use `CLAUDE_PROJECT_DIR` as workspace root; load the latest telemetry snapshot; call the installed core. `checkpoint` writes `agent` = hook-supplied `agent_type` when the call originates inside a subagent (else `null`) and `session_title` = snapshot `session_name` when present/non-empty (else `null`). Return documented latest statusline percentage/remaining K-tokens when valid, explicit unknowns otherwise. `checkpoint_path` returns the shared workspace-root-relative path only.
- **Where**: `claude/agent-checkpoint/server/checkpoint-mcp-runtime.mjs` (`createMcpRuntime`, `listTools`, `callTool`, `readTelemetry`); `server/checkpoint-mcp-server.mjs`; installed `server/checkpoint-core.mjs`.
- **Authorized By**: phase-3 Scope (MCP tools, identity bridge, statusline feedback, path lookup); Acceptance Criteria (compatible records, expected paths); plan eight-field contract + per-harness sourcing decision (2026-07-27).
- **Why**: The server is the narrow callable boundary; the shared core remains authoritative for persistence/path safety.
- **Considerations**: stdout protocol-only, diagnostics on stderr; reject missing internal identity rather than inventing it; no transcript reads, no Canary metrics in-tool, sidecar never exposed as recovery state; internal identity/telemetry source/remaining tokens never persisted.

### Step 3: Inject parent/subagent identity and instructions with hooks

- **What**: One command-hook script plus shared instruction. `SessionStart` returns the instruction with native `session_id`. `SubagentStart` (present on the pinned build with `agent_id` + `agent_type` input and `additionalContext` output) returns the instruction with composite `<session_id>--<agent_id>`. Exact `PreToolUse` matchers for both plugin tools replace the entire tool input preserving public arguments: for `checkpoint`, inject parent/composite `_checkpoint_session_id` plus native `_telemetry_session_id` and the subagent `agent_type` when present; for `checkpoint_path`, preserve the supplied public session ID. Validate any preexisting internal ID against the current hook session/agent; overwrite mismatches. Optionally remove only the matching telemetry sidecar on `SessionEnd`.
- **Where**: `claude/agent-checkpoint/scripts/checkpoint-hook.mjs`; `instructions/checkpoint.md`; `hooks/hooks.json`.
- **Authorized By**: phase-3 Scope (session identity + parent/subagent instruction); Acceptance Criterion (separate logs via hook-injected IDs); plan stable-ID allowance; revalidated hook fields (Addendum items 7, 9).
- **Why**: Claude hooks expose subagent identity at tool-call time, enabling deterministic separate files without the Codex model-carried assumption.
- **Considerations**: If a future re-pin drops `agent_id` from `PreToolUse`, stop for primary (carried stop condition); do not use `prompt_id` as identity or let caller-supplied internal IDs escape the current session prefix.

### Step 4: Implement the atomic statusline telemetry side channel

- **What**: Statusline wrapper reads one documented statusline JSON object, validates native `session_id` and `workspace.project_dir`, and atomically replaces `.agent-checkpoints/.runtime/claude/<encoded-native-session-id>.json` with the minimal latest snapshot: session/project identity, update timestamp, `used_percentage`, `context_window_size`, `total_input_tokens`, and `session_name` when present. Print a compact `Checkpoint context: <percent|unknown>` row. MCP `readTelemetry` requires matching native session and project; maps `used_percentage / 100` → `context_used`; derives approximate remaining K-tokens from `max(0, context_window_size - total_input_tokens) / 1000`; returns unknown on null/absent/invalid. The sidecar never stores chain/word percentages, a checkpoint filename, remaining K-tokens, or display output.
- **Where**: `claude/agent-checkpoint/scripts/checkpoint-statusline.mjs` (`normalizeStatuslineTelemetry`, `writeAtomicSnapshot`, `formatStatusline`); MCP `readTelemetry`; `.agent-checkpoints/.runtime/claude/` runtime-only output.
- **Authorized By**: phase-3 Scope (statusline-fed telemetry with honest degradation); Acceptance Criterion (valid → returned; null/compaction/mismatch → unknown; sidecar never in raw logs/inspection); revalidated statusline fields (Addendum item 8).
- **Why**: Statusline has the host telemetry while MCP has the callable tool; one atomic latest-value file is the smallest process boundary.
- **Considerations**: Statusline values are latest-response, input-only for `used_percentage`, null before first response/after compaction; remaining K-tokens approximate. Subagents use the parent native session's latest snapshot unless a future build documents a separate subagent statusline. Statusline does not fire in `-p` print mode (interactive sessions only) — tests drive the wrapper directly.

### Step 5: Install the plugin and opt-in statusline settings safely

- **What**: When the Claude target is enabled in global installer mode, copy `claude/agent-checkpoint/` to `$CLAUDE_HOME/skills/agent-checkpoint/`, add the Phase-1 core as `server/checkpoint-core.mjs`, preserve destination symlinks. Generate `$CLAUDE_HOME/agent-checkpoint.settings.json` containing only the `statusLine` command pointing at the installed wrapper with macOS-safe JSON/shell quoting. Keep existing shared skills/agents copy behavior; never edit `$CLAUDE_HOME/settings.json`, `~/.claude.json`, marketplace files, or project settings; `--project` behavior unchanged.
- **Where**: `install.sh` (`claude_enabled`, `install_claude_checkpoint`, JSON/path quoting, post-agent installation, summary); generated `$CLAUDE_HOME/agent-checkpoint.settings.json`; `config.yaml.example` Claude target comments.
- **Authorized By**: phase-3 Deliverables + Acceptance Criterion (base `settings.json`/`~/.claude.json` byte-for-byte preserved; activation via documented `--settings` launch); revalidated merge semantics (Addendum item 3).
- **Why**: An explicit launch settings file activates telemetry without overwriting the user's statusline or unrelated configuration; revalidation proved `--settings` merges rather than replaces.
- **Considerations**: Document launch as `CLAUDE_CONFIG_DIR=<home> claude --settings <home>/agent-checkpoint.settings.json` plus restart/`/reload-plugins`. If a future re-pin changes merge behavior, stop and revise — never mutate the base file as a workaround.

### Step 6: Document operation, telemetry semantics, and volatility

- **What**: Plugin README, installation guide, concept-doc updates: default/custom macOS paths, plugin validation/discovery, settings launch, MCP scoped names, hook/permission trust, parent/composite-subagent IDs, root `.agent-checkpoints/`, sidecar lifecycle, phase-3 inspection, statusline latest-response input-only semantics and null fallback, `agent`/`session_title` sourcing (subagent `agent_type`; statusline `session_name`; else `null`), removal.
- **Where**: `claude/agent-checkpoint/README.md`; `docs/installation.md`; `docs/agent-checkpoint-heartbeat.md`; `config.yaml.example`.
- **Authorized By**: phase-3 Docs scope; plan DoD (honest docs for unsupported telemetry).
- **Why**: Users distinguish guaranteed host data from bridge assumptions; the sidecar does not change the raw contract.
- **Considerations**: No marketplace install, plugin cache paths, background monitors, transcript reconstruction, or exact real-time occupancy; remaining K-tokens labeled approximate.

### Step 7: Add isolated protocol, bridge, installer, and macOS verification

- **What**: Node tests for plugin manifest/config shape, MCP protocol/tools, parent/subagent hook rewriting, atomic statusline replacement/null/compaction cases, sidecar session/project mismatch fallback, eight-field records with sourcing rules (`agent` = `agent_type` on subagent calls else `null`; `session_title` = snapshot `session_name` else `null`), path lookup, failed steps, phase-3 inspection parity, legacy six-field read compatibility. Installer smoke: temporary `CLAUDE_CONFIG_DIR`/`OPS_CLAUDE_HOME`, existing-settings snapshots, symlink protection, unchanged skills/agents, plugin files, generated settings. Pinned-CLI smoke: strict-validate the source plugin, launch from a temporary project/config with the generated `--settings`, confirm plugin MCP tools, run one parent and one subagent checkpoint, then selected-path inspection.
- **Where**: `claude/test/checkpoint-claude.test.mjs`; existing core/opencode/codex suites; OS temporary Claude config/project/runtime paths.
- **Authorized By**: phase-3 Acceptance Criteria; plan Testing Strategy.
- **Why**: Deterministic tests verify bridge mechanics; the pinned-CLI smoke validates Claude-owned plugin/hook/statusline/subagent behavior end-to-end (schema-level revalidation evidence is complemented by this behavioral proof).
- **Considerations**: Fail clearly rather than skip when Claude is missing/too old; never use real `~/.claude`, `~/.claude.json`, settings, statusline, credentials, or checkpoint dirs; preserve every earlier-phase test. After Phase 3 completes, mark agent-checkpoint-heartbeat phase 5 completed via `update-plan` (plan DoD).

## Testing Plan

Verify command: `node --test packages/checkpoint-core/test/*.test.js opencode/test/*.test.mjs codex/test/*.test.mjs claude/test/*.test.mjs && bash -n install.sh`

| Test Type | What to Test | Expected Outcome |
|-----------|-------------|-----------------|
| Plugin/MCP | Manifest, bundled MCP names, protocol, tool schemas/calls, errors | Exactly two callable tools backed by the unchanged core contract. |
| Hook identity | Parent/subagent events, exact scoped matchers, full input replacement, invalid internal IDs | Parent/native and subagent/composite IDs deterministic and distinct. |
| Statusline bridge | Current, null, post-compaction, malformed, mismatched, atomic replacement | Valid latest-response values returned; uncertain cases become honest unknowns. |
| Installer isolation | Temporary Claude home/config, existing settings/agents/skills, symlinks, generated opt-in settings | Plugin installed in place; unrelated user/project configuration untouched. |
| macOS pinned CLI | Strict validation, plugin/MCP discovery, parent+subagent calls, sidecar telemetry, inspection | Pinned 2.1.170 build proves the documented integration and every marked assumption. |

### Test Integrity Constraints

- All existing core/opencode/codex tests and shared fixtures remain enabled and pass; Claude records use the same raw/analysis expectations, no adapter-specific schema variants.
- MCP tests assert eight-field JSONL for new writes and prove internal IDs, sidecar fields, remaining K-tokens, filenames, and percentages are never persisted; legacy six-field logs remain readable without migration.
- Parent/subagent tests produce distinct deterministic files; no merging logs or substituting prompt/tool-use IDs for documented agent identity.
- Statusline tests preserve documented null behavior and input-only percentage semantics; no cumulative cost/output tokens or fabricated defaults.
- Sidecar tests prove atomic latest-value replacement and separation from raw logs/inspection; never append-only history or recovery input.
- Installer/CLI tests snapshot existing temporary settings and `~/.claude.json` equivalents byte-for-byte; all changes under temporary config/project paths. No tests skipped, focused, deleted, or weakened for version drift.

## Rollback Strategy

Remove `claude/agent-checkpoint/` and Claude tests, revert installer/documentation additions, and delete `$CLAUDE_HOME/skills/agent-checkpoint/` plus `$CLAUDE_HOME/agent-checkpoint.settings.json` from installations. Remove `.agent-checkpoints/.runtime/claude/` caches if desired. Existing Claude agents/skills, user settings, shared core, other adapters, and raw JSONL need no migration.

## Open Decisions

| Decision | Options | Chosen | Rationale |
|----------|---------|--------|-----------|
| Distribution | Marketplace plugin; direct user MCP/settings edits; skills-directory plugin | Skills-directory plugin | Revalidated: skills-dir children auto-load (`<name>@skills-dir`); fits existing Claude skills home; no marketplace/cache or base-config mutation. |
| Identity bridge | Assume MCP metadata; transcript parsing; `PreToolUse` hook injection | Hook injection | Revalidated: hooks carry session/subagent identity (`agent_id`/`agent_type` in base input); MCP documents project root, not session identity. |
| Telemetry bridge | Unknown always; HTTP daemon; atomic latest-value sidecar | Atomic sidecar | Statusline has documented live values; one local cache is the smallest bridge to stdio MCP. |
| Statusline activation | Overwrite user settings; plugin manifest; opt-in `--settings` file | Opt-in settings file | Plugins cannot declare statusline; `--settings` revalidated as merging, not replacing. |
| Workspace location | Hook `cwd`; transcript path; MCP `CLAUDE_PROJECT_DIR` | `CLAUDE_PROJECT_DIR` | Documented stable launch/project root for local/plugin MCP servers. |
| `agent`/`session_title` sourcing | Always `null`; hook/statusline documented fields | `agent` = subagent `agent_type` else `null`; `session_title` = statusline `session_name` else `null` | Both are documented, revalidated surfaces on the pinned build; honesty criterion forbids inventing values for parents or missing snapshots. |

## Reality Check

### Code Anchors Used

| File | Symbol/Area | Why it matters |
|------|-------------|----------------|
| `install.sh` | `CLAUDE_HOME`, target header map (20–37), target resolution (228–318) | Claude currently receives global skills/agents only; invariants to preserve. |
| `config.yaml.example` | `targets.claude` | Existing enable/home interface; comments extended for plugin/settings. |
| `packages/checkpoint-core/src/index.js` | `RECORD_FIELDS`/`METADATA_FIELDS` (4–13), `validateCheckpointRecord` (59–115), `createCheckpointRecord` (126–148) | Eight-field ground truth; sourcing defaults `null`. |
| `plans/checkpoint-harness-integration/phases/phase-3.md` | Scope/Acceptance | Gated criteria this plan serves. |
| Pinned claude 2.1.170 binary | base hook input schema (`session_id`,`transcript_path`,`cwd`,`permission_mode?`,`agent_id?`), `SubagentStart` (`agent_id`,`agent_type`; `additionalContext` output), statusline object shape, `mcp__plugin_*` naming | Authoritative revalidated surface (Addendum below). |

### Revalidation Addendum (2026-07-27)

Pinned build: `claude 2.1.170 (Claude Code)` (`/opt/homebrew/bin/claude` → npm `@anthropic-ai/claude-code`, native binary). Evidence: `/tmp/opencode/checkpoint-harness-integration-phase1/claude-revalidation.md` + `claude-reval.cA0pMy/` (machine-local; live probes used a disposable `CLAUDE_CONFIG_DIR` + throwaway project; no real home touched).

| # | Item | Status | Note |
|---|------|--------|------|
| 1 | Version pin | confirmed | 2.1.170. |
| 2 | `CLAUDE_CONFIG_DIR` isolation | confirmed | Disposable home honored; hooks/statusLine loaded from it. |
| 3 | `--settings` merge-vs-replace | confirmed **MERGE** | Live probe: base + extra SessionStart hooks both fired. Carried stop condition cleared. |
| 4 | `plugin validate --strict` | confirmed | Present; exit-1 on warnings. |
| 5 | Skills-directory plugin discovery | confirmed | `plugin init` scaffolds `~/.claude/skills/<name>/`, auto-loads as `<name>@skills-dir`. |
| 6 | Plugin-scoped MCP names | confirmed | `mcp__plugin_<name>_<server>__<tool>`. |
| 7 | Command-hook input/output | confirmed | Live SessionStart payload; base input incl. optional `agent_id`; outputs `permissionDecision`, full-input `updatedInput`, `additionalContext`. |
| 8 | Statusline JSON | confirmed (binary+docs) | `model`, `workspace.project_dir`, `context_window_size`, `used_percentage`, `remaining_percentage`, `total_input_tokens`, `exceeds_200k_tokens`, optional `session_name`; does not fire in `-p` print mode. |
| 9 | `session_id` / `agent_id` / `workspace.project_dir` / `context_window` | confirmed | `agent_id`: "Present only when the hook fires from within a subagent" — present on the `PreToolUse` path. |
| 10 | New/volatile vs old draft | noted | Additional events `StopFailure`, `Setup`, `PermissionDenied`; SubagentStart adds `agent_type`; live PreToolUse/statusline captures need auth in a disposable home (unavailable) — schema-level evidence stands; Step 7 smoke is the behavioral proof. |

### Mismatches / Notes

- Old draft was grounded without a local `claude` binary and assumed six-field wording + colleague handoff; both reconciled (eight-field contract; this-machine execution). Gate (b) did not trigger: `agent_id` present on subagent hook inputs and `--settings` merges.
- Statusline semantics carried forward unchanged: latest-response, input-only percentage, null before first response/after compaction; sidecar = atomic latest-value cache, never recovery state, never inspection-selected.
- `session_name` (statusline) and `agent_type` (subagent hooks) are the documented sources adopted for `session_title`/`agent`; both fall back to `null`.

### Blocking Decisions

- None. Carried stop conditions (restated for future re-pins): `agent_id` absent from the checkpoint `PreToolUse` path, or `--settings` replacing rather than merging required settings → stop for primary; never merge parent/subagent logs or overwrite base configuration as a workaround.
