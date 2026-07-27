---
type: planning
entity: phase
plan: "checkpoint-harness-integration"
phase: 2
status: completed
created: "2026-07-27"
updated: "2026-07-27"
---

# Phase 2: Codex Integration

> Part of [checkpoint-harness-integration](../plan.md)

## Objective

Make `checkpoint` and `checkpoint_path` callable in Codex sessions on macOS, installed additively through the existing Codex installer target.

## Contribution to Plan Goal

Delivers the first non-OpenCode harness adapter and proves cross-adapter contract parity. On completion it also closes phase 4 of agent-checkpoint-heartbeat.

## Scope

### Includes

- Execute the grounded Codex approach (authoritative How: `implementation/phase-2-impl.md`, derived in Phase 1 from the [old phase-4 impl plan](../../agent-checkpoint-heartbeat/implementation/phase-4-impl.md), which it supersedes): dependency-free stdio MCP runtime/server exposing `checkpoint` and `checkpoint_path`, hook bridge (`SessionStart`/`PreToolUse`) for session identity and workspace injection, honest-null telemetry. Subagent attribution is excluded on the pinned build (see Notes).
- Installer: extend the Codex target to copy the adapter and generate the additive profile file activated via `codex --profile-v2 agent-checkpoint` (pinned build 0.131.0 moved profile layering from `--profile`); never mutate the base `config.toml`; preserve symlinks.
- Tests: MCP protocol/tools, hook identity injection, installer isolation, pinned-CLI macOS smoke in an isolated home.
- Docs: `codex/README.md`, Codex section of `docs/installation.md`, concept-doc harness row, `config.yaml.example` target comments.

### Excludes (deferred to later phases)

- App-server-owning clients, WebSocket, plugin marketplace packaging (documented as volatile/not selected in the impl plan).
- Claude Code and Hermes work (phases 3–4).

## Prerequisites

- [x] Phase 1 completed: Codex surface revalidated on the pinned local build; impl plan confirmed or revised.

## Deliverables

- [x] `codex/` adapter (MCP runtime, server, hook, shared instruction) reusing `packages/checkpoint-core/`.
- [x] `install.sh` Codex checkpoint install step plus summary output.
- [x] `codex/test/checkpoint-codex.test.mjs` and installer smoke coverage; pinned-CLI smoke evidence recorded.
- [x] Documentation updates listed above.

## Acceptance Criteria

- [x] One real checkpoint call in a Codex session on the pinned build produces a shared-contract JSONL log; `checkpoint_path` returns an inspectable path; telemetry is `null`/unknown per plan. Subagent attribution is documented as unsupported on the pinned build (no documented subagent identity surface).
- [x] Base `$CODEX_HOME/config.toml` is byte-for-byte preserved in installer tests; the adapter activates via `codex --profile-v2 agent-checkpoint`.
- [x] `node --test packages/checkpoint-core/test/*.test.js opencode/test/*.test.mjs codex/test/*.test.mjs` and `bash -n install.sh` pass.
- [x] agent-checkpoint-heartbeat phase 4 marked completed via `update-plan`.

## Dependencies on Other Phases

| Phase | Relationship | Notes |
|-------|-------------|-------|
| 1 | blocked-by | Consumes the revalidated Codex impl plan. |
| 3, 4 | parallel-sequential | Independent adapters, but executed sequentially because all edit the shared `install.sh`. |

## Notes

2026-07-27 primary/user decision (stop gate (a) hit during Phase 1 execution): pinned codex-cli 0.131.0 has no `SubagentStart` hook and no `agent_id` on any hook input; the composite subagent-ID bridge has no documented surface. Phase 2 is re-scoped to session-level logging (native `session_id`) without subagent attribution, documented as a build limit; the volatile `spawn_agent`/`multi_agent_v2` surface is NOT adopted; the `--profile` → `--profile-v2` layering change is absorbed. If a future pinned build documents subagent identity, a new gated phase may restore composite subagent logs.
