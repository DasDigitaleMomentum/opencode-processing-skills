---
type: planning
entity: implementation-plan
plan: "agent-checkpoint-heartbeat"
phase: 6
status: draft
created: "2026-07-26"
updated: "2026-07-26"
---

# Implementation Plan: Phase 6 - PydanticAI Adapter

> Implements [Phase 6](../phases/phase-6.md) of [agent-checkpoint-heartbeat](../plan.md)

## Approach

Add one self-contained Python package at `packages/pydanticai-checkpoint/` using public PydanticAI APIs and a small native Python implementation of the shared observable contract. The package will expose context-bearing function tools for `Agent(..., tools=[...])` or decorator registration, a typed `CheckpointDeps` carrying the workspace root, a deterministic identity helper, and the common agent instruction. It will load the monorepo's shared contract fixtures in tests rather than importing the JavaScript runtime from Python.

Use `RunContext.conversation_id` as the checkpoint session identifier because current PydanticAI defines it as the identity that may span multiple runs sharing history. Fall back to `RunContext.run_id` only if a pinned version provides no usable conversation ID; never use `tool_call_id`, which is scoped to one tool invocation. `checkpoint_path(session_id)` continues to accept the supplied native/stable identifier and returns the same `.agent-checkpoints/<encoded-id>.jsonl` path as every adapter.

PydanticAI's `RunContext.usage` is a `RunUsage` aggregate across model requests. It is useful for budgets/cost accounting but is not current prompt occupancy, and the base `Model.profile` has no universal authoritative context-window limit. The default adapter will therefore persist `context_used: null` and return unknown context percentage/remaining K-tokens. It will not divide accumulated input tokens by an application usage limit or infer a model window. Provider-specific telemetry can be added only through a later gated decision with explicit semantics.

## Affected Modules

| Module | Change Type | Description |
|--------|-------------|-------------|
| PydanticAI Checkpoint Adapter (`packages/pydanticai-checkpoint/`) | create | Add the native Python contract/tool package, example, documentation, and isolated tests. |
| Checkpoint Core fixtures (`packages/checkpoint-core/fixtures/`) | use | Treat shared record, path, chain, word, and failure cases as cross-language observable authority without Python-to-JavaScript runtime coupling. |
| Checkpoint documentation | modify | Document PydanticAI identity/usage semantics, package setup, instruction example, and verification. |

## Required Context

| File | Why |
|------|-----|
| `plans/agent-checkpoint-heartbeat/plan.md` | Defines the common six-field record, identity allowance, telemetry honesty, KISS boundary, and cross-language goal. |
| `plans/agent-checkpoint-heartbeat/phases/phase-6.md` | Supplies the gated PydanticAI scope, deliverables, prerequisites, and acceptance criteria. |
| `plans/agent-checkpoint-heartbeat/implementation/phase-1-impl.md` | Defines exact validation, percent-encoded paths, append behavior, and authoritative shared fixtures. |
| `plans/agent-checkpoint-heartbeat/implementation/phase-2-impl.md` | Establishes native-wrapper response and agent-instruction semantics. |
| `plans/agent-checkpoint-heartbeat/implementation/phase-3-impl.md` | Defines external Canary calculations, selected-path inspection, and the required GO gate. |
| `plans/agent-checkpoint-heartbeat/implementation/phase-4-impl.md` | Confirms later adapters preserve native/stable session identity and honest unknown telemetry without changing raw fields. |
| `plans/agent-checkpoint-heartbeat/implementation/phase-5-impl.md` | Confirms measured harness telemetry is optional and all uncertainty maps to `context_used: null`. |
| `docs/agent-checkpoint-heartbeat.md` | Provides common tool, chaining, failed-step, JSONL, and instruction behavior. |
| `packages/checkpoint-core/fixtures/checkpoint-cases.json` and `packages/checkpoint-core/fixtures/pilot/*.jsonl` (created by Phases 1/3) | Supply language-neutral schema/path/analysis/failure expectations for parity tests. |
| `https://ai.pydantic.dev/tools/` | Official context-bearing function-tool registration, signature inference, tool schemas, and return behavior. |
| `https://ai.pydantic.dev/api/agent/` | Official `Agent`, `run_id`, `conversation_id`, tools, dependencies, and override signatures. |
| `https://ai.pydantic.dev/api/tools/` | Official `RunContext` surface and typed dependency access. |
| `https://ai.pydantic.dev/api/usage/` | Official `RequestUsage`, aggregate `RunUsage`, cache-inclusive input counts, and usage-limit semantics. |
| `https://ai.pydantic.dev/testing/` | Official `TestModel`, `FunctionModel`, `Agent.override`, `ALLOW_MODEL_REQUESTS`, pytest, and isolation guidance. |
| `https://github.com/pydantic/pydantic-ai/blob/main/pydantic_ai_slim/pydantic_ai/_run_context.py` | Current primary `RunContext` fields, including run/conversation/tool-call identity. |
| `https://github.com/pydantic/pydantic-ai/blob/main/pydantic_ai_slim/pydantic_ai/usage.py` | Current primary usage types and aggregation implementation. |
| `https://github.com/pydantic/pydantic-ai/blob/main/pydantic_ai_slim/pydantic_ai/tools.py` | Current primary function-tool type/schema implementation. |
| `https://github.com/pydantic/pydantic-ai/blob/main/pyproject.toml` | Current Python `>=3.10`, package, pytest, anyio, Ruff, and strict typing conventions. |

