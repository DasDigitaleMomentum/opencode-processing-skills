---
type: planning
entity: implementation-plan
plan: "checkpoint-harness-integration"
phase: 2
status: draft
created: "2026-07-27"
updated: "2026-07-27"
---

# Implementation Plan: Phase 2 - Codex Integration

> Implements [Phase 2](../phases/phase-2.md) of [checkpoint-harness-integration](../plan.md). Supersedes [agent-checkpoint-heartbeat phase-4-impl](../../agent-checkpoint-heartbeat/implementation/phase-4-impl.md) as execution authority.

## Approach

Add a dependency-free Codex adapter under `codex/` using the two stable CLI extensibility surfaces revalidated on pinned codex-cli 0.131.0: a local stdio MCP server exposing agent-callable `checkpoint`/`checkpoint_path` tools, and lifecycle command hooks for Codex-owned identity/workspace injection and the session instruction. Install the adapter into `$CODEX_HOME/agent-checkpoint/` and generate an additive `$CODEX_HOME/agent-checkpoint.config.toml` profile file layered via `codex --profile-v2 agent-checkpoint` (the pinned build moved additive profile-file layering from `--profile` to `--profile-v2`; v1 `--profile` reads `[profiles.*]` inside the base `config.toml`). Never edit the user's base `config.toml`; no marketplace/plugin install, daemon, or app-server-owning client.

Logging is **session-level**: every checkpoint in a Codex session writes under the native hook-provided `session_id`. The pinned build has no `SubagentStart`/subagent lifecycle hook and no `agent_id` on any hook input, so subagent attribution has no documented surface and is excluded as a documented build limit (subagent checkpoints land in the same session log). The volatile `spawn_agent`/`multi_agent_v2` surface is explicitly not adopted. `PreToolUse` matching `mcp__agent_checkpoint__checkpoint` returns `permissionDecision: "allow"` plus `updatedInput` (required pairing on the pinned build) to inject `_workspace_root` (hook `cwd`) and `_checkpoint_session_id` (hook `session_id`). Telemetry is honest-null: `{ contextUsed: null, remainingKTokens: null, source: "unavailable" }`; the app-server `thread/tokenUsage/updated` surface remains volatile research evidence, not a dependency.

## Affected Modules

| Module | Change Type | Description |
|--------|-------------|-------------|
| Codex Checkpoint Adapter (`codex/`) | create | stdio MCP runtime/server, lifecycle hook bridge, shared instruction, macOS guidance, behavioral tests. |
| Checkpoint Core (`packages/checkpoint-core/`) | use | Reuse eight-field validation, safe path, append, fixtures, inspection; no contract change. |
| [Installation and Configuration](../../../docs/modules/installation-and-configuration.md) | modify | Extend the skills-only Codex target with adapter/profile-v2 installation; preserve target detection, symlinks, other harnesses. |
| Codex/checkpoint documentation | modify | Profile-v2 activation, hook trust, session-level identity semantics + subagent limit, telemetry limits, inspection. |

## Required Context

| File | Why |
|------|-----|
| `plans/checkpoint-harness-integration/plan.md` | Contract invariants, KISS, honest telemetry, additive/opt-in, gate-(a) decision record. |
| `plans/checkpoint-harness-integration/phases/phase-2.md` | Gated scope/acceptance incl. session-level re-scope and `--profile-v2` activation (Notes 2026-07-27). |
| `plans/agent-checkpoint-heartbeat/implementation/phase-1-impl.md` | Core API, safe mapping, append behavior, cross-adapter fixtures. |
| `plans/agent-checkpoint-heartbeat/implementation/phase-2-impl.md` | Native-wrapper semantics, honest-null telemetry, installer isolation conventions. |
| `plans/agent-checkpoint-heartbeat/implementation/phase-3-impl.md` | Selected-path inspection for the parity check. |
| `docs/agent-checkpoint-heartbeat.md` | Chain, failed-step, telemetry-honesty semantics. |
| `install.sh` / `config.yaml.example` | Existing Codex target (skills-only), `CODEX_HOME`/`OPS_CODEX_HOME`, tri-state enablement, symlink conventions. |
| `packages/checkpoint-core/src/index.js` | Ground truth: `RECORD_FIELDS` eight fields incl. nullable `agent`/`session_title`; `createCheckpointRecord`; `checkpointPath`. |
| `docs/installation.md` | Canonical target docs to extend. |

