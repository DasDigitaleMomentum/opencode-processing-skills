# Cursor Task Delegation

Cursor has no `@agent` picker. Map framework roles to the **`Task`** tool.

## Role → Task mapping

| Framework role | `subagent_type` | Persona file |
|----------------|-----------------|--------------|
| `delegate-fast` | `explore` | `subagents/delegate.md` |
| `delegate-strong` | `generalPurpose` | `subagents/delegate.md` |
| `doc-explorer` | `generalPurpose` | `subagents/doc-explorer.md` |
| `implementer` / `implementer-fast` | `generalPurpose` | `subagents/implementer.md` |
| `legacy-curator` | `generalPurpose` | `subagents/legacy-curator.md` |
| Shell-heavy verification | `shell` | `subagents/delegate.md` (or task-specific prompt) |

**Persona paths:** project install uses `.cursor/subagents/<role>.md`; global install uses `~/.cursor/subagents/<role>.md`.

## How to invoke

Prefix every delegation prompt with the persona file contents, then the task:

```
Task(
  subagent_type: "generalPurpose",
  description: "Author phase 1 impl plan",
  prompt: "<contents of subagents/doc-explorer.md>

  Load skill author-and-verify-implementation-plan.
  Phase: plans/my-plan/phases/phase-1.md
  Write: plans/my-plan/implementation/phase-1-impl.md
  Return: short status + files changed."
)
```

Return only a **compact digest** to the primary session — not full file contents or logs.

## Gated implementation (blueprint → execute)

Always **two separate** `Task` calls:

1. **BLUEPRINT** — `Task(subagent_type="generalPurpose", prompt="MODE: BLUEPRINT ...")` using implementer persona + `execute-work-package` templates. Wait for the step list.
2. **GATE** — primary reviews and approves (e.g. `APPROVE-WP1`).
3. **EXECUTE** — `Task(resume="<agent-id from call 1>", prompt="MODE: EXECUTE APPROVE-WP1 ...")`.

Never combine blueprint and execute in one call.

## Delegation prompt patterns

| Task type | Prompt pattern |
|-----------|----------------|
| `code-exploration` | `Task: code-exploration. Scope: <area>. Question: <what>` |
| `targeted-reading` | `Task: targeted-reading. Scope: <files>. Question: <what>` |
| `web-research` | `Task: web-research. Scope: <topic>. Constraints: <optional>` |
| `deep-dive` | `Task: deep-dive. Scope: <entry>. Question: <what>` |

## Cursor vs OpenCode skill notes

- Skills may reference OpenCode `task()` / `task_id` — use `Task()` / `resume` instead.
- Skills that say "do not use built-in `explore`" are OpenCode-specific; in Cursor, `explore` is correct for `delegate-fast`.
- `doc-explorer` self-delegation: spawn additional `Task(subagent_type="generalPurpose")` calls with the doc-explorer persona, scoped per module.
