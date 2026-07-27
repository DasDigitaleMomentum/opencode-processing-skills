---
type: planning
entity: plan
plan: "checkpoint-harness-integration"
status: completed
created: "2026-07-27"
updated: "2026-07-27"
---

# Plan: checkpoint-harness-integration

## Problem / Context

The checkpoint/heartbeat pilot is complete for OpenCode (phases 1–3 of [agent-checkpoint-heartbeat](../agent-checkpoint-heartbeat/plan.md)): shared contract, core package, OpenCode plugin/tools, persona instructions, inspection, and the checkpoint-watch dashboard are implemented and verified. The Codex and Claude Code adapters are researched and grounded in the [phase-4](../agent-checkpoint-heartbeat/implementation/phase-4-impl.md) and [phase-5](../agent-checkpoint-heartbeat/implementation/phase-5-impl.md) implementation plans but are not implemented. Hermes currently receives skills only and has no grounded checkpoint approach (previously explicitly out of scope). The user now wants the checkpoint integration executed for Codex, Claude Code, and Hermes on this macOS machine.

## Target Outcome

Agents running under Codex, Claude Code, and Hermes can record checkpoints into the same workspace-root `.agent-checkpoints/` JSONL contract and expose `checkpoint_path`, installed through the existing multi-target installer, verified on the pinned macOS builds of this machine, with per-harness telemetry documented honestly (`null` where no defensible value exists). External inspection/watch tooling reads all harness logs unchanged.

## Guiding Decisions & Constraints

- Execute, don't re-research Codex/Claude: the phase-4/5 implementation plans of agent-checkpoint-heartbeat are the technical basis; Phase 1 performs their revalidation steps once and derives this plan's implementation plans from them.
- The shared raw contract is unchanged: current eight-field records with nullable agent/session-title metadata, strict legacy six-field read compatibility, no derived values in JSONL.
- The phase-4/5 impl plans were drafted against six-field wording; Phase 1 reconciles them with the shipped eight-field contract — including an explicit per-harness decision on `agent`/`session_title` sourcing (harness-supplied vs. honest `null`).
- The derived `implementation/phase-N-impl.md` files are execution-authoritative and supersede the old drafts; Phase 1 leaves a superseded pointer in the old artifacts, and any stop-and-revise targets the derived plan.
- Every harness integration is additive and opt-in: no mutation of base user configs (`config.toml`, `settings.json`, `~/.claude.json`, `~/.hermes/config.yaml`), symlink preservation, isolated test homes only. Clarified 2026-07-27 (gate (c), user decision): a harness's own documented opt-in enablement flow (`hermes plugins enable`, adding a single `plugins.enabled` key) counts as additive and opt-in, not forbidden mutation; installer smoke tests prove byte-for-byte preservation of all preexisting config content except the additive enablement entry.
- Honest telemetry: `context_used: null` is a valid outcome per harness (Codex expected `null`; Claude Code via statusline sidecar; Hermes per Phase 1 finding).
- Hermes gets the smallest defensible integration decided in Phase 1; if no native tool/hook surface exists, instruction-only via installed skills plus a documented external logging path is the accepted outcome. Resolved 2026-07-27 (gate (c), user decision): pinned Hermes v0.19.0 documents a native plugin tool/hook surface; the integration is a native plugin (`~/.hermes/plugins/agent-checkpoint/`) providing `checkpoint`/`checkpoint_path` tools plus lifecycle hooks, activated through the documented `hermes plugins enable` opt-in flow.
- KISS: no daemon, watchdog, recovery schema, transcript parsing, marketplace install, or centralized collection.
- Execution happens on this macOS machine (not a colleague handoff); pinned versions are recorded per adapter.

### Scope-Bounding Assumptions

