---
name: archive-legacy-docs
description: Normalize legacy repositories by moving scattered documentation into docs-legacy/ (git-aware) and generating a docs-legacy/summary.md before generating new docs/plans.
license: MIT
compatibility:
  opencode: ">=0.1"
metadata:
  category: hygiene
  phase: pre-docs
---

# Skill: Archive Legacy Docs

This skill prepares a clean, defined repository state **before** running `generate-docs` / `create-plan` on legacy repositories.

It collects existing documentation artifacts that are scattered/historical, moves them into a single archive directory `docs-legacy/`, and generates a lightweight index `docs-legacy/summary.md`.

The archived content is intended to be **forensic reference**, not canonical documentation.

---

## When to Use

Use this skill when:

- You are onboarding a legacy repo and documentation/plan artifacts are scattered.
- You want `docs/` and `plans/` to start from a clean slate.

Do **not** use this skill when:

- `docs/` and `plans/` already follow this framework’s conventions and should be preserved.

---

## Routing Matrix (Who does what)

- **Writes**: `docs-legacy/**` (including `docs-legacy/summary.md`).
- **Moves**: legacy doc files from anywhere in the repo into `docs-legacy/`.
- **Primary**: chooses/approves inclusion & exclusion policy (what counts as legacy docs).
- **legacy-curator (subagent)**: performs git-aware moves and writes the summary.
- **doc-explorer / implementer**: not used.

---

## Execution Model

### Key semantics

- **git-aware moves**:
  - If a file is tracked by git, move it with `git mv`.
  - If a file is untracked, move it with filesystem move.
- **flat archive**:
  - All archived files end up directly under `docs-legacy/` (no path-preserving).
  - Name conflicts are resolved by prefixing with the inferred **module** and adding a stable disambiguator.

### Module inference (draft)

For each legacy document, infer a "module origin" label (best-effort):

1) If path contains a top-level module directory (e.g. `backend/`, `frontend/`, `services/<name>/`, `packages/<name>/`), use that.
2) Else use the first directory segment (`<topdir>`).
3) Else use `root`.

---

## Workflow

### 0) Primary inputs

Primary should provide:

- inclusion patterns (defaults suggested below)
- exclusion patterns (defaults suggested below)
- whether to treat existing `docs/` and `plans/` as legacy (default: yes unless they match this framework)

### 1) Discover candidate legacy docs

legacy-curator:

- Collect candidate files (typical): `**/*.md`, `**/*.rst`, `**/*.adoc`, `**/*.txt`.
- Exclude common non-doc files: `README*`, `LICENSE*`, `CHANGELOG*`, `CONTRIBUTING*`, `.github/**`.
- Exclude build/vendor dirs: `node_modules/**`, `dist/**`, `build/**`, `target/**`, `.venv/**`, `venv/**`.
- Exclude already-archived: `docs-legacy/**`.

Special case:

- If `docs/` or `plans/` exist but do not match this framework’s structure, treat them as legacy and include their files.

### 2) Plan the archive mapping (in-memory)

For each candidate file, compute:

- `original_path`
- `module_origin` (draft inference)
- `archive_name` (flat):
  - base: `<module_origin>--<original_basename>`
  - if collision: append `--<short-hash>` or `--<n>`
- `archive_path`: `docs-legacy/<archive_name>`

### 3) Execute moves (git-aware)

- Create `docs-legacy/` if missing.
- For each file:
  - If tracked: `git mv <original> <archive>`
  - Else: `mv <original> <archive>`

Do not commit.

### 4) Generate `docs-legacy/summary.md`

Create `docs-legacy/summary.md` using `tpl-legacy-summary.md`.

For each archived file, include:

- archive path
- original path
- inferred module origin
- type (doc/plan/spec/notes/adr/unknown; best-effort)
- last modified (draft): from `git log -1 --format=%cs -- <file>` if available, else `unknown`
- time bucket (draft): `recent` / `stale` / `historic` / `unknown`
- 3-sentence summary (best-effort; if non-text or unreadable → state that)

---

## Defaults (recommended)

### Include

- `**/*.md`
- `**/*.rst`
- `**/*.adoc`
- `**/*.txt`

### Exclude

- `docs-legacy/**`
- `.git/**`
- `.github/**`
- `node_modules/**`, `dist/**`, `build/**`, `target/**`
- `venv/**`, `.venv/**`
- `README*`, `LICENSE*`, `CHANGELOG*`, `CONTRIBUTING*`

---

## Templates

- `tpl-archive-legacy-docs-prompt.md` — Primary → legacy-curator delegation prompt
- `tpl-legacy-summary.md` — canonical format for `docs-legacy/summary.md`
