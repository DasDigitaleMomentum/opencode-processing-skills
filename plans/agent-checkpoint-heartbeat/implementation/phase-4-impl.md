---
type: planning
entity: implementation-plan
plan: "agent-checkpoint-heartbeat"
phase: 4
status: draft
created: "2026-07-26"
updated: "2026-07-26"
---

# Implementation Plan: Phase 4 - Codex macOS Adapter

> Implements [Phase 4](../phases/phase-4.md) of [agent-checkpoint-heartbeat](../plan.md)

## Approach

Add a dependency-free Codex adapter under `codex/` using the two stable CLI extensibility surfaces that currently provide the required pieces: a local stdio MCP server for agent-callable `checkpoint`/`checkpoint_path` tools, and lifecycle command hooks for Codex-owned identity/workspace injection and parent/subagent instructions. Install the adapter into the configured `$CODEX_HOME` (default `~/.codex`) and generate an additive `$CODEX_HOME/agent-checkpoint.config.toml` profile selected with `codex --profile agent-checkpoint`. Do not edit the user's base `config.toml`, require a marketplace/plugin install, add a daemon, or make the app-server the normal CLI entry point.

Current documented hooks provide `session_id`, `cwd`, `model`, and turn-scoped `turn_id`; `SubagentStart` additionally provides `agent_id`. A `PreToolUse` hook can match `mcp__agent_checkpoint__checkpoint` and replace MCP arguments. Parent calls therefore use the native Codex `session_id`. Because `PreToolUse` does not document `agent_id`, the `SubagentStart` hook will inject a stable composite checkpoint ID (`<parent-session-id>--<agent-id>`) into that subagent's instructions; the subagent passes it in an adapter-only argument that `PreToolUse` validates/preserves while always injecting `cwd`. This is a documented-hook-based adapter bridge, but the model's carriage of the injected subagent ID is an adapter assumption that must be exercised on the colleague's exact Codex build.

Neither MCP tool calls nor documented hook payloads expose live context occupancy. App-server currently owns native thread IDs and emits version-sensitive `thread/tokenUsage/updated` notifications, but using those values would require replacing the normal CLI/profile path with an app-server-owning client and pinning generated schemas. The KISS adapter will therefore write `context_used: null` and return unknown context/remaining K-tokens. App-server usage remains researched evidence and a revalidation point, not an ungrounded telemetry dependency.

## Affected Modules

| Module | Change Type | Description |
|--------|-------------|-------------|
| Codex Checkpoint Adapter (`codex/`) | create | Add the stdio MCP runtime/server, lifecycle hook bridge, shared instruction, macOS guidance, and behavioral tests. |
| Checkpoint Core (`packages/checkpoint-core/`) | use | Reuse the stable six-field validation, safe path, append, fixtures, and inspection behavior without changing the contract. |
| [Installation and Configuration](../../../docs/modules/installation-and-configuration.md) | modify | Extend the currently skills-only Codex target with adapter/profile installation while preserving target detection and other harnesses. |
| Codex/checkpoint documentation | modify | Document profile activation, hook trust, identity semantics, telemetry limits, inspection, and revalidation steps. |

## Required Context

