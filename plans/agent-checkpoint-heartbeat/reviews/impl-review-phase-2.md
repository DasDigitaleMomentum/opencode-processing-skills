---
type: review
entity: implementation-review
plan: "agent-checkpoint-heartbeat"
phase: 2
status: final
reviewer: "delegate"
created: "2026-07-26"
---

# Implementation Review: Phase 2 - OpenCode Pilot

> Reviewing implementation of [Phase 2](../phases/phase-2.md)
> Against [Implementation Plan](../implementation/phase-2-impl.md) and [Plan](../plan.md)

## Overall Assessment

**Verdict**: Needs Rework

The adapter logic, installer mappings, persona injection, honest null telemetry, and mock-backed behavioral tests match the planned contract. However, an independent fresh-home test with the repository's actual OpenCode `0.0.0-dev-202607131615` showed that startup cannot install `@opencode-ai/plugin` at that unpublished matching version; the installed `checkpoint` and `checkpoint_path` tools were absent, so the central installable-pilot criterion is not met in the reviewed environment.

## Acceptance Criteria Verification

| # | Criterion | Met? | Evidence | Gap |
| - | --------- | ---- | -------- | --- |
| 1 | A parent and a subagent can each create separate session logs under the project-root checkpoint directory. | Partial | Injected-factory test creates separate logs at `opencode/test/checkpoint-plugin.test.mjs:132-177`. | A real freshly installed OpenCode parent reported that `checkpoint` was not in its available toolset; no host-created log was produced (F-1). |
| 2 | `checkpoint` writes authorized fields and returns context utilization plus remaining K-tokens or honest unknown values. | Partial | Adapter passes native IDs/worktree and null telemetry at `opencode/checkpoint-runtime.mjs:45-56`; mock-backed assertions at `opencode/test/checkpoint-plugin.test.mjs:151-172`. | Runtime behavior is correct when invoked, but the current host did not load the tool (F-1). The null/unknown fallback itself is correct and is not a finding. |
| 3 | `checkpoint_path` returns the correct relative path for an OpenCode session. | Partial | Executor delegates to the core at `opencode/checkpoint-runtime.mjs:59-67`; encoded path assertions at `opencode/test/checkpoint-plugin.test.mjs:173-176`. | Not exposed by the independently tested host installation (F-1). |
| 4 | `step_failed=true` is recorded without being treated as Canary failure. | Yes in adapter logic | Failure persistence and later inspection are asserted at `opencode/test/checkpoint-plugin.test.mjs:142-172,178-207`. | Host availability remains blocked by F-1. |
| 5 | Existing global and `--project` installation behavior remains backward compatible. | Yes | Isolated global/project installer tests at `opencode/test/checkpoint-plugin.test.mjs:220-270`; source mappings at `install.sh:910-968,1088-1090`; `bash -n install.sh` passed. | No unrelated installer regression found. |
| 6 | OpenCode restart/configuration requirements are documented. | Yes | `docs/installation.md:25-35`, `config.yaml.example:35-37`, and installer summary `install.sh:1110-1117`. | The claim that restart makes the tools available is false for the reviewed fresh dev-version home until F-1 is addressed or bounded in documentation. |

## Plan Adherence

| Step | Planned | Actual | Deviation? | Assessment |
| ---- | ------- | ------ | ---------- | ---------- |
| 1 | Add a thin native plugin shim and injected runtime factory. | Implemented under `opencode/`; primary-source API shape matches current OpenCode `dev`. | No in source shape | The shim is valid, but dependency resolution fails in the actual fresh host. |
| 2 | Bind `sessionID`, `worktree`, tool arguments, and honest telemetry. | Runtime uses `context.sessionID`, `context.worktree` with plugin fallback, and explicit null/unknown feedback. | No | Correct; the gated telemetry fallback is not a finding. |
| 3 | Install shim and support modules globally and with `--project`. | Installer copies stable plugin/runtime/core paths and preserves file symlinks. | No | File deployment passes isolated tests. |
| 4 | Inject the OpenCode-only instruction into parents/subagents/aliases. | Marked fragment is appended after variant generation, once per ordinary Markdown file, skipping symlinks. | No | Correct and idempotent; in the failing host this advertises unavailable tools, increasing F-1's impact. |
| 5 | Document installation and telemetry limits. | Locations, restart, paths, and unknown telemetry are documented. | Partial | Fresh-host loader limitation is not documented and contradicts tool-availability claims. |
| 6 | Add adapter and installer coverage. | Mock tool/core integration plus real Bash installer smoke tests were added. | Partial | No host-loader/tool-discovery test was added; the mocks cannot catch F-1. |

