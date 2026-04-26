---
type: planning
entity: plan
plan: "agent-improvements"
status: draft
created: "2026-04-26"
updated: "2026-04-26"
---

# Plan: Agent & Tooling Improvements

## Objective

Improve agent ergonomics and delegation discipline across three areas:
1. A non-interactive maintainer variant for environments without the `question` tool.
2. Sharper delegation rules with Blueprint-as-default for all non-trivial edits.
3. Project-local installation option (`--project` flag).

## Motivation

**Interaction friction.** The current `maintainer` agent requires the `question` tool after every turn (Rule #7). This works well in GHCP's interactive UI but is jarring in other environments (API usage, Codex, non-GHCP providers) where the tool either doesn't exist or interrupts the flow.

**Context bloat via self-execution.** The maintainer frequently reads 3-5 files and performs small edits itself — burning context tokens that could be spent on judgment. The Blueprint mechanism (implementer proposes a step list, maintainer reviews, then executes) is underused for smaller changes. It should be the default for any non-trivial edit, not just for large phases.

**Installation friction.** Not every project justifies a global installation. Teams that want skills versioned in-repo (for CI reproducibility or onboarding) currently have no supported path.

## Requirements

### Functional

- [ ] A `maintainer-direct` agent exists that uses `question` only for genuine choice questions (multiple-choice with predefined options; no custom text input expected).
- [ ] `maintainer-direct` agent does NOT ask confirmation for single-action continuations.
- [ ] The maintainer's Operating Rules default to delegation for all non-trivial edits, using `implementer` with Blueprint.
- [ ] The delegation threshold is explicitly defined: trivial single-file single-edit → self; everything else → implementer.
- [ ] `install.sh` supports a `--project` flag that installs into `./.opencode/`.
- [ ] `config.yaml.example` documents the `--project` option.

### Non-Functional

- [ ] Existing `maintainer` behavior is unchanged — the interactive variant remains as-is.
- [ ] `install.sh` without flags behaves identically to before (backward compatible).
- [ ] No new external dependencies.

## Scope

### In Scope

- `agents/maintainer-direct.md` — new agent definition
- `agents/maintainer.md` — Operating Rules refined for delegation/blueprint emphasis
- `agents/maintainer-direct.md` — receives the same delegation rules (shared DNA)
- `install.sh` — `--project` flag support
- `config.yaml.example` — documentation update for `--project`

### Out of Scope

- Changing `maintainer.md`'s interactive behavior (Rule #7, Rule #2) — those stay as-is.
- Making `maintainer-direct` a parametrized variant of `maintainer.md` (separate file is simpler, clearer).
- A separate `install-local.sh` script — a flag is cleaner.
- Any changes to skills, subagents, or templates.
- Config changes for `maintainer-direct` (it inherits the existing `delegate` model from config; no new model config needed).

## Definition of Done

- [ ] `maintainer-direct.md` exists with rules as specified
- [ ] `maintainer.md` delegation rules are sharpened with explicit threshold + anti-pattern table
- [ ] Both maintainer agents share the same delegation/blueprint rules
- [ ] `install.sh --project` installs into `./.opencode/`
- [ ] `install.sh` without flags works identically to before
- [ ] `config.yaml.example` mentions `--project`
- [ ] `install.sh` runs without errors (dry-run or actual test)

## Testing Strategy

- [ ] Verify `maintainer-direct.md` frontmatter is valid OpenCode agent syntax
- [ ] Verify `maintainer.md` changes don't introduce contradictions with existing rules
- [ ] Run `install.sh --help` to confirm `--project` appears
- [ ] Run `install.sh --project` in a temp directory and verify `.opencode/` structure
- [ ] Run `install.sh` (no flags) to confirm backward compatibility

## Phases

| Phase | Title | Scope | Status |
|-------|-------|-------|--------|
| 1 | `maintainer-direct` Agent | New non-interactive maintainer variant | pending |
| 2 | Delegation & Blueprint Emphasis | Sharpen delegation rules in both maintainer agents | pending |
| 3 | `install.sh --project` Flag | Local installation support | pending |

## Risks & Open Questions

| Risk/Question | Impact | Mitigation/Answer |
|---------------|--------|-------------------|
| `maintainer-direct` might be too terse and cause users to miss context | Medium | Keep Rule #2 ("Ask, don't assume") intact; only relax the turn-end behavior, not the judgment threshold |
| Delegation threshold "single edit, single file" might be too simple for edge cases | Low | Add explicit examples in the anti-pattern table; leave room for judgment |
| `install.sh --project` might conflict with future target config expansion | Low | `--project` is orthogonal to `config.yaml` targets; it just changes the install directory |

## Changelog

### 2026-04-26

- Plan created
