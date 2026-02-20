---
name: dependency-audit
description: Analyzes project dependencies for staleness, known vulnerabilities, license compatibility, and unused packages. Produces an actionable audit report with prioritized update recommendations. No external services required — uses local tooling and registry APIs.
license: MIT
compatibility: opencode
metadata:
  category: quality
  phase: maintenance
---

# Skill: Dependency Audit

## What This Skill Does

Produces a **dependency health report** covering four dimensions: staleness (outdated versions), security (known vulnerabilities), licensing (compatibility issues), and usage (potentially unused packages).

## When to Use

- Periodic maintenance check (monthly/quarterly)
- Before a major release
- When security is a concern
- When the user says "audit our dependencies" or "what needs updating?"

## Execution Model

- **Always**: the primary agent runs this skill directly.
- **Token budget**: ~3-5k tokens.
- **Output**: chat-based audit report. Optionally written to `docs/dependency-audit.md`.

## Workflow

### Step 1: Identify Package Manager

```bash
# Node.js
[ -f "package-lock.json" ] && echo "npm"
[ -f "yarn.lock" ] && echo "yarn"
[ -f "pnpm-lock.yaml" ] && echo "pnpm"

# Python
[ -f "requirements.txt" ] && echo "pip"
[ -f "pyproject.toml" ] && echo "poetry/uv"

# Go
[ -f "go.sum" ] && echo "go modules"
```

### Step 2: Check Staleness

```bash
# Node.js
npm outdated --json 2>/dev/null

# Python
pip list --outdated --format=json 2>/dev/null

# Go
go list -u -m all 2>/dev/null
```

Categorize updates:

| Type | Risk | Action |
|------|------|--------|
| Patch (1.0.0 → 1.0.1) | Low | Safe to update |
| Minor (1.0.0 → 1.1.0) | Medium | Review changelog |
| Major (1.0.0 → 2.0.0) | High | Breaking changes likely |

### Step 3: Check Vulnerabilities

```bash
# Node.js
npm audit --json 2>/dev/null

# Python
pip-audit --format=json 2>/dev/null

# Go
govulncheck ./... 2>/dev/null
```

### Step 4: Check Licenses

```bash
# Node.js
npx -y license-checker --json 2>/dev/null | head -100

# Python
pip-licenses --format=json 2>/dev/null
```

Flag problematic licenses:

| License | Compatibility |
|---------|--------------|
| MIT, Apache-2.0, BSD | Permissive |
| GPL-3.0 | Copyleft (check project license) |
| AGPL-3.0 | Strong copyleft |
| Unknown | Investigate |

### Step 5: Generate Report

```markdown
## Dependency Audit

### Summary
| Metric | Value |
|--------|-------|
| Total dependencies | N |
| Outdated | N |
| Vulnerabilities | N |
| License issues | N |

### Vulnerabilities (fix immediately)
| Package | Severity | Advisory | Fix |
|---------|----------|----------|-----|

### Major Updates Available
| Package | Current | Latest | Breaking Changes |
|---------|---------|--------|-----------------|

### Minor/Patch Updates
| Package | Current | Latest | Type |
|---------|---------|--------|------|

### License Concerns
| Package | License | Issue |
|---------|---------|-------|

### Recommendations
1. <prioritized action>
```

## Rules

1. **Use local tools**: prefer `npm audit`, `pip-audit`, `govulncheck` over external services.
2. **Prioritize security**: vulnerabilities are more urgent than staleness.
3. **Don't auto-update**: this skill reports findings. Actual updates should be planned and tested.
4. **License context matters**: a GPL dependency in a MIT project might be fine (if not distributed) or a problem. Note the nuance.
5. **No built-in explore agent**: do NOT use the built-in `explore` subagent type.
