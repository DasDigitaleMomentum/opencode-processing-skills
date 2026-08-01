---
type: review
entity: implementation-plan-review
plan: "checkpoint-session-status-hardening"
phase: 4
review_mode: "batch"
batch_phases: "1, 2, 3, 4"
status: final
reviewer: "delegate"
created: "2026-08-01"
---

# Implementation Plan Review: Phase 4 - Claude, Hermes, and Rollout Closure

> Reviewing [Phase 4 Implementation Plan](../implementation/phase-4-impl.md)
> Against [Phase 4 Scope](../phases/phase-4.md) and [Plan](../plan.md)

## Overall Assessment

**Verdict**: Needs Revision

The Claude/Hermes lifecycle mappings, parent/subagent identities, parity matrix, legacy-plan reconciliation, and pinned-host gate are concrete and faithful to the gated scope. The rollout closure is not yet safe in two installation cases: Phase 4 repeats the required-reader symlink gap found in Phase 3, and its post-install dashboard restart sequence leaves a window in which an already-running Codex or Claude process can execute a newly replaced command-hook script and emit status before the old dashboard process is relaunched.

## Scope Alignment

### Findings

- No scope expansion was found. Claude uses only verified starts and native parent `SessionEnd`; Hermes uses only new-parent `on_session_start`; unsupported child/main-session endings remain absent. PydanticAI stays pending, and the legacy-plan edits are bounded to truthful completion reconciliation.

## Technical Feasibility

### Findings

- **F-1 (Major): the Phase 4 installer plan repeats the unresolved stale-reader-symlink path for Claude and Hermes.** Step 4 preserves protected reader/core symlinks but does not prevent dependent Claude hook assets or the Hermes plugin/enablement from becoming status-capable when the shared watcher/core or Claude's bundled core was not refreshed. For example, `install_claude_checkpoint` currently copies each path independently and can preserve an old symlinked `server/checkpoint-core.mjs` while replacing `scripts/checkpoint-hook.mjs`; the new hook then imports an API the preserved core may not expose. A stale symlink in the shared OpenCode watcher tree likewise lets any new Claude/Hermes status line reach an incompatible reader. Saying the symlink is user-managed is honest, but it does not satisfy the acceptance requirement that installed readers precede compatible writers.
- **F-2 (Major): the documented upgrade sequence has an in-place command-hook activation window.** The plan tells operators to install/update first, then stop and relaunch `checkpoint-watch`, then restart harnesses. Codex and Claude command hooks execute the installed script path on each matching lifecycle event; an already-running Codex session can fire another `SessionStart` (for example compact/resume-class sources), and an already-running Claude session can fire `SubagentStart` or `SessionEnd`, after the script is replaced but before the operator can read the completed install output and restart the dashboard. The old watcher can therefore consume a four-field line during the exact window the sequence claims to prevent.
- Otherwise, the implementation is feasible against current source. Claude already registers the three chosen lifecycle events, has a stable native/composite ID helper, and cleans one sidecar on `SessionEnd`; Hermes' post-Phase-1 root mapping is the correct parent-owned identity for its Python-native status mirror.
- The Reality Check is accurate about current source, prior completion evidence, and the absence of Claude/Hermes binaries on this host. That absence is correctly treated as a final execution blocker and is not a plan defect.

## Step Quality Assessment

| Step | Title | Concrete? | Actionable? | Issue |
| ---- | ----- | --------- | ----------- | ----- |
| 1 | Add only observed Claude lifecycle writes | Yes | Yes | None |
| 2 | Add conservative Hermes parent-log lifecycle writing | Yes | Yes | None |
| 3 | Prove cross-adapter mixed-log reader parity | Yes | Yes | None |
| 4 | Finish reader-first installation and restart guidance | Partial | No | F-1 and F-2 leave two acceptance-significant rollout choices unresolved |
| 5 | Reconcile final lifecycle documentation and inventories | Yes | Yes | None |
| 6 | Reconcile only the stale checkpoint plan state | Yes | Yes | None |
| 7 | Enforce the pinned-host completion gate | Yes | Yes | None |

