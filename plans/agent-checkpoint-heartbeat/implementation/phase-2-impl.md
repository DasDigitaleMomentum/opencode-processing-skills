---
type: planning
entity: implementation-plan
plan: "agent-checkpoint-heartbeat"
phase: 2
status: revised
created: "2026-07-26"
updated: "2026-07-26"
---

# Implementation Plan: Phase 2 - OpenCode Pilot

> Implements [Phase 2](../phases/phase-2.md) of [agent-checkpoint-heartbeat](../plan.md)

## Approach

Refine the small OpenCode-specific adapter under `opencode/` that composes the Phase 1 `packages/checkpoint-core/` API with OpenCode's native plugin `tool` helper. Install one auto-loaded TypeScript shim at the documented global or project-local `plugins/` location and keep the adapter/core support modules in a non-scanned subdirectory of the same OpenCode home. The adapter writes the current eight-field core schema, taking the executing persona from `ToolContext.agent` and a best-effort title snapshot from the SDK, without adding MCP, publishing an npm package, editing OpenCode JSON/JSONC, or duplicating checkpoint behavior.

The tools use `ToolContext.sessionID` as the native identity and `ToolContext.worktree` as the project root, so every session writes beneath the active worktree's `.agent-checkpoints/` rather than beneath the config/plugin directory or process working directory. For telemetry, the plugin uses `PluginInput.client` to query the session's messages and provider models. It follows the TUI's usage semantics by selecting the latest assistant message with positive output tokens, summing input, output, reasoning, cache-read, and cache-write tokens, and resolving that message's provider/model context limit. This is the latest previous completed assistant step: the assistant step currently executing the checkpoint tool has not yet been finalized and therefore is not the selected accounting record.

The adapter stores the clamped context-window fraction and returns its approximate percentage plus remaining context-window headroom in K-tokens. In parallel with telemetry, it snapshots the current session title through `client.session.get`, using the native session ID and directory; unavailable methods, SDK errors, malformed/blank titles, or rejected metadata promises produce `session_title: null` without blocking persistence. `ToolContext.agent` is likewise normalized to a non-blank string or `null`. Telemetry retains its existing honest null fallback, watcher installation remains intact, and feedback continues to name the value as previous-completed-step, TUI-equivalent telemetry rather than claiming live occupancy for the active tool-calling step.

OpenCode-only checkpoint instructions will be maintained as one fragment and appended by the installer to copied OpenCode persona files, including generated delegate/implementer aliases. Canonical `agents/*.md` bodies will not receive an unconditional OpenCode tool instruction because the same sources are also installed into Claude and adapted for Cursor before those harness adapters exist.

## Affected Modules

| Module | Change Type | Description |
|--------|-------------|-------------|
| OpenCode Checkpoint Adapter (`opencode/`) | modify | Capture native persona and a non-blocking SDK session-title snapshot while preserving tool, telemetry, and instruction behavior. |
| Checkpoint Core (`packages/checkpoint-core/`) | use | Consume the stable Phase 1 path, strict legacy/current validation, eight-field append, and checkpoint behavior without duplicating it. |
| [Agent Personas](../../../docs/modules/agent-personas.md) | modify at installation boundary | Apply one checkpoint instruction to OpenCode-installed canonical personas and generated aliases without changing cross-harness source behavior. |
| [Installation and Configuration](../../../docs/modules/installation-and-configuration.md) | modify | Install plugin/runtime assets for global and `--project` OpenCode targets while preserving existing skill, agent, target, and symlink behavior. |
| OpenCode user documentation | modify | Document installed files, restart requirements, tool behavior, project-root logs, nullable metadata snapshots, and honest telemetry limits. |

## Required Context

