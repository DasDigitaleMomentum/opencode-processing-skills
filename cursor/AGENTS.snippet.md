# OpenCode Processing Skills (Cursor)

Merge this section into your project `AGENTS.md` when using the Cursor install target.

## Persistent interface

- `plans/` — scope, DoD, phase intent (source of truth for implementation)
- `docs/` — curated module/feature inventories (reduces rediscovery)

## Orchestration

Load the **`ops-orchestrator`** skill when doing structured planning or implementation (`ops-orchestrator-direct` for non-interactive mode).

**Default to delegation** via the Cursor `Task` tool. Subagent personas live in `.cursor/subagents/` (project) or `~/.cursor/subagents/` (global). Full routing table: see `task-delegation.md` in the `ops-orchestrator` skill directory.

| Role | Task `subagent_type` |
|------|---------------------|
| delegate-fast | `explore` |
| delegate-strong, doc-explorer, implementer, legacy-curator | `generalPurpose` |

Non-trivial code changes: **blueprint → approve → execute** (`execute-work-package` skill), using `Task(resume=...)` between calls.

## Lifecycle

```
create-plan → [review-plan] → author-and-verify-implementation-plan
→ [review-implementation-plan] → execute-work-package → [review-implementation]
→ update-plan → [generate-handover]
```

Multi-phase: author all implementation plans first, then execute phases sequentially.
