---
name: test-strategy
description: Generates a test strategy document for a project or module. Analyzes existing coverage, identifies gaps, prioritizes what to test, and recommends test types (unit, integration, e2e) per module. Use before add-tests for informed testing decisions.
license: MIT
compatibility: opencode
metadata:
  category: testing
  phase: planning
---

# Skill: Test Strategy

## What This Skill Does

Creates a **test strategy document** that answers: what should we test, how, and in what priority? Analyzes the codebase to produce a structured testing plan rather than ad-hoc test writing.

## When to Use

- Before starting a testing initiative
- When the user says "we need better test coverage"
- As input for `add-tests` (which tests to generate first)
- When onboarding a project with poor test coverage

## Execution Model

- **Phase 1**: primary agent analyzes codebase structure, existing tests, and coverage.
- **Phase 2**: primary spawns `doc-explorer` to write the strategy document to `docs/test-strategy.md`.

## Workflow

### Step 1: Inventory Existing Tests

Map what tests exist:

```bash
# Count test files vs source files
find . -name "*.test.*" -o -name "*.spec.*" -o -name "test_*" | wc -l
find . -name "*.ts" -o -name "*.py" -o -name "*.go" | grep -v test | grep -v node_modules | wc -l
```

For each module, check if a corresponding test file exists.

### Step 2: Categorize Modules by Risk

Assess each module's testing priority:

| Risk Factor | Weight |
|-------------|--------|
| Handles user input / external data | High |
| Has complex business logic | High |
| Manages state / data persistence | High |
| Has many dependents (widely imported) | Medium |
| Performs I/O (file, network, DB) | Medium |
| Is pure utility / helper | Low |

### Step 3: Identify Coverage Gaps

For each module:

- Does it have any tests? (binary check)
- Do tests cover happy path? Error cases? Edge cases?
- Are integration points tested?

### Step 4: Recommend Test Types

Per module, recommend the appropriate test types:

| Module Type | Recommended Tests |
|-------------|------------------|
| Business logic | Unit tests with edge cases |
| API endpoints | Integration tests |
| UI components | Component/snapshot tests |
| Data layer | Integration tests with test DB |
| Utilities | Unit tests |
| CLI | Integration tests |

### Step 5: Generate Strategy Document

Write to `docs/test-strategy.md`:

```markdown
# Test Strategy

## Current State
- Source files: N
- Test files: N
- Coverage ratio: N%

## Priority Matrix
| Module | Risk | Current Coverage | Recommended Tests | Priority |
|--------|------|-----------------|-------------------|----------|

## Testing Approach
### Unit Tests
### Integration Tests
### E2E Tests

## Recommended Order
1. <highest priority module>
2. <next>

## Test Infrastructure Needs
- Fixtures needed
- Mocks needed
- CI integration
```

## Rules

1. **Analysis, not implementation**: this skill produces a strategy document. It does not write tests (use `add-tests` for that).
2. **Risk-based prioritization**: not all code needs the same level of testing. Focus on high-risk, high-impact areas.
3. **Be pragmatic**: 80% coverage of critical paths beats 100% coverage of trivial code.
4. **Respect existing patterns**: recommend test types and tools that align with the project's existing test infrastructure.
5. **No built-in explore agent**: do NOT use the built-in `explore` subagent type.
