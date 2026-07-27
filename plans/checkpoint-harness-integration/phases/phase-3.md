---
type: planning
entity: phase
plan: "checkpoint-harness-integration"
phase: 3
status: completed
created: "2026-07-27"
updated: "2026-07-27"
---

# Phase 3: Claude Code Integration

> Part of [checkpoint-harness-integration](../plan.md)

## Objective

Make `checkpoint` and `checkpoint_path` callable in Claude Code sessions on macOS via a skills-directory plugin, installed additively through the existing Claude installer target.

## Contribution to Plan Goal

Delivers the second harness adapter and the first with live (statusline-fed) context telemetry outside OpenCode. On completion it also closes phase 5 of agent-checkpoint-heartbeat.

## Scope

### Includes

- Execute the grounded Claude Code approach (authoritative How: `implementation/phase-3-impl.md`, derived in Phase 1 from the [old phase-5 impl plan](../../agent-checkpoint-heartbeat/implementation/phase-5-impl.md), which it supersedes): personal skills-directory plugin at `$CLAUDE_HOME/skills/agent-checkpoint/` with `.claude-plugin/plugin.json`, bundled dependency-free stdio MCP server, command hooks for parent/subagent identity injection, and an atomic statusline telemetry sidecar under `.agent-checkpoints/.runtime/claude/`.
- Installer: copy the plugin and shared core, generate the opt-in `$CLAUDE_HOME/agent-checkpoint.settings.json` (statusLine only); never mutate `settings.json` or `~/.claude.json`; preserve symlinks.
- Tests: plugin/manifest shape, MCP protocol/tools, hook rewriting, statusline sidecar (valid/null/compaction/mismatch cases), installer isolation, pinned-CLI macOS smoke in an isolated config/project.
- Docs: `claude/agent-checkpoint/README.md`, Claude section of `docs/installation.md`, concept-doc harness row, `config.yaml.example` target comments.

### Excludes (deferred to later phases)

- Marketplace distribution, plugin cache manipulation, background monitors, transcript parsing.
- Codex and Hermes work (phases 2 and 4).

## Prerequisites

- [ ] Phase 1 completed: Claude Code surface revalidated on the pinned local build (plugin discovery/names, hook `agent_id`, `PreToolUse.updatedInput`, statusline fields, `--settings` merge behavior); impl plan confirmed or revised.

## Deliverables

- [ ] `claude/agent-checkpoint/` plugin (manifest, `.mcp.json`, hooks, scripts, instruction, README) reusing `packages/checkpoint-core/`.
- [ ] `install.sh` Claude checkpoint install step plus summary output.
- [ ] `claude/test/checkpoint-claude.test.mjs` and installer smoke coverage; pinned-CLI smoke evidence recorded.
- [ ] Documentation updates listed above.

## Acceptance Criteria

- [ ] Plugin passes strict validation on the pinned build; scoped MCP tools are discoverable and callable.
- [ ] One real parent and one real subagent checkpoint produce separate shared-contract JSONL logs via hook-injected IDs; `checkpoint_path` returns inspectable paths.
- [ ] Statusline-fed telemetry is returned when valid and degrades to explicit unknown on null/compaction/mismatch; the sidecar never enters raw logs or inspection.
- [ ] Base `$CLAUDE_HOME/settings.json` and `~/.claude.json` are byte-for-byte preserved in installer tests; activation works via the documented `--settings` launch.
- [ ] `node --test packages/checkpoint-core/test/*.test.js opencode/test/*.test.mjs codex/test/*.test.mjs claude/test/*.test.mjs` and `bash -n install.sh` pass.
- [ ] agent-checkpoint-heartbeat phase 5 marked completed via `update-plan`.

## Dependencies on Other Phases

| Phase | Relationship | Notes |
|-------|-------------|-------|
| 1 | blocked-by | Consumes the revalidated Claude Code impl plan. |
| 2 | sequential-after | Independent adapter, sequential due to shared `install.sh`. |
| 4 | parallel-sequential | Independent adapter, sequential due to shared `install.sh`. |

## Notes

"Claude Code Desktop" is interpreted as Claude Code on this macOS machine (see plan assumptions). The statusline sidecar is an ephemeral cache, not a second log; the phase-5 impl plan's blocking decisions apply if `agent_id` or `--settings` merge behavior is missing on the pinned build.
