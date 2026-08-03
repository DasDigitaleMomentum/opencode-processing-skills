---
type: planning
entity: plan
plan: "claude-desktop-checkpoint"
status: completed
created: "2026-08-03"
updated: "2026-08-03"
---

# Plan: Claude Desktop Checkpoint

## Problem / Context

The repository provides native checkpoint integrations for other supported agent environments, but Claude Desktop has no real adapter. Claude Desktop cannot use Claude Code hooks or injected project/session identity, so a model call currently cannot write a valid shared-contract checkpoint to an explicitly selected workspace. The approved architecture is defined in [`docs/superpowers/specs/2026-08-03-claude-desktop-checkpoint-design.md`](../../docs/superpowers/specs/2026-08-03-claude-desktop-checkpoint-design.md).

## Target Outcome

Claude Desktop 1.24012.9 (`03c61d`) can load a dependency-free local stdio MCP server, invoke `checkpoint` and `checkpoint_path` with explicit workspace and conversation identity, and persist a valid closed checkpoint lifecycle that the existing inspector and watcher can read. Global installation registers the adapter additively and atomically without changing unrelated Claude Desktop or Claude Code configuration.

## Guiding Decisions & Constraints

- Implement a separate MCP-only Claude Desktop adapter; do not weaken the Claude Code identity boundary.
- Require an existing absolute `workspace_root` and a non-empty conversation-stable `session_id`; never invent either value.
- Reuse the installed shared checkpoint core and preserve the existing eight-field JSONL contract and open/checkpoint/optional-close lifecycle.
- Persist `context_used`, `agent`, and `session_title` as honest `null` values because Desktop exposes no defensible source for them.
- Update Desktop configuration fail-closed, additively, and atomically; preserve unrelated top-level values and MCP servers semantically.
- Do not follow or replace symlinked adapter destinations or configuration files.
- Keep the existing watcher and inspector behavior unchanged except for regression fixes strictly required by this adapter.
- Use exactly one final repository commit on the current branch after all planning, review, implementation, live, documentation, and verification gates pass.
- Do not create a new branch or pull request, and do not use agent, tool, or workflow prefixes for branch, commit, task, or artifact names.

### Scope-Bounding Assumptions

- The real live gate targets the installed macOS Claude Desktop app version/build named by the approved specification; a changed installed version is a blocking Reality Check rather than permission to weaken the gate.
- A normal Claude Desktop tool-permission click is the only permitted manual E2E boundary.

## Requirements

### Functional

- [x] Provide a dependency-free stdio MCP server under `claude-desktop/agent-checkpoint/` with `checkpoint` and `checkpoint_path`.
- [x] Advertise Desktop-specific instructions for one stable session ID per conversation and explicit absolute workspace selection.
- [x] Strictly validate required strings, booleans, and an existing absolute directory before any checkpoint write.
- [x] Delegate valid writes and path encoding to the shared checkpoint core with honest-null Desktop metadata.
- [x] Install the adapter under `~/Library/Application Support/Claude/agent-checkpoint/` in global mode.
- [x] Add exactly `mcpServers.agent-checkpoint` with absolute command/server paths while preserving unrelated configuration.
- [x] Make identical registration idempotent and fail closed on malformed/non-object JSON, conflicts, symlinks, missing Node, and project mode.
- [x] Report the required full Desktop restart without terminating the app from the installer.
- [x] Prove a real Desktop model invokes the tool for a disposable workspace and closes the session.
- [x] Prove the resulting JSONL through both direct inspection and the unchanged watcher.
- [x] Update the installation guide, checkpoint harness matrix, configuration example, and focused Claude Desktop README required by the approved design.

### Non-Functional

- [x] Emit JSON-RPC only on stdout and diagnostics only on stderr so stdio framing cannot be corrupted.
- [x] Preserve shared contract and existing adapter behavior through the complete repository regression gates.
- [x] Do not commit real user configuration, logs, credentials, disposable workspaces, or generated checkpoint JSONL.

## Scope

### In Scope

- Desktop runtime, stdio server, configuration helper, focused README, tests, installer integration, and configuration example.
- Additive global installation and registration for Claude Desktop independently from Claude Code.
- Automated protocol, validation, lifecycle, configuration, isolation, negative-path, and full regression proof.
- Real Claude Desktop restart, MCP connection check, actual model tool call, persisted closed lifecycle, and watcher display.
- The approved documentation set: installation guide, checkpoint harness matrix, configuration example, and focused Claude Desktop README.

### Out of Scope