| File | Why |
|------|-----|
| `plans/agent-checkpoint-heartbeat/plan.md` | Defines the original six-field compatibility baseline, OpenCode-first rollout, root-local storage, and honest telemetry constraint. |
| `plans/agent-checkpoint-heartbeat/phases/phase-2.md` | Supplies the gated OpenCode pilot scope, deliverables, and acceptance criteria. |
| `plans/agent-checkpoint-heartbeat/implementation/phase-1-impl.md` | Fixes the core package/API, safe identifier mapping, append behavior, fixtures, and test command that this adapter must preserve. |
| `docs/agent-checkpoint-heartbeat.md` | Defines tool signatures, agent chaining/failure instruction, response semantics, and OpenCode harness expectations. |
| `docs/installation.md` | Canonical user-facing OpenCode global/project installation and restart guidance. |
| `docs/modules/agent-personas.md` | Inventories all canonical parent/subagent sources and explains their multi-target reuse and generated aliases. |
| `docs/modules/installation-and-configuration.md` | Maps OpenCode target resolution, project override, copy loops, variants, and symlink invariants. |
| `agents/maintainer.md` and `agents/maintainer-direct.md` | Identify both installed parent personas that must receive the OpenCode checkpoint instruction. |
| `agents/delegate.md`, `agents/retriever.md`, `agents/doc-explorer.md`, `agents/implementer.md`, and `agents/legacy-curator.md` | Identify every canonical installed subagent persona covered by the instruction. |
| `install.sh` | Provides `OPENCODE_HOME`, the `--project` override, canonical/variant copy order, symlink handling, and final user guidance. |
| `config.yaml.example` | Defines `targets.opencode.home`; no additional plugin configuration key is needed. |
| `opencode/checkpoint-runtime.mjs` | Implements SDK-backed telemetry selection, calculation, validation/fallback, result formatting, and tool execution. |
| `opencode/checkpoint-plugin.ts` | Composes the runtime with `PluginInput.client`, the native `tool` helper when available, and installed core exports. |
| `opencode/test/checkpoint-plugin.test.mjs` | Captures implemented telemetry, fallback, persistence, tool, and installer behavior. |
| `https://opencode.ai/docs/plugins/` | Official locations, auto-loading, TypeScript support, restart/load behavior, and native custom-tool example. |
| `/develop/software/opencode/packages/plugin/src/tool.ts` | Defines current `ToolContext`, including `sessionID`, `directory`, `worktree`, and `agent`. |
| `/develop/software/opencode/packages/plugin/src/index.ts` | Defines `PluginInput.client`, plugin input fields, and hook types. |
| `/develop/software/opencode/packages/sdk/js/src/gen/sdk.gen.ts` | Defines the SDK `session.get`, session-message, and provider-list queries used by metadata and telemetry. |
| `/develop/software/opencode/packages/tui/src/component/prompt/index.tsx` | Supplies the TUI-equivalent latest-assistant selection, token sum, provider/model lookup, and context percentage semantics. |
| `/develop/software/opencode/packages/tui/src/context/sync.tsx` | Distinguishes finalized assistant messages from an active working step and shows session-message synchronization. |
| `/develop/software/opencode/packages/opencode/src/config/plugin.ts` | Confirms only direct `{plugin,plugins}/*.{ts,js}` files are auto-discovered, allowing support modules to remain outside the scanned directory. |

## Implementation Steps

### Step 1: Create the OpenCode adapter and loadable shim