| File | Why |
|------|-----|
| `plans/agent-checkpoint-heartbeat/plan.md` | Defines the raw contract, KISS exclusions, honest telemetry, adapter-generated identity allowance, and macOS colleague handoff. |
| `plans/agent-checkpoint-heartbeat/phases/phase-4.md` | Supplies the gated Codex/macOS scope, prerequisites, deliverables, and acceptance criteria. |
| `plans/agent-checkpoint-heartbeat/implementation/phase-1-impl.md` | Defines the core API, safe mapping, exact append behavior, and cross-adapter fixtures. |
| `plans/agent-checkpoint-heartbeat/implementation/phase-2-impl.md` | Establishes native-wrapper response semantics, honest-null telemetry, installer isolation, and parent/subagent instruction behavior. |
| `plans/agent-checkpoint-heartbeat/implementation/phase-3-impl.md` | Defines selected-path inspection and the GO/NO-GO gate that must authorize this phase before execution. |
| `docs/agent-checkpoint-heartbeat.md` | Provides the common invocation, chain, failed-step, context, and handoff semantics. |
| `install.sh` | Shows `CODEX_HOME`/`OPS_CODEX_HOME`, tri-state enablement, current skills-only destination, project-mode exclusion, and symlink conventions. |
| `config.yaml.example` | Defines the existing Codex target and currently documents skills-only behavior. |
| `docs/installation.md` | Canonical installer/target guidance that must gain Codex adapter activation and macOS instructions. |
| `https://developers.openai.com/codex/extend/mcp` | Official MCP server configuration, callable tools, stdio transport, `$CODEX_HOME` config, and tool approval options. |
| `https://developers.openai.com/codex/hooks` | Official hook locations, trust model, common identity fields, subagent fields, MCP matcher naming, and `PreToolUse.updatedInput`. |
| `https://developers.openai.com/codex/config-file/config-reference` | Official profile-file, MCP, hooks, model context-window, and compaction settings. |
| `https://developers.openai.com/codex/app-server` | Official thread/turn identity, generated-schema commands, `thread/tokenUsage/updated`, and volatile/experimental protocol boundaries. |
| `https://developers.openai.com/codex/plugins` and `https://developers.openai.com/codex/build-plugins` | Confirms plugins can bundle MCP/hooks but require marketplace/plugin lifecycle and include under-development CLI APIs not needed for this local adapter. |
| `https://github.com/openai/codex/tree/main/codex-rs/core/src/hooks` | Primary hook implementation/types to recheck against the installed revision. |
| `https://github.com/openai/codex/tree/main/codex-rs/app-server` | Primary app-server protocol/source and generated type evidence for identity and usage semantics. |

## Implementation Steps

### Step 1: Revalidate the exact Codex/macOS surface before coding

- **What**: On the assigned macOS machine, record `codex --version`; verify global-option ordering and the selected profile with CLI help; generate installed-version app-server TypeScript/JSON schemas into an OS temporary directory; and inspect the installed hook schema/source behavior for common `session_id`/`cwd`, `SubagentStart.agent_id`, `PreToolUse.updatedInput`, canonical MCP tool naming, and any token-usage fields. Compare those results to the cited docs before implementing dependent code. If profile layering, hook argument rewriting, or MCP tool matching has changed, stop and update this implementation plan rather than silently choosing another transport.
- **Where**: Installed Codex CLI on macOS; temporary generated schemas only; this plan's Reality Check updated before execution if APIs differ
- **Authorized By**: Phase 4 Prerequisite requiring immediate primary-API/macOS revalidation; Plan Non-Functional Requirement that harness plans verify current primary APIs; Plan risk mitigation for Codex API drift.
- **Why**: The phase is deliberately executed later, and app-server/plugin/hook details are moving faster than the shared raw contract.
- **Considerations**: Stable documented target is stdio MCP plus command hooks. Treat app-server WebSocket, plugin list/install methods, prompt/agent hooks, asynchronous hooks, and generated token fields as volatile; do not adopt them merely because they appear in online `main`.

### Step 2: Implement the minimal stdio MCP tools over the shared core

