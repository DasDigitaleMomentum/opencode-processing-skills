---
type: planning
entity: phase
plan: "checkpoint-harness-integration"
phase: 1
status: completed
created: "2026-07-27"
updated: "2026-07-27"
---

# Phase 1: Grounding and Hermes Research

> Part of [checkpoint-harness-integration](../plan.md)

## Objective

Verify that the grounded Codex and Claude Code implementation approaches still match this machine's pinned harness versions and the shipped eight-field contract, and research plus decide the Hermes checkpoint integration approach.

## Contribution to Plan Goal

De-risks all three adapter phases before any code is written: it prevents building against drifted harness APIs, aligns the reused implementation plans with the current record contract, and converts Hermes from an unknown surface into an explicit, executable decision with a documented fallback.

## Scope

### Includes

- Record pinned versions (`codex --version`, `claude --version`, Hermes install/discovery state) and revalidate the documented surfaces listed in the revalidation steps of the [phase-4](../../agent-checkpoint-heartbeat/implementation/phase-4-impl.md) and [phase-5](../../agent-checkpoint-heartbeat/implementation/phase-5-impl.md) impl plans.
- Reconcile the phase-4/5 impl plans with the current eight-field record contract (nullable agent/session-title metadata, legacy six-field read compatibility), including an explicit per-harness decision on where `agent`/`session_title` values come from (harness-supplied identity vs. honest `null`), recorded in each derived impl plan.
- Research Hermes integration points from primary sources (skills, hooks, MCP, plugin/API surface) and its session/identity model.
- Decide the Hermes approach (native tool surface vs instruction-only via installed skills plus documented external logging) with rationale.
- Author/verify the per-phase implementation plans for phases 2–4 via `author-and-verify-implementation-plan` (deriving from the referenced old impl plans into this plan's `implementation/` directory).

### Excludes (deferred to later phases)

- Any adapter runtime code, installer changes, or test implementation (phases 2–4).
- PydanticAI research (remains phase 6 of agent-checkpoint-heartbeat).

## Prerequisites

- [x] Pilot (agent-checkpoint-heartbeat phases 1–3) completed with GO recorded — satisfied per its changelog; confirm before starting.
- [x] Codex and Claude Code CLIs installed locally and pinnable; Hermes install/discovery path available.
- [x] Access to primary documentation (Codex, Claude Code, Hermes).

## Deliverables

- [x] Revalidation addendum per harness (pinned versions, confirmed/changed surfaces) attached to the affected implementation plans.
- [x] Verified implementation plans for phases 2–4 (`implementation/phase-2-impl.md`, `phase-3-impl.md`, `phase-4-impl.md`) referencing the eight-field contract and current primary APIs.
- [x] Hermes integration decision recorded inside the phase-4 implementation plan (approach, limits, fallback).
- [x] Superseded pointer recorded in the old agent-checkpoint-heartbeat phase-4/5 impl plans.

## Acceptance Criteria

- [x] Every "revalidate before execution" item from the old phase-4/5 impl plans is marked confirmed, or the affected plan is revised accordingly.
- [x] No implementation plan still assumes the six-field-only record wording.
- [x] The Hermes decision is explicit, with rationale and testable acceptance implications; no "unknown surface" item remains without a documented fallback.

## Dependencies on Other Phases

| Phase | Relationship | Notes |
|-------|-------------|-------|
| 2, 3, 4 | blocks | All adapter phases consume Phase 1 outputs (revalidated/derived impl plans, Hermes decision). |

## Notes

Hermes research is the only genuinely new ground. Codex/Claude work is verification and reconciliation, not re-research — the technical approaches themselves are already decided in the referenced impl plans. Phase 1 may span more than one session (dual revalidation + reconciliation + Hermes research + three impl plans); create a handover via `generate-handover` when interrupting.
