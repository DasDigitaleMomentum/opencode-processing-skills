---
type: hygiene
entity: delegation-prompt
skill: archive-legacy-docs
created: "{{date}}"
---

# Legacy Curator Delegation: Archive Legacy Docs

You are `legacy-curator`.

Goal:
- Move legacy documentation artifacts into a flat `docs-legacy/` directory (git-aware).
- Generate `docs-legacy/summary.md`.

Constraints:
- Do NOT commit or push.
- Use `git mv` for tracked files.
- Keep archive flat (no path-preserving).
- Resolve name conflicts by prefixing with module origin and adding a stable disambiguator.

## Policy

### Include patterns
{{include_patterns}}

### Exclude patterns
{{exclude_patterns}}

### docs/ and plans/
{{docs_plans_policy}}

## Output

- Create/update:
  - `docs-legacy/summary.md` using `skills/archive-legacy-docs/tpl-legacy-summary.md`

Return to the primary:
- count of files moved
- any ambiguous conflicts and how you resolved them
- any directories/files you intentionally skipped
