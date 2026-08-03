---
type: planning
entity: phase
plan: "claude-desktop-checkpoint"
phase: 2
status: completed
created: "2026-08-03"
updated: "2026-08-03"
---

# Phase 2: Real Desktop Installation and Model E2E

> Part of [Claude Desktop Checkpoint](../plan.md)

## Objective

Install the reviewed adapter into the real Claude Desktop environment, prove that the actual Desktop model invokes it and closes a checkpoint session in a disposable workspace, and collect authoritative persisted/runtime evidence without committing live artifacts.

## Scope

### Includes

- Read-only preflight of the installed Claude Desktop version/build and safe configuration shape.
- Global installation for every currently enabled target using the repository installer.
- Source-to-installed parity and exact Desktop registration readback.
- Full Claude Desktop quit/restart, MCP connection/log inspection, and connector availability confirmation.
- A real model-issued final `checkpoint` call for a disposable workspace and stable live session ID.
- Inspector and watcher validation of lifecycle, payload, null metadata, and `CLOSED` state.
- Final status/evidence update in repository source followed by the complete automated gate.
- Post-review incremental updates to the existing installation guide and checkpoint harness matrix.

### Excludes

- Synthetic or mocked substitutes for the Desktop UI/model/tool path.
- Committing the real Desktop config, logs, disposable workspace, or generated JSONL.
- Unrelated local-agent installation targets that are not currently enabled by repository configuration.
- Manual configuration mutation that bypasses a fail-closed installer result.

## Prerequisites

- [x] Phase 1 implementation and its independent implementation review have no remaining findings.
- [x] The Phase 2 implementation plan has passed a fresh independent review with no findings before live execution begins.
- [x] The complete Phase 1 automated gate passes from the source that will be installed.
- [x] The installed Claude Desktop version/build matches the approved target or the user explicitly gates a revised target.

## Deliverables

- [x] Installed Claude Desktop adapter whose bytes match reviewed repository source.
- [x] Additive persisted `mcpServers.agent-checkpoint` registration with absolute paths.
- [x] Fresh Desktop startup evidence without relevant MCP errors.
- [x] One real model-authored, closed checkpoint lifecycle in a disposable workspace.
- [x] Inspector and unchanged watcher evidence for the real record.
- [x] Updated installation guide and checkpoint harness matrix containing no private/live artifact.

## Acceptance Criteria

- [x] Preflight discloses only safe configuration structure and confirms the specified app version/build before mutation.
- [x] Global installation preserves unrelated Desktop and Claude Code state and installed files match source bytes.
- [x] After a full app restart, the local server connects and both tools are available without relevant startup/protocol errors.
- [x] The real Desktop model successfully invokes `checkpoint` with the literal disposable workspace and stable session ID, `done="Desktop MCP verified"`, `next="Live validation complete"`, `step_failed=false`, and `close_session=true`.
- [x] The resulting selected JSONL contains exactly one checkpoint between `open` and `closed`, reports `CLOSED`, and keeps `context_used`, `agent`, and `session_title` null.
- [x] `checkpoint-inspect` and the native `checkpoint-watch --once` both show the real persisted record correctly.
- [x] After implementation review, the existing installation guide and checkpoint harness matrix document the verified Desktop target, explicit workspace/session inputs, null telemetry, restart/log path, and real-E2E boundary.
- [x] Final source-to-install parity, clean relevant MCP log, complete automated regression gate, documentation validation, and `git diff --check` all pass.
- [x] A fresh independent implementation review of the complete Phase 2 live-evidence and documentation state has no findings before the single final commit and push; no new branch or pull request is created.

## Dependencies on Other Phases

| Phase | Relationship | Notes |
|-------|-------------|-------|
| Phase 1 | blocked-by | Live proof depends on the reviewed source-only adapter and installer. |

## Notes

- A normal Claude Desktop permission dialog is the only allowed manual pause; no other live step may be replaced by user assertion or synthetic evidence.
