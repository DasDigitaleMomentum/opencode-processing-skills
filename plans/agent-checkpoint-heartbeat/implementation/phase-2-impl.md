---
type: planning
entity: implementation-plan
plan: "agent-checkpoint-heartbeat"
phase: 2
status: draft
created: "2026-07-26"
updated: "2026-07-26"
---

# Implementation Plan: Phase 2 - OpenCode Pilot

> Implements [Phase 2](../phases/phase-2.md) of [agent-checkpoint-heartbeat](../plan.md)

## Approach

Add a small OpenCode-specific adapter under `opencode/` that composes the Phase 1 `packages/checkpoint-core/` API with OpenCode's native plugin `tool` helper. Install one auto-loaded TypeScript shim at the documented global or project-local `plugins/` location and place the adapter/core support modules in a non-scanned subdirectory of the same OpenCode home. This preserves one shared persistence contract without adding MCP, publishing an npm package, editing OpenCode JSON/JSONC, or duplicating checkpoint behavior.

The tools will use `ToolContext.sessionID` as the native identity and `ToolContext.worktree` as the project root, so every session writes beneath the active worktree's `.agent-checkpoints/` rather than beneath the config/plugin directory or process working directory. Current OpenCode custom-tool context does not expose current context occupancy, token counts, model identity, or remaining tokens while a tool executes. The pilot will therefore persist `context_used: null` and return explicit unknown context/remaining values rather than treating stale completed-message accounting as current telemetry. The adapter boundary will keep telemetry replaceable if a defensible current-session value becomes available later.

OpenCode-only checkpoint instructions will be maintained as one fragment and appended by the installer to copied OpenCode persona files, including generated delegate/implementer aliases. Canonical `agents/*.md` bodies will not receive an unconditional OpenCode tool instruction because the same sources are also installed into Claude and adapted for Cursor before those harness adapters exist.

## Affected Modules

| Module | Change Type | Description |
|--------|-------------|-------------|
| OpenCode Checkpoint Adapter (`opencode/`) | create | Add the native plugin shim, testable tool factory, and OpenCode-only persona instruction fragment. |
| Checkpoint Core (`packages/checkpoint-core/`) | use | Consume the stable Phase 1 path, validation, append, and checkpoint behavior without changing its raw contract. |
| [Agent Personas](../../../docs/modules/agent-personas.md) | modify at installation boundary | Apply one checkpoint instruction to OpenCode-installed canonical personas and generated aliases without changing cross-harness source behavior. |
| [Installation and Configuration](../../../docs/modules/installation-and-configuration.md) | modify | Install plugin/runtime assets for global and `--project` OpenCode targets while preserving existing skill, agent, target, and symlink behavior. |
| OpenCode user documentation | modify | Document installed files, restart requirements, tool behavior, project-root logs, and honest telemetry limits. |

## Required Context

| File | Why |
|------|-----|
| `plans/agent-checkpoint-heartbeat/plan.md` | Defines the stable six-field contract, OpenCode-first rollout, root-local storage, and honest telemetry constraint. |
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
| `https://opencode.ai/docs/plugins/` | Official locations, auto-loading, TypeScript support, restart/load behavior, and native custom-tool example. |
| `https://github.com/anomalyco/opencode/blob/dev/packages/plugin/src/tool.ts` | Current primary `ToolContext` and `tool()` API, including `sessionID`, `directory`, and `worktree`. |
| `https://github.com/anomalyco/opencode/blob/dev/packages/plugin/src/index.ts` | Current `Plugin`, `PluginInput`, hooks, and SDK-client types. |
| `https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/config/plugin.ts` | Confirms only direct `{plugin,plugins}/*.{ts,js}` files are auto-discovered, allowing support modules to remain outside the scanned directory. |
| `https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/session/overflow.ts` | Shows OpenCode's internal completed-message overflow accounting and why it is not a current custom-tool occupancy API. |

## Implementation Steps

### Step 1: Create the OpenCode adapter and loadable shim