## Implementation Steps

### Step 1: Pin and revalidate the PydanticAI public surface

- **What**: Pin the currently verified released `pydantic-ai-slim==2.18.0` in the package, then recheck that release's public `Agent`, `RunContext`, function-tool registration, `run_id`, `conversation_id`, `RunUsage`, `TestModel`, and `FunctionModel` behavior immediately before coding. Record the installed version in test output/documentation. If the pinned release differs from current docs or lacks required public identity fields, update this implementation plan before selecting a replacement version or private API.
- **Where**: `packages/pydanticai-checkpoint/pyproject.toml`; installed isolated Python environment; package README compatibility section
- **Authorized By**: Phase 6 Prerequisite requiring PydanticAI API revalidation; Plan Non-Functional Requirement for current primary API verification; Plan risk mitigation for evolving harness APIs.
- **Why**: PydanticAI uses dynamic versions and a rapidly changing main branch; an exact package pin makes the implementation and tests reproducible.
- **Considerations**: Use Python `>=3.10` and public imports from `pydantic_ai`. Do not couple to private graph nodes or `_run_context.py` merely because source currently exposes them.

### Step 2: Create the minimal Python package boundary

- **What**: Add a standard `src/` package with build metadata, exact PydanticAI dependency, pytest test extra, README, and no service/CLI process. Export `CheckpointDeps`, `checkpoint_session_id`, `checkpoint`, `checkpoint_path`, `CHECKPOINT_INSTRUCTIONS`, and `checkpoint_tools` from one public package namespace. Keep the adapter installable independently while tests retain access to monorepo fixtures.
- **Where**: `packages/pydanticai-checkpoint/pyproject.toml`; `src/agent_checkpoint_pydanticai/__init__.py`; `README.md`
- **Authorized By**: Phase 6 Scope → Includes Python package/test integration and instruction example; Phase 1 package-boundary/KISS decision; Plan assumption permitting language-native wrappers.
- **Why**: A self-contained package is the smallest Python integration that applications can add to an existing PydanticAI agent without forcing Node or a daemon.
- **Considerations**: Do not create a root Python workspace, require `uv`, add web/hosted infrastructure, or force JavaScript runtime reuse. Standard editable/pip installation remains supported.

### Step 3: Implement native record, path, and append parity