- "Claude Code Desktop" means Claude Code on this macOS machine (`~/.claude` / `CLAUDE_CONFIG_DIR`), not the Claude Desktop app; a Desktop-app requirement would revise this plan (different, MCP-only surface).
- Hermes exposes at least its documented skills surface; any hook/MCP/plugin capability is unverified until Phase 1 research.
- The phase-4/5 impl plans remain valid modulo Phase 1 revalidation; if revalidation finds breaking drift, the affected impl plan is revised first (stop-and-revise, per those plans' blocking-decision rules).

## Requirements

### Functional

- [x] Codex sessions can call `checkpoint(done, next, step_failed=false)` and `checkpoint_path(session_id)` via a stdio MCP server, with session identity injected through documented hooks, activated by an additive profile (`codex --profile-v2 agent-checkpoint`); subagent attribution is out of scope on the pinned build (no documented subagent identity surface — decision 2026-07-27). (satisfied: Phase 2; credential-free stdio E2E accepted proof set)
- [x] Claude Code sessions can call both tools via a skills-directory plugin with bundled MCP server, hook-based identity injection, and a statusline-fed telemetry sidecar, activated by an opt-in `--settings` file. (satisfied: Phase 3; pinned-CLI smoke 9/9)
- [x] Hermes sessions can call `checkpoint` and `checkpoint_path` through the native Hermes plugin decided in Phase 1 (gate (c), 2026-07-27), activated via the documented `hermes plugins enable` opt-in flow, with behavior and limits (subagent start-time identity not adopted — the `subagent_start` hook exists on the pinned build; documented follow-up — and telemetry estimate-or-`null`) documented. (satisfied: Phase 4; isolated-home smoke, real checkpoint context_used 0.512)
- [x] All three harnesses append shared-contract records to workspace-root `.agent-checkpoints/` and keep runtime side state out of the raw logs. (satisfied: contract-parity tests per adapter, phases 2–4)
- [x] `install.sh` installs each adapter through its existing target (codex/claude/hermes) in global mode with symlink preservation and without changing other targets' behavior. (satisfied: Steps per target incl. Step 9 `install_hermes_checkpoint`; `bash -n` green)
- [x] Existing inspection (`checkpoint_path` consumers, checkpoint-watch dashboard) reads logs from all three harnesses without changes. (satisfied: Phase 4 four-harness inspection parity, reviewer-confirmed)

### Non-Functional

- [x] Phase 1 records each harness's pinned CLI version and revalidates documented API surfaces once before impl-plan authoring; adapter phases consume the confirmed plans and re-check the pin if the harness version changed since Phase 1. (satisfied: pins codex 0.131.0 / claude 2.1.170 / hermes v0.19.0 recorded Phase 1; no drift in adapter phases)
- [x] No base user configuration is mutated beyond the documented opt-in enablement entry (`plugins.enabled` in `~/.hermes/config.yaml`, gate-(c) clarification); all installer smoke tests use temporary homes and prove byte-for-byte preservation of preexisting config files, and of preexisting `config.yaml` content except the additive entry. (satisfied: per-target isolation smokes; Hermes config diff exactly 3 additive lines; real `~/.hermes` untouched)
- [x] All phase 1–3 pilot suites plus new per-adapter suites pass; `bash -n install.sh` and docs/frontmatter checks stay green. (satisfied: final gate node 58/58 + python 44/44 + `bash -n`, exit 0)
- [x] User-facing docs (installation guide, concept doc harness matrix, per-adapter READMEs) match implemented behavior and mark unsupported telemetry honestly. (satisfied: installation.md, harness matrix, codex/claude/hermes READMEs, config.yaml.example updated through Phase 4)

## Scope

### In Scope

- Phase 1 grounding: pinned-version revalidation of the Codex/Claude approaches, eight-field contract reconciliation, Hermes primary-source research and integration decision.
- Codex adapter implementation, installation, tests, docs (per the phase-4 impl plan of agent-checkpoint-heartbeat).
- Claude Code plugin implementation, installation, tests, docs (per the phase-5 impl plan of agent-checkpoint-heartbeat).
- Hermes integration per the Phase 1 decision, installation, tests, docs.
- Marking agent-checkpoint-heartbeat phases 4/5 completed (or superseded with a pointer) after the corresponding phases here complete.

### Out of Scope

- PydanticAI adapter (remains phase 6 of agent-checkpoint-heartbeat).
- Claude Desktop app integration, Cursor/Antigravity adapters, remote telemetry, centralized log collection.
- Changes to the shared raw JSONL contract or to OpenCode pilot behavior beyond bug fixes required by integration.
- Recovery schemas, transcript reconstruction, autonomous restart, or follow-up delegation.

## Definition of Done

- [x] `checkpoint`/`checkpoint_path` (or the Phase-1-decided Hermes equivalent) verified working on this machine's pinned Codex, Claude Code, and Hermes builds in isolated homes — credential-free proof sets per accepted Phase 2 precedent (Codex stdio E2E; Claude pinned smoke 9/9; Hermes installer smoke with real checkpoint, context_used 0.512).
- [x] Each adapter produces shared-contract JSONL, separates parent/subagent logs within documented harness limits (Codex session-level, Claude full, Hermes session-level), and returns honest telemetry (`null`/estimate per harness).
- [x] Installer smoke tests per target pass with base configs untouched (Hermes config diff exactly 3 additive lines; real `~/.hermes` untouched); existing OpenCode/skills installation behavior unchanged.
- [x] Cross-adapter inspection parity shown with the agent-checkpoint-heartbeat phase-3 inspection path (`checkpoint-inspect`) and checkpoint-watch over four-harness logs (pilot fixtures + real codex/claude records + hermes log), unchanged.
- [x] Docs updated: `docs/installation.md`, `docs/agent-checkpoint-heartbeat.md` harness matrix, `codex/README.md`, `claude/agent-checkpoint/README.md`, Hermes guidance (`hermes/agent-checkpoint/README.md`, `docs/agent-checkpoint-heartbeat.md`); `config.yaml.example` target comments current.
- [x] agent-checkpoint-heartbeat phases 4/5 status reconciled via update-plan (phase 4 via Phase 2, phase 5 via Phase 3); this plan's todo/changelog current via this update.

## Testing Strategy

- [x] Per-adapter Node suites: MCP protocol/tool behavior, hook identity injection, telemetry fallback, exact-record assertions (no internal fields persisted). (satisfied: codex/claude node suites; hermes python suite 44 tests incl. contract parity)
- [x] Installer isolation tests per target with temporary `*_HOME`/config dirs and preexisting-config snapshots. (satisfied: per-target isolation incl. Hermes config-diff assertion)
- [x] Real-CLI smoke per harness on this machine (isolated home + repository): tool discovery, one parent and one subagent checkpoint, selected-path inspection. (satisfied: pinned-CLI smokes per harness; subagent coverage within documented harness limits)
- [x] Full regression: `node --test packages/checkpoint-core/test/*.test.js opencode/test/*.test.mjs codex/test/*.test.mjs claude/test/*.test.mjs` (plus Hermes suite if applicable) and `bash -n install.sh`. (satisfied: final gate exit 0 — node 58/58 0 skipped, python 44/44, `bash -n`)

## Phases

| Phase | Title | Contribution | Detail | Status |
|-------|-------|--------------|--------|--------|
| 1 | Grounding and Hermes Research | Revalidates Codex/Claude approaches on pinned builds, reconciles the eight-field contract, and decides the Hermes integration approach. | [Phase](phases/phase-1.md) | completed |
| 2 | Codex Integration | Delivers the grounded Codex adapter with installer profile, tests, and docs. | [Phase](phases/phase-2.md) | completed |
| 3 | Claude Code Integration | Delivers the grounded Claude Code plugin with installer settings, tests, and docs. | [Phase](phases/phase-3.md) | completed |
| 4 | Hermes Integration | Delivers the Phase-1-decided Hermes integration with installer support, tests, and docs. | [Phase](phases/phase-4.md) | completed |

> All phases completed (2026-07-27). Plan completion confirmed by the user (2026-07-27) — status set to `completed`.

## Risks & Open Questions

| Risk/Question | Impact | Mitigation/Answer |
|---------------|--------|-------------------|
| Hermes may offer no tool/hook surface beyond skills. | Medium | Resolved 2026-07-27 (gate (c)): pinned v0.19.0 documents plugin tools + lifecycle hooks; native plugin adopted, activated via the documented `hermes plugins enable` opt-in flow; instruction-only fallback not needed. |
| Codex/Claude APIs drifted since the 2026-07-26 grounding. | High | Mandatory revalidation step per adapter on the pinned local build; stop-and-revise per the impl plans' blocking decisions. |
| Codex pinned build (0.131.0) has no documented subagent identity surface (no `SubagentStart`, no `agent_id` on hooks). | High | Resolved 2026-07-27: Phase 2 re-scoped to session-level logging with the limit documented; volatile multi-agent surface not adopted; revisit when Codex documents subagent identity. |
| Phase-4/5 impl plans predate the eight-field contract wording. | Medium | Phase 1 reconciles record fields (nullable agent/session-title) before execution. |
| Claude `--settings` merge behavior or statusline fields changed. | Medium | Revalidate on pinned build; never mutate base `settings.json` as a workaround. |
| `install.sh` is one shared file across three adapter phases. | Low | Phases run sequentially; each ends with `bash -n` plus isolated smoke tests green. |

## Changelog

### 2026-07-27

- Plan created to execute the checkpoint rollout for Codex, Claude Code, and Hermes on this macOS machine, reusing the grounded phase-4/5 implementation plans of agent-checkpoint-heartbeat and adding first-time Hermes grounding. Assumptions recorded: "Claude Code Desktop" = Claude Code CLI on macOS (`~/.claude`); Hermes approach decided in Phase 1.
- Plan review applied ([reviews/plan-review.md](reviews/plan-review.md), verdict: Needs Revision, 0 Critical/Major): F-1 revalidation ownership aligned to Phase 1; F-2 derived impl plans declared execution-authoritative and superseding; F-3 per-harness `agent`/`session_title` sourcing made explicit; F-4 cross-adapter inspection parity assigned to Phase 4; F-5 inspection-path reference qualified; F-6 multi-session Phase 1 noted.
- Impl-plan review applied ([reviews/impl-plan-review-phase-1.md](reviews/impl-plan-review-phase-1.md), verdict: Needs Revision → remediated): F-1 phase-2/3 docs cited in Steps 7/8; F-2 module links fixed; F-3 verify command strengthened (sourcing + Hermes decision greps).
- Phase 1 execution (execute-work-package) hit conditional stop gate (a): pinned codex-cli 0.131.0 lacks `SubagentStart` and `agent_id` on all hook surfaces; secondary finding: profile layering moved to `--profile-v2`. User decision (Option A): Phase 2 re-scoped to session-level logging without subagent attribution (documented build limit); volatile multi-agent surface not adopted; Steps 3–6 (Claude/Hermes) continue under the revised gate. Evidence: `/tmp/opencode/checkpoint-harness-integration-phase1/codex-revalidation.md` (machine-local).
- Phase 1 execution resumed (Steps 3–6): Claude Code surface revalidated on pinned claude 2.1.170 (10/10 items classified: 9 confirmed, 1 noted as volatile-watch — `--settings` merges, `agent_id` present on subagent hook inputs, plugin validate/discovery/naming confirmed; stop gate (b) NOT triggered; live hook-payload captures need auth in disposable homes, schema-level evidence stands). Hermes research completed on pinned v0.19.0 upstream `e0b9ab5a` (native plugin tools + lifecycle hooks + MCP client documented; `hermes checkpoints` disambiguated as shadow-git rollback store, never a contract substitute; no `subagent_start` event). Stop gate (c) hit: all global Hermes activation paths write `~/.hermes/config.yaml`. User decision: native plugin via the documented opt-in enablement flow (`hermes plugins enable`) counts as additive and opt-in; installer smoke tests amended (byte-for-byte except the additive `plugins.enabled` entry). Per-harness `agent`/`session_title` sourcing determined: Codex both `null`; Claude `agent` = hook `agent_type` (subagents) else `null`, `session_title` = statusline `session_name` else `null`; Hermes per phase-4 impl (titles in SQLite store, `--pass-session-id`). Evidence: `/tmp/opencode/checkpoint-harness-integration-phase1/` (machine-local).
- Phase 1 completed: impl review ([reviews/impl-review-phase-1.md](reviews/impl-review-phase-1.md), verdict **Accepted**, 0 Critical/0 Major/1 Minor/2 Note — F-1 stale todo reconciled via update-plan, F-3 wording precision applied, F-2 Claude-live-capture limitation already documented (phase-3 smoke remains behavioral proof). Final gate printed `PHASE 1 ARTIFACT CHECKS PASSED`. Phase 2 (Codex Integration) started.
- Phase 2 completed: Codex adapter implemented (`codex/` MCP runtime/server/hook/instruction, session-level logging, honest-null telemetry), installer extended (additive profile-v2 `$CODEX_HOME/agent-checkpoint.config.toml`, base `config.toml` byte-for-byte preserved), docs updated. Execution stop conditions resolved by primary decisions: (1) `--profile-v2` is runtime-command-only on 0.131.0 (`mcp list` has no profile support) → accepted proof set = TOML parse + layering-accepted (`debug prompt-input` exit 0) + credential-free stdio E2E; docs/impl-plan corrected; (2) broad gate red via 2 pre-existing failures root-caused and minimally fixed — opencode project-mode test path canonicalization (test bug) and `checkpoint-watch.js` main-guard symlink resolution (real pilot bug, regression test added). Impl review ([reviews/impl-review-phase-2.md](reviews/impl-review-phase-2.md), verdict **Accepted**, 0 Critical/0 Major/2 Minor/2 Note; F-1 smoke-log marker closed via independent reviewer re-execution, F-2 watch-guard regression test added, F-3 done here). Final gate: 40/40 + `bash -n` green. agent-checkpoint-heartbeat phase 4 marked completed. Phase 3 (Claude Code Integration) started.
- Phase 3 completed: Claude Code plugin delivered (`claude/agent-checkpoint/`: manifest, bundled MCP server, parent/subagent identity hooks, atomic statusline sidecar, instruction, README; 17 behavioral tests), installer extended (Step 8 `install_claude_checkpoint` + opt-in settings, Cursor renumbered Step 9; base `settings.json`/`~/.claude.json` untouched), docs updated. Executed via execute-work-package with a fresh implementer (prior session context-exhausted after evidence gathering, zero edits; secured evidence carried over). Primary decision: credential-free proof set accepted (Phase 2 precedent) — live parent/subagent MODEL runs need credentials unavailable in isolated homes; carried stop conditions (`agent_id` on PreToolUse, `--settings` merge) NOT triggered. Impl review ([reviews/impl-review-phase-3.md](reviews/impl-review-phase-3.md), verdict **Accepted**, 0 Critical/0 Major/0 Minor/4 Note; zero actionable findings, no fix loop). Final gate: 57/57 + `bash -n` green; pinned-CLI smoke (claude 2.1.170, disposable CLAUDE_CONFIG_DIR) 9/9 PASS. agent-checkpoint-heartbeat phase 5 marked completed. Phase 4 (Hermes Integration) started.
- Phase 4 impl plan stop-and-revise (Phase 1 research gap; pin unchanged @ `e0b9ab5a`, clean): the research mis-enumerated `VALID_HOOKS` — `subagent_start` exists (`plugins.py:164`, fired from `tools/delegate_tool.py` with parent/child identity payloads, documented) and `stop` is absent; no integration hook usage relied on `stop`. Primary decision recorded: the gated session-level design is kept; `subagent_start` is documented as available-but-not-adopted (follow-up option), mirroring the Codex gate-(a) precedent. Requirements wording, phase-4.md Notes/acceptance, and phase-4-impl.md facts/anchors corrected and re-verified against the pinned tree; no gated behavior, scope, or acceptance outcomes changed.
- Phase 4 completed: Hermes native plugin delivered (`hermes/agent-checkpoint/`: `checkpoint`/`checkpoint_path` tools, `on_session_start`/`pre_tool_call`/`pre_api_request` hooks, honest estimate-or-`null` telemetry with `AGENT_CHECKPOINT_CONTEXT_LIMIT_TOKENS` override, `agent`/`session_title` always `null`; `hermes/test/test_agent_checkpoint.py` 44 tests incl. installer isolation + cross-adapter parity), installer extended (Step 9 `install_hermes_checkpoint` + additive `plugins.enabled` text edit with loud stops — chosen because `save_config`/`atomic_yaml_write` rewrites the whole file; docs cite `hermes plugins enable|disable` as the user-facing flow; Cursor renumbered 10), docs updated (`config.yaml.example`, `docs/installation.md`, `docs/agent-checkpoint-heartbeat.md`), `checkpoint-inspect.js` realpath main-guard fixed + regression test (Phase 4 note resolved). Executed via execute-work-package (Blueprint APPROVE-WP4; implementer ses_05d2c5888ffesqKJ6sdSN27AyN completed Step 1 then context-exhausted; fresh implementer ses_05d09da42ffeeyEL641mspwWiM completed Steps 2–8). Pinned smoke (v0.19.0, isolated HERMES_HOME): installer exit 0, config diff exactly 3 additive lines, plugin listed enabled, real checkpoint context_used 0.512, checkpoint-inspect read the log, real `~/.hermes` untouched (spool `/tmp/opencode/checkpoint-harness-integration-phase4/`). Impl review ([reviews/impl-review-phase-4.md](reviews/impl-review-phase-4.md), verdict **Needs Rework**, 0 Critical/1 Major/3 Minor/2 Note) → same-session review-fix remediated F-1 (disabled-list loud stop), F-2 (negative-branch installer tests), F-3 (inline-dict loud stop), F-4 (telemetry model table precision), F-6 (continued-session binding doc); remediation addendum appended, no actionable findings remain. Final gate exit 0 (node 58/58, 0 skipped; python 44/44; `bash -n`). Cross-adapter inspection parity confirmed over four-harness logs. All phases completed; plan completion pending user confirmation (status stays `active`).
- Plan completed: user confirmed plan completion (2026-07-27); status set to `completed`. All DoD items satisfied/annotated; final gate exit 0 (node 58/58 0 skipped, python 44/44, `bash -n`).