- **What**: Add `opencode/checkpoint-runtime.mjs` as a dependency-injected factory that accepts OpenCode's `tool` helper and the Phase 1 core exports, plus `opencode/checkpoint-plugin.ts` as the minimal installed composition module. The shim will import `tool` from `@opencode-ai/plugin`, import the installed core/runtime support modules, and export exactly one plugin function that returns `tool.checkpoint` and `tool.checkpoint_path`. Keep support modules outside the direct `plugins/*.{ts,js}` scan so OpenCode does not mistake their utility exports for plugin entry points.
- **Where**: `opencode/checkpoint-runtime.mjs`; `opencode/checkpoint-plugin.ts`
- **Authorized By**: Phase 2 Scope → Includes “OpenCode custom tools/plugin”; Phase 2 Notes favoring an OpenCode-native wrapper; Plan Scope-Bounding Assumption permitting harness-native wrappers; Phase 1 approach selecting a reusable JavaScript core plus authoritative fixtures.
- **Why**: A tiny native shim uses OpenCode's supported extension point while the injected factory remains directly testable without adding an OpenCode SDK dependency or build step to this repository.
- **Considerations**: The plugin module must not export raw core functions because OpenCode treats exported functions as plugin entry points. Do not add an MCP server, daemon, bundle step, root package manager, or OpenCode config mutation.

### Step 2: Bind native identity, project root, tool arguments, and honest telemetry

- **What**: Define `checkpoint` with `done` and `next` string schemas and an optional/default-false `step_failed` boolean. Its executor will pass `context.sessionID`, `context.worktree`, labels, failure state, and `contextUsed: null` into the Phase 1 core, then return a compact result stating that the checkpoint was saved and both context percentage and remaining K-tokens are unknown. Define `checkpoint_path` with a required `session_id` string and return only the Phase 1 workspace-root-relative path; OpenCode callers and Phase 3 inspection resolve it against the same `context.worktree`. Tool descriptions will instruct exactly-three-word labels, verbatim next-to-done reuse, and failed-step reporting without enforcing those Canary rules in schemas.
- **Where**: `opencode/checkpoint-runtime.mjs` (`createOpenCodeCheckpointPlugin`, `checkpoint`, `checkpoint_path`, telemetry fallback)
- **Authorized By**: Plan Guiding Decisions for tool signatures, six raw fields, non-blocking labels, chain reuse, failed steps, and project-root files; Phase 2 Scope → Includes native session identity and best available telemetry; Acceptance Criteria for authorized writes, path lookup, failed steps, and honest unknown telemetry; current `ToolContext` invariant exposing `sessionID` and `worktree` but no current token occupancy.
- **Why**: The tool context provides authoritative session/worktree values, while returning unknown is more accurate than fabricating a current percentage from completed-message or compaction data.
- **Considerations**: Do not use `process.cwd()`, plugin-config paths, `context.directory`, historical message sums, or model-limit guesses as the workspace root/current occupancy. Keep a small injectable telemetry function boundary, but do not add event caches or SDK queries in this pilot unless execution-time API revalidation reveals a documented current value.

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

- **What**: Update the concept's OpenCode harness/current-decision sections and `docs/installation.md` with the global/project plugin locations, installed support directory, automatic local-plugin loading, required OpenCode restart, available tool names, root-worktree log location, and current `null`/unknown telemetry behavior. Update the OpenCode target comments in `config.yaml.example` to state that the existing home also receives the checkpoint plugin; add no new setting. Remove only the now-resolved “first harness” and OpenCode telemetry questions while leaving Phase 3 display decisions deferred.
- **Where**: `docs/agent-checkpoint-heartbeat.md`; `docs/installation.md`; `config.yaml.example`
- **Authorized By**: Phase 2 Acceptance Criterion requiring restart/configuration documentation; Deliverable requiring documented telemetry fallback; Plan Definition of Done requiring user-facing documentation to match implemented behavior; existing `targets.opencode.home` configuration contract.
- **Why**: Users need to know where the auto-loaded plugin is installed and that an unknown response reflects an API limit rather than a failed checkpoint.
- **Considerations**: Do not document aggregate display/inspection as implemented, edit OpenCode runtime JSON/JSONC, or promise exact values unsupported by the current API.