- **What**: Create a line-oriented stdio MCP runtime with handlers for `initialize`, `notifications/initialized`, `tools/list`, and `tools/call`, plus a thin executable composition file. Expose only `checkpoint` and `checkpoint_path`. `checkpoint` advertises public `done`, `next`, and optional/default-false `step_failed` plus adapter-only optional `_checkpoint_session_id` and `_workspace_root` fields marked “hook injected; callers omit.” Require the injected fields at execution, call the installed Phase 1 core with `contextUsed: null`, and return saved/unknown telemetry text. `checkpoint_path` accepts the supplied stable/native session ID and returns the shared workspace-root-relative path without writing; consumers resolve it against the same hook-injected workspace root used by `checkpoint`.
- **Where**: `codex/checkpoint-mcp-runtime.mjs` (`createMcpRuntime`, `listTools`, `callTool`); `codex/checkpoint-mcp-server.mjs`; installed sibling `checkpoint-core.mjs`
- **Authorized By**: Phase 4 Scope → Includes Codex MCP/dynamic-tool integration and path lookup; Acceptance Criteria for contract-compatible root records and selected session path; Plan Guiding Decisions for tool signatures, six raw fields, non-blocking labels, and honest telemetry; official Codex MCP support for agent-callable stdio tools.
- **Why**: A two-tool stdio implementation avoids an npm dependency, remote service, plugin marketplace, or separate process beyond the MCP child Codex already owns.
- **Considerations**: Keep JSONL protocol output on stdout and diagnostics on stderr. Do not expose inspection, percentages, recovery, or restart tools. Unknown/extra MCP methods should return protocol errors without terminating the server; malformed checkpoint records must fail without partial append.

### Step 3: Bridge Codex parent and subagent identity through hooks

- **What**: Add `codex/checkpoint-hook.mjs` that reads one documented hook JSON object from stdin. For `SessionStart`, return the common checkpoint instruction plus the native `session_id` as the parent checkpoint ID. For `SubagentStart`, return the same instruction plus a deterministic `<session_id>--<agent_id>` checkpoint ID. For `PreToolUse` matching `mcp__agent_checkpoint__checkpoint`, return `permissionDecision: "allow"` and `updatedInput` containing the original public arguments, the hook's `cwd` as `_workspace_root`, and either the hook `session_id` or a supplied composite `_checkpoint_session_id` only when it has the current parent-session prefix. Reject/replace any unrelated supplied internal ID. Keep `turn_id` out of the persistent session identity.
- **Where**: `codex/checkpoint-hook.mjs` (`handleSessionStart`, `handleSubagentStart`, `handleCheckpointPreToolUse`); `codex/checkpoint-instruction.md`
- **Authorized By**: Phase 4 Scope → Includes a session/thread identity bridge and Codex parent/subagent instruction; Acceptance Criterion that parent/subagent behavior match the pilot; Plan allowance for stable adapter-generated IDs; official hooks contract for `session_id`, `cwd`, `agent_id`, MCP matcher names, and argument replacement.
- **Why**: Hooks inject host-owned values that standard MCP requests do not carry, while the composite ID keeps concurrent subagent logs separate without a daemon or transcript parsing.
- **Considerations**: **Adapter assumption:** `PreToolUse` does not document `agent_id`, so subagents must carry the ID injected as additional context. Verify this with a real parent/subagent call on the pinned macOS build. Do not infer active subagents from timing, maintain a mutable global registry, parse unstable transcripts, or use `turn_id` as a session file name.

### Step 4: Preserve context honesty and document app-server limits

- **What**: Centralize a Codex telemetry result of `{ contextUsed: null, remainingKTokens: null, source: "unavailable" }` for the CLI/MCP path and ensure only `null` enters JSONL. Document that hooks expose `model` but no usage, static `model_context_window` is not occupancy, and transcript length or accumulated API usage cannot yield defensible remaining context after compaction/prefix/caching effects. Record `thread/tokenUsage/updated` and `thread.id` as app-server facts, but do not consume them unless a future gated phase adopts an app-server-owning client after generated-schema verification.
- **Where**: `codex/checkpoint-mcp-runtime.mjs` (telemetry fallback); `codex/README.md`; `docs/agent-checkpoint-heartbeat.md` (Codex harness row/limits)
- **Authorized By**: Phase 4 Scope → Includes best available usage feedback with documented semantics; Excludes fabricated occupancy; Plan Scope-Bounding Assumption allowing `null`; Acceptance Criterion requiring telemetry to match actual Codex semantics.
- **Why**: The normal Codex CLI profile cannot correlate app-server notifications into an independently spawned MCP call, so unknown is the only defensible KISS result.
- **Considerations**: App-server identity/usage notifications are documented but version-sensitive; WebSocket is explicitly experimental/unsupported and plugin methods are under development. Neither is authorization to add a sidecar, wrapper client, or background state service.

