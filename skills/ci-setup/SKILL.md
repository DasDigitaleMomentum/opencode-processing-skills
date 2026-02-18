---
name: ci-setup
description: Generates a CI/CD pipeline (GitHub Actions) tailored to the project's tech stack. Detects language, framework, test runner, and linter, then produces a production-ready workflow with caching, matrix testing, and security best practices.
license: MIT
compatibility: opencode
metadata:
  category: devops
  phase: setup
---

# Skill: CI Setup

## What This Skill Does

Generates a **production-ready CI pipeline** based on the project's tech stack. Instead of copying a generic template and adapting it, this skill analyzes the project's actual tools and produces a workflow that matches.

## When to Use

- When a project has no CI yet
- When migrating CI from another provider to GitHub Actions
- When the user says "set up CI" or "add a pipeline"
- After `scaffold` creates a new project

Do NOT use this for fixing existing CI — use `fix-ci` for that.

## Execution Model

- **Always**: the primary agent runs this skill directly.
- **Output**: `.github/workflows/ci.yml` (and optionally additional workflow files).

## Workflow

### Step 1: Detect Project Stack

Check for key files:

| File | Stack | Tools |
|------|-------|-------|
| `package.json` | Node.js | npm/yarn/pnpm |
| `tsconfig.json` | TypeScript | tsc |
| `pyproject.toml` | Python | pip/poetry/uv |
| `go.mod` | Go | go |
| `Cargo.toml` | Rust | cargo |
| `pom.xml` | Java | maven |

Extract from config:

- **Language version**: from engines, python-requires, go directive
- **Package manager**: npm vs yarn vs pnpm (check lockfile)
- **Test framework**: jest, vitest, pytest, go test
- **Linter**: eslint, ruff, golangci-lint
- **Build command**: from scripts or Makefile

### Step 2: Design Pipeline

Build a workflow with these jobs:

1. **Lint / Format** — fast, catches style issues early
2. **Type Check** — if applicable (tsc, mypy, pyright)
3. **Test** — with matrix strategy for multiple versions if sensible
4. **Build** — verify the project builds
5. **Security** — dependency audit (optional)

### Step 3: Apply Best Practices

- **Pin action versions** to SHA for security
- **Cache dependencies** (node_modules, pip cache, Go modules)
- **Explicit permissions** (`contents: read` minimum)
- **Concurrency control** to cancel stale runs
- **Matrix testing** for multiple language versions (if applicable)

### Step 4: Generate Workflow File

Write `.github/workflows/ci.yml` with proper structure:

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  # ... generated jobs
```

### Step 5: Verify Locally

Run the same commands that CI would run to verify they work:

```bash
# Example
npm ci && npm run lint && npm test && npm run build
```

### Step 6: Present to User

Show the generated workflow and explain each job. Ask if any adjustments are needed (additional checks, deployment steps, etc.).

## Rules

1. **Stack-specific**: generate CI that matches the actual project, not a generic template.
2. **Security first**: pin actions to SHA, use minimal permissions, never put secrets in plain text.
3. **Fast feedback**: order jobs from fastest to slowest. Lint and type check should run before tests.
4. **Cache everything**: dependency caching significantly speeds up CI. Always include it.
5. **No built-in explore agent**: do NOT use the built-in `explore` subagent type.