### Step 6: Add adapter integration and isolated installer coverage

- **What**: Add a Node test suite that injects a minimal fake OpenCode `tool` helper and the real Phase 1 core into the adapter factory. Execute both tools with deterministic contexts representing a parent and subagent in a temporary worktree; assert separate native session files, exact six-field lines, failure recording, root placement, relative path lookup, non-blocking labels, and explicit unknown telemetry. In the same suite, run `install.sh` against isolated temporary global and project homes with non-OpenCode targets disabled; assert plugin/support files, canonical parent/subagent instructions, generated-alias instruction coverage, restart guidance, symlink preservation, existing skill/agent output, and shell syntax validity.
- **Where**: `opencode/test/checkpoint-plugin.test.mjs`; existing `packages/checkpoint-core/test/checkpoint-core.test.js`; temporary homes/worktrees created by the test
- **Authorized By**: Phase 2 Scope → Includes temporary-workspace integration and installer smoke tests; Phase 2 Acceptance Criteria for separate parent/subagent logs, tools, failed steps, and backward-compatible installation; Plan Testing Strategy requiring harness integration and isolated installer smoke tests while preserving `bash -n install.sh`.
- **Why**: Exercising the tool executors and real installer mappings verifies changed behavior without touching the developer's actual OpenCode home or repository runtime directory.
- **Considerations**: The smoke test must set `HOME`, `OPS_OPENCODE_HOME`, all non-OpenCode `OPS_SYNC_*` values, and any detection path to temporary/disabled values. It must not require a running OpenCode process or network access; loader compatibility is covered by matching the verified native API and installed file layout.

## Testing Plan

Verify command: `node --test packages/checkpoint-core/test/checkpoint-core.test.js opencode/test/checkpoint-plugin.test.mjs`

| Test Type | What to Test | Expected Outcome |
|-----------|-------------|-----------------|
| Native tool integration | Parent/subagent contexts, `sessionID`, `worktree`, both tool schemas/executors, failed step, labels, path, and unknown telemetry | Each session gets its own valid root-local JSONL; output/path match the contract and no Canary rule blocks writing. |
| Global installer smoke | Temporary `OPS_OPENCODE_HOME`, plugin/support copies, all persona classes/aliases, symlinks, and unaffected skill/agent installation | OpenCode receives loadable assets/instructions while existing outputs and protected symlinks remain intact. |
| Project installer smoke | Temporary workspace with `--project` | Assets land only under that workspace's `.opencode/`; checkpoint execution still targets the workspace root, not `.opencode/`. |
| Regression | Phase 1 contract tests and installer shell parsing invoked by the adapter suite | The shared schema/path/append contract remains unchanged and `install.sh` is syntactically valid. |

### Test Integrity Constraints

- Phase 1 core tests and fixtures must remain enabled and unchanged unless a gated Phase 1 contract defect is separately approved; the adapter must conform to them rather than weakening them.
- Existing installer assertions represented by global/project skill and agent output, model/variant generation, and symlink preservation must remain covered; checkpoint tests may not replace those compatibility checks with file-existence-only assertions.
- All homes, worktrees, config files, detection paths, and checkpoint logs must be created under OS temporary directories. Tests must not read or modify the user's real `~/.config/opencode`, repository `.opencode/`, or repository `.agent-checkpoints/`.
- Unknown telemetry assertions must require `context_used: null` and explicit unknown response text; tests must not inject fabricated percentages merely to satisfy the happy path.
- No tests may be skipped, focused with `.only`, deleted, or have exact raw-field/session/root-placement assertions weakened to make the adapter pass.

## Rollback Strategy

Remove the tracked `opencode/` adapter assets and tests, revert the OpenCode-specific installer functions/calls and documentation/config comments, then rerun the prior installer to refresh ordinary agent files. Installed checkpoint plugin/support files may be removed from the configured or project-local OpenCode home; no JSONL migration is needed because runtime logs are raw local state and the shared Phase 1 package remains valid.

## Open Decisions

