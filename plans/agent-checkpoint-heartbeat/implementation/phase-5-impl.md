---
type: planning
entity: implementation-plan
plan: "agent-checkpoint-heartbeat"
phase: 5
status: draft
created: "2026-07-26"
updated: "2026-07-26"
---

> **Superseded (2026-07-27):** This draft is superseded as execution authority by [plans/checkpoint-harness-integration/implementation/phase-3-impl.md](../../checkpoint-harness-integration/implementation/phase-3-impl.md), which was derived from it after pinned-build revalidation (claude 2.1.170). It remains as research evidence; any stop-and-revise targets the derived plan.

# Implementation Plan: Phase 5 - Claude Code macOS Adapter

> Implements [Phase 5](../phases/phase-5.md) of [agent-checkpoint-heartbeat](../plan.md)

## Approach

Package the Claude Code adapter as a personal skills-directory plugin at `$CLAUDE_CONFIG_DIR/skills/agent-checkpoint/` (default `~/.claude/skills/agent-checkpoint/`). Current Claude Code documentation treats any skills-directory child with `.claude-plugin/plugin.json` as an in-place plugin on the next session, with no marketplace/cache mutation. The plugin will bundle one dependency-free stdio MCP server, command hooks, the shared checkpoint instruction, and statusline/bridge scripts. Its tools will reuse the Phase 1 core and retain the exact raw JSONL contract.

Claude Code's documented hook payload supplies `session_id` and `cwd`, and supplies `agent_id` while a hook runs inside a subagent. A `PreToolUse` hook matching the plugin-scoped MCP tool will inject an internal checkpoint ID—native `session_id` for the parent and `<session_id>--<agent_id>` for a subagent—into the callable tool arguments. The MCP child independently receives the stable project root as `CLAUDE_PROJECT_DIR`. MCP itself does not document automatic session or agent identity, so the hook is the identity bridge.

Statusline input is the documented context source: it includes `session_id`, `workspace.project_dir`, `context_window.used_percentage`, `remaining_percentage`, `context_window_size`, and current input/cache token counts. Because statusline and MCP are independent processes, a small atomic side channel is required. The configured statusline wrapper will write only the latest validated telemetry snapshot to `.agent-checkpoints/.runtime/claude/<native-session-id>.json`; the MCP tool reads that snapshot by the hook-injected native session ID. The sidecar is ignored local runtime state, not JSONL, recovery data, or a second progress log. Missing, null, mismatched, or unreadable telemetry produces `context_used: null` and unknown returned values.

Plugins cannot declare a user's `statusLine` setting. The installer will therefore generate an opt-in `$CLAUDE_CONFIG_DIR/agent-checkpoint.settings.json` used with Claude Code's documented `--settings` flag. This avoids modifying an existing `settings.json` or statusline while making the plugin's telemetry bridge available for sessions launched with the checkpoint adapter.

## Affected Modules

| Module | Change Type | Description |
|--------|-------------|-------------|
| Claude Code Checkpoint Plugin (`claude/agent-checkpoint/`) | create | Add plugin manifest, bundled MCP, hooks, instruction, statusline bridge, runtime, and macOS guidance. |
| Checkpoint Core (`packages/checkpoint-core/`) | use | Reuse the shared record/path/append/inspection implementation and fixtures without adding fields. |
| [Installation and Configuration](../../../docs/modules/installation-and-configuration.md) | modify | Extend the current Claude skills/agents target with an in-place plugin and opt-in settings file while preserving existing destinations. |
| Claude/checkpoint documentation | modify | Document plugin activation, statusline semantics, runtime sidecar, session mapping, macOS verification, and API volatility. |

## Required Context

