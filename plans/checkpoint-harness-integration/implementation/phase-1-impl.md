---
type: planning
entity: implementation-plan
plan: "checkpoint-harness-integration"
phase: 1
status: draft
created: "2026-07-27"
updated: "2026-07-27"
---

# Implementation Plan: Phase 1 - Grounding and Hermes Research

> Implements [Phase 1](../phases/phase-1.md) of [checkpoint-harness-integration](../plan.md)

## Approach

Phase 1 is a grounding and authoring phase: it produces no runtime code, no installer changes, and no test code. Execution runs on this macOS machine in four stages. (1) Confirm the pilot GO state and revalidate the Codex and Claude Code surfaces on the pinned local builds by executing every "revalidate before execution" item from the old [phase-4](../../agent-checkpoint-heartbeat/implementation/phase-4-impl.md) and [phase-5](../../agent-checkpoint-heartbeat/implementation/phase-5-impl.md) drafts, classifying each item confirmed or changed. (2) Reconcile the inherited six-field wording with the shipped eight-field contract (nullable `agent`/`session_title`, strict legacy six-field read) and determine per-harness `agent`/`session_title` sourcing from revalidated documented surfaces, with honest `null` as the default. (3) Research the pinned Hermes install from primary sources and decide the integration approach inside the plan-gated option space (native tool/hook surface vs instruction-only via installed skills plus a documented external logging path). (4) Author the execution-authoritative implementation plans for phases 2–4 sequentially via `author-and-verify-implementation-plan`, embed the dated revalidation addenda, mark the old drafts superseded, and run a cross-phase consistency pass.

Pinned version values and surface findings are recorded on this machine during execution — this plan specifies the recording procedure and deliberately asserts no version values. All harness probes are read-only on real homes; any captured payloads use disposable `*_HOME`/config dirs and OS temporary directories. No base user configuration (`config.toml`, `settings.json`, `~/.claude.json`, `~/.hermes` state) is mutated. The phase may span more than one session; create a handover via `generate-handover` when interrupting (Phase 1 Notes; plan changelog F-6).

## Affected Modules

| Module | Change Type | Description |
|--------|-------------|-------------|
| [Checkpoint Core](../../../docs/modules/checkpoint-core.md) | use | Read-only ground truth for the eight-field write / legacy six-field read contract during reconciliation; no code changes. |
| [Installation and Configuration](../../../docs/modules/installation-and-configuration.md) | use | Read-only reference for existing codex/claude/hermes target behavior and invariants (skills-only codex, skills+agents claude, namespaced hermes skills) the derived plans must preserve; no installer changes in this phase. |
| Plan artifacts (this plan) | create | `implementation/phase-2-impl.md`, `phase-3-impl.md`, `phase-4-impl.md` derived/authored as execution-authoritative. |
| Plan artifacts (agent-checkpoint-heartbeat) | modify | Superseded-pointer banners added to the old phase-4/5 impl drafts only; no frontmatter status or scope edits. |

## Required Context

