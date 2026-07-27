---
type: planning
entity: phase
plan: "checkpoint-harness-integration"
phase: 4
status: completed
created: "2026-07-27"
updated: "2026-07-27"
---

# Phase 4: Hermes Integration

> Part of [checkpoint-harness-integration](../plan.md)

## Objective

Deliver the Phase-1-decided Hermes checkpoint integration and install it through the existing Hermes installer target (`~/.hermes/skills/processing`).

## Contribution to Plan Goal

Completes the three-harness rollout requested by the user. Hermes was previously out of scope in agent-checkpoint-heartbeat; this phase adds it with the smallest defensible integration and honestly documented limits.

## Scope

### Includes

- Implement the approach decided in Phase 1 (gate (c), 2026-07-27, user decision): a native Hermes plugin at `~/.hermes/plugins/agent-checkpoint/` providing `checkpoint`/`checkpoint_path` tools (reusing `packages/checkpoint-core/` semantics) plus lifecycle hooks for session identity/workspace injection, activated through the documented `hermes plugins enable` opt-in flow.
- Installer: extend the Hermes target to install the plugin directory and perform the documented opt-in enablement (single additive `plugins.enabled` entry in `~/.hermes/config.yaml`; byte-for-byte preservation of all other preexisting content), keeping the namespaced `skills/processing` category tidy and removable.
- Tests proportionate to the decided surface, plus installer isolation for the Hermes target.
- Docs: Hermes section of `docs/installation.md`, concept-doc harness row with explicit capability/telemetry limits, `config.yaml.example` target comments.

### Excludes (deferred to later phases)

- Building Hermes infrastructure beyond the documented plugin tool/hook surface adopted in Phase 1 (no MCP server, no shell-hook argument rewriting — unsupported on the pinned build, no project-local `HERMES_ENABLE_PROJECT_PLUGINS=1` shape).
- Changes to Hermes itself; remote telemetry or centralized collection.
- Codex/Claude work (phases 2–3).

## Prerequisites

- [x] Phase 1 completed: Hermes integration decision recorded with rationale and fallback.
- [x] Phases 2–3 completed (keeps `install.sh` changes sequential and reviewable).

## Deliverables

- [x] Hermes integration artifacts per the Phase 1 decision (`hermes/agent-checkpoint/`: `plugin.yaml`, `agent_checkpoint.py`, `__init__.py`, `README.md` — `checkpoint`/`checkpoint_path` tools + `on_session_start`/`pre_tool_call`/`pre_api_request` hooks).
- [x] `install.sh` Hermes adjustments (Step 9 `install_hermes_checkpoint` + additive `plugins.enabled` text edit with loud stops; Cursor renumbered 10) plus summary output.
- [x] Tests and installer smoke coverage for the Hermes target (`hermes/test/test_agent_checkpoint.py`, 44 tests incl. installer isolation + cross-adapter parity; pinned-CLI smoke).
- [x] Cross-adapter inspection parity demonstration (agent-checkpoint-heartbeat phase-3 inspection path and checkpoint-watch over the installed harness logs — four-harness logs read unchanged, reviewer-confirmed).
- [x] Documentation updates listed above (`docs/installation.md`, `docs/agent-checkpoint-heartbeat.md` harness row, `config.yaml.example`, plugin README).

## Acceptance Criteria

- [x] One real `checkpoint` call in a Hermes session on the pinned build produces a shared-contract JSONL log via the plugin tool; `checkpoint_path` returns an inspectable path; subagent start-time identity is not adopted (`subagent_start` exists on the pinned build; documented as an available-but-not-adopted follow-up), so subagent checkpoints share the parent session log (post-hoc `subagent_stop` only); telemetry is an honest estimate or `null`. (satisfied: isolated-home smoke — real checkpoint written with context_used 0.512 and read back via checkpoint-inspect)
- [x] `~/.hermes/config.yaml` preexisting content is preserved byte-for-byte except the additive `plugins.enabled` entry in installer tests; activation works via the documented enablement flow (and is removable via `hermes plugins disable`). (satisfied: smoke config diff exactly 3 additive lines; `hermes plugins list --json` honors the text-edit enablement; real `~/.hermes` untouched)
- [x] Hermes installer isolation tests pass; other targets' behavior unchanged; `bash -n install.sh` passes. (satisfied: final gate node 58/58 + python 44/44 + `bash -n`, exit 0)
- [x] checkpoint-watch and the agent-checkpoint-heartbeat phase-3 inspection path (`checkpoint-inspect`) read logs from all installed harnesses unchanged. (satisfied: four-harness parity, reviewer-confirmed)
- [x] Concept-doc harness matrix lists Hermes with its actual capabilities. (satisfied: `docs/agent-checkpoint-heartbeat.md` row + `docs/installation.md` Hermes section)

## Dependencies on Other Phases

| Phase | Relationship | Notes |
|-------|-------------|-------|
| 1 | blocked-by | Consumes the Hermes integration decision. |
| 2, 3 | sequential-after | Independent, sequential due to shared `install.sh`. |

## Notes

2026-07-27 user decision (stop gate (c) hit during Phase 1 execution): pinned Hermes v0.19.0 (upstream `e0b9ab5a`) documents a native plugin tool/hook surface (`PluginContext.register_tool()`, `on_session_start`/`pre_tool_call`/`subagent_stop` plugin hooks, MCP client), but every global activation path writes `~/.hermes/config.yaml`. The user decided the documented opt-in enablement flow (`hermes plugins enable`, single additive `plugins.enabled` key) satisfies the plan's additive-and-opt-in constraint; the instruction-only fallback's trigger (no native surface) was not met and is not taken. Revalidated facts for the impl plan (corrected 2026-07-27 stop-and-revise; pin unchanged @ `e0b9ab5a`): `subagent_start` exists on the pinned build (in `VALID_HOOKS`, fired on `delegate_task` child construction with parent/child session + role payloads, documented) and is deliberately not adopted — session-level logging per the gate-(c) scope, subagent identity post-hoc only in this integration, adoption is a documented follow-up option; `stop` is absent from `VALID_HOOKS` (Phase 1 research mis-enumeration; no integration hook usage relied on it); session titles live in the SQLite store (`hermes sessions rename`); `--pass-session-id` exposes the session ID to the model; `pre_api_request` carries approx token counts (estimate path; honest `null` remains valid). `hermes checkpoints` is Hermes' shadow-git rollback store — unrelated to the shared `.agent-checkpoints/` contract, never a substitute.

Completed 2026-07-27: executed via execute-work-package (Blueprint APPROVE-WP4; first implementer context-exhausted after Step 1, fresh implementer completed Steps 2–8). Impl review ([reviews/impl-review-phase-4.md](../reviews/impl-review-phase-4.md)) verdict Needs Rework (0 Critical/1 Major/3 Minor/2 Note) → same-session review-fix remediated F-1/F-2/F-3/F-4/F-6 (remediation addendum appended); no actionable findings remain. Final gate exit 0 (node 58/58, python 44/44, `bash -n`); pinned smoke green (config diff exactly 3 additive lines; real checkpoint context_used 0.512); cross-adapter inspection parity confirmed. Plan status: all phases completed — completion pending user confirmation.
