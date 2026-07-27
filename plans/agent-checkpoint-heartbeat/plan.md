---
type: planning
entity: plan
plan: "agent-checkpoint-heartbeat"
status: active
created: "2026-07-26"
updated: "2026-07-27"
---

# Plan: agent-checkpoint-heartbeat

## Problem / Context

Long-running parent and subagent sessions currently have no small, machine-readable progress chain. When a subagent stops because of context pressure or interruption, the parent knows the original prompt or Blueprint but cannot cheaply determine the last attempted step, the announced next step, or whether the agent still followed the checkpoint instruction. The agreed concept is documented in [Agent Checkpoint / Heartbeat](../../docs/agent-checkpoint-heartbeat.md).

## Target Outcome

This repository becomes the monorepo for a minimal checkpoint implementation with OpenCode as the pilot and later adapters for Codex, Claude Code, and PydanticAI. Every parent and subagent can append short progress records, receive current context telemetry, expose the relative log path, and leave raw JSONL that external scripts or a retriever can inspect without a separate recovery schema.

## Guiding Decisions & Constraints

- OpenCode is the first executable pilot and the gate for later harness implementation.
- The repository root contains `.agent-checkpoints/` alongside `docs/` and `plans/`; the runtime directory is local state and must not be versioned.
- One append-only JSONL file is created per harness session.
- Current raw records contain `timestamp`, `session_id`, `done`, `next`, `step_failed`, `context_used`, nullable `agent`, and nullable `session_title`; historical six-field records remain readable without migration.
- `checkpoint(done, next, step_failed=false)` appends the record and returns approximate context utilization plus remaining K-tokens.
- `checkpoint_path(session_id)` returns the workspace-relative JSONL path; it does not create a recovery representation.
- `done` and `next` are instructed to contain exactly three words, without hard input rejection.
- The next checkpoint reuses the previous `next` value verbatim as `done`.
- `step_failed=true` records a failed work attempt followed by a correction step; it is not a Canary-quality failure.
- Chain, work-success, and three-word counts/percentages, file selection, and displays are computed externally from raw logs.
- Parent agents follow the same checkpoint instruction as subagents.
- Codex and Claude Code implementation is planned and grounded now for later macOS execution by a colleague; their phases are not part of the OpenCode pilot rollout.
- Keep the implementation small: no daemon, external watchdog, recovery schema, or autonomous restart mechanism.

### Scope-Bounding Assumptions

- Harnesses may expose only approximate context telemetry; `null` is valid when no defensible value exists.
- A stable adapter-generated ID may replace a native session ID when a harness does not expose one.
- The common contract may have harness-native wrappers; identical packaging across TypeScript and Python is not required.

## Requirements

### Functional

- [ ] All supported agents can call `checkpoint(done, next, step_failed=false)` after each completed or failed self-segmented subtask.
- [x] The tool appends one valid JSON object per line to `.agent-checkpoints/<session-id>.jsonl` without storing derived percentages or the filename.
- [x] Every current record carries timestamp, session ID, done/next labels, step outcome, measured context utilization, and nullable agent/session-title metadata.
- [x] The tool returns approximate context utilization and remaining K-tokens to support controlled handoff.
- [x] `checkpoint_path` returns the relative path for a supplied native or adapter session identifier.
- [x] Parent, retriever, Bash, and Python workflows can read and filter a selected session log.
- [x] External analysis can calculate Chain, Work, and Three-word success/count/percent values while keeping `step_failed` independent from Canary metrics.
- [x] OpenCode integrates both tools and the instruction for parent and subagent personas.
- [ ] Codex, Claude Code, and PydanticAI adapters preserve the same observable contract within documented harness limits.

### Non-Functional

- [x] Appends remain valid under repeated calls and do not rewrite prior records.
- [x] Runtime paths cannot escape `.agent-checkpoints/` through caller-provided identifiers.
- [x] Missing context telemetry is represented honestly rather than fabricated.
- [x] The pilot adds focused behavioral tests and preserves existing installer and agent behavior outside the new feature.
- [x] Harness-specific implementation plans cite and verify current primary APIs before execution.

## Scope

### In Scope

- Shared raw record and tool semantics in this monorepo.
- Root-local `.agent-checkpoints/` convention and ignore behavior.
- OpenCode plugin/tool pilot, persona instructions, installation, and behavioral verification.
- Read-only external analysis/display of raw session logs.
- Researched and grounded future adapters for Codex on macOS, Claude Code on macOS, and PydanticAI.
- Harness-specific documentation and installation guidance required by each phase.

### Out of Scope

- Recovery schemas, transcript reconstruction, automatic agent restart, or automatic follow-up delegation.
- Treating successful checkpoint calls as proof of correct implementation work.
- Blocking a checkpoint because labels violate three-word or chain expectations.
- Logging derived chain/word percentages, filenames, or remaining-token values in JSONL.
- Implementing Codex or Claude Code during the OpenCode pilot phases.
- Cursor, Hermes, Antigravity-specific adapters, remote telemetry, or centralized log collection.

