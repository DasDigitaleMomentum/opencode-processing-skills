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

Load the **`ops-orchestrator`** skill when doing structured planning or implementation.

**Default to delegation** via the Cursor `Task` tool. Subagent personas live in `.cursor/subagents/` (project) or `~/.cursor/subagents/` (global). Full routing table: see `task-delegation.md` in the `ops-orchestrator` skill directory.

| Role | Task `subagent_type` |
|------|---------------------|
| delegate-fast | `explore` |
| delegate, delegate-strong, doc-explorer, implementer, legacy-curator | `generalPurpose` |

Non-trivial code changes: **blueprint → approve → execute** (`execute-work-package` skill), using `Task(resume=...)` between calls.

Implementation plans (`author-and-verify-implementation-plan`) route through the canonical delegate persona using the appropriate Cursor Task type and may be written directly because the skill provides the explicit output path/template. Do not add a Blueprint gate for implementation-plan authoring.

Delegate routing roles share the same installed canonical persona; Cursor selects model capacity through the mapped Task type rather than installed OpenCode-style aliases. Load `delegate-analysis` for routine investigation. Reviews check for gaps and unnecessary work but report only evidence-backed exceptions. Once invoked, `Reduction Required: Yes` or unresolved Critical/Major findings block progression until applied or explicitly rejected with rationale. Accepted conversation-owned plan corrections, including plan reductions, stay primary-owned through `update-plan`.

For accepted, evidence-backed technical implementation-plan/implementation defects from a review or diagnosis, use `review-fix` in the eligible existing source Task; review artifacts or analysis/implementation digests or messages are supported sources, not a mandatory preceding review. Reuse correct and sufficient retained context/output rather than collecting secured evidence again. If faulty, insufficient, or unavailable, start a fresh appropriate workflow with a finding-source hint, not claimed inherited context or fresh-session `review-fix`. The Primary's explicit remediation instruction naming accepted defects and scope suffices; no approval token or new Blueprint is required.

The Primary may assign defects across multiple eligible source Tasks in one bounded pass. Post-digest Implementer reuse is allowed only through `review-fix` for accepted defects of the same completed package, never another phase/package or indefinite continuation. See `task-delegation.md` for exact Task/resume routing and unchanged persona/model requirements. Return a compact digest and stop: a fix is not an independent review. Escalate materially new risk/uncertainty to the Primary, who decides on independent re-review; do not create automatic review/fix loops.

## Lifecycle

```
create-plan → [review-plan] → author-and-verify-implementation-plan
→ [review-implementation-plan] → execute-work-package → [review-implementation]
→ [review-fix in eligible source Task] → update-plan → [generate-handover]
```

Multi-phase: author all implementation plans first, then execute phases sequentially.
