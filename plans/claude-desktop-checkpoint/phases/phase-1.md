---
type: planning
entity: phase
plan: "claude-desktop-checkpoint"
phase: 1
status: completed
created: "2026-08-03"
updated: "2026-08-03"
---

# Phase 1: Desktop Adapter and Automated Proof

> Part of [Claude Desktop Checkpoint](../plan.md)

## Objective

Produce a stable, source-only Claude Desktop adapter and global-installer integration whose public behavior, failure boundaries, isolation, and compatibility are proven by the complete automated gate before any real Desktop configuration is changed.

## Scope

### Includes

- The dependency-free Desktop MCP runtime and serialized stdio server.
- Strict public input validation and shared-core lifecycle/path delegation with honest-null metadata.
- A fail-closed configuration helper and independent global Desktop target in `install.sh` and `config.yaml.example`.
- The configuration example and focused adapter README needed to operate, diagnose, and remove the target.
- Focused protocol/configuration/installer tests and all existing automated regression gates.

### Excludes

- Mutation of the real Claude Desktop installation or configuration.
- Claude Desktop app restart, connectors-UI inspection, and real model/tool execution.
- Broader changes to existing adapters, watcher behavior, or the shared contract.
- The existing installation guide and checkpoint harness matrix, which are updated after implementation review in Phase 2 as the requested final documentation workflow.

## Prerequisites

- [x] The approved design remains the authoritative architecture and scope source.
- [x] The current shared checkpoint core and installer behavior have been inspected before implementation planning.
- [x] The Phase 1 implementation plan has passed a fresh independent review with no findings before execution begins.

## Deliverables

- [x] Desktop MCP runtime and stdio server under `claude-desktop/agent-checkpoint/`.
- [x] Additive/atomic Desktop configuration helper and independent installer integration.
- [x] Focused Claude Desktop adapter README.
- [x] Updated `config.yaml.example` with the independent Desktop target and its environment overrides.
- [x] Focused automated test suite covering protocol, validation, lifecycle, config, installer isolation, and negative paths.
- [x] Passing complete automated repository regression gate.

## Acceptance Criteria

- [x] MCP initialization includes the approved identity/workspace instructions and lists exactly the two scoped tools with strict schemas.
- [x] Invalid workspace, string, boolean, method, or tool inputs produce MCP errors without checkpoint writes or false success.
- [x] A successful `checkpoint` response returns the session ID, workspace-relative path, and checkpoint result; a valid `checkpoint_path` returns the workspace-relative encoded path without writing.
- [x] Filesystem write failures return MCP tool errors and never report success.
- [x] A valid final checkpoint produces `open`, checkpoint, and `closed` records through the real shared core with all Desktop metadata fields null.
- [x] Stdio requests are serialized, stdout remains JSON-RPC-only, and diagnostics remain on stderr.
- [x] Configuration creation/merge is additive, identical registration is byte-stable/idempotent, and writes are validated through a sibling temporary file plus atomic rename.
- [x] Malformed/non-object JSON, a conflicting key, symlinked targets, missing Node, disabled target, and project mode fail or skip exactly as specified without partial installation.
- [x] Existing Claude Code configuration and files remain unchanged by the Desktop target.
- [x] Focused and complete automated gates pass with no required skips.
- [x] A fresh independent implementation review of the complete Phase 1 source state has no findings before Phase 2 installation begins.

## Dependencies on Other Phases

| Phase | Relationship | Notes |
|-------|-------------|-------|
| Phase 2 | blocks | The real installation and model E2E may use only the reviewed and automatically verified Phase 1 source. |

## Notes

- Implementation must preserve the existing shared-core and installer patterns unless the verified implementation plan demonstrates a direct adapter-specific necessity.