### Step 5: Install an additive Codex profile without editing user config

- **What**: When the existing Codex target is enabled in global installer mode, copy the hook, instruction, MCP runtime/server, and Phase 1 core into `$CODEX_HOME/agent-checkpoint/`, preserving symlinked destinations. Generate `$CODEX_HOME/agent-checkpoint.config.toml` with absolute macOS-safe paths, `[mcp_servers.agent_checkpoint]` stdio command/args, `enabled_tools = ["checkpoint", "checkpoint_path"]`, suitable tool approval defaults, `[features].hooks = true`, and `SessionStart`, `SubagentStart`, and exact checkpoint `PreToolUse` command hooks. Do not alter `$CODEX_HOME/config.toml`; do not add Codex to `--project`, whose current contract intentionally installs only local OpenCode/Cursor assets.
- **Where**: `install.sh` (Codex enabled flag, `install_codex_checkpoint`, TOML path quoting, post-skill install sequence, summary); `$CODEX_HOME/agent-checkpoint.config.toml` generated output; `config.yaml.example` Codex target comments
- **Authorized By**: Phase 4 Deliverable “Codex adapter and configuration/install integration”; Acceptance Criterion for isolated macOS installation; official `$CODEX_HOME/<profile>.config.toml`, MCP, and hook layers; existing installer Codex target and symlink-preservation invariants.
- **Why**: An explicit profile makes the feature opt-in and removable while retaining all existing user Codex configuration and skills-only behavior outside the selected session.
- **Considerations**: Document activation as `codex --profile agent-checkpoint` and required hook review via `/hooks`; tests may use the documented one-run trust bypass only inside an isolated home. Do not assume the ChatGPT desktop app bundle path or write marketplace/plugin state.

### Step 6: Document macOS operation and volatile revalidation points

- **What**: Add `codex/README.md` and update `docs/installation.md`/the concept document with prerequisites (Codex CLI and Node), default/custom `$CODEX_HOME`, profile activation, `codex --profile agent-checkpoint mcp list`, hook trust/restart/new-session behavior, parent and subagent ID mapping, project-root `.agent-checkpoints/`, `checkpoint_path`/Phase 3 inspection usage, and telemetry unknowns. Include a dated “revalidate before execution” checklist for profile layering, MCP matcher/tool schema rewriting, subagent additional context, hook trust, generated app-server usage types, and macOS paths.
- **Where**: `codex/README.md`; `docs/installation.md`; `docs/agent-checkpoint-heartbeat.md`; `config.yaml.example`
- **Authorized By**: Phase 4 Scope → Includes macOS installation instructions and Codex agent instruction/path behavior; Deliverable for macOS documentation; Plan Definition of Done requiring user-facing docs to identify unsupported telemetry honestly.
- **Why**: The later colleague needs an executable path and an explicit boundary between current facts and assumptions rather than stale online-API confidence.
- **Considerations**: State that plugins can bundle MCP/hooks but are not selected for this local adapter; do not document plugin marketplace, app-server, or exact token feedback as required runtime components.

### Step 7: Add protocol, hook, installer, and macOS CLI verification

