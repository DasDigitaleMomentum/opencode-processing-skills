# OpenCode Processing Skills - Skill Matrix

This matrix defines the default execution owner for each skill.

The term "default owner" means recommended runtime behavior for consistency and
context safety. It is not a replacement for technical permission checks.

Authoritative enforcement lives in `agents/engineer.md` and
`agents/doc-explorer.md`.

## Default Owner: `engineer` (Primary)

These skills should run in the primary agent because they require direct user
dialogue, source edits, terminal execution, or plan authorship decisions.

| Domain | Skills |
|---|---|
| Session | `smart-start`, `resume-plan`, `context-compress` |
| Planning | `create-plan`, `update-plan`, `generate-handover`, `analyze-impact`, `cross-repo-plan` |
| Implementation | `implement-phase`, `refactor`, `scaffold`, `fix-ci`, `debug-assist` |
| Testing | `add-tests`, `coverage-check` |
| Review & Quality | `validate-docs`, `diff-review`, `dependency-audit` |
| Delivery | `pr-ready`, `release-notes`, `ci-setup`, `generate-agents-md` |

## Delegated Owner: `doc-explorer` (Subagent)

These skills are delegated to `doc-explorer` because they are repo-anchored,
write-heavy documentation tasks.

| Domain | Skills |
|---|---|
| Documentation | `generate-docs`, `update-docs`, `adr-create`, `retrospective`, `onboard-developer` |
| Documentation Planning Output | `test-strategy` |

## Notes

1. Plan narrative/decision artifacts are primary-owned by design.
2. `doc-explorer` may still materialize `plans/` files only when explicitly
delegated by the primary agent.
3. If a skill definition and this matrix diverge, treat the skill definition as
the source of truth and update this matrix.