| File | Why |
|------|-----|
| `plans/checkpoint-harness-integration/plan.md` | Global constraints: revalidation ownership (F-1), supersession (F-2), per-harness sourcing (F-3), inspection parity (F-4), KISS, honest telemetry, additive/opt-in invariants. |
| `plans/checkpoint-harness-integration/phases/phase-1.md` | Gated scope, deliverables, and acceptance criteria this plan must satisfy. |
| `plans/checkpoint-harness-integration/phases/phase-2.md` | Gated Codex scope, deliverables, and acceptance criteria the derived phase-2-impl.md must satisfy — including the verify-command growth (`bash -n install.sh`) and marking agent-checkpoint-heartbeat phase 4 completed via `update-plan`, both absent from the old draft. |
| `plans/checkpoint-harness-integration/phases/phase-3.md` | Gated Claude Code scope, deliverables, and acceptance criteria the derived phase-3-impl.md must satisfy — including the verify-command growth (`bash -n install.sh`) and marking agent-checkpoint-heartbeat phase 5 completed via `update-plan`, both absent from the old draft. |
| `plans/checkpoint-harness-integration/phases/phase-4.md` | Bounded Hermes decision space ("native tool surface if Hermes documents one, otherwise instruction-only") and phase-4 expectations the derived plan must serve. |
| `plans/agent-checkpoint-heartbeat/plan.md` | Eight-field raw contract, legacy six-field compatibility, adapter-generated ID allowance, GO state of phases 1–3. |
| `plans/agent-checkpoint-heartbeat/implementation/phase-4-impl.md` | Codex technical basis: Step 1 revalidation items, hook/MCP approach, volatile-API list, blocking decisions to carry forward. |
| `plans/agent-checkpoint-heartbeat/implementation/phase-5-impl.md` | Claude Code technical basis: Step 1 revalidation items, plugin/MCP/statusline approach, blocking decisions to carry forward. |
| `packages/checkpoint-core/src/index.js` | Current record writer/reader ground truth (`RECORD_FIELDS`, `validateCheckpointRecord`, `normalizeCheckpointRecord`, `createCheckpointRecord`). |
| `docs/agent-checkpoint-heartbeat.md` | Concept semantics (chain, failed-step, telemetry honesty) the derived plans must not contradict. |
| `docs/modules/checkpoint-core.md` | Curated contract inventory confirming eight-field current schema and legacy normalization. |
| `install.sh` | Existing codex/claude/hermes target sections (skills-only codex, skills+agents claude, hermes `skills/processing` category) and symlink/override invariants. |
| `config.yaml.example` | Existing target definitions and comments the derived plans will extend. |
| `skills/author-and-verify-implementation-plan/SKILL.md` and `tpl-implementation-plan.md` | Authoring workflow, sequential-processing and consistency rules, canonical template for the derived plans. |
| `skills/generate-handover/SKILL.md` | Only when interrupting mid-phase (multi-session note). |

## Implementation Steps

### Step 1: Confirm pilot GO state and execution prerequisites