## Implementation Steps

### Step 1: Implement the minimal stdio MCP tools over the shared core

- **What**: Line-oriented stdio MCP runtime with `initialize`, `notifications/initialized`, `tools/list`, `tools/call` plus a thin executable composition file. Expose only `checkpoint` and `checkpoint_path`. `checkpoint` advertises public `done`, `next`, optional/default-false `step_failed`, plus adapter-only optional `_checkpoint_session_id`/`_workspace_root` marked "hook injected; callers omit". Require the injected fields at execution; call the installed core with `contextUsed: null`, `agent: null`, `sessionTitle: null`; return saved/unknown telemetry text. `checkpoint_path` accepts the supplied session ID and returns the shared workspace-root-relative path without writing.
- **Where**: `codex/checkpoint-mcp-runtime.mjs` (`createMcpRuntime`, `listTools`, `callTool`); `codex/checkpoint-mcp-server.mjs`; installed sibling `checkpoint-core.mjs`.
- **Authorized By**: phase-2 Scope (MCP tools + path lookup); Acceptance Criterion (shared-contract records, inspectable path); plan Guiding Decisions (tool signatures, eight raw fields, honest telemetry).
- **Why**: Two-tool stdio avoids npm deps, remote services, marketplace, or extra processes beyond the MCP child Codex owns.
- **Considerations**: JSONL protocol on stdout, diagnostics on stderr. No inspection/percentage/recovery/restart tools. Unknown MCP methods return protocol errors without terminating; malformed records fail without partial append.

### Step 2: Bridge session identity and workspace through hooks (session-level)

- **What**: `codex/checkpoint-hook.mjs` reads one documented hook JSON object from stdin. For `SessionStart`, return the checkpoint instruction plus the native `session_id` as the session checkpoint ID (via `additionalContext`). For `PreToolUse` matching `mcp__agent_checkpoint__checkpoint`, return `permissionDecision: "allow"` with `updatedInput` = original public arguments + `_workspace_root` = hook `cwd` + `_checkpoint_session_id` = hook `session_id`; replace any caller-supplied internal ID with the current session value. No subagent branch exists: the pinned build fires the same session-scoped `PreToolUse` for subagent tool calls, so subagent checkpoints land in the session log (documented limit).
- **Where**: `codex/checkpoint-hook.mjs` (`handleSessionStart`, `handleCheckpointPreToolUse`); `codex/checkpoint-instruction.md`.
- **Authorized By**: phase-2 Scope (hook bridge `SessionStart`/`PreToolUse`; session-level logging per Notes); plan allowance for stable native session IDs; revalidated pinned-build hook contract (Revalidation Addendum).
- **Why**: Hooks inject host-owned values standard MCP requests do not carry; `updatedInput` is supported when paired with `permissionDecision: "allow"`.
- **Considerations**: Do not infer subagent identity from timing, keep no mutable registry, parse no transcripts, and do not adopt the volatile `spawn_agent`/`multi_agent_v2` surface. Keep `turn_id` out of persistent identity.

### Step 3: Preserve context honesty and document app-server limits

- **What**: Centralize the Codex telemetry result `{ contextUsed: null, remainingKTokens: null, source: "unavailable" }`; only `null` enters JSONL. Document: hooks expose `model` but no usage; static `model_context_window` is not occupancy; `thread/tokenUsage/updated` and native thread IDs remain app-server-scoped, version-sensitive, and uncorrelatable to the CLI's stdio MCP child.
- **Where**: `codex/checkpoint-mcp-runtime.mjs` (telemetry fallback); `codex/README.md`; `docs/agent-checkpoint-heartbeat.md` (Codex harness row/limits).
- **Authorized By**: phase-2 Acceptance Criterion (telemetry `null`/unknown per plan); plan honest-telemetry decision; Scope Excludes (app-server clients/WebSocket/marketplace).
- **Why**: The CLI profile path has no documented correlation channel from app-server notifications to the MCP child; unknown is the only defensible KISS result.
- **Considerations**: Revalidated present on 0.131.0 (`schemas/v2/ThreadTokenUsageUpdatedNotification.ts`) — still volatile; not authorization for a sidecar, wrapper client, or background state.

