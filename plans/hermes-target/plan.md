---
type: planning
entity: plan
plan: "hermes-target"
status: completed
created: "2026-07-14"
updated: "2026-07-14"
---

# Plan: hermes-target

## Objective

Add the Hermes agent as an installation target to `install.sh`, so that running the installer syncs all repo skills into Hermes' skill directory — following the same configuration and detection pattern as the existing Codex/Claude/Cursor targets.

## Motivation

Users who run the Hermes agent alongside OpenCode, Codex, Claude Code, and Cursor currently have to copy the processing skills into `~/.hermes/skills/` by hand and re-copy them after every repo update. The installer already solves exactly this problem for four harnesses; Hermes fits the established target pattern with minimal code.

Verified Hermes facts (from `~/.hermes/hermes-agent` source, `agent/skill_utils.py`):

- Skills live under `~/.hermes/skills/` and are discovered **recursively** (any depth), so a namespaced subdirectory works without any Hermes-side configuration.
- Skill format is agentskills-compatible: YAML frontmatter with `name` + `description`; `platforms:` is optional (absent = all platforms). The repo's skills need **no changes**.
- Support dirs inside a skill (`references/`, `templates/`, `assets/`, `scripts/`) are excluded from discovery — matches this repo's skill layout.
- Hermes has no agents-directory concept comparable to OpenCode/Claude — it is a **skills-only** target, exactly like Codex.
- Top-level directories in `~/.hermes/skills/` act as categories and may carry a plain-prose `DESCRIPTION.md` (optional).

## Requirements

### Functional

- [x] `install.sh` resolves a `hermes` target: `targets.hermes.home` (default `~/.hermes`) and `targets.hermes.enabled` (`true|false|auto`, default `auto` = enabled iff home exists).
- [x] Environment overrides `OPS_HERMES_HOME` and `OPS_SYNC_HERMES` take precedence over config.yaml, consistent with the other targets.
- [x] When enabled, all skills are installed to `$HERMES_HOME/skills/processing/<skill-name>/` (namespaced subdirectory, see Notes/Risks).
- [x] A short plain-prose `DESCRIPTION.md` is written to `$HERMES_HOME/skills/processing/` so the group presents as a proper category in Hermes.
- [x] Hermes is a skills-only target: no agents are installed.
- [x] `--project` mode ignores the Hermes target (same behavior as Codex/Claude).
- [x] Existing symlink-safety and update semantics of the shared install loop apply unchanged.

### Non-Functional

- [x] No new dependencies (coreutils + grep + awk + sed only).
- [x] GNU/BSD portability preserved (reuse `sed_inplace` where needed; plain `mkdir`/`cp`/`printf` otherwise).
- [x] Idempotent: re-running the installer updates in place without duplicates or leftovers.

## Scope

### In Scope

- `install.sh`: hermes target resolution + `SKILLS_DESTS` wiring + category `DESCRIPTION.md` generation + summary output.
- `config.yaml.example`: `targets.hermes` block with documentation.
- `README.md`: mention Hermes in the target sync sentence.
- Plan artifacts under `plans/hermes-target/`.

### Out of Scope

- Editing the user's live `~/.hermes/config.yaml` (e.g. registering `skills.external_dirs`) — the installer stays copy-based and never touches harness configs.
- Installing agents/personas into Hermes (no equivalent concept).
- Modifying skill frontmatter (e.g. adding `platforms:` or `metadata.hermes.*`) — not required for discovery.
- Uninstaller, CI pipeline, or test framework for `install.sh` (repo has none; verification is scripted sandbox runs).

## Definition of Done

- [x] `./install.sh` on a machine with `~/.hermes` present reports "Hermes integration: enabled" and installs all 14 skills to `~/.hermes/skills/processing/`.
- [x] `OPS_SYNC_HERMES=false` disables the target; `enabled: auto` with a missing home directory disables it silently and cleanly.
- [x] `./install.sh --project` produces no Hermes writes.
- [x] `bash -n install.sh` passes (and `shellcheck` reports no new findings, if available).
- [x] `config.yaml.example` and `README.md` document the new target.
- [x] Sandboxed verification evidence (enabled / disabled / auto-missing / project mode) captured in the PR description.

## Testing Strategy

The repo has no test harness; `install.sh` explicitly supports `OPS_*` overrides "for tests/CI". Verification is therefore scripted sandbox runs against a temp directory:

- [x] Enabled case: `OPS_HERMES_HOME=<tmp>/hermes` (pre-created) with all other targets disabled → 14 skill dirs + `DESCRIPTION.md` appear under `<tmp>/hermes/skills/processing/`; `SKILL.md` content matches repo source.
- [x] Override-disable case: `OPS_SYNC_HERMES=false` → no Hermes writes, "disabled" reported.
- [x] Auto-missing case: `OPS_HERMES_HOME` pointing at a non-existent dir, state `auto` → target disabled.
- [x] Idempotency: run the enabled case twice → identical tree, no duplicates.
- [x] Symlink safety: pre-create `<dest>/processing/<skill>` as symlink → installer skips it.
- [x] Project mode: `./install.sh --project` in a temp dir → only `./.opencode/` (+ `./.cursor/` if enabled) written, no Hermes paths.
- [x] Static check: `bash -n`; `shellcheck` if installed.
- [x] Real-machine smoke test: full `./install.sh` run on this Mac, verify `~/.hermes/skills/processing/`.

## Phases

Single-phase plan — the change is one focused session (one script, two doc files).

| Phase | Title | Scope | Status |
|-------|-------|-------|--------|
| 1 | Hermes install target | [Detail](phases/phase-1.md) | completed |

## Risks & Open Questions

| Risk/Question | Impact | Mitigation/Answer |
|---------------|--------|-------------------|
| Hermes' skills curator (`.curator_state`, `.bundled_manifest`) could treat a foreign top-level directory unexpectedly (e.g. archive it) | Low — skills would disappear from Hermes until re-install | Namespaced `processing/` dir keeps the footprint contained and identifiable; skills are plain agentskills format; re-running the installer restores them |
| Name collisions with bundled Hermes skills | Low | Verified: no overlap — bundled `software-development` category has `plan`/`writing-plans` etc.; repo names (`create-plan`, `review-plan`, …) are distinct |
| Flat install (Codex pattern) vs. namespaced subdirectory | Design decision | Namespaced `processing/` chosen: Hermes' skills root is a curated category tree (unlike Codex/Claude flat roots); recursive discovery makes the subdirectory free; uninstall/identification trivial |
| `skills.external_dirs` in Hermes config.yaml as alternative integration | Design decision | Rejected: would require the installer to edit a user's live 6+ KB YAML config — copy-based install matches all other targets and stays side-effect free |
| Hermes home layout changes in future versions | Medium | `targets.hermes.home` + `OPS_HERMES_HOME` make the path configurable without code changes |

## Changelog

### 2026-07-14

- Plan created

- Scope addition: docs/installation.md also updated (target list + OPS_* override table) for consistency
- Phase 1 implemented, verified (24/24 sandbox checks, shellcheck clean, real-machine smoke test incl. Hermes-code discovery check), plan completed
