---
type: review
entity: implementation-plan-review
plan: "checkpoint-harness-integration"
phase: 1
review_mode: "single-phase"
batch_phases: ""
status: final
reviewer: "delegate"
created: "2026-07-27"
---

# Implementation Plan Review: Phase 1 - Grounding and Hermes Research

> Reviewing [Phase 1 Implementation Plan](../implementation/phase-1-impl.md)
> Against [Phase 1 Scope](../phases/phase-1.md) and [Plan](../plan.md)

## Overall Assessment

**Verdict**: Needs Revision

The plan is well-grounded and executable: all code anchors verify against current repo state, the revalidation steps faithfully enumerate every item from the old phase-4/5 drafts' Step 1, probes are confined to read-only or disposable homes, and the eight-field reconciliation matches the shipped `checkpoint-core` contract exactly. One Major gap remains: Steps 7–8 derive `phase-2-impl.md`/`phase-3-impl.md` without ever referencing this plan's `phases/phase-2.md`/`phase-3.md` — the gated scopes (with acceptance criteria absent from the old drafts, notably the `update-plan` marking and `bash -n install.sh` verify growth) that the derived plans must satisfy. The fix is small (two Required Context rows plus a citing clause per step), but the phase's primary deliverable depends on it.

## Scope Alignment

### Findings

- No gaps or creep in coverage of the gated scope. Every Phase 1 "Includes" item maps to a step: pinned-version recording and Codex/Claude revalidation (Steps 1–3), eight-field reconciliation with explicit per-harness `agent`/`session_title` sourcing (Step 4), Hermes primary-source research (Step 5), bounded Hermes decision with fallback (Step 6), derived impl plans for phases 2–4 (Steps 7–9). Deliverables map cleanly: embedded dated addenda (Steps 7–8, placement justified in Open Decisions), Hermes decision inside phase-4-impl (Step 9), superseded pointers banner-only with frontmatter status correctly deferred to `update-plan` (Step 10). Excludes are respected — Affected Modules lists code modules as `use` only; no runtime, installer, or test changes are planned.
- **F-1 (Major)**: Steps 7 and 8 author the derived plans for *this* plan's phases 2 and 3, yet neither the Required Context table nor the step texts reference `plans/checkpoint-harness-integration/phases/phase-2.md` and `phase-3.md`. The `author-and-verify-implementation-plan` skill lists `phases/phase-N.md` as a required input, and the asymmetry with Step 9 — which explicitly cites "phase-4 gated scope and acceptance criteria" (phase-4.md *is* in Required Context) — makes the omission unambiguous. The new phase files carry gated content the old drafts lack: `bash -n install.sh` in the acceptance verify composition (phase-2 line 52, phase-3 line 54) and "agent-checkpoint-heartbeat phase 4/5 marked completed via `update-plan`" (phase-2 line 53, phase-3 line 55). Step 11's consistency check covers verify-command growth against the plan Testing Strategy, but nothing in the plan carries the `update-plan` marking acceptance criterion into the derived plans.

## Technical Feasibility

### Findings

- Steps 2/3 are executable as specified on this machine without mutating real harness homes. Verified: `codex-cli 0.131.0`, `claude 2.1.170`, `hermes v0.19.0 (2026.7.20) upstream e0b9ab5a` all present and pinnable. Step 2 is fully static (version, `--help`, schema generation into `mktemp`, hook-surface inspection, docs comparison). Step 3's live parent/subagent `PreToolUse` and statusline captures are confined to a disposable `CLAUDE_CONFIG_DIR` and throwaway project; the considerations explicitly forbid touching real `~/.claude`/`~/.claude.json`. This satisfies the old drafts' Step 1 items item-for-item, including the `--settings` merge-vs-replace stop condition.
- The eight-field reconciliation (Step 4) matches ground truth exactly: `RECORD_FIELDS`/`LEGACY_RECORD_FIELDS`/`METADATA_FIELDS` (index.js:4–13), `validateCheckpointRecord` (59–115) accepting exactly legacy-six or current-eight, `normalizeCheckpointRecord` (117–124) normalizing legacy metadata to `null` in memory, `createCheckpointRecord` (126–148) with false/null defaults. The "no derived values in JSONL" rule and the transcript-parsing exclusion are correctly carried.
- Hermes probe list (Step 5) is grounded, not speculative: `hermes --help` on the pinned install confirms `hooks`, `mcp`, `plugins`, `skills`, `sessions`, `acp`, and `checkpoints` subcommands, and `~/.hermes/hooks/` exists and is empty. The native-`checkpoints` name collision is flagged both in Step 5 and Reality Check with an explicit no-substitution rule.
- Stop conditions are carried forward as record-and-raise gates (Blocking Decisions a–c), and Step 6 correctly stops for primary on any out-of-gate Hermes option rather than choosing — ungated decisions halt dependent planning as required.

## Step Quality Assessment

