---
name: add-tests
description: Analyzes a module or function and generates appropriate tests. Detects the project's test framework, discovers existing test patterns, and produces tests that follow the project's conventions. Covers unit, integration, and edge case tests.
license: MIT
compatibility: opencode
metadata:
  category: testing
  phase: quality
---

# Skill: Add Tests

## What This Skill Does

Generates **tests that fit the project**, not generic boilerplate. Analyzes the target code, discovers the project's test framework and patterns (file naming, fixture usage, assertion style), then generates tests that look like they were written by a team member.

## When to Use

- After implementing new code that needs tests
- When `coverage-check` identifies untested modules
- When the user says "add tests for X"
- As part of `implement-phase` (after each code change)

Do NOT use this for test strategy planning — use `test-strategy` for that.

## Execution Model

- **Always**: the primary agent runs this skill directly.
- **Rationale**: test generation requires reading source code, understanding execution context, and running tests to verify they pass.
- **Output**: test files in the project's test directory.

## Workflow

### Step 1: Detect Test Infrastructure

Identify the project's test setup:

**JavaScript/TypeScript:**

```bash
# Framework
grep -l "vitest\|jest\|mocha" package.json
# Config
find . -name "vitest.config.*" -o -name "jest.config.*" | head -5
# Existing tests
find . -path "*/test*" -name "*.test.*" -o -name "*.spec.*" | head -10
```

**Python:**

```bash
# Framework
grep -l "pytest\|unittest" pyproject.toml setup.cfg
# Config
find . -name "conftest.py" -o -name "pytest.ini" | head -5
# Existing tests
find . -path "*/test*" -name "test_*" | head -10
```

### Step 2: Analyze Existing Test Patterns

Read 2-3 existing test files to extract patterns:

- **File naming**: `test_<module>.py` vs `<module>.test.ts` vs `<module>.spec.ts`
- **Directory structure**: `tests/unit/`, `tests/integration/`, `__tests__/`, co-located
- **Import style**: relative vs absolute, aliases
- **Fixture patterns**: pytest fixtures, beforeEach, test factories
- **Assertion style**: assert, expect, should
- **Mocking approach**: unittest.mock, jest.mock, vitest vi.mock
- **Test organization**: describe/it blocks, class-based, function-based

### Step 3: Analyze Target Code

Read the module/function to test:

1. **Public interface**: exported functions, class methods, API endpoints
2. **Input types**: what parameters does it accept?
3. **Output types**: what does it return?
4. **Side effects**: does it write files, call APIs, modify state?
5. **Error cases**: what exceptions/errors can it throw?
6. **Edge cases**: null inputs, empty arrays, boundary values
7. **Dependencies**: what does it import? (need mocking?)

### Step 4: Design Test Cases

Create test cases covering:

| Category | Test Cases |
|----------|-----------|
| **Happy path** | Normal inputs → expected outputs |
| **Edge cases** | Empty input, null, boundary values |
| **Error handling** | Invalid input, missing dependencies |
| **Integration** | Interaction with dependencies (if applicable) |

### Step 5: Generate Tests

Write the test file following the discovered patterns:

1. Use the same file naming convention
2. Use the same import style
3. Use the same fixture/setup patterns
4. Use the same assertion style
5. Add clear test names that describe the behavior being tested

### Step 6: Run and Verify

Run the generated tests:

```bash
# Python
pytest <test-file> -v

# JavaScript
npx vitest run <test-file>
```

If tests fail:

- **Import errors**: fix paths
- **Type errors**: fix mocks/fixtures
- **Assertion errors**: verify expected values against actual implementation
- **Do NOT change the source code to make tests pass** — fix the tests

### Step 7: Report Coverage

Show what was covered:

```
Tests generated: <file>
   - <N> test cases
   - Happy path: <Covered/Not Covered>
   - Edge cases: <Covered/Not Covered>
   - Error handling: <Covered/Not Covered>
```

## Rules

1. **Match project patterns**: generated tests must look like existing tests in the project. Never introduce a different framework, style, or structure.
2. **Test behavior, not implementation**: test what the function does, not how it does it. Avoid testing private internals.
3. **Tests must pass**: run tests after generating them. Failing generated tests are worse than no tests.
4. **Don't modify source code**: if a function is hard to test, note it — don't refactor the source to make it testable (that's `refactor`'s job).
5. **Meaningful names**: test names should read as behavior descriptions: `test_returns_empty_list_when_no_items_match`.
6. **No built-in explore agent**: do NOT use the built-in `explore` subagent type.