- **What**: Read `plans/agent-checkpoint-heartbeat/plan.md` (changelog, phase table) and its phase-3 artifacts to confirm phases 1–3 are completed with GO recorded. On this machine, confirm presence and pinnability of all three CLIs: `command -v codex claude hermes` resolves and each binary answers its documented version command. Confirm the Hermes install/discovery path (the version output's reported install directory and `~/.hermes`). Record only presence/pinnability here; version values are recorded into the addenda in Steps 2, 3, and 5. Change nothing on any harness.
- **Where**: Repo `plans/`; this machine's `PATH` and harness homes (read-only probes).
- **Authorized By**: Phase 1 Prerequisites (pilot GO "satisfied per its changelog; confirm before starting"; CLIs installed and pinnable; Hermes install/discovery path available); plan constraint that execution happens on this macOS machine.
- **Why**: Authoring execution-authoritative plans against missing or unpinnable harnesses would invalidate every downstream artifact.
- **Considerations**: If a CLI is absent or cannot report a version, the prerequisite fails — stop and report to primary; installing or upgrading harnesses is not authorized by this phase. Authoring-time probe (this session) confirmed all three binaries resolve, but execution must re-verify because machine state drifts.

### Step 2: Revalidate the Codex surface on the pinned build

- **What**: Execute every revalidation item from the old phase-4 draft's Step 1 on this machine: record `codex --version`; verify global-option ordering and `--profile` selection via CLI help; generate the installed-version app-server TypeScript/JSON schemas into an OS temporary directory; inspect the installed hook surface for common `session_id`/`cwd`, `SubagentStart.agent_id`, `PreToolUse.updatedInput`, canonical MCP tool naming (`mcp__agent_checkpoint__checkpoint`), and any token-usage fields; compare each result against the official docs URLs cited in the old draft's Required Context. Classify every item **confirmed** or **changed** (with the temp evidence path). Items hitting the old draft's stop conditions (profile layering, hook argument rewriting, MCP tool matching changed) are recorded as changed and raised — never worked around.
- **Where**: This machine's pinned Codex CLI; `$(mktemp -d)` scratch only; outcomes feed the phase-2-impl Revalidation Addendum (Step 7).
- **Authorized By**: Phase 1 Scope → Includes ("Record pinned versions … and revalidate the documented surfaces listed in the revalidation steps of the phase-4 and phase-5 impl plans"); plan Non-Functional requirement (Phase 1 records pinned CLI versions and revalidates once before impl-plan authoring); old phase-4 draft Step 1 authorization chain (its phase prerequisite + plan API-drift risk mitigation).
- **Why**: The derived phase-2 plan must be execution-authoritative against the real pinned build, not the 2026-07-26 grounding.
- **Considerations**: Never touch the real `~/.codex` configuration during revalidation; temp dirs only. Treat online `main`-branch APIs as volatile — the pinned local build is authoritative. Preserve the old draft's documented-volatile list (app-server WebSocket, plugin list/install methods, prompt/agent hooks, asynchronous hooks, generated token fields) as revalidation targets, not adoption candidates.

### Step 3: Revalidate the Claude Code surface on the pinned build

- **What**: Execute every revalidation item from the old phase-5 draft's Step 1 on this machine: record `claude --version`; verify `CLAUDE_CONFIG_DIR`, `--settings` merge-vs-replace behavior, `plugin validate --strict`, skills-directory plugin discovery, plugin-scoped MCP tool names, command-hook input/output, and statusline JSON with the installed CLI. Capture representative parent/subagent `PreToolUse` payloads and a statusline payload into an OS temporary directory using a disposable `CLAUDE_CONFIG_DIR` and a throwaway project. Confirm `session_id`, `agent_id` on the subagent `PreToolUse` path, `workspace.project_dir`, and `context_window` fields. Classify every item confirmed or changed with evidence paths.
- **Where**: This machine's pinned Claude Code CLI; disposable config/project/temp captures only; outcomes feed the phase-3-impl Revalidation Addendum (Step 8).
- **Authorized By**: Phase 1 Scope → Includes (same revalidation mandate); plan Non-Functional requirement (pinned-version revalidation before impl-plan authoring); old phase-5 draft Step 1 authorization chain.
- **Why**: Statusline token semantics and plugin/hook naming carry minimum-version changes, and the old draft explicitly notes `claude` was not installed in its authoring environment — this machine has it (`/opt/homebrew/bin/claude` at authoring time), so grounding must be refreshed from real behavior, not assumed.
- **Considerations**: Never inspect or alter the real `~/.claude`, `~/.claude.json`, settings, or statusline; all captures use disposable homes. Preserve the old draft's stop conditions: `agent_id` absent on the checkpoint `PreToolUse` path, or `--settings` replacing rather than merging required settings, are record-and-raise findings, not design-around opportunities.

### Step 4: Reconcile the eight-field contract and determine per-harness agent/session_title sourcing

- **What**: For Codex and Claude, determine from the revalidated surfaces (Steps 2–3) which documented fields, if any, can defensibly supply `agent` and `session_title`. Apply the honesty criterion: use a harness-supplied value only when a documented, revalidated surface provides it on the pinned build; otherwise record honest `null`. Record each harness's determination as an explicit Open Decision in its derived impl plan. Update all inherited six-field wording to the current contract: new records are exactly eight fields (nullable `agent`/`session_title`); legacy six-field logs remain readable without migration; no derived values (percentages, filenames, remaining tokens, internal IDs) enter JSONL.
- **Where**: Content feeding the derived plans (Steps 7–9); ground truth `packages/checkpoint-core/src/index.js` (`RECORD_FIELDS`/`LEGACY_RECORD_FIELDS`/`METADATA_FIELDS`, `validateCheckpointRecord`, `normalizeCheckpointRecord`, `createCheckpointRecord`).
- **Authorized By**: Phase 1 Scope → Includes (reconcile with the eight-field contract "including an explicit per-harness decision on where `agent`/`session_title` values come from … recorded in each derived impl plan"); plan Guiding Decisions (shared raw contract unchanged; honest telemetry); Phase 1 Acceptance Criterion (no impl plan assumes six-field-only wording); plan changelog F-3.
- **Why**: F-3 makes the sourcing decision explicit rather than inherited by default; the old drafts predate the eight-field wording.
- **Considerations**: Do not invent identity sources (transcript parsing, inferred titles) — that violates the KISS and honesty invariants and the plan's transcript-parsing exclusion. The core package itself is not modified by this phase ("Changes to the shared raw JSONL contract" is out of scope).

### Step 5: Research the Hermes integration surface from primary sources

- **What**: On this machine's pinned Hermes install, enumerate integration surfaces from primary sources only: record `hermes --version` (version string and upstream commit); read CLI help for the surface-bearing subcommands (`hooks`, `mcp`, `plugins`, `skills`, `sessions`, `acp`, and `checkpoints` for disambiguation); inspect the git install tree at the reported install directory (hook handling, tool/skill loading, session/identity model); inspect the `~/.hermes` runtime layout read-only (existing `hooks/` and `skills/` category dirs); and consult upstream primary docs/source pinned to the installed commit (not floating `main`). Answer four questions: (a) is there an agent-callable custom-tool surface (MCP, plugin toolsets); (b) is there a lifecycle hook surface capable of identity/workspace injection; (c) what is the session/identity model (session IDs, subagent or delegation identity if any); (d) is any defensible context-occupancy telemetry exposed. Explicitly disambiguate Hermes' native `checkpoints` feature from this plan's shared JSONL contract.
- **Where**: Pinned Hermes CLI and install tree (read-only); OS temporary directory for captured help/probe output; outcomes feed Step 6 and the phase-4 impl plan.
- **Authorized By**: Phase 1 Scope → Includes ("Research Hermes integration points from primary sources (skills, hooks, MCP, plugin/API surface) and its session/identity model"); plan Scope-Bounding Assumption (Hermes hook/MCP/plugin capability is unverified until Phase 1 research).
- **Why**: Hermes is the only genuinely new ground in this plan; the decision and the phase-4 impl plan depend on verified surface facts.
- **Considerations**: Probes are read-only (`--version`, `--help`, file reads). Do not run Hermes chat/agent flows that mutate `~/.hermes` state, send messages, or consume inference credentials. Do not adopt Hermes-native checkpoint/session state as a substitute for the shared `.agent-checkpoints/` JSONL logs. Authoring-time probe noted the `hooks`/`mcp`/`plugins`/`skills`/`sessions`/`acp` subcommands and an empty `~/.hermes/hooks/` — candidates to verify, not established facts.

### Step 6: Decide the Hermes integration approach (gated, bounded)

- **What**: Choose within the plan-gated option space using the "smallest defensible integration" criterion: (a) a native tool/hook surface writing shared-contract JSONL, if Step 5 verified a documented one on the pinned build; otherwise (b) instruction-only via the installed Hermes skills plus a documented external logging path. Record the decision with rationale, documented limits, the fallback, testable acceptance implications, and the Hermes `agent`/`session_title` sourcing (per the Step 4 criterion) in the phase-4 impl plan. If research surfaces an option outside the gated space (e.g., a surface requiring an always-on daemon, base-config mutation, or a product/policy judgment), record it under the phase-4 plan's Blocking Decisions and stop for primary instead of choosing.
- **Where**: Decision recorded in `plans/checkpoint-harness-integration/implementation/phase-4-impl.md` (authored in Step 9).
- **Authorized By**: Phase 1 Scope → Includes ("Decide the Hermes approach … with rationale"); plan Guiding Decision (smallest defensible integration; instruction-only fallback is the accepted outcome); Phase 1 Deliverables (decision recorded inside the phase-4 implementation plan); Phase 1 Acceptance Criterion (explicit decision, rationale, testable implications, no undocumented unknown surface); phase-4 gated scope (native surface only "if Hermes documents one").
- **Why**: Converts Hermes from an unknown surface into an executable phase with an honest fallback.
- **Considerations**: Instruction-only is a plan-accepted outcome, not a failure — document its limits honestly (instructed behavior without tool enforcement, no live telemetry beyond what the harness exposes). Do not expand the option space unilaterally.

### Step 7: Author the derived phase-2 implementation plan (Codex)

- **What**: Via `author-and-verify-implementation-plan`, derive `plans/checkpoint-harness-integration/implementation/phase-2-impl.md` from the old phase-4 draft against the gated scope, deliverables, and acceptance criteria of [phase-2.md](../phases/phase-2.md): carry forward the approach, steps, and tests; apply Step 2 confirmed/changed results, revising affected content per the old draft's stop-and-revise rule; embed the dated **Revalidation Addendum (YYYY-MM-DD)** — pinned version, per-item confirmed/changed status, evidence references — as a subsection under Reality Check; record the `agent`/`session_title` sourcing Open Decision; update six-field→eight-field wording and colleague-handoff→this-machine wording; keep the old draft's volatile-API list and blocking decisions current. Carry the phase-2 acceptance criteria the old draft does not contain: grow the verify command to the phase-2 composition (`node --test packages/checkpoint-core/test/*.test.js opencode/test/*.test.mjs codex/test/*.test.mjs` plus `bash -n install.sh`) and include marking agent-checkpoint-heartbeat phase 4 completed via `update-plan` after Phase 2 completes.
- **Where**: `plans/checkpoint-harness-integration/implementation/phase-2-impl.md` (new file).
- **Authorized By**: `plans/checkpoint-harness-integration/phases/phase-2.md` (gated Codex scope, deliverables, and acceptance criteria the derived plan must satisfy); Phase 1 Scope → Includes ("Author/verify the per-phase implementation plans for phases 2–4 via author-and-verify-implementation-plan (deriving from the referenced old impl plans)"); plan Guiding Decision (derived impl plans are execution-authoritative and supersede the old drafts); Phase 1 Deliverables (verified phase-2 impl plan referencing the eight-field contract and current primary APIs; addendum attached to the affected implementation plan).
- **Why**: Phase 2 must consume a plan grounded in this machine's pinned build and the current contract.
- **Considerations**: Sequential authoring (2 before 3 before 4) per the skill's sequential-processing rule. If Step 2 produced an unresolved stop-condition finding (e.g., subagent ID carriage impossible on the pinned build), carry it into the derived plan's Blocking Decisions instead of designing around it — no silent merge of parent/subagent logs.

### Step 8: Author the derived phase-3 implementation plan (Claude Code)

- **What**: Same derivation pattern from the old phase-5 draft plus Step 3 results, against the gated scope, deliverables, and acceptance criteria of [phase-3.md](../phases/phase-3.md): carry forward the plugin/MCP/hook/statusline-sidecar approach; apply confirmed/changed results; embed the dated Revalidation Addendum under Reality Check; record the sourcing Open Decision; update contract wording and handoff wording; refresh minimum-version notes against the pinned build; keep the old draft's blocking decisions current. Carry the phase-3 acceptance criteria the old draft does not contain: grow the verify command to the phase-3 composition (`node --test packages/checkpoint-core/test/*.test.js opencode/test/*.test.mjs codex/test/*.test.mjs claude/test/*.test.mjs` plus `bash -n install.sh`) and include marking agent-checkpoint-heartbeat phase 5 completed via `update-plan` after Phase 3 completes.
- **Where**: `plans/checkpoint-harness-integration/implementation/phase-3-impl.md` (new file).
- **Authorized By**: `plans/checkpoint-harness-integration/phases/phase-3.md` (gated Claude Code scope, deliverables, and acceptance criteria the derived plan must satisfy); Phase 1 Scope → Includes (same derivation mandate); plan Guiding Decision (derived plans supersede); Phase 1 Deliverables (verified phase-3 impl plan; addendum attached).
- **Why**: Phase 3 must consume a plan revalidated against the pinned Claude build — the old draft was grounded without a local `claude` binary.
- **Considerations**: Preserve the old draft's documented statusline semantics (latest-response, input-only percentage, null before first response/after compaction) and its sidecar invariants (atomic latest-value cache, never recovery state, never selected by inspection). Carry forward stop conditions unchanged (`agent_id` on `PreToolUse`; `--settings` merge behavior).

### Step 9: Author the phase-4 implementation plan (Hermes)

- **What**: Author fresh — no old draft exists — via the same skill and template, from Steps 5–6: the decided approach with rationale and limits; installer integration bounded to what the decided approach requires of the existing Hermes target (keeping the `skills/processing` category tidy and removable); tests proportionate to the decided surface plus Hermes-target installer isolation; docs requirements (installation guide section, concept-doc harness row, `config.yaml.example` comments); the `agent`/`session_title` sourcing decision; and the cross-adapter inspection-parity requirement (`checkpoint-inspect` and checkpoint-watch reading all harness logs unchanged) that F-4 assigns to Phase 4. For an instruction-only outcome, specify the checkpoint-instruction packaging into installed Hermes skills and the documented external logging path with honest limits instead of inventing a tool surface.
- **Where**: `plans/checkpoint-harness-integration/implementation/phase-4-impl.md` (new file).
- **Authorized By**: Phase 1 Deliverables (Hermes decision recorded inside the phase-4 implementation plan); plan Scope (Hermes integration per the Phase 1 decision); phase-4 gated scope and acceptance criteria; plan changelog F-4 (inspection parity assigned to Phase 4).
- **Why**: Phase 4 has no prior draft; it needs the same execution-authoritative quality as the derived plans, and its prerequisite (phases 2–3 completed, shared `install.sh` sequential) must be reflected in its content.
- **Considerations**: Do not plan Hermes plugin/MCP infrastructure that Step 5 did not find documented on the pinned build (phase-4 Excludes). Do not conflate Hermes' native `checkpoints` feature with the shared contract.

### Step 10: Record superseded pointers in the old drafts

- **What**: Add a short dated banner at the top of `plans/agent-checkpoint-heartbeat/implementation/phase-4-impl.md` and `phase-5-impl.md` stating each is superseded as execution authority by the corresponding derived plan in this plan's `implementation/` directory, remains as research evidence, and that any stop-and-revise targets the derived plan. Make no other edits to the old plan: phase-status reconciliation in agent-checkpoint-heartbeat happens later via `update-plan` after the corresponding phases here complete (plan DoD), not in this phase.
- **Where**: The two old impl-plan files.
- **Authorized By**: plan Guiding Decision ("Phase 1 leaves a superseded pointer in the old artifacts, and any stop-and-revise targets the derived plan"); Phase 1 Deliverables (superseded pointer recorded in the old phase-4/5 impl plans).
- **Why**: Prevents future sessions from executing stale drafts while preserving them as grounded research.
- **Considerations**: Do not change old plan/phase frontmatter status here — that is gated to `update-plan` ("Marking agent-checkpoint-heartbeat phases 4/5 completed (or superseded with a pointer) after the corresponding phases here complete").

### Step 11: Cross-phase consistency check and phase wrap-up

- **What**: Re-read the three authored impl plans as a set and verify: shared naming (composite ID format `<session_id>--<agent_id>`; internal fields `_checkpoint_session_id`, `_workspace_root`, `_telemetry_session_id`); workspace-root sourcing per harness (Codex hook `cwd`; Claude `CLAUDE_PROJECT_DIR`; Hermes per the Step 6 decision); identical eight-field contract language; verify-command composition matching the plan Testing Strategy (phase-scoped suites growing to the full regression plus `bash -n install.sh`); and that no phase's `install.sh` changes assume a later phase's state (sequential phases, one shared file). Fix inconsistencies directly in the authored plans; raise only items requiring a primary decision. If the phase was interrupted across sessions, ensure the handover exists (`plans/checkpoint-harness-integration/handovers/`) per Phase 1 Notes.
- **Where**: The three authored impl plans; `plans/checkpoint-harness-integration/handovers/` (only when interrupted).
- **Authorized By**: `author-and-verify-implementation-plan` consistency rule (author-owned cross-phase check; fix directly, flag only primary-decision items); plan Risk row (`install.sh` is one shared file; phases run sequentially); Phase 1 Notes (multi-session; handover via `generate-handover` when interrupting); plan changelog F-6.
- **Why**: Adapter phases consume these plans independently; drift between them would surface as installer conflicts or contract drift mid-execution.
- **Considerations**: Consistency fixes must not alter gated phase scopes; anything requiring a scope change goes to primary via `update-plan`.

## Testing Plan

Verify command:

```bash
set -e; for f in plans/checkpoint-harness-integration/implementation/phase-2-impl.md plans/checkpoint-harness-integration/implementation/phase-3-impl.md plans/checkpoint-harness-integration/implementation/phase-4-impl.md; do grep -q "session_title" "$f" && grep -q "## Reality Check" "$f" || { echo "FAIL: $f missing contract wording or Reality Check"; exit 1; }; done; for f in plans/checkpoint-harness-integration/implementation/phase-2-impl.md plans/checkpoint-harness-integration/implementation/phase-3-impl.md; do grep -q "Revalidation Addendum" "$f" && grep -qi "sourcing" "$f" || { echo "FAIL: $f missing revalidation addendum or agent/session_title sourcing decision"; exit 1; }; done; grep -qi "rationale" plans/checkpoint-harness-integration/implementation/phase-4-impl.md && grep -qi "fallback" plans/checkpoint-harness-integration/implementation/phase-4-impl.md || { echo "FAIL: phase-4-impl.md missing Hermes decision record (rationale/fallback)"; exit 1; }; for f in plans/agent-checkpoint-heartbeat/implementation/phase-4-impl.md plans/agent-checkpoint-heartbeat/implementation/phase-5-impl.md; do grep -qi "superseded" "$f" || { echo "FAIL: $f missing superseded pointer"; exit 1; }; done; ! grep -n "exact six-field" plans/checkpoint-harness-integration/implementation/phase-2-impl.md plans/checkpoint-harness-integration/implementation/phase-3-impl.md plans/checkpoint-harness-integration/implementation/phase-4-impl.md && echo "PHASE 1 ARTIFACT CHECKS PASSED"
```

| Test Type | What to Test | Expected Outcome |
|-----------|-------------|-----------------|
| Structural artifact check | Derived impl plans exist with eight-field contract wording and Reality Check sections; phase-2/3 embed revalidation addenda and record the `agent`/`session_title` sourcing decision; phase-4 records the Hermes decision (rationale, fallback); old drafts carry superseded pointers; no stale six-field-only test wording | Verify command prints `PHASE 1 ARTIFACT CHECKS PASSED` |
| Revalidation completeness | Every old-draft Step 1 revalidation item appears in the addenda marked confirmed or changed; changed items are reflected in revised derived-plan content or carried as blocking decisions | Manual checklist review of both addenda; Phase 1 Acceptance Criterion 1 satisfied |
| Hermes decision record | phase-4-impl states the approach, rationale, limits, fallback, sourcing, and testable acceptance implications | Manual review; Phase 1 Acceptance Criterion 3 satisfied |
| Code/test regression | N/A — this phase changes no code, tests, installer, or configuration; existing suites and `bash -n install.sh` are unaffected by plans-only edits, so no suite run is required here | Adapter phases carry suite-level regression per the plan Testing Strategy |

### Test Integrity Constraints

- No existing tests are affected: Phase 1 edits only `plans/` artifacts; `packages/checkpoint-core/test/`, `opencode/test/`, `install.sh`, and all harness homes remain untouched.
- Derived impl plans must carry forward the old drafts' integrity constraints in contract-current wording (exact eight-field records for new writes; legacy six-field logs readable without migration; hook-injected/internal fields never persisted). That wording update is the authorized reconciliation, not a weakening of test intent.
- Revalidation must not weaken the old drafts' stop conditions; carried-forward blocking decisions remain record-and-raise gates.
- All harness probes are read-only on real homes; any capture uses disposable `*_HOME`/config dirs and OS temporary directories, preserving the installer's byte-for-byte base-config invariant.

## Rollback Strategy

Delete the three authored impl plans under `plans/checkpoint-harness-integration/implementation/` and revert the two banner edits in the old agent-checkpoint-heartbeat drafts. This phase changes no runtime, code, config, or harness state (probes are read-only, scratch lives in OS temp directories), so no migration or machine cleanup is required beyond the `plans/` files.

## Open Decisions

| Decision | Options | Chosen | Rationale |
|----------|---------|--------|-----------|
| Revalidation addendum placement | Separate addendum files; embedded dated subsection in each derived impl plan | Embedded `Revalidation Addendum (YYYY-MM-DD)` subsection under Reality Check | The gated deliverable says "attached to the affected implementation plans"; embedding keeps the artifact set gated and preserves the canonical top-level template headings. |
| Authoring order | Author phase-2/3 plans immediately after each revalidation; or revalidate both, determine sourcing, research/decide Hermes, then author 2→3→4 | Revalidate → sourcing → Hermes research/decision → author 2→3→4 | Matches the Phase 1 Includes ordering; a single authoring pass with all decisions in hand avoids rework; the skill's sequential-processing rule is preserved within the authoring stage. |
| Probe evidence retention | Commit captured payloads/schemas to the repo; OS temp dirs with outcomes recorded in addenda | OS temp dirs; outcomes in addenda/decision records | KISS; the gated deliverables contain no evidence files, and machine-local dumps do not belong in version control (consistent with the repo's local-state ignore conventions). |

## Reality Check

### Code Anchors Used

| File | Symbol/Area | Why it matters |
|------|-------------|----------------|
| `plans/checkpoint-harness-integration/plan.md` | Guiding Decisions; Risks; Changelog F-1..F-6 | Gated constraints: Phase 1 owns revalidation; derived plans supersede; per-harness sourcing required; KISS; honest telemetry. |
| `plans/checkpoint-harness-integration/phases/phase-1.md` | Scope, Deliverables, Acceptance Criteria | Authorizing gate for every step in this plan. |
| `plans/checkpoint-harness-integration/phases/phase-4.md` | Scope ("native tool surface if Hermes documents one"); Prerequisites; Notes | Bounds the Hermes decision space and confirms instruction-only is an accepted outcome. |
| `plans/agent-checkpoint-heartbeat/implementation/phase-4-impl.md` | Step 1; Reality Check; Blocking Decisions | Source of the Codex revalidation items, volatile-API list, and stop conditions carried into Steps 2 and 7. |
| `plans/agent-checkpoint-heartbeat/implementation/phase-5-impl.md` | Step 1; Reality Check; Blocking Decisions | Source of the Claude revalidation items and stop conditions carried into Steps 3 and 8; notes `claude` was absent in its authoring environment. |
| `packages/checkpoint-core/src/index.js` | `RECORD_FIELDS`/`LEGACY_RECORD_FIELDS`/`METADATA_FIELDS` (lines 4–13); `validateCheckpointRecord` (59–115); `normalizeCheckpointRecord` (117–124); `createCheckpointRecord` (126–148) | Confirms the shipped contract: exact eight-field writes with nullable `agent`/`session_title`; strict legacy six-field acceptance normalized in memory without rewriting source bytes. |
| `install.sh` | Target header map (lines 20–37); target resolution (228–318); Hermes category handling (1014–1030) | Confirms codex = skills-only, claude = skills+agents, hermes = skills into `skills/processing`, with `OPS_*` overrides and tri-state enablement — invariants the derived plans must preserve. |
| `config.yaml.example` | `targets.codex` / `targets.claude` / `targets.hermes` | Existing target schema and comments the derived plans will extend. |
| `docs/modules/checkpoint-core.md` | Overview / Responsibility | Curated confirmation of the contract semantics used for reconciliation. |
| This machine (authoring probes, read-only) | `command -v codex claude hermes` → `/opt/homebrew/bin/codex`, `/opt/homebrew/bin/claude`, `~/.local/bin/hermes`; `hermes --version` reports a pinned version with upstream commit and git install dir `~/.hermes/hermes-agent`; `hermes --help` lists `hooks`/`mcp`/`plugins`/`skills`/`sessions`/`acp`/`checkpoints` subcommands; `~/.hermes/hooks/` exists and is empty | Confirms Phase 1 prerequisites (all three CLIs present and pinnable; Hermes discovery path available) and grounds the Step 5 probe list. Version values intentionally not recorded here — see Mismatches / Notes. |

### Mismatches / Notes

- The old phase-4/5 drafts assume six-field contract wording and a colleague handoff; the derived plans must update both (authorized by the Phase 1 reconciliation scope item and plan changelog F-2/F-3). Their "revalidate before execution" checklists become this machine's revalidation addenda.
- Hermes exposes a native `checkpoints` subcommand (its own session feature) — a name collision with this plan's contract. Step 5 must disambiguate it and must not substitute Hermes-native state for the shared `.agent-checkpoints/` JSONL logs.
- Pinned version values are deliberately not asserted in this plan: per the phase deliverable they are recorded on this machine during execution. Authoring confirmed only CLI presence/paths; any value quoted now would be unverified at execution time.
- The plan's Non-Functional requirements mention "docs/frontmatter checks"; the repo has no dedicated frontmatter script (no root `package.json` or `scripts/`). Phase 1 changes no executable code, so suite-level regression is carried by the adapter phases; this phase's verification is the structural artifact check above.
- `install.sh` Hermes handling (namespaced `skills/processing` category, `DESCRIPTION.md` frontmatter) is existing behavior the phase-4 derived plan must preserve; Phase 1 does not modify it.
- There is no docs module inventory for Hermes; Hermes grounding comes from the pinned local install and upstream primary sources during execution (Step 5).

### Blocking Decisions

- None for authoring this implementation plan: the Hermes approach decision (within the bounded option space) and the per-harness `agent`/`session_title` sourcing decisions are gated to Phase 1 execution, and this plan specifies their decision procedures without pre-choosing outcomes.
- Conditional stop gates carried from the old drafts and the plan risk table — record-and-raise to primary, never design around: (a) the pinned Codex build cannot preserve a distinct subagent checkpoint ID through documented `SubagentStart` context plus `PreToolUse` rewriting; (b) the pinned Claude build lacks `agent_id` on the checkpoint `PreToolUse` path, or `--settings` replaces rather than merges required settings; (c) Hermes research surfaces an integration option outside the gated space (daemon, base-config mutation, or a product/policy judgment).