- **What**: Implement Python helpers that construct exactly `timestamp`, `session_id`, `done`, `next`, `step_failed`, and `context_used`; validate the same types/ranges and non-empty identity; serialize compact UTF-8 JSON plus one newline; and append without reading/rewriting history. Reproduce Phase 1's deterministic path mapping exactly from shared fixtures: UTF-8 encoding, the `encodeURIComponent` safe set (`A-Z`, `a-z`, `0-9`, `-`, `_`, `.`, `!`, `~`, `*`, `'`, `(`, `)`), and uppercase percent escapes. Return only POSIX `.agent-checkpoints/<encoded-id>.jsonl`, resolve it under `CheckpointDeps.workspace_root`, verify containment, and reject empty IDs. Keep three-word and chain checks non-blocking and external.
- **Where**: `packages/pydanticai-checkpoint/src/agent_checkpoint_pydanticai/_contract.py` (`create_record`, `validate_record`, `checkpoint_path_for`, `append_record`)
- **Authorized By**: Phase 6 Objective and Acceptance Criterion for contract-compatible workspace-root records; Phase 1 exact raw/path/append contract; Plan Functional/Non-Functional Requirements for six fields, append history, and escape prevention; Phase 6 Notes making observable fixtures authoritative.
- **Why**: Native Python code avoids cross-runtime coupling while fixture parity prevents semantic drift.
- **Considerations**: Use UTC `Z` timestamps and a single append write. Do not persist Python model names, run usage, run IDs in extra fields, remaining tokens, filenames, percentages, or analysis output.

### Step 4: Map RunContext identity and expose native function tools

- **What**: Define frozen/typed `CheckpointDeps(workspace_root: Path)`. Implement `checkpoint_session_id(ctx)` as non-empty `ctx.conversation_id` first and `ctx.run_id` fallback. Implement context-bearing `checkpoint(ctx: RunContext[CheckpointDeps], done: str, next: str, step_failed: bool = False) -> str` and `checkpoint_path(ctx: RunContext[CheckpointDeps], session_id: str) -> str`; package them for `Agent(..., deps_type=CheckpointDeps, tools=checkpoint_tools())` and decorator-compatible reuse. Tool schemas must omit the first `RunContext` parameter and expose only the common public arguments.
- **Where**: `packages/pydanticai-checkpoint/src/agent_checkpoint_pydanticai/tools.py` (`CheckpointDeps`, `checkpoint_session_id`, `checkpoint`, `checkpoint_path`, `checkpoint_tools`)
- **Authorized By**: Phase 6 Scope → Includes native function tools and run/conversation identity mapping; Acceptance Criteria for path lookup; Plan `checkpoint`/`checkpoint_path` signatures; current public PydanticAI `RunContext` and tool-schema behavior.
- **Why**: Conversation identity preserves one log across related runs, while explicit dependencies make the workspace root application-owned and testable.
- **Considerations**: `tool_call_id` is never a session ID. Document that applications should pass/reuse `conversation_id` when they expect continuity, supply that same value to `checkpoint_path`, and resolve the returned relative path against the same `CheckpointDeps.workspace_root`; generated IDs remain valid when the application does not provide one.

### Step 5: Return honest telemetry without misusing RunUsage

- **What**: In `checkpoint`, read `ctx.usage` only to confirm/document that values are run aggregates; do not convert them into context occupancy. Write `context_used: null` and return “Context: unknown; Remaining: unknown” on the default adapter. Document why `RunUsage.input_tokens`, `total_tokens`, `UsageLimits`, optional `Model.count_tokens`, and `Model.profile` cannot universally provide current prompt percentage plus model-window remainder.
- **Where**: `packages/pydanticai-checkpoint/src/agent_checkpoint_pydanticai/tools.py` (telemetry result); package README; `docs/agent-checkpoint-heartbeat.md` PydanticAI harness section
- **Authorized By**: Phase 6 Scope → Includes honest usage/model metadata semantics; Excludes claims equating aggregate usage with occupancy; Acceptance Criterion allowing unknown; Plan Scope-Bounding Assumption allowing `null`.
- **Why**: PydanticAI sums provider-reported usage across requests and does not expose a universal context-window limit, so a percentage would be fabricated.
- **Considerations**: Do not use an application's token budget as a model context window. A future provider-specific callback requires separate gated semantics; it is not included merely to make the happy path return numbers.

### Step 6: Add the application instruction and usage example

- **What**: Provide the same self-segmentation, exact-three-word, verbatim chain, failed-step/correction, and controlled-handoff instruction as other adapters. Add an example `Agent` with `deps_type=CheckpointDeps`, both tools, deterministic caller-supplied `conversation_id`, a workspace root, and `ALLOW_MODEL_REQUESTS` left untouched in production code. Demonstrate retrieving the relative path with the same conversation ID and inspecting it with the Phase 3 command.
- **Where**: `packages/pydanticai-checkpoint/src/agent_checkpoint_pydanticai/instructions.py`; `examples/basic_agent.py`; package README; `docs/agent-checkpoint-heartbeat.md`
- **Authorized By**: Phase 6 Scope → Includes agent instruction example; Plan requirement that all agents call the common tools and preserve chain/failed-step semantics; Phase 3 selected-path workflow.
- **Why**: PydanticAI applications assemble their own agents, so a reusable instruction constant and concrete registration example are the native integration point.
- **Considerations**: Do not claim the tool proves work quality or impose a global context threshold. Unknown telemetry still permits an explicit final checkpoint/handoff chosen by the application/agent.

### Step 7: Add isolated Python and cross-language parity tests

- **What**: Use pytest with `tmp_path`, `models.ALLOW_MODEL_REQUESTS = False`, `FunctionModel` for controlled tool-call sequences, and `TestModel` only where generated arguments are sufficient. Test tool schemas/signatures, explicit/generated conversation identity, run fallback helper, supplied path lookup, exact six fields, repeated append preservation, unsafe IDs, missing context, failed steps, and non-blocking labels. Load the Phase 1/3 language-neutral fixtures and compare Python path/record outputs; run the Phase 3 inspector over Python-produced logs to verify chain/word/failure parity. Assert accumulated nonzero `RunUsage` still yields `context_used: null`.
- **Where**: `packages/pydanticai-checkpoint/tests/test_contract.py`; `test_tools.py`; `test_fixture_parity.py`; shared fixture paths; OS temporary workspaces
- **Authorized By**: Phase 6 Deliverable for focused Python tests; all Phase 6 Acceptance Criteria; Plan Testing Strategy for deterministic identity/context fixtures and failure separation; official PydanticAI testing guidance.
- **Why**: Test models exercise real PydanticAI registration/run context without network variability, while shared fixtures and inspection prove observable cross-language parity.
- **Considerations**: Tests must not make provider requests, write repository `.agent-checkpoints/`, or duplicate expected percentages independently of the shared fixture/inspector authority.

## Testing Plan

Verify command: `node --test packages/checkpoint-core/test/*.test.js opencode/test/*.test.mjs codex/test/*.test.mjs claude/test/*.test.mjs && python3 -m pytest packages/pydanticai-checkpoint/tests`

| Test Type | What to Test | Expected Outcome |
|-----------|-------------|-----------------|
| Python contract | Exact schema, UTC serialization, path mapping/containment, append history, unsafe IDs | Python output is byte/behavior compatible with shared fixture expectations. |
| PydanticAI tool integration | Public schemas, `RunContext`, dependencies, conversation/run identity, tool returns | Agents call both native tools with only common public arguments and stable identity. |
| Telemetry honesty | Nonzero aggregate `RunUsage`, absent universal model limit, missing context | Raw context remains `null`; return text reports unknown rather than an inferred percentage. |
| Cross-language parity | Shared fixtures and Phase 3 inspection over Python logs | Chain, exact-three-word, failed-step, and selected-path behavior match the pilot. |
| Full regression | All JavaScript/OpenCode/Codex/Claude tests before pytest | Earlier adapter contracts and installer behavior remain intact. |

### Test Integrity Constraints

- All Phase 1–5 tests and shared fixtures must remain enabled and pass before Python tests; Phase 6 may not fork the raw schema, path mapping, analysis formulas, or tool semantics.
- Python tests must consume shared path/record/pilot fixtures and may not change expected fixture values solely to accommodate Python encoding or serialization differences.
- `models.ALLOW_MODEL_REQUESTS` must be false for the suite; no test may require provider credentials, network model calls, or mutable global user configuration.
- Tests must assert exactly six persisted fields and the absence of run usage, model metadata, `tool_call_id`, remaining tokens, filenames, chain percentage, and three-word percentage.
- Failed-step tests must prove `step_failed=true` remains visible while shared inspection metrics are unchanged; tests may not implement an alternate Python Canary formula.
- All writes must use `tmp_path`/OS temporary directories. No tests may be skipped, focused, deleted, or weakened for version drift or cross-language mismatch.

## Rollback Strategy

Remove `packages/pydanticai-checkpoint/` and revert the PydanticAI documentation additions. No installer, JavaScript package, other adapter, runtime log, or migration changes are required because the Python package is additive and writes the unchanged raw contract.

## Open Decisions

| Decision | Options | Chosen | Rationale |
|----------|---------|--------|-----------|
| Python runtime reuse | Invoke JavaScript core; shared service; native Python plus fixtures | Native Python plus fixtures | Phase 6 explicitly permits language-native code and makes observable fixtures authoritative. |
| Session identity | Tool call ID; run ID always; conversation ID with run fallback | Conversation ID with run fallback | Conversation ID spans related runs; run ID is one execution; tool call ID is too narrow. |
| Context telemetry | Aggregate usage ratio; provider-specific estimator; honest unknown | Honest unknown | No universal current occupancy/window pair exists in public PydanticAI APIs. |
| Packaging | Root Python workspace; hosted adapter; self-contained package | `packages/pydanticai-checkpoint/` | It matches the monorepo package boundary without imposing Python tooling on existing modules. |
| Test model | Real provider; TestModel only; FunctionModel plus targeted TestModel | FunctionModel plus targeted TestModel | Deterministic tool sequences need controlled calls, while all external model requests stay disabled. |

## Reality Check

### Code Anchors Used

| File | Symbol/Area | Why it matters |
|------|-------------|----------------|
| `plans/agent-checkpoint-heartbeat/implementation/phase-1-impl.md` | six-field schema, path encoding, fixtures, append behavior | Defines the language-neutral contract the Python package must reproduce. |
| `plans/agent-checkpoint-heartbeat/implementation/phase-3-impl.md` | inspector and Canary metrics | Keeps derived calculations outside all adapter records and supplies parity verification. |
| PydanticAI `agent.py` docs/source | `Agent.__init__`, `Agent.iter`, `Agent.override`, tool decorators | Documents registration, identity inputs, dependencies, and isolated override support. |
| PydanticAI `_run_context.py` | `RunContext` | Confirms current `conversation_id`, `run_id`, `tool_call_id`, `usage`, `model`, and deps fields. |
| PydanticAI `usage.py` | `RequestUsage`, `RunUsage`, `UsageLimits` | Confirms aggregate/provider-reported semantics and why they are not prompt occupancy. |
| PydanticAI `tools.py` | tool function types/schema generation | Confirms the context parameter is excluded from model-visible arguments. |
| PydanticAI testing guide | `TestModel`, `FunctionModel`, `ALLOW_MODEL_REQUESTS`, `Agent.override` | Supplies deterministic no-network integration patterns. |

### Mismatches / Notes

- The current repository has no Python package boundary, Python manifest, PydanticAI dependency, or Python tests; Phase 6 adds one isolated package rather than changing the root toolchain.
- Current PyPI reports `pydantic-ai-slim` 2.18.0, while online docs/source track a rapidly changing main branch. Execution must verify the exact pin and revise the plan if required public fields differ.
- **Documented fact:** `conversation_id` can span runs and `run_id` identifies one run; both are generated when omitted. **Adapter decision:** conversation identity names the log, with run ID only as a defensive fallback.
- **Documented fact:** `RunUsage` aggregates provider-reported request usage and input counts include cache tokens. **Documented limitation:** neither aggregate usage nor `UsageLimits` supplies a universal current context-window denominator.
- Model profiles/counters are provider-dependent and do not establish one framework-wide remaining-token value. The default adapter's honest result is therefore unknown, consistent with OpenCode/Codex fallback behavior.
- Language-level runtime reuse is intentionally absent. Shared fixtures, exact raw fields/path semantics, and the Phase 3 inspector are the cross-language interface.
- Phase 6 execution remains blocked until Phase 3 records GO and the pinned PydanticAI public API is revalidated.

### Blocking Decisions

- None for implementation-plan authoring. Execution must stop and revise this plan if pinned PydanticAI no longer exposes usable public `conversation_id`/`run_id` on `RunContext`; do not substitute `tool_call_id` or private graph state.
