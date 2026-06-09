# OpenCode Processing Skills (Codex)

Merge this section into `~/.codex/AGENTS.md` (global) or your project `AGENTS.md` when using the Codex install target.

## Persistent interface

- `plans/` — scope, DoD, phase intent (source of truth for implementation)
- `docs/` — curated module/feature inventories (reduces rediscovery)

## Orchestration

Workflow skills live in `~/.codex/skills/`. Codex has no subagent tool — all framework roles (maintainer, delegate, doc-explorer, implementer, legacy-curator) run inline in the primary session.

- Check `docs/` and `plans/` before exploring the codebase.
- Where a skill says "delegate to `<agent>`", execute the task yourself, honoring that agent's output contract (e.g. doc-explorer writes only `docs/**` and `plans/**`; implementer touches code files only).
- Ask before destructive actions or external effects (deletion, push, deploy, production APIs) unless explicitly requested.

## Gated implementation (blueprint → approve → execute)

Non-trivial code changes follow the `execute-work-package` skill in file-backed single-session mode:

1. **BLUEPRINT** — produce the step list per the skill's templates, write it to `plans/<plan>/implementation/` (or a scratch file), then stop.
2. **GATE** — the user reviews and approves with an explicit token (e.g. `APPROVE-WP1`).
3. **EXECUTE** — implement strictly along the approved blueprint; finish with a compact digest (steps done, files changed, verify result).

Never combine blueprint and execute in a single turn.

## Lifecycle

```
create-plan → [review-plan] → author-and-verify-implementation-plan
→ [review-implementation-plan] → execute-work-package → [review-implementation]
→ update-plan → [generate-handover]
```

Multi-phase: author all implementation plans first, then execute phases sequentially.