- **What**: Keep `opencode/checkpoint-runtime.mjs` as a dependency-injected factory that accepts OpenCode's `tool` helper, Phase 1 core exports, telemetry lookup, and session-title lookup, plus `opencode/checkpoint-plugin.ts` as the minimal installed composition module. The shim imports installed core/runtime support modules, resolves the native `tool` helper with a compatibility fallback, builds both SDK lookups from `pluginContext.client`, and exports exactly one plugin function that returns `tool.checkpoint` and `tool.checkpoint_path`. Keep support modules outside the direct `plugins/*.{ts,js}` scan so OpenCode does not mistake their utility exports for plugin entry points.
- **Where**: `opencode/checkpoint-runtime.mjs`; `opencode/checkpoint-plugin.ts`
- **Authorized By**: Phase 2 Scope → Includes “OpenCode custom tools/plugin”; Phase 2 Notes favoring an OpenCode-native wrapper; Plan Scope-Bounding Assumption permitting harness-native wrappers; Phase 1 approach selecting a reusable JavaScript core plus authoritative fixtures.
- **Why**: A tiny native shim uses OpenCode's supported extension point while the injected factory remains directly testable without adding an OpenCode SDK dependency or build step to this repository.
- **Considerations**: The plugin module must not export raw core functions because OpenCode treats exported functions as plugin entry points. Do not add an MCP server, daemon, bundle step, root package manager, or OpenCode config mutation.

### Step 2: Bind native identity, persona, title, and telemetry

- **What**: Keep `checkpoint` defined with `done` and `next` string schemas and an optional/default-false `step_failed` boolean. Pass `context.sessionID` and `context.worktree` (with plugin worktree fallback) to the core, and normalize `context.agent` to the nullable `agent` metadata value. Add `createOpenCodeSessionTitle(client)`, which calls `client.session.get({ path: { id: context.sessionID }, query: { directory: context.directory } })` at each checkpoint and returns a non-blank title or `null`. In the executor, launch title acquisition and the existing `createOpenCodeContextTelemetry(client)` concurrently with `Promise.allSettled`; independently fall back to null title or unknown telemetry if either lookup rejects or returns invalid data, then append the checkpoint. Preserve telemetry's backward scan for the latest positive-output assistant message, five-category token sum, provider/model context limit, clamped fraction/headroom, and TUI-equivalent wording. Keep `checkpoint_path` and the instructional rather than schema-blocking label/chain/failure rules unchanged.
- **Where**: `opencode/checkpoint-runtime.mjs` (`nonEmptyString`, `createOpenCodeSessionTitle`, `unknownTelemetry`, `createOpenCodeContextTelemetry`, `formatCheckpointResult`, `createOpenCodeCheckpointPlugin` executor); `opencode/checkpoint-plugin.ts` (`CheckpointPlugin` composition with `pluginContext.client`)
- **Authorized By**: Plan Guiding Decisions for tool signatures, raw progress fields, non-blocking labels, chain reuse, failed steps, project-root files, approximate utilization, and remaining K-tokens; Phase 2 Scope → Includes native session identity and best available context telemetry; Acceptance Criteria for parent/subagent records and utilization/headroom or honest unknown values; requested ToolContext persona and non-blocking SDK title-snapshot refinement; existing OpenCode TUI invariant for completed assistant-step context accounting.
- **Why**: Native context identifies which parent/subagent persona wrote each record, while a point-in-time title makes that session recognizable; isolating both SDK lookups from persistence preserves the checkpoint heartbeat when host metadata or telemetry is unavailable.
- **Considerations**: Require the native ID and directory before issuing `session.get`; do not cache a title because session titles can change between records. Blank/missing agent or title becomes `null`. Use `context.directory` only to scope SDK queries, validate every token category and context limit, clamp telemetry to valid bounds, and never let a rejected or invalid lookup prevent the append. Do not sum the whole transcript, select an output-zero active step, infer an unmatched model limit, or persist remaining-token/provider/model details.

### Step 3: Install plugin and support assets for both OpenCode modes