### Step 4: Install an additive Codex profile-v2 file without editing user config

- **What**: When the Codex target is enabled in global installer mode, copy hook, instruction, MCP runtime/server, and the core into `$CODEX_HOME/agent-checkpoint/`, preserving symlinked destinations. Generate `$CODEX_HOME/agent-checkpoint.config.toml` with absolute macOS-safe paths, `[mcp_servers.agent_checkpoint]` stdio command/args, `enabled_tools = ["checkpoint", "checkpoint_path"]`, tool-approval defaults, hooks enablement for the pinned build, and `SessionStart` + exact checkpoint `PreToolUse` command hooks. Do not alter `$CODEX_HOME/config.toml`; do not add Codex to `--project`.
- **Where**: `install.sh` (Codex enabled flag, `install_codex_checkpoint`, TOML path quoting, post-skill install sequence, summary); generated `$CODEX_HOME/agent-checkpoint.config.toml`; `config.yaml.example` Codex target comments.
- **Authorized By**: phase-2 Deliverables + Acceptance Criterion (`--profile-v2 agent-checkpoint` activation; base `config.toml` byte-for-byte preserved); revalidated profile layering (Addendum item 3); existing installer invariants.
- **Why**: A profile-v2 file is opt-in, removable, test-isolatable, and preserves all existing user Codex configuration.
- **Considerations**: Document activation as `codex --profile-v2 agent-checkpoint` and required hook review; tests may use the documented trust bypass only inside an isolated home. No ChatGPT-desktop bundle paths or marketplace state.

### Step 5: Document macOS operation and limits

- **What**: `codex/README.md` plus `docs/installation.md`/concept-doc updates: prerequisites (pinned codex-cli, Node), default/custom `$CODEX_HOME`, profile-v2 activation, registration/verification path (see Mismatches — `--profile-v2` applies only to runtime commands on 0.131.0; `mcp list` has no profile support), hook trust/restart behavior, session-level identity semantics (no subagent attribution on pinned 0.131.0; future restore path if a later build documents subagent identity), project-root `.agent-checkpoints/`, `checkpoint_path`/inspection usage, telemetry unknowns, `agent`/`session_title` always `null` for Codex.
- **Where**: `codex/README.md`; `docs/installation.md`; `docs/agent-checkpoint-heartbeat.md`; `config.yaml.example`.
- **Authorized By**: phase-2 Docs scope; plan DoD (docs identify unsupported telemetry/attribution honestly).
- **Why**: Users need the executable path and the explicit boundary between current facts and the documented build limit.
- **Considerations**: Do not document plugin marketplace, app-server, subagent logs, or token feedback as runtime components.

### Step 6: Add protocol, hook, installer, and macOS CLI verification

- **What**: Node tests driving the MCP runtime over representative requests, invoking the hook script with SessionStart/PreToolUse payloads, and temporary-workspace assertions: shared-contract eight-field records with `agent`/`session_title` `null`, safe paths, repeated appends, failed-step behavior, `context_used: null`, legacy six-field logs still readable via core normalization. Extend installer smoke coverage with temporary `CODEX_HOME`, enabled Codex target, protected symlinks, unchanged skills output, generated profile-v2 parsing, and byte-for-byte base `config.toml` preservation. On the pinned CLI: prove profile layering is accepted (`codex --profile-v2 agent-checkpoint debug prompt-input` exit 0 — see Mismatches for the `mcp list` limitation) and run one real credential-free checkpoint through the installed hook→MCP chain in an isolated repo/home; inspect the returned path.
- **Where**: `codex/test/checkpoint-codex.test.mjs`; existing core/opencode suites; OS temporary `CODEX_HOME` and workspace.
- **Authorized By**: phase-2 Acceptance Criteria; plan Testing Strategy (adapter integration, controlled failure, installer isolation).
- **Why**: Protocol/factory tests stay deterministic; one pinned-CLI smoke validates what Codex owns.
- **Considerations**: Fail clearly rather than silently skip when the pinned CLI is absent. No real user profile/credentials/marketplace/network assertions; preserve all earlier suites. After Phase 2 completes, mark agent-checkpoint-heartbeat phase 4 completed via `update-plan` (plan DoD).

## Testing Plan