## Definition of Done

- [ ] The common current eight-field contract, strict legacy six-field read compatibility, and raw JSONL semantics are documented, tested, and used consistently by every adapter.
- [x] `.agent-checkpoints/` is a workspace-root sibling of `docs/` and `plans/`, is ignored by Git, and safely isolates per-session files.
- [x] OpenCode parents and subagents can call `checkpoint` and `checkpoint_path` in an installed pilot.
- [x] OpenCode records and returns context telemetry according to the documented confidence limits.
- [x] A failed step is visible through `step_failed=true` without reducing Canary compliance calculations.
- [x] External analysis can answer “How far did session X get?”, identify its latest agent/title when available, and calculate count-based Chain, Work, and Three-word metrics.
- [x] The OpenCode pilot passes focused integration tests plus an isolated installer smoke test.
- [x] Codex/macOS and Claude Code/macOS implementation plans are grounded in current primary APIs and executable later by the assigned colleague.
- [ ] PydanticAI has a grounded adapter implementation and verification path.
- [x] User-facing documentation matches implemented behavior and identifies unsupported telemetry honestly.

## Testing Strategy

- [x] Unit-test record serialization, safe session-to-path mapping, exact append behavior, and external calculations.
- [ ] Integration-test each harness tool against a temporary workspace and deterministic session/context fixtures.
- [x] Verify controlled failure records separately from Canary compliance metrics.
- [ ] Run isolated installation smoke tests for each adapter without modifying real user configuration.
- [x] Preserve `bash -n install.sh` and existing documentation/frontmatter/link checks.

## Phases

| Phase | Title | Contribution | Detail | Status |
|-------|-------|--------------|--------|--------|
| 1 | Shared Contract and Monorepo Foundation | Establishes the raw format, safe workspace paths, analysis rules, and testable package boundary. | [Phase](phases/phase-1.md) | completed |
| 2 | OpenCode Pilot | Delivers native OpenCode tools, context feedback, persona instructions, and installation. | [Phase](phases/phase-2.md) | completed |
| 3 | Pilot Evaluation and Inspection | Adds raw-log inspection/display and validates the two separate Canary and work-progress signals. | [Phase](phases/phase-3.md) | completed |
| 4 | Codex macOS Adapter | Supplies the researched later implementation for Codex on macOS without changing the common contract. | [Phase](phases/phase-4.md) | completed (via checkpoint-harness-integration Phase 2, 2026-07-27) |
| 5 | Claude Code macOS Adapter | Supplies the researched later implementation for Claude Code on macOS without changing the common contract. | [Phase](phases/phase-5.md) | completed (via checkpoint-harness-integration Phase 3, 2026-07-27) |
| 6 | PydanticAI Adapter | Adds the Python-native adapter and verifies parity with the shared behavior. | [Phase](phases/phase-6.md) | pending |

## Risks & Open Questions

| Risk/Question | Impact | Mitigation/Answer |
|---------------|--------|-------------------|
| OpenCode may not expose exact current context occupancy to a custom tool. | Medium | Use the best defensible host value, label estimates in documentation, and permit `null`. |
| Agent-defined subtask granularity varies. | Medium | Measure instruction following and chain consistency; do not interpret the log as objective work sizing. |
| A failed work step could be mistaken for Canary degradation. | High | Keep `step_failed` as an independent raw outcome and exclude it from Canary calculations. |
| Concurrent sessions or unsafe IDs could corrupt or escape log paths. | High | Use one sanitized file per session and test append/path behavior. |
| Codex and Claude Code APIs may change before colleague execution. | Medium | Ground plans in primary APIs now and require a reality check immediately before those phases execute. |
| Cross-language reuse could overcomplicate the KISS design. | Medium | Share the observable contract and fixtures; permit small native wrappers instead of forcing one runtime. |

## Changelog

### 2026-07-26

- Plan created with OpenCode as pilot and later Codex/macOS, Claude Code/macOS, and PydanticAI phases.
- Phase 1 completed with behavioral verification; Phase 2 started.
- Phase 2 completed with integration and installer verification; Phase 3 started.
- Phase 3 completed; the OpenCode pilot gate passed and later harness phases remain pending.
- Independent Phase 1–3 review findings were remediated; a fresh isolated OpenCode host exposed and executed both tools, and the full pilot gate passed again.
- OpenCode telemetry corrected to use the SDK client's TUI-equivalent previous-completed-step estimate with an honest null fallback; Phase 2–3 plans, tests, and docs were updated.
- Phase 3 extended with the dependency-free `checkpoint-watch` live terminal dashboard, age-based session state, installed launch path, and one-shot test mode.
- Checkpoint records and displays refined with nullable agent/session-title metadata, count-based metrics, legacy-log compatibility, and adaptive wide-terminal layout.