- **What**: Extend target resolution with a single effective OpenCode target home: configured `OPENCODE_HOME` in global mode and `$PWD/.opencode` in project mode. Add an OpenCode-specific install function that copies `opencode/checkpoint-plugin.ts` to `<target>/plugins/checkpoint.ts`, copies `opencode/checkpoint-runtime.mjs` to `<target>/lib/opencode-processing-skills/checkpoint-runtime.mjs`, and copies `packages/checkpoint-core/src/index.js` to the explicit ESM destination `<target>/lib/opencode-processing-skills/checkpoint-core.mjs`; the shim imports those stable names. Preserve destination symlinks instead of overwriting them, refresh ordinary files on rerun, and invoke this step only for the effective OpenCode target after core skill/agent/variant installation.
- **Where**: `install.sh` (OpenCode target-home selection, `install_opencode_checkpoint`, installation sequence, and summary); source inputs `opencode/checkpoint-plugin.ts`, `opencode/checkpoint-runtime.mjs`, `packages/checkpoint-core/src/index.js`
- **Authorized By**: Phase 2 Scope → Includes installer support for global and project-local OpenCode; Acceptance Criterion preserving existing global and `--project` behavior; official OpenCode plugin locations `~/.config/opencode/plugins/` and `.opencode/plugins/`; existing installer invariant that destination symlinks are skipped.
- **Why**: Mapping one source set into both documented plugin locations makes the pilot installable without editing user JSON/JSONC or requiring npm publication.
- **Considerations**: Do not add the plugin to Codex, Claude, Cursor, or Hermes destination arrays. A global and project-local install may both be visible to OpenCode; documented load order gives the project-local copy later precedence, and both copies must expose identical behavior.

### Step 4: Inject the checkpoint instruction into OpenCode-installed personas

- **What**: Add one concise `opencode/checkpoint-instruction.md` fragment covering self-segmented checkpoints, exactly three words, verbatim chain reuse, `step_failed=true` plus corrective next step, final checkpoint/compact handoff under reported context pressure, and applicability to parents. After canonical agents and configured delegate/implementer variants are created, append the fragment once to every ordinary Markdown file under the effective OpenCode `agents/` directory. Skip symlinked agent destinations and make reruns idempotent by relying on the preceding copy/regeneration or an explicit marker check.
- **Where**: `opencode/checkpoint-instruction.md`; `install.sh` (`install_opencode_checkpoint_instruction` after variant generation)
- **Authorized By**: Plan Guiding Decision “Parent agents follow the same checkpoint instruction as subagents”; Functional Requirement that all supported agents can call `checkpoint`; Phase 2 Scope → Includes instructions for maintainers and applicable subagents; Deliverable “Updated parent and subagent checkpoint instruction”; existing installer behavior that generates aliases from canonical personas.
- **Why**: Installer-time OpenCode injection reaches both parents, all five canonical subagents, and generated aliases while avoiding premature OpenCode-specific behavior in Claude/Cursor copies of the shared agent sources.
- **Considerations**: Do not alter agent frontmatter permissions or append to symlinks. The instruction must treat unknown telemetry as unknown and must not impose a global stop threshold or claim that checkpointing proves work quality.

### Step 5: Document installation and telemetry limits

- **What**: Update the concept's OpenCode harness/current-decision sections and `docs/installation.md` with the global/project plugin locations, installed support directory, automatic local-plugin loading, required OpenCode restart, available tool names, root-worktree log location, nullable persona/title snapshots, previous-completed-step TUI-equivalent telemetry semantics, context-window percentage/headroom, the unfinished active-step limitation, and null/unknown fallback conditions. Update the OpenCode target comments in `config.yaml.example` to state that the existing home also receives the checkpoint plugin; add no new setting. Remove only the now-resolved “first harness” and OpenCode telemetry questions while leaving Phase 3 display decisions deferred.
- **Where**: `docs/agent-checkpoint-heartbeat.md`; `docs/installation.md`; `config.yaml.example`
- **Authorized By**: Phase 2 Acceptance Criterion requiring restart/configuration documentation; Deliverable requiring documented telemetry fallback; Plan Definition of Done requiring user-facing documentation to match implemented behavior; existing `targets.opencode.home` configuration contract.
- **Why**: Users need to know where the auto-loaded plugin is installed and that an unknown response reflects an API limit rather than a failed checkpoint.
- **Considerations**: Do not claim the later Phase 3 inspector/dashboard as a Phase 2 deliverable, edit OpenCode runtime JSON/JSONC, or describe previous-completed-step accounting as exact live occupancy for the active tool-calling step.