Verify command: `node --test packages/checkpoint-core/test/*.test.js opencode/test/*.test.mjs codex/test/*.test.mjs && bash -n install.sh`

| Test Type | What to Test | Expected Outcome |
|-----------|-------------|-----------------|
| MCP protocol/tool | Initialize, tool listing/calls, public/internal arguments, errors, append/path results | Codex-facing tools produce only shared-contract records and deterministic unknown telemetry. |
| Hook identity | SessionStart, checkpoint `PreToolUse` (allow + `updatedInput`), stale internal ID replacement, cwd injection | Native session ID used; writes stay under the hook cwd; no subagent branch exists. |
| Signal parity | Repeated/failed checkpoints inspected with phase-3 calculations | Codex records match shared fixtures; `step_failed` independent of Canary metrics. |
| Installer/profile-v2 | Temporary Codex home, skills, adapter files, symlinks, generated profile-v2, untouched base config | Existing installation compatible; adapter opt-in via `codex --profile-v2 agent-checkpoint`. |
| macOS pinned CLI | MCP discovery plus one real checkpoint and selected-path inspection | Pinned 0.131.0 build validates callable tools and session-level logging. |

### Test Integrity Constraints

- All existing core/opencode tests and fixtures remain enabled and pass; Codex conforms to the common raw/analysis behavior, no adapter-specific expected records.
- MCP tests assert eight-field JSONL for new writes (nullable `agent`/`session_title` = `null` for Codex) and reject any persisted `_checkpoint_session_id`, `_workspace_root`, turn ID, remaining tokens, filename, or derived percentage; legacy six-field logs remain readable without migration.
- Session-level logging is asserted honestly: subagent tool calls share the session log on the pinned build; tests must not fabricate subagent attribution.
- Telemetry tests require `context_used: null` and explicit unknown returns.
- Installer tests snapshot an existing temporary `config.toml`, verify byte-for-byte preservation, and keep all profile/hook-trust/adapter/checkpoint effects inside temporary paths.
- The real CLI smoke uses an isolated `CODEX_HOME` and repository, no production credentials or network-dependent assertions. No tests skipped, focused, deleted, or weakened for API drift.

## Rollback Strategy

Remove `codex/` adapter/tests, revert the Codex installer/profile generation and documentation comments, and delete `$CODEX_HOME/agent-checkpoint/` plus `$CODEX_HOME/agent-checkpoint.config.toml` from installations. Base `config.toml`, existing skills, shared core, OpenCode adapter, and raw logs need no migration (additive profile; unchanged contract).

## Open Decisions

| Decision | Options | Chosen | Rationale |
|----------|---------|--------|-----------|
| Callable-tool transport | Stdio MCP; plugin marketplace; app-server client | Stdio MCP | Revalidated on 0.131.0: direct, local, agent-callable, no marketplace/app-server ownership. |
| Identity scope | Composite subagent IDs; session-level | Session-level (native `session_id`) | Gate-(a) user decision 2026-07-27: no `SubagentStart`/`agent_id` on the pinned build; volatile multi-agent surface excluded. |
| Context telemetry | Transcript estimate; app-server sidecar; honest unknown | Honest unknown | No documented correlated live occupancy on the CLI/MCP path. |
| Config integration | Edit base config; v1 `[profiles.*]`; additive profile-v2 file | `$CODEX_HOME/agent-checkpoint.config.toml` via `--profile-v2` | Pinned build layers `<name>.config.toml` via `--profile-v2`; base `config.toml` untouched. |
| `agent`/`session_title` sourcing | Hook fields; app-server metadata; honest `null` | Both `null` | No documented persona/agent-name or session-title surface on the pinned hook/MCP path; app-server titles are volatile and uncorrelatable. |

## Reality Check

### Code Anchors Used

| File | Symbol/Area | Why it matters |
|------|-------------|----------------|
| `install.sh` | `CODEX_HOME`, target header map (20–37), target resolution (228–318) | Codex currently skills-only globally; excluded from `--project`; invariants to preserve. |
| `config.yaml.example` | `targets.codex` | Existing enable/home interface; comments become stale without adapter notes. |
| `packages/checkpoint-core/src/index.js` | `RECORD_FIELDS`/`METADATA_FIELDS` (4–13), `validateCheckpointRecord` (59–115), `createCheckpointRecord` (126–148) | Eight-field ground truth; nullable `agent`/`session_title`. |
| `plans/checkpoint-harness-integration/phases/phase-2.md` | Scope/Acceptance/Notes | Gated session-level re-scope and `--profile-v2` activation. |
| Pinned codex-cli 0.131.0 binary | hook event registry, `PreToolUseHookSpecificOutputWire`, `--profile-v2` help, app-server schema generator | Authoritative revalidated surface (Addendum below). |