| File | Why |
|------|-----|
| `plans/agent-checkpoint-heartbeat/plan.md` | Defines the six-field contract, root runtime directory, honest telemetry, KISS exclusions, and later-macOS execution constraint. |
| `plans/agent-checkpoint-heartbeat/phases/phase-5.md` | Supplies the gated plugin/MCP/hook/statusline scope, deliverables, and acceptance criteria. |
| `plans/agent-checkpoint-heartbeat/implementation/phase-1-impl.md` | Defines the shared core API, safe paths, fixtures, and exact append behavior. |
| `plans/agent-checkpoint-heartbeat/implementation/phase-2-impl.md` | Establishes native-wrapper output, parent/subagent instruction, project-root behavior, and telemetry fallback conventions. |
| `plans/agent-checkpoint-heartbeat/implementation/phase-3-impl.md` | Defines selected-path inspection and the GO/NO-GO prerequisite for later adapters. |
| `plans/agent-checkpoint-heartbeat/implementation/phase-4-impl.md` | Provides the preceding MCP/hook adapter boundary and cross-phase naming/test continuity without making Codex assumptions authoritative for Claude. |
| `docs/agent-checkpoint-heartbeat.md` | Defines chain, word-count, failed-step, context, handoff, and harness parity semantics. |
| `install.sh` | Shows `CLAUDE_HOME`, `OPS_CLAUDE_HOME`, tri-state enablement, current skills/agents destinations, project-mode exclusion, and symlink behavior. |
| `config.yaml.example` | Defines the existing Claude target and currently describes skills/agents only. |
| `docs/installation.md` | Canonical target and environment-override documentation to extend with the plugin/settings launch path. |
| `https://code.claude.com/docs/en/plugins-reference` | Official manifest/components, skills-directory plugin discovery, placeholders, plugin data, scoped MCP names, and validation command. |
| `https://code.claude.com/docs/en/mcp` | Official stdio MCP, `CLAUDE_PROJECT_DIR`, roots, plugin-bundled servers, callable naming, scopes, and approval behavior. |
| `https://code.claude.com/docs/en/hooks` | Official hook input/output, `session_id`, subagent `agent_id`, `PreToolUse.updatedInput`, plugin path placeholders, and MCP matcher rules. |
| `https://code.claude.com/docs/en/statusline` | Official statusline invocation, session/workspace/context fields, null cases, and current-context percentage semantics. |
| `https://code.claude.com/docs/en/settings` and `https://code.claude.com/docs/en/env-vars` | Official `--settings`, `CLAUDE_CONFIG_DIR`, settings scopes, and isolation controls. |
| `https://github.com/anthropics/claude-plugins-official` | Primary maintained plugin examples and packaging patterns to compare against the pinned CLI. |

## Implementation Steps

### Step 1: Revalidate the pinned Claude Code/macOS contracts

- **What**: On the assigned macOS machine, record `claude --version`; verify `CLAUDE_CONFIG_DIR`, `--settings`, `plugin validate --strict`, skills-directory plugin discovery, plugin-scoped MCP tool names, command-hook input/output, and statusline JSON with the installed CLI. Capture representative parent/subagent `PreToolUse` payloads and a statusline payload in an OS temporary directory, confirming `session_id`, `agent_id`, `workspace.project_dir`, and `context_window` fields before implementing dependent logic. Stop and revise this plan if the pinned build lacks any required documented field or rewriting behavior.
- **Where**: Pinned Claude Code CLI on macOS; disposable `CLAUDE_CONFIG_DIR`, project, and captured schemas/payloads only
- **Authorized By**: Phase 5 Prerequisite requiring immediate Claude primary-API/macOS revalidation; Plan Non-Functional Requirement for harness-specific API verification; Plan API-drift risk mitigation.
- **Why**: Statusline token semantics and plugin/hook naming have explicit minimum-version changes, and the phase is assigned for later execution.
- **Considerations**: Mark plugin cache paths, marketplace state, statusline fields before v2.1.132, hook matcher normalization, plugin-scoped server naming, subagent backgrounding, and any undocumented MCP identity propagation as volatile. Do not inspect or alter the colleague's real configuration during revalidation.

### Step 2: Create the in-place Claude Code plugin package

- **What**: Add a plugin root with `.claude-plugin/plugin.json`, `.mcp.json`, `hooks/hooks.json`, scripts, and `README.md`. Use plugin name `agent-checkpoint` and MCP server key `checkpoint`, yielding documented callable names `mcp__plugin_agent-checkpoint_checkpoint__checkpoint` and `mcp__plugin_agent-checkpoint_checkpoint__checkpoint_path`. Reference executables through `${CLAUDE_PLUGIN_ROOT}` in exec-form hooks/MCP config and the project root through `${CLAUDE_PROJECT_DIR}`. Validate the source plugin strictly.
- **Where**: `claude/agent-checkpoint/.claude-plugin/plugin.json`; `.mcp.json`; `hooks/hooks.json`; `README.md`
- **Authorized By**: Phase 5 Scope → Includes Claude Code plugin/MCP integration; Deliverable requiring supported plugin packaging; official skills-directory plugin, manifest, bundled MCP, and hook facilities.
- **Why**: An in-place personal plugin fits the repository's existing Claude skills destination and avoids marketplace/cache writes or duplicated user MCP configuration.
- **Considerations**: Keep only the checkpoint capability in this plugin. Do not bundle existing framework agents/skills again, add monitors/channels, rely on experimental plugin components, or store mutable state under update-sensitive `${CLAUDE_PLUGIN_ROOT}`.