- **What**: Add Node tests that drive the MCP runtime over representative requests, invoke the hook script with parent/subagent/PreToolUse payloads, and use temporary workspaces to assert separate parent/composite-subagent logs, safe paths, repeated appends, failed-step behavior, and `context_used: null`. Extend installer smoke coverage with a temporary `CODEX_HOME`, enabled Codex target, protected symlinks, unchanged skills output, generated profile parsing, and no base `config.toml` mutation. On macOS with the pinned CLI, require `codex --profile agent-checkpoint mcp list` to confirm the configured server/profile, run one real parent and one real subagent checkpoint to prove both tools are callable in an isolated repository/home, and inspect both returned paths with the Phase 3 command.
- **Where**: `codex/test/checkpoint-codex.test.mjs`; existing Phase 1–3 test targets; OS temporary `CODEX_HOME` and workspace
- **Authorized By**: Phase 4 Acceptance Criteria for compatible records, identity/path, telemetry semantics, parent/subagent behavior, and isolated macOS smoke; Plan Testing Strategy for adapter integration, controlled failures, and installer isolation.
- **Why**: Protocol/factory tests stay deterministic, while one pinned-CLI macOS smoke validates the assumptions Codex itself owns.
- **Considerations**: The test must fail clearly rather than silently skip when the required Codex CLI/version is absent on the colleague's macOS execution machine. Use no real user profile, credentials, marketplace, network service, or non-temporary checkpoint directory; preserve all earlier phase tests.

## Testing Plan

Verify command: `node --test packages/checkpoint-core/test/*.test.js opencode/test/*.test.mjs codex/test/*.test.mjs`

| Test Type | What to Test | Expected Outcome |
|-----------|-------------|-----------------|
| MCP protocol/tool | Initialize, tool listing/calls, public/internal arguments, errors, append/path results | Codex-facing tools produce only shared-contract records and deterministic unknown telemetry. |
| Hook identity | Parent start, subagent start, checkpoint `PreToolUse`, invalid internal ID, cwd injection | Parent uses native session ID; subagent uses stable composite ID; writes stay under the hook cwd. |
| Signal parity | Repeated/failed checkpoints inspected with Phase 3 calculations | Codex records match shared fixtures and `step_failed` remains independent of Canary metrics. |
| Installer/profile | Temporary Codex home, skills, adapter files, symlinks, generated profile, untouched base config | Existing installation remains compatible and the adapter is opt-in through one additive profile. |
| macOS pinned CLI | MCP discovery plus real parent/subagent calls and selected-path inspection | The exact colleague build validates callable tools, hook carriage, separate logs, and honest telemetry. |

### Test Integrity Constraints

- All Phase 1–3 tests and fixtures must remain enabled and pass; Codex must conform to the common raw/analysis behavior rather than introduce adapter-specific expected records.
- MCP tests must inspect exact six-field JSONL and reject any persisted `_checkpoint_session_id`, `_workspace_root`, turn ID, remaining tokens, filename, or derived percentage.
- Parent/subagent identity tests must prove distinct files and deterministic mapping; they may not collapse subagents into the parent log merely because `PreToolUse` omits `agent_id`.
- Telemetry tests must require `context_used: null` and explicit unknown return values unless revalidation yields a documented, correlated live value and the implementation plan is revised before coding.
- Installer tests must snapshot an existing temporary `config.toml`, verify byte-for-byte preservation, and keep all profile, hook-trust, adapter, and checkpoint effects inside temporary paths.
- The real CLI smoke must use an isolated `CODEX_HOME` and repository, with no production credentials or network-dependent model assertions beyond the explicitly provisioned test account/environment. No tests may be skipped, focused, deleted, or weakened to accommodate API drift.

## Rollback Strategy

Remove `codex/` adapter/tests, revert the Codex-specific installer/profile generation and documentation comments, and delete `$CODEX_HOME/agent-checkpoint/` plus `$CODEX_HOME/agent-checkpoint.config.toml` from installations. The base Codex `config.toml`, existing skills, shared core, OpenCode adapter, and raw checkpoint logs require no migration because the profile is additive and records use the unchanged contract.

## Open Decisions

