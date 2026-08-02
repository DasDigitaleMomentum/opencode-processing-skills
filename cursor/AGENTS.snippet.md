# OpenCode Processing Skills (Cursor)

Merge this section into your project `AGENTS.md` when using the Cursor install target.

## Persistent interface

- `plans/` — scope, DoD, phase intent (source of truth for implementation)
- `docs/` — curated module/feature inventories (reduces rediscovery)

## Scope reminder

**No Gold-Plating. No Adversarial Reviewing. No Scope Creep.** Report
evidence-backed problems, do not hunt for gotchas or invent extra work, and do
not broaden the objective without a primary decision. Required related call
sites, integration points, and tests remain in scope.

## Orchestration

Load the **`ops-orchestrator`** skill when doing structured planning or implementation (`ops-orchestrator-direct` for non-interactive mode).

**Default to delegation** via the Cursor `Task` tool. Subagent personas live in `.cursor/subagents/` (project) or `~/.cursor/subagents/` (global). Full routing table: see `task-delegation.md` in the `ops-orchestrator` skill directory.

| Role | Task `subagent_type` |
|------|---------------------|
| delegate-fast | `explore` |
| delegate, delegate-strong, doc-explorer, implementer, legacy-curator | `generalPurpose` |

Non-trivial code changes: **blueprint → approve → execute** (`execute-work-package` skill), using `Task(resume=...)` between calls.

Implementation plans (`author-and-verify-implementation-plan`) route through the canonical delegate persona using the appropriate Cursor Task type and may be written directly because the skill provides the explicit output path/template. Do not add a Blueprint gate for implementation-plan authoring.

Delegate routing roles share the same installed canonical persona; Cursor selects model capacity through the mapped Task type rather than installed OpenCode-style aliases. Load `delegate-analysis` for routine investigation. Reviews check for gaps and unnecessary work but report only evidence-backed exceptions. Once invoked, `Reduction Required: Yes` or unresolved Critical/Major findings block progression until applied or explicitly rejected with rationale. Apply accepted plan reductions once through `update-plan`; use `review-fix` for accepted implementation-plan/implementation findings. The remediation digest ends the pass; do not create automatic re-review loops.

## Lifecycle

```
create-plan → [review-plan] → author-and-verify-implementation-plan
→ [review-implementation-plan] → execute-work-package → [review-implementation]
→ [review-fix using reviewer/fresh path] → update-plan → [generate-handover]
```

Multi-phase: author all implementation plans first, then execute phases sequentially.
