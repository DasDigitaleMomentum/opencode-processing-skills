---
type: planning
entity: phase
plan: "hermes-target"
phase: 1
status: completed
created: "2026-07-14"
updated: "2026-07-14"
---

# Phase 1: Hermes install target

> Part of [hermes-target](../plan.md)

## Objective

Wire Hermes into `install.sh` as a fifth installation target (skills-only), configurable via `config.yaml` and `OPS_*` environment variables, with auto-detection via directory existence — and document it.

## Scope

### Includes

- Target resolution block in `install.sh` (after the Cursor block): `HERMES_HOME` (default `~/.hermes`), `HERMES_STATE` (default `auto`), env overrides `OPS_HERMES_HOME` / `OPS_SYNC_HERMES`.
- `SKILLS_DESTS` wiring: append `$HERMES_HOME/skills/processing` when enabled; print enabled/disabled status line like the other targets.
- Category `DESCRIPTION.md` generation into `$HERMES_HOME/skills/processing/` (plain prose, two lines, matching the style of bundled Hermes categories).
- `--project` mode: Hermes excluded (no change needed beyond the existing dest-array reset — verify).
- `config.yaml.example`: `targets.hermes` block + comment lines explaining the skills-only behavior and the `processing/` namespace.
- `README.md`: extend the target sync sentence ("If Codex, Claude Code, or Cursor are installed locally…") to include Hermes.

### Excludes (deferred to later phases)

- Nothing deferred — single-phase plan. (Hermes agents/persona support and installer test harness are out of scope per plan.)

## Prerequisites

- [x] Local `main` at v0.5.0 (`b0869cd`) — contains `sed_inplace` portability helper and the Cursor target as the freshest pattern to mirror.
- [x] Hermes skill-discovery behavior verified against `~/.hermes/hermes-agent` source (recursive `SKILL.md` scan, optional `platforms:` frontmatter, support-dir exclusions).

## Deliverables

- [x] Modified `install.sh` with hermes target (resolution, dest wiring, status output, `DESCRIPTION.md` generation, summary note).
- [x] Updated `config.yaml.example` with `targets.hermes`.
- [x] Updated `README.md` target sentence.
- [x] Sandboxed verification transcript (for the PR description).

## Acceptance Criteria

- [x] With `~/.hermes` present and no config: installer prints `Hermes integration: enabled (skills -> ~/.hermes/skills/processing)` and installs all 14 skills there, plus `DESCRIPTION.md`.
- [x] `OPS_SYNC_HERMES=false` prints `Hermes integration: disabled` and writes nothing to the Hermes home.
- [x] `enabled: auto` + non-existent home → disabled, exit code 0.
- [x] Re-run is idempotent; pre-existing symlinked skill dirs are skipped with the standard message.
- [x] `./install.sh --project` writes no Hermes paths.
- [x] `bash -n install.sh` clean; `shellcheck` (if present) shows no new findings vs. `main`.

## Dependencies on Other Phases

| Phase | Relationship | Notes |
|-------|-------------|-------|
| — | — | Single-phase plan |

## Notes

- Mirror the Codex block for resolution and the Codex/Cursor blocks for `SKILLS_DESTS` wiring — keep ordering: OpenCode, Codex, Claude, Cursor, Hermes.
- The `processing/` namespace is a deliberate deviation from the flat Codex/Claude layout because Hermes' skills root is a curated category tree (see plan risks table).
- `DESCRIPTION.md` must be written **after** the skills loop would be wrong — write it during target setup or right after the skills loop; simplest: generate it in the wiring block via `mkdir -p` + `printf` guarded by the enabled check, or after Step 1. Decide during implementation; keep it outside the per-skill loop.