### Step 3: Implement the shared-contract MCP server

- **What**: Add a dependency-free line-oriented stdio MCP runtime/server exposing only `checkpoint` and `checkpoint_path`. Advertise `done`, `next`, optional/default-false `step_failed`, and adapter-only optional `_checkpoint_session_id`/`_telemetry_session_id` fields marked as hook-injected. Require valid injected identity at execution, use `CLAUDE_PROJECT_DIR` as workspace root, load the latest telemetry snapshot, and call the installed Phase 1 core. Return the documented latest statusline percentage/remaining K-tokens when valid or explicit unknowns otherwise. `checkpoint_path` returns only the shared workspace-root-relative path, which consumers resolve against that same `CLAUDE_PROJECT_DIR`. Keep internal identity, telemetry source, remaining tokens, and path out of the six-field record.
- **Where**: `claude/agent-checkpoint/server/checkpoint-mcp-runtime.mjs` (`createMcpRuntime`, `listTools`, `callTool`, `readTelemetry`); `server/checkpoint-mcp-server.mjs`; installed `server/checkpoint-core.mjs`
- **Authorized By**: Phase 5 Scope → Includes MCP callable tools, identity bridge, statusline feedback, and path lookup; Acceptance Criteria for compatible records and expected paths; Plan raw-field and KISS constraints; official plugin-bundled stdio MCP behavior.
- **Why**: The server is the narrow callable boundary while the shared core remains authoritative for persistence and path safety.
- **Considerations**: Keep stdout protocol-only and diagnostics on stderr. Reject missing internal identity rather than inventing one. Do not read transcripts, calculate Canary metrics in the tool, or expose the sidecar as recovery state.

### Step 4: Inject parent/subagent identity and instructions with hooks

- **What**: Add one command-hook script and shared instruction. `SessionStart` returns the checkpoint instruction with the native `session_id`. `SubagentStart` returns it with composite `<session_id>--<agent_id>`. Exact `PreToolUse` matchers for both plugin tools replace the entire tool input while preserving public arguments: for `checkpoint`, inject parent/composite `_checkpoint_session_id` plus native `_telemetry_session_id`; for `checkpoint_path`, preserve the supplied public session ID. Validate any preexisting internal ID against the current hook session/agent and overwrite mismatches. Optionally remove only the matching telemetry sidecar on `SessionEnd`.
- **Where**: `claude/agent-checkpoint/scripts/checkpoint-hook.mjs`; `instructions/checkpoint.md`; `hooks/hooks.json`
- **Authorized By**: Phase 5 Scope → Includes supported session identity and parent/subagent instruction; Acceptance Criterion that parent/subagent behavior match the pilot; Plan allowance for stable adapter-generated IDs; official hook fields and `PreToolUse.updatedInput` behavior.
- **Why**: Claude hooks expose subagent identity at tool-call time, allowing deterministic separate files without the Codex phase's model-carried identity assumption.
- **Considerations**: **Documented fact to revalidate:** `agent_id` is present when the hook fires inside a subagent. If the pinned build omits it on `PreToolUse`, stop for a plan decision rather than infer concurrency from timing. Do not use `prompt_id` as session identity or let caller-provided internal IDs escape the current session prefix.

### Step 5: Implement the atomic statusline telemetry side channel

