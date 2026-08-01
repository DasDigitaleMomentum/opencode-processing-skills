---
type: planning
entity: phase
plan: "checkpoint-session-status-hardening"
phase: 1
status: completed
created: "2026-07-31"
updated: "2026-08-01"
---

# Phase 1: Adapter Correctness Hardening

> Part of [checkpoint-session-status-hardening](../plan.md)

## Objective

Correct the five verified adapter/installer defects so the existing checkpoint behavior is safe and truthful before lifecycle records are introduced.

## Contribution to Plan Goal

Lifecycle events would amplify current Hermes session-binding and installation defects. This phase establishes a regression-tested baseline on which the shared status contract can safely build.

## Scope

### Includes

- Correct Hermes parent/subagent and concurrent-session binding while preserving one parent-owned log: map native child-session IDs internally to the parent log through the verified `subagent_start` relation, keep invocation/telemetry state isolated by native session, and persist no new child attribution.
- Deliver the complete heartbeat instruction to Hermes parents/subagents through a verified supported mechanism.
- Detect quoted and unquoted exact `agent-checkpoint` entries under block or inline `plugins.disabled` and stop without changing config.
- Preserve a symlinked Codex adapter destination directory as a whole.
- Clamp Hermes remaining context-window headroom to zero.
- Add focused regression tests and adjust directly affected docs.

### Excludes (deferred to later phases)

- Status-event schema, reader/dashboard changes, and lifecycle writers.
- New detailed status vocabulary or hook adoption beyond the `subagent_start` mapping required to preserve parent-log sharing and correct concurrent binding.
- General installer refactoring beyond the accepted defects.

## Prerequisites

- [x] Independent findings reproduced against commit `3cb3f84`.
- [x] User requested remediation.

## Deliverables

- [x] Corrected Hermes runtime/session state and heartbeat instruction delivery.
- [x] Corrected Hermes installer parsing and headroom feedback.
- [x] Corrected Codex destination-directory symlink handling.
- [x] Focused tests and truthful affected documentation.

## Acceptance Criteria

- [x] Parent checkpoint, child checkpoint, and resumed-parent checkpoint all append to the parent-owned log; no separate child log or child attribution is persisted, and two interleaved parent trees keep invocation binding and telemetry isolated.
- [x] A normal Hermes parent and child receive the complete heartbeat instruction without manual prompting.
- [x] Single- and double-quoted disabled entries in block and inline lists abort installation, leave config bytes unchanged, and explain the manual enablement command.
- [x] A symlinked `$CODEX_HOME/agent-checkpoint` remains untouched and no file is written through it.
- [x] Over-limit Hermes telemetry returns `context_used: 1.0` and zero, never negative, remaining K-tokens.
- [x] Existing checkpoint and installer suites remain green apart from explicitly unavailable pinned-host binaries.

## Dependencies on Other Phases

| Phase | Relationship | Notes |
|-------|-------------|-------|
| 2 | blocks | Shared status work starts only from the corrected baseline. |

## Notes

The five defects were independently reviewed and locally reproduced on 2026-07-31. Implementation completed on 2026-08-01 and the independent implementation review returned **Accepted** with no findings. Locally runnable verification passed 49 Hermes tests, 11 Codex tests, and `bash -n install.sh`. Actual Hermes pinned-host behavior still requires its unavailable v0.19.0 binary, and the pinned Claude Code 2.1.170/Hermes v0.19.0 host-smoke gate remains blocked until both binaries are available.
