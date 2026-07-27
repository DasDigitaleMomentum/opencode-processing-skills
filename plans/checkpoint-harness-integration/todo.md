---
type: planning
entity: todo
plan: "checkpoint-harness-integration"
updated: "2026-07-27"
---

# Todo: checkpoint-harness-integration

> Tracking [checkpoint-harness-integration](plan.md)

## Active Phase: none — all phases completed (plan completed, user-confirmed 2026-07-27)

### Phase Context (closed — Phase 4 completed)

- **Scope**: [Phase 4](phases/phase-4.md)
- **Implementation**: [Phase 4 Plan](implementation/phase-4-impl.md)
- **Latest Handover**: [session-2026-07-27-3](handovers/session-2026-07-27-3.md)
- **Relevant Docs**: [Checkpoint concept](../../docs/agent-checkpoint-heartbeat.md), [checkpoint-core module](../../docs/modules/checkpoint-core.md), [installation module](../../docs/modules/installation-and-configuration.md), [Phase 2 review](reviews/impl-review-phase-2.md), [Phase 3 review](reviews/impl-review-phase-3.md)

### Pending

### In Progress

### Completed

- [x] Confirm pilot GO state and record pinned local harness versions (codex 0.131.0, claude 2.1.170, hermes v0.19.0) <!-- completed: 2026-07-27 -->
- [x] Revalidate Codex surface per old phase-4 impl plan step 1; findings recorded, stop gate (a) hit → user decision Option A (phase-2 re-scope) <!-- completed: 2026-07-27 -->
- [x] Revalidate Claude Code surface per old phase-5 impl plan step 1; 10/10 items classified (9 confirmed, 1 noted) on pinned 2.1.170, stop gate (b) NOT triggered (evidence spooled machine-local) <!-- completed: 2026-07-27 -->
- [x] Research Hermes integration surface from primary sources (pinned v0.19.0: native plugin tools/hooks + MCP documented; `hermes checkpoints` name collision disambiguated) <!-- completed: 2026-07-27 -->
- [x] Record Hermes integration decision: stop gate (c) → user decision native plugin via documented `hermes plugins enable` opt-in; recorded in plan.md/phase-4.md, embedding in phase-4-impl via Step 9 <!-- completed: 2026-07-27 -->
- [x] Reconcile old phase-4/5 impl plans with the eight-field record contract (landed in derived plans; no six-field-only wording remains) <!-- completed: 2026-07-27 -->
- [x] Resume Phase 1 execution Steps 7–12 under the gate-(c) decision (implementer task ses_05f5c03e0ffeyl7QAVsj4L5zes; final gate `PHASE 1 ARTIFACT CHECKS PASSED`) <!-- completed: 2026-07-27 -->
- [x] Author/verify implementation plans for phases 2–4 via author-and-verify-implementation-plan (phase-2/3/4-impl.md authored, verified, consistency-checked) <!-- completed: 2026-07-27 -->
- [x] Phase 1 impl review: verdict Accepted (0 Critical/0 Major/1 Minor/2 Note), findings F-1/F-3 applied <!-- completed: 2026-07-27 -->
- [x] Phase 2 Steps 1–7: Codex adapter (MCP runtime/server, hook bridge, instruction), profile-v2 installer, docs, tests (10/10 suite + credential-free E2E smoke) <!-- completed: 2026-07-27 -->
- [x] Phase 2 stop conditions resolved: mcp-list drift → accepted proof set + docs corrected; 2 pre-existing failures root-caused (test path canonicalization = test bug; checkpoint-watch main-guard = real pilot bug) and minimally fixed <!-- completed: 2026-07-27 -->
- [x] Phase 2 impl review: verdict Accepted (0 Critical/0 Major/2 Minor/2 Note); F-1 closed via reviewer re-execution, F-2 watch-guard regression test added (40/40 gate green) <!-- completed: 2026-07-27 -->
- [x] Mark agent-checkpoint-heartbeat phase 4 completed via update-plan <!-- completed: 2026-07-27 -->
- [x] Phase 3 Step 1: Create the in-place Claude Code plugin package <!-- completed: 2026-07-27 -->
- [x] Phase 3 Step 2: Implement the shared-contract MCP server <!-- completed: 2026-07-27 -->
- [x] Phase 3 Step 3: Inject parent/subagent identity and instructions with hooks <!-- completed: 2026-07-27 -->
- [x] Phase 3 Step 4: Implement the atomic statusline telemetry side channel <!-- completed: 2026-07-27 -->
- [x] Phase 3 Step 5: Install the plugin and opt-in statusline settings safely <!-- completed: 2026-07-27 -->
- [x] Phase 3 Step 6: Document operation, telemetry semantics, and volatility <!-- completed: 2026-07-27 -->
- [x] Phase 3 Step 7: Add isolated protocol, bridge, installer, and macOS verification <!-- completed: 2026-07-27 -->
- [x] Phase 3 verify command green (57/57 + `bash -n`) + review-implementation: verdict Accepted, zero actionable findings, no fix loop needed <!-- completed: 2026-07-27 -->
- [x] Mark agent-checkpoint-heartbeat phase 5 completed via update-plan <!-- completed: 2026-07-27 -->
- [x] Phase 4 Step 1: Implement the Hermes plugin package (`hermes/agent-checkpoint/`: plugin.yaml, agent_checkpoint.py, __init__.py, README.md) <!-- completed: 2026-07-27 -->
- [x] Phase 4 Step 2: Bind session identity, workspace, and telemetry via plugin hooks (`on_session_start`/`pre_tool_call`/`pre_api_request`; estimate-or-`null` telemetry with model table + `AGENT_CHECKPOINT_CONTEXT_LIMIT_TOKENS` override; `agent`/`session_title` always `null`) <!-- completed: 2026-07-27 -->
- [x] Phase 4 Step 3: Install the plugin and perform documented enablement (Step 9 `install_hermes_checkpoint` + additive `plugins.enabled` text edit with loud stops; Cursor renumbered 10) <!-- completed: 2026-07-27 -->
- [x] Phase 4 Step 4: Document operation and limits (`config.yaml.example`, `docs/installation.md`, `docs/agent-checkpoint-heartbeat.md`, plugin README) <!-- completed: 2026-07-27 -->
- [x] Phase 4 Step 5: Add contract-parity, installer-isolation, pinned-CLI, and inspection-parity verification (44 python tests; smoke: installer exit 0, config diff exactly 3 additive lines, real checkpoint context_used 0.512, real `~/.hermes` untouched) <!-- completed: 2026-07-27 -->
- [x] (Phase 4 note) `checkpoint-inspect.js` naive main-guard pattern — RESOLVED: realpath guard applied + regression test <!-- completed: 2026-07-27 -->
- [x] Phase 4 verify command green + review-implementation + review-fix loops (final gate exit 0: node 58/58 0 skipped, python 44/44, `bash -n`; impl review Needs Rework 0 Critical/1 Major/3 Minor/2 Note → same-session review-fix F-1–F-4 + F-6, remediation addendum appended, no actionable findings) <!-- completed: 2026-07-27 -->
- [x] Cross-adapter inspection parity: four-harness logs read by `checkpoint-inspect` and `checkpoint-watch --once` unchanged (plan DoD, reviewer-confirmed) <!-- completed: 2026-07-27 -->
- [x] Reconcile plan status via update-plan after Phase 4 completion (plan DoD) — this update; all phases completed, plan completion pending user confirmation <!-- completed: 2026-07-27 -->

