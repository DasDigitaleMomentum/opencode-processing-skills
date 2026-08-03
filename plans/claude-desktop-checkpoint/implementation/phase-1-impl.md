---
type: planning
entity: implementation-plan
plan: "claude-desktop-checkpoint"
phase: 1
status: completed
created: "2026-08-03"
updated: "2026-08-03"
---

# Implementation Plan: Phase 1 - Desktop Adapter and Automated Proof

> Implements [Phase 1](../phases/phase-1.md) of [Claude Desktop Checkpoint](../plan.md)

## Approach

Add one dependency-free Claude Desktop stdio MCP adapter that accepts explicit workspace and conversation identity, validates both before delegating persistence and path encoding to the unchanged shared checkpoint core, and keeps all unavailable Desktop metadata honestly null. Extend the existing installer directly with an independent global-only Desktop target and a small Node configuration helper that plans and performs the exact additive `mcpServers.agent-checkpoint` update without coupling Desktop to Claude Code. Develop new production behavior test-first: add focused protocol, persistence, configuration, installer-isolation, and documentation tests; observe the expected RED failures before creating each production surface; then implement only enough behavior to make those tests GREEN. Phase 1 stops at source and disposable-home proof and does not mutate or exercise the real Claude Desktop installation.

## Affected Modules

| Module | Change Type | Description |
|--------|-------------|-------------|
| [Claude Desktop Checkpoint Integration](../../../docs/superpowers/specs/2026-08-03-claude-desktop-checkpoint-design.md) | create | Add the Desktop-only runtime, serialized stdio server, configuration helper, focused README, and test suite under `claude-desktop/`. |
| [Installation and Configuration](../../../docs/modules/installation-and-configuration.md) | modify | Add independent Desktop target resolution, fail-closed preflight/install/registration, restart guidance, and example configuration without changing Claude Code behavior. |

## Required Context

| File | Why |
|------|-----|
| `plans/claude-desktop-checkpoint/plan.md` | Supplies global scope, constraints, target outcome, and the single-final-commit boundary; it does not authorize commits during this phase implementation. |
| `plans/claude-desktop-checkpoint/phases/phase-1.md` | Authoritative Phase 1 objective, deliverables, exclusions, and acceptance criteria. |
| `docs/superpowers/specs/2026-08-03-claude-desktop-checkpoint-design.md` | Authoritative Desktop architecture, tool inputs, configuration semantics, null metadata, and automated/live verification boundary. |
| `docs/overview.md` | Locates the distribution and checkpoint planes and their current supported-adapter boundary. |
| `docs/modules/checkpoint-core.md` | Summarizes the shared core contract and reader/writer invariants that the adapter must preserve. |
| `docs/modules/installation-and-configuration.md` | Inventories current target resolution, preflight ordering, symlink handling, project mode, and installer summary behavior. |
| `docs/agent-checkpoint-heartbeat.md` | Defines the current eight-field checkpoint, lifecycle ordering, path encoding, strict close behavior, and honest-null adapter precedent. |
| `packages/checkpoint-core/src/index.js` | Provides the unchanged `checkpoint(options)` and `checkpointPath(sessionId)` APIs and their exact append/path behavior. |
| `codex/checkpoint-mcp-runtime.mjs` | Provides the closest dependency-free MCP result/error and JSON-RPC dispatch pattern while retaining a different, hook-injected identity boundary. |
| `codex/checkpoint-mcp-server.mjs` | Provides the existing serialized stdin queue and stdout/stderr separation pattern. |
| `codex/test/checkpoint-codex.test.mjs` | Provides real-core protocol, stdio flushing, temporary-home installer, isolation, project-mode, and symlink-test patterns. |
| `install.sh` | Contains the current target precedence, pre-mutation reader preflight, adapter installers, global/project branching, and summary ordering to extend directly. |
| `config.yaml.example` | Defines the public target schema and documented `OPS_*` override surface. |
| `docs/superpowers/plans/2026-08-03-claude-desktop-checkpoint.md` | Non-authoritative technical navigation only; its intermediate commits, extra documentation, live work, and independent scope choices do not authorize Phase 1 work. |

## Implementation Steps

### Step 1: Establish focused RED coverage