All steps cite gated requirements or preserved invariants, and blocking prerequisites are explicit. Steps 1–3 and 5–7 can be executed as written; Step 4 needs the two safety decisions above before an implementer can truthfully satisfy its acceptance claims.

## Required Context Assessment

### Missing Context

- None. The necessary installer helpers, adapter scripts, previous reviews, and stale plan artifacts are all listed. F-1/F-2 require clarified behavior, not more file discovery.

### Unnecessary Context

- None.

## Testing Plan Assessment

### Test Integrity Check

The plan preserves exact Claude hook/config/output, MCP/checkpoint, sidecar, config-byte, and symlink assertions; preserves Phase 1 Hermes binding/instruction/telemetry/installer coverage; extends rather than replaces strict Phase 2/3 lifecycle and mixed-reader tests; and keeps absent/wrong pinned binaries as asserted failures rather than skips.

### Test Gaps

- **F-1:** Add stale required-reader/core symlink cases for the shared watcher tree and Claude bundled core, plus the corresponding Hermes activation path. Assert that status-capable assets/activation are withheld or installation stops with recovery guidance; mere “skip before install” marker ordering is insufficient.
- **F-2:** Test stable installer/documentation output that requires writer-enabled harness sessions to be quiesced before writer scripts are replaced, then orders reader installation and live-dashboard relaunch before those harnesses are started again. If a different activation barrier is chosen, test the barrier directly.

### Real-World Testing

Relevant and explicitly gated. Exact Claude Code 2.1.170 and Hermes Agent v0.19.0 validation is appropriate because hook payloads and plugin loading are host-owned. Their absence from this Linux environment is the known final execution blocker, not a finding; the plan correctly forbids a skip, newer unverified substitute, or source-only claim of completion.

## Findings Summary

| ID | Severity | Area | Finding | Recommendation |
| --- | -------- | ---- | ------- | -------------- |
| F-1 | Major | Reader-first installation | Required shared/Claude reader-core symlinks may remain stale while dependent Claude/Hermes writers or activation are installed, so copy order does not establish compatibility. | Extend the Phase 3 dependency-aware stop/withhold policy to every Phase 4 reader/writer edge and test stale symlinks behaviorally. |
| F-2 | Major | Operational rollout | Installing in-place Codex/Claude hook scripts before relaunching a live old dashboard allows already-running harnesses to emit status during the upgrade window. | Require writer-enabled harnesses to be stopped before installation (or define an equivalent activation barrier), then install readers/writers, relaunch the dashboard, and only then restart harnesses; assert that complete order in output/docs. |

## Recommendations

1. Resolve F-1 with one cross-adapter policy that preserves user symlinks without installing or activating a writer against an unverified reader/core.
2. Resolve F-2 by moving harness quiescence ahead of writer replacement, or by defining an equivalent barrier that prevents command-hook execution until the dashboard has reloaded compatible readers.
3. Retain the current Claude/Hermes event mappings, parity expectations, scoped plan reconciliation, and exact pinned-host completion gate.

## Cross-Phase Consistency (Batch Review Only)

**Reviewed phases**: 1 → 2 → 3 → 4

**Integrated assessment**: The phase order and interfaces are otherwise consistent. Phase 1 preserves six-/eight-field writes and establishes Hermes root-parent identity; Phase 2 adds the exact four-field record, `appendSessionStatus`, checkpoint-only compatibility facade, physical-order reduction, and reader-only `ERROR`; Phases 3–4 consume the same option names, path semantics, status vocabulary, and analysis model without changing them. Lifecycle capability mapping remains deliberately unequal and honest across all four adapters, and every final writer depends on Phase 2 readers. The only cross-phase inconsistency is rollout enforcement: the Phase 3/4 copy-and-restart steps do not preserve that reader-before-writer dependency when required readers are stale symlinks or when already-running command-hook harnesses can execute newly copied writers before the old live reader is restarted.

### Cross-Phase Findings

- No additional finding beyond Phase 3 F-1 and Phase 4 F-1/F-2. Apply those installation remediations as one shared policy across OpenCode, Codex, Claude, and Hermes; no contract, identity, lifecycle, or phase-order revision is otherwise required.