### Revalidation Addendum (2026-07-27)

Pinned build: `codex-cli 0.131.0` (`/opt/homebrew/bin/codex` → npm `@openai/codex`, native darwin-arm64 binary). Evidence: `/tmp/opencode/checkpoint-harness-integration-phase1/codex-revalidation.md` + `codex-reval.KCJwCX/` (machine-local).

| # | Item | Status | Note |
|---|------|--------|------|
| 1 | Version pin | confirmed | 0.131.0 (real supported pin). |
| 2 | Global-option ordering | confirmed | `codex [OPTIONS] <COMMAND>`. |
| 3 | Profile layering | **changed** | v1 `--profile` = `[profiles.*]` inside `config.toml`; additive file layering is `--profile-v2` → `$CODEX_HOME/<name>.config.toml`. Absorbed into Step 4. |
| 4 | App-server schema generation | confirmed | `codex app-server generate-ts --out <tmp>` produced 79 schemas. |
| 5 | Token-usage surface | confirmed (volatile) | `v2/ThreadTokenUsageUpdatedNotification.ts`; app-server-scoped, uncorrelatable. |
| 6 | Hook common fields | partial | `session_id`, `turn_id`, `transcript_path`, `hook_event_name`, `model`, `permission_mode`, `tool_name`/`tool_input`; no `agent_id`. |
| 7 | `SubagentStart.agent_id` | **changed — ABSENT** | 0 occurrences; events = PreToolUse, PermissionRequest, PostToolUse, PreCompact, PostCompact, SessionStart, UserPromptSubmit, Stop. Gate (a) → user decision: session-level logging. |
| 8 | `PreToolUse.updatedInput` | confirmed w/ constraints | Requires `permissionDecision:"allow"`; command-field constraint for command rewriting; `updatedMCPToolOutput` is PostToolUse-only. |
| 9 | MCP tool naming `mcp__<server>__<tool>` | confirmed | Matcher surface for `mcp__agent_checkpoint__checkpoint`. |
| 10 | Hook trust model | confirmed | New/changed hooks need review; `hooks`/`plugin_hooks` feature flags; configRequirements includes hooks. |

### Mismatches / Notes

- Old draft assumed `SubagentStart`-based composite IDs and `--profile` file layering; both superseded per the Addendum and the 2026-07-27 user decision. Session-level logging is the documented pinned-build limit; a future build documenting subagent identity may restore composite logs via a new gated phase.
- 2026-07-27 execution finding (primary decision): `--profile-v2` applies only to runtime commands on pinned 0.131.0 — `codex --profile-v2 agent-checkpoint mcp list` is rejected and `codex mcp list` has no profile support. Accepted registration proof set: generated TOML parses (`[mcp_servers.agent_checkpoint]`, `enabled_tools`, both `[[hooks.*]]` groups), profile layering accepted (`codex --profile-v2 agent-checkpoint debug prompt-input` exit 0), and the credential-free stdio E2E (SessionStart hook → PreToolUse hook → installed MCP server → `checkpoint-inspect` → exact eight-field record). Docs worded to this proof set; no live-agent-run claim (credential-free constraint).
- The old draft's six-field wording is reconciled to the shipped contract: new records carry all eight fields with Codex `agent`/`session_title` = `null`; legacy logs stay readable.
- Volatile-API list carried forward unchanged: app-server WebSocket, plugin list/install methods, prompt/agent hooks, asynchronous hooks, generated token fields, and (added) `spawn_agent`/`multi_agent_v2`/`child_agents_md`.

### Blocking Decisions

- None. Former gate (a) resolved by user decision 2026-07-27 (session-level logging; volatile multi-agent surface excluded). Execution stops for primary if a future re-pin changes profile-v2 layering, hook allow+`updatedInput` pairing, or MCP tool matching.