| Decision | Options | Chosen | Rationale |
|----------|---------|--------|-----------|
| Callable-tool transport | Stdio MCP; plugin marketplace bundle; app-server custom client | Stdio MCP | Official CLI support is direct, local, agent-callable, and does not require marketplace/app-server ownership. |
| Identity bridge | Implicit MCP metadata; transcript parsing; hook injection with composite subagent ID | Hook injection | Hooks document native session/cwd and subagent start IDs; standard MCP has no implicit Codex thread metadata. |
| Context telemetry | Transcript/model-limit estimate; app-server sidecar; honest unknown | Honest unknown | The selected CLI MCP/hook path has no correlated live occupancy; KISS forbids a sidecar solely to manufacture it. |
| Config integration | Rewrite base config; project config; additive named profile | `$CODEX_HOME/agent-checkpoint.config.toml` | It is opt-in, removable, test-isolatable, and preserves unrelated user configuration. |
| Plugin usage | Build/install local marketplace plugin; direct profile assets | Direct profile assets | Current plugins add packaging/browser/trust lifecycle and under-development APIs without solving identity or telemetry better. |

## Reality Check

### Code Anchors Used

| File | Symbol/Area | Why it matters |
|------|-------------|----------------|
| `install.sh` | `CODEX_HOME`, `CODEX_STATE`, `SKILLS_DESTS`, project override, skill copy loop | Confirms Codex currently receives only skills globally when enabled and is excluded from `--project`. |
| `config.yaml.example` | `targets.codex` and “skills only” comment | Supplies the existing enable/home interface and identifies documentation that becomes stale. |
| `plans/agent-checkpoint-heartbeat/implementation/phase-1-impl.md` | Core checkpoint/path API and fixtures | Prevents a Codex-specific raw schema or unsafe path implementation. |
| `plans/agent-checkpoint-heartbeat/implementation/phase-3-impl.md` | Inspection command and GO/NO-GO gate | Supplies the acceptance gate and cross-adapter observable verification. |
| Official Codex MCP guide | `[mcp_servers.<id>]`, stdio command, enabled tools, approvals | Documents the selected callable-tool path and config locations. |
| Official Codex Hooks guide | common fields; `SubagentStart`; `PreToolUse`; matcher naming; trust | Documents native identity/workspace values and legal MCP argument rewriting, plus the missing `agent_id` on tool hooks. |
| Official Codex App Server guide | `thread/start`; `turn/start`; schema generation; `thread/tokenUsage/updated` | Establishes richer identity/usage facts while showing why a custom owning client would be a different architecture. |
| `openai/codex` `codex-rs/core/src/hooks` and `codex-rs/app-server` | Current primary implementation/types | Provides source-level revalidation targets for the colleague's pinned build. |

### Mismatches / Notes

- The repository's Codex integration is currently skills-only; there is no `codex/` runtime, MCP config, hook, profile generation, or Codex behavioral test.
- The local command reports `codex-cli 0.0.0`, which is not a useful supported-release pin and cannot validate the later colleague's macOS build. Execution must record and test the actual installed version.
- **Documented fact:** hooks provide parent `session_id`/`cwd`, and `SubagentStart` provides `agent_id`; `PreToolUse` can rewrite MCP arguments. **Documented limitation:** `PreToolUse` does not expose `agent_id`.
- **Adapter assumption:** a subagent reliably retains and supplies its composite ID from `SubagentStart` additional context, and Codex accepts hook-injected internal MCP fields declared optional in the tool schema. The pinned macOS smoke must validate both; failure requires plan revision, not a timing registry workaround.
- **Documented fact:** app-server exposes native thread IDs and a token-usage update notification. **Adapter decision:** these are not consumed because the normal CLI profile does not provide a documented correlation channel from that event stream to its stdio MCP child, and exact generated fields are version-sensitive.
- Hooks require user trust and project config requires a trusted project. The additive user profile still needs explicit hook review; tests may use the documented bypass only in a disposable home.
- Phase 4 execution is intentionally later and remains blocked until Phase 3 records GO. Online `main`, plugin methods, app-server WebSocket, hook schemas, profile parsing, and macOS paths must all be rechecked immediately before execution.

### Blocking Decisions

- None for implementation-plan authoring. Execution must stop for a primary decision if the pinned Codex build cannot preserve a distinct subagent checkpoint ID through documented `SubagentStart` context plus `PreToolUse` rewriting; do not silently merge parent/subagent logs or add an app-server sidecar.