### Blocked

## Changelog

### 2026-07-27

- Plan created; todo initialized with Phase 1 grounding items.
- Plan review findings F-1–F-6 applied to plan.md and phase docs; review artifact: [reviews/plan-review.md](reviews/plan-review.md).
- Impl-plan phase-1 authored, reviewed ([reviews/impl-plan-review-phase-1.md](reviews/impl-plan-review-phase-1.md)), remediated (F-1–F-3).
- Phase 1 execution stopped at Codex stop gate (a); user decision Option A (session-level logging, no subagent attribution, `--profile-v2`, volatile multi-agent surface rejected) recorded in plan.md/phase-2.md; Steps 3–12 to resume under the revised gate.
- Phase 1 resumed: Claude revalidation done (10/10 items classified: 9 confirmed, 1 noted; gate (b) not triggered), Hermes research done (native plugin surface documented on pinned v0.19.0), stop gate (c) hit → user decision: native Hermes plugin via documented `hermes plugins enable` opt-in (recorded atomically in plan.md/phase-4.md); Steps 7–12 to resume under this decision.
- Phase 1 completed: Steps 7–12 executed (impl plans 2–4 authored, old drafts superseded-bannered, consistency pass, final gate `PHASE 1 ARTIFACT CHECKS PASSED`); impl review verdict Accepted (0 Critical/0 Major); F-1 (stale todo) and F-3 (wording) applied here. Phase 2 (Codex Integration) started.
- Phase 2 completed: Codex adapter + profile-v2 installer + docs delivered; stop conditions (mcp-list drift, 2 pre-existing test failures) resolved by primary decisions; review Accepted (F-1/F-2/F-3 closed); final gate 40/40 + `bash -n` green; agent-checkpoint-heartbeat phase 4 marked completed. Phase 3 (Claude Code Integration) started.
- Phase 3 completed: Claude Code plugin (`claude/agent-checkpoint/`) + installer Step 8 + docs delivered (17 behavioral tests; final gate 57/57 + `bash -n` green; pinned-CLI smoke 9/9 PASS; credential-free proof set accepted per Phase 2 precedent — live MODEL runs need credentials unavailable in isolated homes; carried stop conditions not triggered); impl review Accepted (0 Critical/0 Major/0 Minor/4 Note, zero actionable findings, no fix loop); agent-checkpoint-heartbeat phase 5 marked completed. Phase 4 (Hermes Integration) started; pending repopulated from phase-4-impl Steps 1–5.
- Phase 4 completed: pre-execution stop-and-revise recorded (pin `e0b9ab5a` unchanged — research gap, not drift; `subagent_start` exists on the pinned build, deliberately not adopted — documented follow-up; phase-4-impl.md revised in place); executed via execute-work-package (Blueprint APPROVE-WP4; implementer ses_05d2c5888ffesqKJ6sdSN27AyN completed Step 1 then context-exhausted; fresh implementer ses_05d09da42ffeeyEL641mspwWiM completed Steps 2–8); Hermes native plugin + installer Step 9 + docs delivered; `checkpoint-inspect.js` realpath main-guard fixed + regression test (Phase 4 note resolved); verify green (final gate exit 0: node 58/58 0 skipped, python 44/44, `bash -n`); impl review ([reviews/impl-review-phase-4.md](reviews/impl-review-phase-4.md)) verdict Needs Rework (0 Critical/1 Major/3 Minor/2 Note) → same-session review-fix remediated F-1–F-4 + F-6 (remediation addendum appended), no actionable findings remain; pinned smoke (v0.19.0, isolated HERMES_HOME) green — config diff exactly 3 additive lines, real checkpoint context_used 0.512, real `~/.hermes` untouched; cross-adapter inspection parity confirmed. All phases completed — Active Phase cleared; plan completion pending user confirmation (plan status stays `active`).
- Plan completed: user confirmed completion (2026-07-27); plan.md status set to `completed`. Nothing pending/in-progress/blocked.