- **What**: Add a statusline wrapper that reads one documented statusline JSON object, validates native `session_id` and `workspace.project_dir`, and atomically replaces `.agent-checkpoints/.runtime/claude/<encoded-native-session-id>.json` with the minimal latest snapshot: session/project identity, update timestamp, `used_percentage`, `context_window_size`, and `total_input_tokens`. Print a compact `Checkpoint context: <percent|unknown>` status row. In the MCP reader, require matching native session and project; map `used_percentage / 100` to `context_used`, and derive approximate remaining K-tokens from `max(0, context_window_size - total_input_tokens) / 1000`. Return unknown when required fields are null/absent/invalid. The sidecar must not store chain/word percentages, a checkpoint filename, remaining K-tokens, or display output.
- **Where**: `claude/agent-checkpoint/scripts/checkpoint-statusline.mjs` (`normalizeStatuslineTelemetry`, `writeAtomicSnapshot`, `formatStatusline`); MCP `readTelemetry`; `.agent-checkpoints/.runtime/claude/` runtime-only output
- **Authorized By**: Phase 5 Scope → Includes context feedback from supported statusline/runtime data; Acceptance Criterion requiring documented semantics or unknown; Plan permits approximate telemetry and forbids derived fields in JSONL; official statusline current-context and null semantics.
- **Why**: Statusline has the required host telemetry while MCP has the callable tool; one atomic latest-value file is the smallest process boundary between them.
- **Considerations**: The snapshot is an ephemeral cache, not append-only history or recovery. It must never be selected by `checkpoint_path` or inspection. Statusline values represent the most recent API response, use input-side tokens for `used_percentage`, exclude output tokens from that percentage, and may be null before the first call or after compaction. Subagents use the parent native session's latest statusline snapshot unless the pinned build proves a separate documented subagent statusline.

### Step 6: Install the plugin and opt-in statusline settings safely

- **What**: When the current Claude target is enabled in global installer mode, copy `claude/agent-checkpoint/` to `$CLAUDE_HOME/skills/agent-checkpoint/`, add the Phase 1 core as `server/checkpoint-core.mjs`, and preserve destination symlinks. Generate `$CLAUDE_HOME/agent-checkpoint.settings.json` containing only the `statusLine` command pointing to the installed wrapper with macOS-safe JSON/shell quoting. Keep the existing shared skills/agents copy behavior and do not edit `$CLAUDE_HOME/settings.json`, `~/.claude.json`, marketplace files, or project settings. Leave `--project` behavior unchanged because it currently excludes Claude global sync.
- **Where**: `install.sh` (`claude_enabled`, `install_claude_checkpoint`, JSON/path quoting, post-agent installation, summary); generated `$CLAUDE_HOME/agent-checkpoint.settings.json`; `config.yaml.example` Claude target comments
- **Authorized By**: Phase 5 Deliverable for plugin/configuration installation; Acceptance Criterion for isolated macOS setup; official personal skills-directory plugin and `--settings` behavior; existing installer target/symlink invariants.
- **Why**: An explicit launch settings file activates telemetry without overwriting a user's statusline or unrelated configuration.
- **Considerations**: Document launch with `CLAUDE_CONFIG_DIR=<home> claude --settings <home>/agent-checkpoint.settings.json` and restart/`/reload-plugins` requirements. If `--settings` replaces rather than merges required settings on the pinned build, stop and revise instead of mutating the base file.

### Step 7: Document operation, telemetry semantics, and volatility

- **What**: Update plugin README, installation guide, and concept document with default/custom macOS paths, plugin validation/discovery, settings launch, MCP scoped names, hook/permission trust, parent/composite-subagent IDs, root `.agent-checkpoints/`, runtime sidecar lifecycle, Phase 3 inspection, statusline's latest-response input-only semantics, null fallback, and removal. Add a dated colleague checklist for Claude version, plugin discovery/names, `agent_id`, argument rewriting, statusline version fields, `CLAUDE_PROJECT_DIR`, `--settings`, and isolated config behavior.
- **Where**: `claude/agent-checkpoint/README.md`; `docs/installation.md`; `docs/agent-checkpoint-heartbeat.md`; `config.yaml.example`
- **Authorized By**: Phase 5 Scope → Includes macOS instructions and Claude parent/subagent path behavior; Deliverable for macOS tests/documentation; Plan Definition of Done requiring accurate unsupported-telemetry documentation.
- **Why**: Users and the later colleague need to distinguish guaranteed host data from bridge assumptions and know that the sidecar does not change the raw contract.
- **Considerations**: Do not document marketplace installation, plugin cache paths, background monitors, transcript reconstruction, or exact real-time occupancy. Label remaining K-tokens approximate and tied to the latest statusline response.