### Step 6: Add adapter integration and isolated installer coverage

- **What**: Maintain the Node suite that injects a minimal fake OpenCode `tool` helper, SDK client, and the real Phase 1 core into the adapter factory. Execute both tools with deterministic parent/subagent contexts in a temporary worktree; assert separate native session files, exact current eight-field lines, `ToolContext.agent`, per-call parent/subagent title snapshots, title changes between records, failure recording, root placement, relative path lookup, non-blocking labels, and null fallback. Cover thrown/error/blank title responses and ensure title lookup failure cannot prevent append. Preserve focused telemetry cases for latest completed assistant-step selection ahead of an output-zero active step, all token categories, provider/model context lookup, percentage/headroom calculation, exhausted-context clamping, malformed/missing host data, and SDK failure. Keep the isolated global/project installer smoke, watcher asset/launch checks, persona/alias instruction checks, symlink preservation, existing outputs, and shell syntax verification.
- **Where**: `opencode/test/checkpoint-plugin.test.mjs`; existing `packages/checkpoint-core/test/checkpoint-core.test.js`; temporary homes/worktrees created by the test
- **Authorized By**: Phase 2 Scope → Includes temporary-workspace integration and installer smoke tests; Phase 2 Acceptance Criteria for separate parent/subagent logs, tools, failed steps, and backward-compatible installation; Plan Testing Strategy requiring harness integration and isolated installer smoke tests while preserving `bash -n install.sh`.
- **Why**: Exercising the tool executors and real installer mappings verifies changed behavior without touching the developer's actual OpenCode home or repository runtime directory.
- **Considerations**: The smoke test must set `HOME`, `OPS_OPENCODE_HOME`, all non-OpenCode `OPS_SYNC_*` values, and any detection path to temporary/disabled values. It must not require a running OpenCode process or network access; loader compatibility is covered by matching the verified native API and installed file layout.

## Testing Plan

Verify command: `node --test packages/checkpoint-core/test/checkpoint-core.test.js opencode/test/checkpoint-plugin.test.mjs`

| Test Type | What to Test | Expected Outcome |
|-----------|-------------|-----------------|
| Native tool integration | Parent/subagent contexts, `sessionID`, `worktree`, `agent`, title snapshots, both tool schemas/executors, failed step, labels, path, and null fallback | Each session gets its own valid eight-field root-local JSONL; persona/title reflect the call snapshot or null, output/path match the contract, and no metadata/Canary issue blocks writing. |
| SDK telemetry | Latest positive-output assistant step before the active unfinished step, five token categories, provider/model context limit, percentage/headroom, clamping, malformed data, and request errors | Valid host data produces TUI-equivalent previous-step context feedback; unavailable or invalid data produces null/unknown without blocking persistence. |
| SDK session metadata | Parent/subagent `session.get` request shape, renamed title snapshots, blank/error/throw responses, and rejected metadata promises | Each checkpoint captures the current non-blank title when available and otherwise writes null without preventing the append. |
| Global installer smoke | Temporary `OPS_OPENCODE_HOME`, plugin/support copies, all persona classes/aliases, symlinks, and unaffected skill/agent installation | OpenCode receives loadable assets/instructions while existing outputs and protected symlinks remain intact. |
| Project installer smoke | Temporary workspace with `--project` | Assets land only under that workspace's `.opencode/`; checkpoint execution still targets the workspace root, not `.opencode/`. |
| Regression | Phase 1 contract tests and installer shell parsing invoked by the adapter suite | Strict legacy/current schema behavior, path/append semantics, and installer syntax remain intact. |

### Test Integrity Constraints