- DXT/MCPB packaging, extension publication, daemons, remote MCP, OAuth, or marketplace distribution.
- Conversation discovery, transcript parsing, undocumented Claude internals, or fabricated telemetry.
- Feature changes to OpenCode, Codex, Claude Code, Hermes, the watcher, inspector, or shared JSONL contract beyond adapter-required regression fixes.
- Mocked UI, direct MCP calls, Claude Code calls, or synthetic JSONL as substitutes for the real Desktop-model E2E.

## Definition of Done

- [x] Both phase acceptance sets are satisfied with authoritative automated and live evidence.
- [x] Plan, implementation-plan, and implementation reviews have no remaining findings; every accepted finding has been remediated and independently re-reviewed.
- [x] A real Claude Desktop model call writes exactly one requested final checkpoint between `open` and `closed` lifecycle records in a disposable workspace.
- [x] The persisted record uses the requested three-word chain values, `step_failed=false`, and null Desktop metadata; inspector and watcher both report it correctly.
- [x] Real installed adapter bytes match the reviewed source and the Desktop MCP log has no relevant startup/protocol/tool error.
- [x] The installation guide, checkpoint harness matrix, configuration example, and focused Claude Desktop README accurately describe the new target and their cross-references resolve.
- [x] The complete Node, Hermes, installer/shell, native watcher, documentation, and whitespace gates pass from the final source state.
- [x] All repository changes from this workflow are contained in exactly one new commit on `feature/agent-checkpoint-heartbeat`, with no temporary/live artifacts committed; the commit is pushed to the same remote branch without creating a new branch or pull request.

## Testing Strategy

- [x] Use `node:test` focused tests for MCP initialization, schemas, protocol round trips, strict validation, lifecycle writes, path lookup, honest-null metadata, configuration merge/atomicity, and isolated installer behavior.
- [x] Exercise malformed JSON, non-object roots, conflicting keys, symlinks, missing Node, disabled target, and project-mode negative paths with byte-preservation assertions.
- [x] Run all existing Node adapter/core suites, Hermes unittest discovery, `bash -n install.sh`, the `scriptc` native watcher build/smoke gate, focused checks for the four approved documentation artifacts, and `git diff --check`.
- [x] Run a real Claude Desktop UI/model/tool flow after global installation and full restart; inspect the resulting log and render it through the native watcher.

## Phases

| Phase | Title | Contribution | Why Separate | Detail | Status |
|-------|-------|--------------|--------------|--------|--------|
| 1 | Desktop Adapter and Automated Proof | Adds the MCP runtime, safe configuration/installer path, focused docs, and complete automated regression coverage. | Produces a stable source-only result before mutating the real Desktop installation. | [Phase](phases/phase-1.md) | completed |
| 2 | Real Desktop Installation and Model E2E | Installs the reviewed source, proves an actual Desktop model checkpoint, validates watcher visibility, and closes delivery evidence. | Requires external app state, a restart, and a possible user permission click after automated correctness is established. | [Phase](phases/phase-2.md) | completed |

## Risks & Open Questions

| Risk/Question | Impact | Mitigation/Answer |
|---------------|--------|-------------------|
| Installed Claude Desktop version/build differs from 1.24012.9 (`03c61d`). | The specified live target cannot be claimed as verified. | Read the installed bundle version/build before mutation and stop for a user decision if it differs. |
| Existing Desktop config is malformed, conflicting, or symlinked. | Additive registration cannot proceed safely. | Fail before copying or mutating anything and report the exact manual-resolution boundary. |
| Desktop requests a normal tool permission. | The live model call pauses. | Ask only for the explicit UI approval allowed by the specification, then continue and verify persisted evidence. |

## Changelog

### 2026-08-03

- Plan created from the approved Claude Desktop checkpoint design with two stable execution boundaries and a single-final-commit constraint.
- Plan review F-1 accepted: reduced documentation to the four approved artifacts and assigned their delivery explicitly across the two phases.
- Plan review F-2 rejected: the user explicitly requires independent re-review until no findings remain.
- Plan review F-3 accepted: added explicit success-response and filesystem-error acceptance coverage.
- Plan re-review F-1 accepted: placed zero-finding implementation-plan and implementation-review gates at both phase execution boundaries.
- Plan re-review F-2 accepted: explicitly prohibited creating a new pull request.
- Both implementation plans authored and independently reviewed to no findings; Phase 1 execution started.
- Phase 1 completed after TDD execution, F-1 remediation, full regression verification, and fresh Accepted review with no findings; Phase 2 started.
- Phase 2 completed the real Desktop install/model E2E, incremental documentation update, complete final gate, and fresh Accepted implementation review with no findings.
