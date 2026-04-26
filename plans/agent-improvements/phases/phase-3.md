---
type: planning
entity: phase
plan: "agent-improvements"
phase: 3
status: pending
created: "2026-04-26"
updated: "2026-04-26"
---

# Phase 3: `install.sh --project` Flag

> Part of [agent-improvements](../plan.md)

## Objective

Add a `--project` flag to `install.sh` that installs skills and agents into `./.opencode/` in the current directory instead of the global `~/.config/opencode/`.

## Scope

### Includes

- `install.sh` — new `--project` flag
- `install.sh` — `--help` output documents the flag
- `config.yaml.example` — add note about `--project` usage
- Target directory: `./.opencode/skills/` and `./.opencode/agents/`

### Excludes (deferred to later phases)

- None — this is self-contained

## Prerequisites

- [ ] Current `install.sh` reviewed and understood
- [ ] Current target directory structure understood

## Deliverables

- [ ] `install.sh` accepts `--project` flag
- [ ] When `--project` is passed, installation target is `./.opencode/` instead of `~/.config/opencode/`
- [ ] `--help` lists the `--project` option
- [ ] `install.sh` without flags behaves identically to before (backward compatible)
- [ ] `config.yaml.example` mentions `--project` in comments (near targets section or as a usage note)

## Acceptance Criteria

- [ ] `./install.sh --help` shows `--project` flag description
- [ ] `./install.sh --project` in a temp directory creates `./.opencode/skills/` and `./.opencode/agents/`
- [ ] `./install.sh` (no flag) in a temp directory creates files in `~/.config/opencode/` (or the configured target home)
- [ ] Dry-run or actual test confirms no regression
- [ ] `config.yaml.example` references `--project` option

## Dependencies on Other Phases

| Phase | Relationship | Notes |
|-------|-------------|-------|
| 1 | parallel | No dependency |
| 2 | parallel | No dependency |

## Notes

- No separate `install-local.sh` script — a flag is cleaner, single maintenance surface.
- The `--project` flag is orthogonal to `config.yaml` targets. It simply overrides the install root directory.
- `config.yaml.example` update is minimal: a comment or usage note, not new configuration keys.