## Code Quality Assessment

### Findings

- **F-1 (Major):** The fresh installed plugin is not functional with the actual local OpenCode build used by the plan's reality check. Independent installation into an isolated home succeeded, but `opencode debug config`/`opencode run` logged `No matching version found for @opencode-ai/plugin@0.0.0-dev-202607131615`; an installed `maintainer` then explicitly reported only the 15 built-in tools and no `checkpoint`, and no JSONL file was created. The implementation imports `@opencode-ai/plugin` in `opencode/checkpoint-plugin.ts:1`, while the tests replace it with `fakeTool` (`opencode/test/checkpoint-plugin.test.mjs:15-32`) and only inspect copied text, so the acceptance-blocking loader failure is invisible to the suite.

Apart from F-1, the runtime is concise and keeps responsibilities cleanly separated. It surfaces write failures, uses the native worktree/session context, adds no unauthorized dependency to the repository, and does not fabricate telemetry.

## Testing Assessment

### Verify Command Result

- **Command**: `node --test packages/checkpoint-core/test/*.test.js opencode/test/*.test.mjs` and `bash -n install.sh`
- **Exit Code**: 0 for both
- **Result**: Pass — 15/15 Node tests and valid Bash syntax; this does not override the failed real-host availability check.

### Test Quality

| Test | What it Tests | Meaningful? | Issue |
| ---- | ------------- | ----------- | ----- |
| Injected native-tool test | Session/worktree binding, schema definitions, output, raw fields, failed-step chain, and inspection | Yes, at adapter boundary | Uses a permissive fake `tool` helper and directly calls executors; it does not load `checkpoint-plugin.ts` in OpenCode. |
| Global installer smoke | File mappings, aliases/personas, instruction idempotence, refresh, and symlink preservation | Yes | Verifies copied content only, not that OpenCode can resolve/import/register the plugin. |
| Project installer smoke | Effective `.opencode` target and no global write | Yes | Same loader gap. |
| Phase 1 regression tests | Core contract, paths, append behavior, and calculations | Yes | Core behavior remains intact. |

### Real-World Testing

Performed independently and failed: the reviewer installed into a fresh isolated OpenCode home, started the actual local OpenCode `0.0.0-dev-202607131615`, and asked the installed `maintainer` to call `checkpoint`. Dependency installation warned that the matching plugin package version does not exist; the agent's real available-tool list omitted both checkpoint tools. This is distinct from the intentionally unknown telemetry fallback, which remains accepted.

## Scope Compliance

### Findings

- Changes remain within the planned OpenCode adapter, installer/config comments, instructions, tests, and user/module documentation. No MCP server, daemon, JSON/JSONC mutation, or non-OpenCode instruction injection was introduced.

## Regression Risk

### Test Integrity Check

- [x] No existing tests were deleted
- [x] No tests were disabled (15 tests ran; zero skipped/todo)
- [x] No existing assertions were weakened in the tracked diff
- [x] All automated pre-existing/current tests pass

### Findings

- Existing installer behavior is well protected by isolated global/project tests. The principal regression/acceptance risk is at the untested host-loader boundary: copied files can appear correct while the tools remain unavailable.

## Documentation & Cleanup

### Findings

- `docs/installation.md:23-35` and `docs/agent-checkpoint-heartbeat.md:251-255` state that restart loads the tools without disclosing the observed fresh dev-build dependency-resolution failure. Documentation should match the supported-version boundary or the corrected loader behavior.

## Findings Summary

| ID  | Severity | Area | Finding | Recommendation |
| --- | -------- | ---- | ------- | -------------- |
| F-1 | Major | Plugin / installer / tests | A fresh installation under the actual local OpenCode dev build does not expose either checkpoint tool because the matching `@opencode-ai/plugin` package cannot be installed; mock-only adapter tests miss this. | Make dependency resolution work for the supported current host (or explicitly gate unsupported dev builds), then add an isolated real OpenCode loader/tool-discovery smoke test and update version guidance. |

## Recommendations

1. **Blocks acceptance:** Resolve F-1 and prove that a fresh installed OpenCode process registers both tools. The test should fail if only files are copied or instructions are injected without tool discovery.
2. **Blocks acceptance:** Update restart/support documentation to state the verified host-version boundary rather than promising availability on an unverified or failing build.