- **What**: Create `claude-desktop/test/checkpoint-claude-desktop.test.mjs` and first encode the Phase 1 public contract against the real shared core and disposable workspaces/homes. Cover initialization instructions; exactly `checkpoint` and `checkpoint_path` with required/optional schema types; serialized stdio round trips and parse/unknown-method handling; strict validation of existing absolute directories, non-empty strings, and booleans; no-write invalid/path calls; successful result contents; `open` → checkpoint → `closed` persistence with null `context_used`, `agent`, and `session_title`; filesystem-error reporting; additive/idempotent/atomic config behavior; malformed, non-object, conflict, symlink, missing-Node, disabled-target, and project-mode failures/skips; Claude Code byte isolation; and the focused README/config-example requirements. Use temporary paths only, assert byte preservation on every fail-closed case, and observe the expected focused-suite RED result before adding each missing production surface.
- **Where**: `claude-desktop/test/checkpoint-claude-desktop.test.mjs`
- **Authorized By**: Phase 1 Deliverables “Focused automated test suite”; all Phase 1 Acceptance Criteria; Plan Testing Strategy.
- **Why**: Every new production surface needs executable proof before implementation, and the phase explicitly requires both focused negative-path coverage and complete regression proof without touching real Desktop state.
- **Considerations**: Reuse `node:test`, real `packages/checkpoint-core/src/index.js`, `spawnSync`, and temporary-home patterns already used by the Codex tests; direct protocol calls remain automated evidence only and must not be represented as the Phase 2 model E2E.

### Step 2: Implement the Desktop MCP runtime and serialized server

- **What**: Create `checkpoint-mcp-runtime.mjs` with Desktop-specific initialization instructions, strict public tool schemas, and `createMcpRuntime({ checkpointCore, serverName?, serverVersion? })`. Validate `workspace_root` as a non-empty absolute path whose current `stat` is a directory; validate `session_id`, `done`, and `next` as non-empty strings and optional `step_failed`/`close_session` as actual booleans before any core call. For `checkpoint`, call the shared core with the explicit workspace/session, false defaults, `contextUsed`, `agent`, and `sessionTitle` set to `null`, and return an MCP result containing the session ID, `checkpointPath(sessionId)`, and core feedback. For `checkpoint_path`, validate the same workspace/session boundary, return the encoded workspace-relative path, and perform no write. Convert validation, filesystem, unknown-tool, and core failures into MCP errors without false success. Create `checkpoint-mcp-server.mjs` by reusing the Codex server's single promise queue so newline-delimited requests are serialized, only JSON-RPC reaches stdout, diagnostics reach stderr, and stdin close waits for pending I/O.
- **Where**: `claude-desktop/agent-checkpoint/checkpoint-mcp-runtime.mjs`; `claude-desktop/agent-checkpoint/checkpoint-mcp-server.mjs`
- **Authorized By**: Plan Functional Requirements 1–4 and Non-Functional Requirement 1; Phase 1 Deliverable “Desktop MCP runtime and stdio server”; Phase 1 Acceptance Criteria 1–6; approved design sections Architecture and Data Flow.
- **Why**: Claude Desktop lacks trusted hook-injected identity, so a separate adapter must require explicit identity/workspace inputs while reusing the existing persistence contract and proven serialized stdio pattern.
- **Considerations**: Do not alter the Codex/Claude Code runtimes or shared core, invent identity, enforce the advisory three-word rule in code, persist derived feedback, or log diagnostics to stdout.

### Step 3: Implement fail-closed Desktop configuration planning and writes

- **What**: Create `configure-desktop.mjs` with an exported pure `planDesktopConfig(current, desired)` and CLI modes `--check` and `--write` for `<config-path> <node-bin> <server-path>`. Treat a missing config as an empty object; reject arrays/null/non-object roots and non-object `mcpServers`; preserve all unrelated top-level keys and MCP entries; create an absent `mcpServers`; return `unchanged` only for an exactly equivalent existing `{ command: nodeBin, args: [serverPath] }`; and reject any conflicting `agent-checkpoint` value. Refuse symlinked config paths. In write mode, serialize the planned object to a sibling process-specific temporary file, parse and revalidate the staged bytes, preserve an existing file's mode, and atomically rename it; clean up only that helper-owned temporary file on failure. Print only `changed` or `unchanged` to stdout, and keep `--check` read-only and identical registration byte-stable.
- **Where**: `claude-desktop/agent-checkpoint/configure-desktop.mjs`
- **Authorized By**: Plan Functional Requirements 6–7 and Non-Functional Requirement 2; Phase 1 Deliverable “Additive/atomic Desktop configuration helper”; Phase 1 Acceptance Criteria 7–8; approved design section Installation and Configuration.
- **Why**: The existing Bash installer has no safe semantic JSON merge primitive, while Desktop registration must preserve unrelated user configuration, detect conflicts before mutation, and replace only through validated same-directory staging.
- **Considerations**: This is a narrow adapter-local helper, not a shared config framework; it must not normalize an unchanged file, follow links, delete user files, or mutate Claude Code configuration.

### Step 4: Add the independent global Desktop installer target