- Phase 1 core tests and legacy fixtures must remain enabled; the adapter must conform to strict legacy/current parsing and current eight-field writes rather than weakening schema checks.
- Existing installer assertions represented by global/project skill and agent output, model/variant generation, and symlink preservation must remain covered; checkpoint tests may not replace those compatibility checks with file-existence-only assertions.
- All homes, worktrees, config files, detection paths, and checkpoint logs must be created under OS temporary directories. Tests must not read or modify the user's real `~/.config/opencode`, repository `.opencode/`, or repository `.agent-checkpoints/`.
- Telemetry tests must derive expected values from deterministic SDK-shaped messages and provider models, not inject fabricated final percentages; fallback cases must require `context_used: null`, explicit unknown response text, and successful persistence.
- The active assistant fixture must remain after the selected completed assistant message with zero output tokens so the test preserves the distinction between previous finalized accounting and the current tool-calling step.
- Metadata tests must exercise both parent and subagent `ToolContext.agent` values, a title change across calls, and null fallbacks; they may not replace the existing telemetry, watcher, installer, session-isolation, or root-placement assertions.
- No tests may be skipped, focused with `.only`, deleted, or have exact raw-field/session/root-placement assertions weakened to make the adapter pass.

## Rollback Strategy

Remove the tracked `opencode/` adapter assets and tests, revert the OpenCode-specific installer functions/calls and documentation/config comments, then rerun the prior installer to refresh ordinary agent files. Installed checkpoint plugin/support files may be removed from the configured or project-local OpenCode home; no JSONL migration is needed because runtime logs are raw local state and the shared Phase 1 package remains valid.

## Open Decisions

| Decision | Options | Chosen | Rationale |
|----------|---------|--------|-----------|
| Plugin transport | Native local plugin; npm publication; MCP server | Native local plugin | Phase 2 explicitly favors OpenCode-native context and the official loader supports global/project TypeScript files. |
| Current telemetry source | SDK message/provider queries; event cache; unconditional unknown | SDK message/provider queries with null fallback | `PluginInput.client` exposes the same message/provider data used by the TUI. The latest positive-output assistant step supports defensible previous-completed-step percentage and headroom, while the active tool-calling step remains unfinished and unavailable/invalid data stays unknown. |
| Session metadata source | User input; cached event state; native tool context plus per-call SDK lookup | `ToolContext.agent` plus `client.session.get` title snapshot | These are the native persona/session values available at execution time, and null fallbacks keep metadata best-effort rather than a persistence dependency. |
| Persona instruction placement | Modify all canonical cross-harness bodies; duplicate seven OpenCode agents; installer-injected shared fragment | Installer-injected shared fragment | It reaches canonical and generated OpenCode personas without activating an unavailable tool in Claude/Cursor installations. |
| Installed code composition | Duplicate core in plugin; publish local packages; thin shim plus non-scanned support modules | Thin shim plus support modules | It reuses Phase 1 behavior, avoids package publication/building, and respects OpenCode's direct plugin scan. |

## Reality Check

### Code Anchors Used