### Step 8: Add isolated protocol, bridge, installer, and macOS verification

- **What**: Add Node tests for plugin manifest/config shape, MCP protocol/tools, parent/subagent hook rewriting, atomic statusline replacement/null/compaction cases, sidecar/session/project mismatch fallback, exact six-field logs, path lookup, failed steps, and Phase 3 inspection parity. Extend installer smoke tests with temporary `CLAUDE_CONFIG_DIR`/`OPS_CLAUDE_HOME`, existing settings snapshots, symlink protection, unchanged skills/agents, plugin files, and generated settings. On the pinned macOS CLI, validate the source plugin strictly, launch from a temporary project/config with the generated `--settings`, confirm the plugin MCP server/tools, and run one parent and one subagent checkpoint followed by selected-path inspection.
- **Where**: `claude/test/checkpoint-claude.test.mjs`; existing Phase 1–4 tests; OS temporary Claude config/project/runtime paths
- **Authorized By**: Phase 5 Acceptance Criteria for raw/path/telemetry/instruction behavior and isolated macOS smoke; Plan Testing Strategy for adapter integration, failed-step separation, and installation isolation.
- **Why**: Deterministic tests verify the bridge mechanics, while the pinned CLI smoke validates Claude-owned plugin, hook, statusline, and subagent behavior.
- **Considerations**: The colleague's macOS run must fail clearly rather than silently skip if Claude Code is missing or too old. It must not use the real `~/.claude`, `~/.claude.json`, settings, statusline, credentials, or checkpoint directory; preserve every earlier-phase test.

## Testing Plan

Verify command: `node --test packages/checkpoint-core/test/*.test.js opencode/test/*.test.mjs codex/test/*.test.mjs claude/test/*.test.mjs`

| Test Type | What to Test | Expected Outcome |
|-----------|-------------|-----------------|
| Plugin/MCP | Manifest, bundled MCP names, protocol, tool schemas/calls, errors | Plugin exposes exactly two callable tools backed by the unchanged core contract. |
| Hook identity | Parent and subagent events, exact scoped matchers, full input replacement, invalid internal IDs | Parent/native and subagent/composite IDs are deterministic and distinct. |
| Statusline bridge | Current, null, post-compaction, malformed, mismatched, and atomic replacement cases | Valid latest-response values are labeled/returned; all uncertain cases become honest unknowns. |
| Installer isolation | Temporary Claude home/config, existing settings/agents/skills, symlinks, generated opt-in settings | Plugin is installed in place without mutating unrelated user/project configuration. |
| macOS pinned CLI | Strict validation, plugin/MCP discovery, parent/subagent calls, sidecar telemetry, inspection | The colleague's exact build proves the documented integration and every marked assumption. |

### Test Integrity Constraints

- All Phase 1–4 tests and shared fixtures must remain enabled and pass; Claude records must use the same raw/analysis expectations rather than adapter-specific schema variants.
- MCP tests must assert exact six-field JSONL and prove that internal IDs, sidecar fields, remaining K-tokens, filenames, and percentages are never persisted.
- Parent/subagent tests must produce distinct deterministic files; they may not merge logs or substitute prompt/tool-use IDs for missing documented agent identity.
- Statusline tests must preserve documented null behavior and input-only percentage semantics. They may not use cumulative cost/output tokens or fabricated defaults to create telemetry.
- Sidecar tests must prove atomic latest-value replacement and separation from raw logs/inspection; the cache may not become append-only history or recovery input.
- Installer/CLI tests must snapshot existing temporary settings and `~/.claude.json` equivalents byte-for-byte, and keep all changes under temporary config/project paths. No tests may be skipped, focused, deleted, or weakened for version drift.

## Rollback Strategy

Remove `claude/agent-checkpoint/` and Claude tests, revert installer/documentation additions, and delete `$CLAUDE_HOME/skills/agent-checkpoint/` plus `$CLAUDE_HOME/agent-checkpoint.settings.json` from installations. Remove `.agent-checkpoints/.runtime/claude/` caches if desired. Existing Claude agents/skills, user settings, shared core, other adapters, and raw JSONL require no migration.

## Open Decisions