- **What**: Extend target resolution with YAML `targets.claude_desktop`, `OPS_CLAUDE_DESKTOP_HOME`, and `OPS_SYNC_CLAUDE_DESKTOP`, defaulting the home to `$HOME/Library/Application Support/Claude` and auto-enabling only when that directory exists. Keep its enablement independent from `targets.claude`. Before the installer's existing first mutation, preflight every Desktop adapter path component plus `claude_desktop_config.json` for symlinks, resolve an absolute Node executable, and run the source configuration helper in `--check` mode against the exact installed command/server paths. In global mode only, install the unchanged core plus runtime, server, and helper under `$CLAUDE_DESKTOP_HOME/agent-checkpoint/`, preserve executable modes where needed, then register exactly `mcpServers.agent-checkpoint` through helper `--write`. Add summary output with the adapter/config locations, full-quit/restart requirement, and `$HOME/Library/Logs/Claude/mcp-server-agent-checkpoint.log`. Extend the example target and override documentation. Keep disabled and project modes write-free for Desktop and preserve Claude Code homes/configuration byte-for-byte in isolated tests.
- **Where**: `install.sh`; `config.yaml.example`
- **Authorized By**: Plan Functional Requirements 5–8; Phase 1 Scope and Deliverables for the independent Desktop target/config example; Phase 1 Acceptance Criteria 7–9; approved design section Installation and Configuration.
- **Why**: Desktop needs additive global registration at its macOS application-support path, and existing installer ordering already provides the correct place for a validation-only preflight before any target mutation.
- **Considerations**: Do not terminate/restart Claude Desktop, touch the real Desktop home during tests, couple Desktop to Claude Code detection, run Desktop installation in project mode, or continue after malformed/conflicting/symlink/missing-Node preflight failures.

### Step 5: Document only the Phase 1 adapter surface

- **What**: Create the focused adapter README with the two exact tool signatures; explicit absolute `workspace_root` and conversation-stable `session_id`; null Desktop telemetry/metadata; installed adapter, config, and MCP log paths; the full-quit/restart requirement; conflict/symlink diagnostics; removal of only `mcpServers.agent-checkpoint` plus the adapter directory; and the boundary that Claude Desktop is MCP-only and does not use Claude Code hooks. State that direct MCP tests are automated proof and that the real model E2E remains Phase 2.
- **Where**: `claude-desktop/agent-checkpoint/README.md`
- **Authorized By**: Phase 1 Includes and Deliverables for the focused README/configuration example; Phase 1 Excludes for the installation guide and checkpoint harness matrix; approved design Scope and Installation and Configuration sections.
- **Why**: Phase 1 must make the new source target operable, diagnosable, and removable without pulling the explicitly deferred repository-wide installation guide or harness matrix into this phase.
- **Considerations**: Do not update `docs/installation.md`, `docs/agent-checkpoint-heartbeat.md`, root `README.md`, `CHANGELOG.md`, design status, or any live-evidence artifact in Phase 1.

## Testing Plan

**Primary Verify Command**: `bash -c 'set -euo pipefail; node --test packages/checkpoint-core/test/*.test.js opencode/test/*.test.mjs codex/test/*.test.mjs claude/test/*.test.mjs claude-desktop/test/*.test.mjs; python3 -m unittest discover -s hermes/test; bash -n install.sh; stage="$(mktemp -d "${TMPDIR:-/tmp}/checkpoint-watch-verify.XXXXXX")"; trap '\''rm -rf "$stage"'\'' EXIT; mkdir -p "$stage/bin" "$stage/src" "$stage/workspace/.agent-checkpoints" "$stage/native-live"; cp packages/checkpoint-core/bin/checkpoint-watch.js "$stage/bin/checkpoint-watch.js"; cp packages/checkpoint-core/src/index.js "$stage/src/index.js"; scriptc coverage "$stage/bin/checkpoint-watch.js" >"$stage/coverage.txt" 2>&1; ! grep -q "SC2002" "$stage/coverage.txt"; ! grep -Eq "Number of unknown values.*SC2020|SC2020.*Number of unknown values" "$stage/coverage.txt"; scriptc build "$stage/bin/checkpoint-watch.js" -o "$stage/checkpoint-watch" --no-keep-c; test -x "$stage/checkpoint-watch"; "$stage/checkpoint-watch" --help >"$stage/help.txt"; grep -q "Usage: checkpoint-watch" "$stage/help.txt"; (cd "$stage/workspace" && ../checkpoint-watch --once >"$stage/once.txt"); grep -q "Checkpoint sessions" "$stage/once.txt"; python3 packages/checkpoint-core/test/native-checkpoint-watch-smoke.py "$stage/checkpoint-watch" "$stage/native-live"; git diff --check'`
