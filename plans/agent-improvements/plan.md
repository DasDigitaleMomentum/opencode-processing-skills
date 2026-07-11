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

Improve agent ergonomics and delegation discipline across four areas:
1. A non-interactive maintainer variant for environments without the `question` tool.
2. Right-sized delegation rules with Blueprint for changes that need a gate.
3. Project-local installation option (`--project` flag).
4. One canonical skill-driven delegate with context-preserving review remediation.

## Motivation

**Interaction friction.** The current `maintainer` agent requires the `question` tool after every turn (Rule #7). This works well in GHCP's interactive UI but is jarring in other environments (API usage, Codex, non-GHCP providers) where the tool either doesn't exist or interrupts the flow.

**Context bloat via self-execution.** The maintainer frequently reads 3-5 files and performs small edits itself — burning context tokens that could be spent on judgment. The Blueprint mechanism (implementer proposes a step list, maintainer reviews, then executes) is underused for smaller changes. It should be the default for any non-trivial edit, not just for large phases.

**Context loss via remediation.** After a review, routing a related fix to a new implementer discards the reviewer's code understanding and adds a blueprint, context rebuild, and often another review. Same-session remediation should be the default; new work packages are reserved for changed objectives, unavailable context, new primary decisions, or explicit fresh perspectives.

**Installation friction.** Not every project justifies a global installation. Teams that want skills versioned in-repo (for CI reproducibility or onboarding) currently have no supported path.

## Requirements

### Functional

- [ ] A `maintainer-direct` agent exists that uses `question` only for genuine choice questions (multiple-choice with predefined options; no custom text input expected).
- [ ] `maintainer-direct` agent does NOT ask confirmation for single-action continuations.
- [ ] The maintainer's Operating Rules right-size delegation: bounded low-risk edits may remain local; gated implementation is used when behavior, risk, or uncertainty requires it.
- [ ] Accepted related review findings normally resume the same reviewer `task_id`, including multi-file runtime fixes.
- [ ] New work packages require changed scope/objective, unavailable context, a new primary decision, or an explicit fresh-context request.
- [ ] Review and remediation never loop automatically.
- [ ] Maintainer and delegate guidance explicitly rejects gold-plating, adversarial reviewing, and scope creep while preserving attention to real defects.
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
- Replacing the separate `implementer` or `doc-explorer` workflow boundaries.
- Config changes for `maintainer-direct` (it inherits the existing `delegate` model from config; no new model config needed).

## Definition of Done

- [ ] `maintainer-direct.md` exists with rules as specified
- [ ] `maintainer.md` delegation rules are right-sized with an explicit low-risk threshold + anti-pattern table
- [ ] Both maintainer agents share the same delegation/blueprint rules
- [ ] `delegate.md` is the canonical skill-driven delegate persona
- [ ] `delegate-analysis` owns routine analysis modes
- [ ] `review-fix` resumes the same reviewer session for accepted related findings
- [ ] Review-fix rules do not require a narrow file allowlist or automatic re-review
- [ ] Maintainer, delegate, Cursor, review-skill, documentation, and plan guidance includes the no-gold-plating / no-adversarial-reviewing / no-scope-creep reminder
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
| 2 | Delegation & Blueprint Emphasis | Right-size delegation rules in both maintainer agents | pending |
| 3 | `install.sh --project` Flag | Local installation support | pending |
| 4 | Canonical Delegate & Review Remediation | Skill-driven delegate and same-session remediation | pending |

## Risks & Open Questions

| Risk/Question | Impact | Mitigation/Answer |
|---------------|--------|-------------------|
| `maintainer-direct` might be too terse and cause users to miss context | Medium | Keep Rule #2 ("Ask, don't assume") intact; only relax the turn-end behavior, not the judgment threshold |
| Delegation threshold might be too strict for edge cases | Medium | Use risk, uncertainty, and scope continuity rather than file count alone |
| Review remediation might create self-confirming changes | Medium | Keep the original review artifact immutable; make fresh re-review optional and explicit |
| `install.sh --project` might conflict with future target config expansion | Low | `--project` is orthogonal to `config.yaml` targets; it just changes the install directory |

## Changelog

### 2026-04-26

- Plan created