| Decision | Options | Chosen | Rationale |
|----------|---------|--------|-----------|
| Distribution | Marketplace plugin; direct user MCP/settings edits; personal skills-directory plugin | Skills-directory plugin | Official in-place discovery fits the existing Claude skills home and avoids marketplace/cache or base-config mutation. |
| Identity bridge | Assume MCP metadata; transcript parsing; `PreToolUse` hook injection | Hook injection | Hooks document session/subagent identity; MCP documents project root but not session identity. |
| Telemetry bridge | Unknown always; HTTP daemon; atomic latest-value sidecar | Atomic sidecar | Statusline has documented live values, and one local cache is the smallest bridge to stdio MCP without background monitoring. |
| Statusline activation | Overwrite user settings; plugin manifest; opt-in `--settings` file | Opt-in settings file | Plugins cannot declare statusline configuration, and user settings must remain untouched. |
| Workspace location | Hook `cwd`; transcript path; MCP `CLAUDE_PROJECT_DIR` | `CLAUDE_PROJECT_DIR` | It is the documented stable launch/project root for local/plugin MCP servers. |

## Reality Check

### Code Anchors Used

| File | Symbol/Area | Why it matters |
|------|-------------|----------------|
| `install.sh` | `CLAUDE_HOME`, `CLAUDE_STATE`, `SKILLS_DESTS`, `AGENTS_DESTS`, project override | Confirms Claude currently receives global skills/agents only and has no plugin/settings step. |
| `config.yaml.example` | `targets.claude` and target comments | Supplies the existing enable/home interface and the documentation boundary to update. |
| `plans/agent-checkpoint-heartbeat/implementation/phase-1-impl.md` | Core record/path API and fixtures | Keeps Claude persistence identical to every adapter. |
| `plans/agent-checkpoint-heartbeat/implementation/phase-3-impl.md` | Inspection and GO/NO-GO gate | Supplies the later-adapter prerequisite and observable parity check. |
| Official Claude Plugins reference | skills-directory plugins; manifest; MCP/hooks; placeholders | Documents the chosen distribution and scoped component names. |
| Official Claude MCP reference | plugin servers; `CLAUDE_PROJECT_DIR`; roots; tool names | Documents callable tools/project root and confirms no automatic session identity. |
| Official Claude Hooks reference | common/subagent input; `PreToolUse.updatedInput`; MCP matchers | Documents the identity/argument bridge and exact scoped matcher surface. |
| Official Claude Statusline reference | session/workspace/context fields and v2.1.132 semantics | Documents the telemetry source, formula, update cadence, and null cases. |

### Mismatches / Notes

- The current repository installs shared skills and agents to Claude but has no plugin, MCP server, statusline integration, side channel, or Claude tests.
- `claude` is not installed in the authoring environment, so no local version supports execution claims. The assigned colleague must pin and record the macOS version before implementation.
- **Documented fact:** statusline provides native session identity and latest-response context metrics, while plugin MCP receives `CLAUDE_PROJECT_DIR`. **Documented limitation:** MCP does not receive session/agent identity or statusline JSON automatically.
- **Adapter design:** the statusline writes an atomic runtime snapshot and the MCP reads it after hook identity injection. This side channel is not an Anthropic-provided correlation API; session/project matching and null fallback must be verified under concurrency.
- **Documented fact to revalidate:** hooks provide `agent_id` when executing inside a subagent and can replace full MCP tool input. If the pinned build does not include `agent_id` on the relevant `PreToolUse`, separate subagent files are blocked.
- **Adapter assumption:** parent statusline telemetry is the appropriate latest context signal for subagent checkpoint calls unless a separate subagent statusline is documented. The tool must return unknown on any ambiguous/mismatched snapshot rather than infer.
- Statusline `used_percentage` is input-only and values are null before the first response/after compaction. Remaining K-tokens are approximate from the same latest response, not an exact future-token guarantee.
- Phase 5 execution remains blocked until Phase 3 records GO and all plugin, hook, statusline, settings, and macOS details are revalidated on the colleague's build.

### Blocking Decisions

- None for implementation-plan authoring. Execution must stop for a primary decision if the pinned Claude Code build cannot expose subagent identity on the checkpoint `PreToolUse` path or cannot merge the opt-in `--settings` file without replacing required user settings; do not merge parent/subagent logs or overwrite base configuration as a workaround.
