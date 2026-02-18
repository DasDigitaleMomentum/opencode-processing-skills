---
name: coverage-check
description: Lightweight test coverage analysis using git and file system heuristics. Identifies source files with no corresponding test file. No coverage tools required — works on any project by pattern matching. The CHECK skill for testing, analogous to validate-docs for documentation.
license: MIT
compatibility: opencode
metadata:
  category: testing
  phase: check
---

# Skill: Coverage Check

## What This Skill Does

The **`validate-docs` of testing**. Performs a fast, lightweight coverage check by matching source files against test files using naming conventions. No coverage tools, no test execution, no source file reads — just file system patterns.

Answers: "Which source files have no corresponding test file?"

## When to Use

- At session start (via `smart-start`) to assess test health
- Before `add-tests` to know where to focus
- As a quick health check: "how's our test coverage?"

Do NOT use this for detailed coverage analysis — use actual coverage tools for that. This is a fast heuristic.

## Execution Model

- **Always**: the primary agent runs this skill directly.
- **Token budget**: ~1-2k tokens. This is intentionally minimal.
- **Output**: chat-based coverage report.

## Workflow

### Step 1: Detect Test Patterns

Identify how the project names test files:

```bash
# Find test files and extract naming pattern
find . -name "*.test.*" -o -name "*.spec.*" -o -name "test_*" | head -5
```

Common patterns:

| Pattern | Convention |
|---------|-----------|
| `src/foo.ts` → `src/foo.test.ts` | Co-located |
| `src/foo.ts` → `tests/foo.test.ts` | Separate directory |
| `src/foo.ts` → `__tests__/foo.test.ts` | Jest convention |
| `src/foo.py` → `tests/test_foo.py` | Python convention |
| `src/foo.go` → `src/foo_test.go` | Go convention |

### Step 2: Map Source to Tests

For each source file, check if a corresponding test file exists:

```bash
# Example for Python
for src in $(find src -name "*.py" ! -name "__init__.py" ! -path "*/test*"); do
    base=$(basename "$src" .py)
    if ! find tests -name "test_${base}.py" | grep -q .; then
        echo "UNCOVERED: $src"
    fi
done
```

### Step 3: Generate Report

```markdown
## Coverage Check

| Metric | Value |
|--------|-------|
| Source files | N |
| Test files | N |
| Coverage ratio | N% |

### Uncovered Files (no test file found)

| File | Module | Risk |
|------|--------|------|
| src/auth/login.ts | auth | 🔴 High (handles user input) |
| src/utils/format.ts | utils | 🟢 Low (pure utility) |

### Well-Covered Modules
- ✅ api/ (8/8 files have tests)
- ✅ models/ (5/5 files have tests)

### Recommendation
Focus `add-tests` on: auth/login.ts, data/repository.ts
```

## Rules

1. **No test execution**: this skill never runs tests. It only checks file existence.
2. **Heuristic, not precise**: file-based matching is approximate. A test file existing doesn't mean it has good coverage. Flag this in the report.
3. **Fast**: should complete in under 5 seconds. No source file reads.
4. **Convention-aware**: detect the project's test naming convention before matching. Don't assume.
5. **No built-in explore agent**: do NOT use the built-in `explore` subagent type.