| Decision | Options | Chosen | Rationale |
|----------|---------|--------|-----------|
| Plugin transport | Native local plugin; npm publication; MCP server | Native local plugin | Phase 2 explicitly favors OpenCode-native context and the official loader supports global/project TypeScript files. |
| Current telemetry source | Sum/query historical messages; event cache and inferred model limits; honest unknown | `context_used: null` and unknown remaining K-tokens | `ToolContext` has no current occupancy/model fields, and completed/synthetic message tokens do not defensibly represent occupancy during the active tool call. |
| Persona instruction placement | Modify all canonical cross-harness bodies; duplicate seven OpenCode agents; installer-injected shared fragment | Installer-injected shared fragment | It reaches canonical and generated OpenCode personas without activating an unavailable tool in Claude/Cursor installations. |
| Installed code composition | Duplicate core in plugin; publish local packages; thin shim plus non-scanned support modules | Thin shim plus support modules | It reuses Phase 1 behavior, avoids package publication/building, and respects OpenCode's direct plugin scan. |

## Reality Check

### Code Anchors Used

| File | Symbol/Area | Why it matters |
|------|-------------|----------------|
| `packages/checkpoint-core/src/index.js` (created by Phase 1) | Planned public core exports | Provides the only authorized record/path/append behavior for the native wrapper. |
| `install.sh` | `OPENCODE_HOME`, `SKILLS_DESTS`, `AGENTS_DESTS`, project-mode override, Steps 1–4 | Shows OpenCode is always enabled, project mode changes its root, aliases are generated after canonical copies, and no plugin step exists today. |
| `agents/*.md` | Two primary and five subagent persona files | Establishes the complete canonical instruction audience and the multi-target source-sharing constraint. |
| `config.yaml.example` | `targets.opencode.home` | Supplies the global plugin home without requiring a new configuration key. |
| OpenCode `packages/plugin/src/tool.ts` | `ToolContext`; `tool()` | Verifies native `sessionID`, `directory`, `worktree`, schema, execute, and result interfaces; no current token telemetry is present. |
| OpenCode `packages/plugin/src/index.ts` | `PluginInput`; `Hooks.tool` | Verifies the plugin factory receives the SDK client and returns named custom tools. |
| OpenCode `packages/opencode/src/config/plugin.ts` | `ConfigPlugin.load` glob | Verifies auto-discovery is limited to direct `.ts`/`.js` plugin files, so nested/non-plugin support assets are safe. |
| OpenCode `packages/opencode/src/session/overflow.ts` | `usable`; `isOverflow` | Confirms internal overflow uses completed assistant token accounting/model limits and is not exposed as current `ToolContext` occupancy. |

### Mismatches / Notes

- The repository currently has no `opencode/` adapter source, plugin installation step, or automated installer suite; Phase 2 introduces those surfaces while preserving the existing Bash-first installer.
- The locally installed command reports `opencode 0.0.0-dev-202607131615`; current primary `dev` source reports `@opencode-ai/plugin` 1.18.5. The implementation must recheck the installed `tool` shape before execution, but the cited current API and local build both support native plugins/tools.
- Official OpenCode docs auto-load global `~/.config/opencode/plugins/` and project `.opencode/plugins/` files and install `@opencode-ai/plugin` dependencies in the config directory. The repository installer currently creates neither plugin location nor support files.
- The native tool context exposes `sessionID` and `worktree` but no current usage/model limit. SDK message/provider APIs exist, yet during a checkpoint call they expose completed or synthetic accounting rather than a documented exact current prompt occupancy; this plan uses the gated honest-unknown fallback.
- Canonical `agents/*.md` are also copied to Claude and selected bodies are adapted for Cursor. Unconditional source-body instructions would advertise an unavailable OpenCode tool outside the Phase 2 scope, so the instruction is applied only to OpenCode installation output.
- Phase 1 is authored but not yet implemented in the current working tree. Phase 2 execution remains blocked by its normal prerequisite until `packages/checkpoint-core/` and its tests exist and pass; this does not block authoring the sequential implementation-plan batch.

### Blocking Decisions

- None for implementation-plan authoring. Phase 2 execution must wait for successful Phase 1 implementation and contract verification, as already gated by the phase prerequisite.