| Step | Title | Concrete? | Actionable? | Issue |
| ---- | ----- | --------- | ----------- | ----- |
| 1 | Confirm pilot GO state and prerequisites | y | y | GO state verified against old plan changelog/phase table and concept-doc pilot gate |
| 2 | Revalidate Codex surface | y | y | Covers every old phase-4 Step 1 item; read-only |
| 3 | Revalidate Claude surface | y | y | Live payload capture needs a credentialed run; correctly confined to disposable home/project |
| 4 | Eight-field reconciliation + sourcing | y | y | Honesty criterion explicit; core package untouched |
| 5 | Hermes research | y | y | Probe list verified against pinned install; four decision questions well-posed |
| 6 | Hermes decision (gated, bounded) | y | y | Fallback is plan-accepted; out-of-gate options stop for primary |
| 7 | Author derived phase-2 plan | y | partial | Never cites new `phases/phase-2.md` gated scope/ACs (F-1) |
| 8 | Author derived phase-3 plan | y | partial | Never cites new `phases/phase-3.md` gated scope/ACs (F-1) |
| 9 | Author phase-4 plan | y | y | Correctly cites phase-4 gated scope, F-4 inspection parity, sequential `install.sh` prerequisite |
| 10 | Superseded pointers | y | y | Banner-only edits; status reconciliation correctly deferred |
| 11 | Consistency check + wrap-up | y | y | Covers naming/workspace/verify growth; cannot catch missing phase-2/3 AC content (F-1) |

## Required Context Assessment

### Missing Context

- `plans/checkpoint-harness-integration/phases/phase-2.md` — gated scope, deliverables, and acceptance criteria the derived `phase-2-impl.md` must satisfy (F-1).
- `plans/checkpoint-harness-integration/phases/phase-3.md` — same for `phase-3-impl.md` (F-1).

### Unnecessary Context

- None. All listed files are load-bearing; `skills/generate-handover/SKILL.md` is correctly conditional on interruption.

## Testing Plan Assessment

The verify command is a single structural artifact check, proportionate to a documents-only phase: it proves the three derived plans exist with eight-field wording (`session_title`) and Reality Check sections, phase-2/3 embed revalidation addenda, both old drafts carry superseded pointers, and no stale `exact six-field` test wording survives. The `exact six-field` needle is well-chosen — it matches the old drafts' test-integrity phrasing verbatim (old phase-4 line 126, old phase-5 line 137) while the mandated "legacy six-field logs remain readable" wording does not collide. Missing files fail closed via `grep` exit 2 under `set -e`.

### Test Integrity Check

Addressed explicitly and honestly: no existing tests are affected (plans-only edits); derived plans must carry forward the old drafts' integrity constraints in contract-current wording as the *authorized reconciliation*, not a weakening; stop conditions may not be weakened; all probes preserve the byte-for-byte base-config invariant. The code/test regression row is a justified `N/A` — this phase changes no executable surface, and suite regression is correctly assigned to the adapter phases per the plan Testing Strategy.

### Test Gaps

- **F-3 (Note)**: Phase 1 Acceptance Criteria 2–3 (no six-field-only assumptions beyond the grep proxy; explicit Hermes decision with rationale/fallback/testable implications; per-harness `agent`/`session_title` sourcing recorded) rest on the manual review rows only. That is proportionate for prose deliverables; if machine-checking is desired, cheap greps (e.g. `fallback` in phase-4-impl, a sourcing/Open-Decision marker in phase-2/3-impl) would close it without new infrastructure.

### Real-World Testing

N/A for artifact verification — but note the phase's revalidation steps *are* on-machine real-world probes against the pinned builds (with disposable homes), which is the real-world grounding this phase exists to provide. Real-CLI adapter smoke is correctly deferred to phases 2–4.

## Reference Consistency

### Findings

- **F-2 (Minor)**: The Affected Modules links `../../docs/modules/checkpoint-core.md` and `../../docs/modules/installation-and-configuration.md` (impl plan lines 25–26) resolve to `plans/docs/...`, which does not exist. From `plans/checkpoint-harness-integration/implementation/` the correct form is `../../../docs/...` (the old drafts use it correctly, e.g. old phase-4 line 29). No execution impact — Required Context uses unambiguous repo-relative paths — but the three derived plans may copy the broken pattern.
- All other references verified accurate: index.js symbol line ranges exact; `install.sh` target header map (~20–37), target resolution (~228–318), Hermes category handling (1014–1030; the comment block opens at 1013 — one-line offset, no action needed); `config.yaml.example` targets.codex/claude/hermes (54/58/66); old draft Step 1 items, volatile-API lists, verify commands, and blocking decisions all present as cited.

## Findings Summary

| ID  | Severity | Area | Finding | Recommendation |
| --- | -------- | ---- | ------- | -------------- |
| F-1 | Major | Scope Alignment / Required Context | Steps 7–8 derive phase-2/3 impl plans without referencing this plan's `phases/phase-2.md`/`phase-3.md`; their gated ACs (`update-plan` marking of old phases 4/5, `bash -n install.sh` verify growth) are carried by no step. | Add both phase files to Required Context; cite them in Steps 7/8 (What + Authorized By) and explicitly carry the `update-plan` marking and verify-growth ACs into the derived plans. |
| F-2 | Minor | Reference Consistency | Two `../../docs/modules/...` links in Affected Modules resolve to nonexistent `plans/docs/...`. | Change to `../../../docs/modules/...`. |
| F-3 | Note | Testing Plan | Hermes decision record and per-harness sourcing decisions are verified only via manual review rows. | Optional: extend the verify command with greps for the decision/fallback and sourcing markers. |

## Recommendations

1. Resolve F-1: add `phases/phase-2.md` and `phases/phase-3.md` to Required Context, cite them in Steps 7/8 as the gating scopes, and name the carried-over acceptance criteria (`bash -n install.sh` in the verify composition; marking old agent-checkpoint-heartbeat phases 4/5 completed via `update-plan` after the corresponding phase completes).
2. Resolve F-2: fix the two Affected Modules links to `../../../docs/...`.
3. Optionally resolve F-3: strengthen the verify command with the two additional greps.