| File | Symbol/Area | Why it matters |
|------|-------------|----------------|
| `packages/checkpoint-core/src/index.js` | `checkpoint`; `checkpointPath` | Provides the authoritative eight-field record/path/append behavior used by the native wrapper. |
| `opencode/checkpoint-runtime.mjs` | `createOpenCodeSessionTitle`; `createOpenCodeContextTelemetry`; `createOpenCodeCheckpointPlugin`; `formatCheckpointResult` | Shows native persona normalization, per-call SDK title lookup, independent all-settled fallbacks, TUI-equivalent telemetry, persistence wiring, and user feedback. |
| `opencode/checkpoint-plugin.ts` | `CheckpointPlugin`; `resolveToolHelper` | Shows the installed plugin passes `PluginInput.client` into title and telemetry helpers and composes the runtime/core/tool helper. |
| `opencode/test/checkpoint-plugin.test.mjs` | metadata, telemetry, and native-tool tests | Verifies parent/subagent persona/title snapshots, title fallback, latest completed-step selection, five token categories, provider/model limits, clamping, and non-blocking failure handling. |
| `install.sh` | `OPENCODE_HOME`, `install_opencode_checkpoint`, `install_opencode_checkpoint_instruction`, project-mode override | Shows the implemented global/project asset mapping, installation order, alias instruction injection, and symlink-preserving behavior. |
| `agents/*.md` | Two primary and five subagent persona files | Establishes the complete canonical instruction audience and the multi-target source-sharing constraint. |
| `config.yaml.example` | `targets.opencode.home` | Supplies the global plugin home without requiring a new configuration key. |
| OpenCode `packages/plugin/src/tool.ts` | `ToolContext`; `tool()` | Verifies native `sessionID`, `directory`, `worktree`, `agent`, schema, execute, and result interfaces; no current token telemetry is present. |
| OpenCode `packages/plugin/src/index.ts` | `PluginInput`; `Hooks.tool` | Verifies the plugin factory receives the typed SDK client and returns named custom tools. |
| OpenCode `packages/sdk/js/src/gen/sdk.gen.ts` | `Session.get`; `Session.messages`; `Provider.list` | Verifies the client queries used to retrieve the title, session messages, and provider models. |
| OpenCode `packages/opencode/src/config/plugin.ts` | `ConfigPlugin.load` glob | Verifies auto-discovery is limited to direct `.ts`/`.js` plugin files, so nested/non-plugin support assets are safe. |
| OpenCode `packages/tui/src/component/prompt/index.tsx` | `usage` memo | Confirms the latest assistant message with positive output, five-category token sum, provider/model lookup, and context percentage semantics mirrored by the plugin. |
| OpenCode `packages/tui/src/context/sync.tsx` | `status`; `sync` | Confirms completion status and SDK-backed session-message synchronization; the assistant step invoking the tool is still working rather than finalized. |

### Mismatches / Notes

- Phase 2 is implemented. The repository now contains the adapter, client-backed telemetry, installer integration, persona instruction, and focused integration/smoke tests described above.
- `ToolContext` itself still has no token/model fields, but `PluginInput.client` exposes session messages and provider models. The implementation deliberately reports the latest previous completed assistant step using TUI semantics; it does not claim that this is finalized accounting for the active assistant step currently invoking the tool.
- OpenCode's TUI displays used tokens and percentage, not remaining headroom. The plugin computes headroom from the same validated context limit minus the same five-category token total, clamps it at zero, and labels it as context-window headroom.
- The SDK client shape uses generated request wrappers (`path.id` plus optional `query.directory`) in the installed/runtime integration, while adjacent TUI call sites may use the higher-level client argument shape generated for that checkout. Tests lock the shape consumed by this plugin.
- Null remains an intentional fallback, not the default design: absent methods/session IDs/completed steps, response errors, malformed token arrays, unmatched provider/models, invalid limits, and thrown SDK requests all produce null/unknown without preventing the JSONL append.
- Session metadata is snapshot data rather than a stable join: `context.agent` can vary by call and an SDK session title can be renamed. The implementation intentionally records the values observed at each checkpoint and normalizes missing/blank/error results to null.
- Title and telemetry requests run concurrently under `Promise.allSettled`; title failure is isolated from telemetry failure and neither prevents the core append. The title helper uses the generated SDK request shape with both session ID and directory.
- Current user-facing documentation reflects TUI-equivalent telemetry, honest null fallback, and nullable persona/title snapshots; this implementation-plan-only revision preserves that established behavior without editing documentation.
- Canonical `agents/*.md` are also copied to Claude and selected bodies are adapted for Cursor. Unconditional source-body instructions would advertise an unavailable OpenCode tool outside the Phase 2 scope, so the instruction is applied only to OpenCode installation output.

### Blocking Decisions

- None.
