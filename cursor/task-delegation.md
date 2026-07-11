# Cursor Task Delegation

Cursor has no `@agent` picker. Map framework roles to the **`Task`** tool.

## Role → Task mapping

| Framework role | `subagent_type` | Persona file |
|----------------|-----------------|--------------|
| `delegate` | `generalPurpose` | `subagents/delegate.md` |
| `delegate-fast` | `explore` | `subagents/delegate.md` |
| `delegate-strong` | `generalPurpose` | `subagents/delegate.md` |
| `doc-explorer` | `generalPurpose` | `subagents/doc-explorer.md` |
| `implementer` / `implementer-fast` | `generalPurpose` | `subagents/implementer.md` |
| `legacy-curator` | `generalPurpose` | `subagents/legacy-curator.md` |
| Shell-heavy verification | `shell` | `subagents/delegate.md` (or task-specific prompt) |

**Persona paths:** project install uses `.cursor/subagents/<role>.md`; global install uses `~/.cursor/subagents/<role>.md`.

`delegate`, `delegate-fast`, and `delegate-strong` are semantic routing roles that share the installed canonical delegate persona. Cursor selects behavior/model capacity through the mapped Task type (`explore` or `generalPurpose`); `install.sh` does not create OpenCode-style model aliases for Cursor. Expertise and write permissions come from the loaded skill, not from a role-specific persona.

## How to invoke

Prefix every delegation prompt with the persona file contents, then the task:

```
Task(
  subagent_type: "generalPurpose",
  description: "Author phase 1 impl plan",
  prompt: "<contents of subagents/delegate.md>

  Load skill author-and-verify-implementation-plan.
  Phase: plans/my-plan/phases/phase-1.md
  Write: plans/my-plan/implementation/phase-1-impl.md
  Return: short status + files changed."
)
```

Return only a **compact digest** to the primary session — not full file contents or logs.

## Write boundaries

- **Scope reminder:** No Gold-Plating. No Adversarial Reviewing. No Scope Creep.
  Report evidence-backed problems rather than hunting for gotchas or inventing
  work. Keep the reviewed objective intact while discovering related files and
  tests required to complete accepted findings.
- `delegate-strong`: use for independent reviews and genuinely difficult or high-risk skill-defined artifacts. Implementation plans may use the canonical delegate and may be written directly because the skill provides an explicit path/template; do **not** add a Blueprint gate.
- `delegate`: use for routine analysis with `delegate-analysis`; do not escalate to `delegate-strong` merely because work has multiple steps.
- After an implementation or implementation-plan review, prefer resuming the same Task using `review-fix` for accepted related findings. Related fixes may span multiple files; do not start a context-cold fixer merely because runtime code is involved.
- `doc-explorer`: docs-focused; use for `generate-docs`/`update-docs` and selected skill-governed `plans/**` maintenance where applicable.
- Larger ad-hoc writes with undefined shape/targets should start with an informal Blueprint before mutation.
- A new `implementer` or authoring pass is needed only for a changed objective/scope, new primary decision, unavailable session, or explicit fresh-context request. `review-fix` is the normal same-session remediation path; do not create automatic review-fix loops.

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

Prefix these prompts with `Load skill delegate-analysis.` After a review, use `Task(resume="<reviewer-id>", prompt="Load skill review-fix ...")` and include accepted finding IDs, allowed scope, and verification.

## Cursor vs OpenCode skill notes

- Skills may reference OpenCode `task()` / `task_id` — use `Task()` / `resume` instead.
- Skills that say "do not use built-in `explore`" are OpenCode-specific; in Cursor, `explore` is correct for `delegate-fast`.
- `doc-explorer` self-delegation: spawn additional `Task(subagent_type="generalPurpose")` calls with the doc-explorer persona, scoped per module.
