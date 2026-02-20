---
name: scaffold
description: Generates boilerplate for new modules, features, or components based on existing project conventions. Detects patterns from the codebase and produces new code that looks like it belongs. Ensures consistency without manual template maintenance.
license: MIT
compatibility: opencode
metadata:
  category: implementation
  phase: creation
---

# Skill: Scaffold

## What This Skill Does

Generates **convention-aware boilerplate** for new modules, features, or components. Instead of starting from scratch (and introducing inconsistencies), this skill analyzes existing code to learn the project's patterns, then generates new code that follows the same structure, naming, imports, and organization.

## When to Use

- When creating a new module, service, component, or feature
- When the user says "add a new <X> like the existing ones"
- As part of `implement-phase` when a step requires creating new files

Do NOT use this for modifying existing code — use `refactor` for that.

## Execution Model

- **Always**: the primary agent runs this skill directly.
- **Rationale**: scaffolding requires reading existing code patterns and creating new files — primary agent capabilities.
- **Output**: new source files + optional test files.

## Workflow

### Step 1: Identify What to Scaffold

Use the `question` tool to determine:

1. What type? (module, component, service, endpoint, model, CLI command)
2. What name?
3. Is there an existing example to follow? (e.g., "like the auth module")

### Step 2: Find Reference Examples

Locate existing code of the same type:

```bash
# Find similar modules/components
find . -name "*.ts" -path "*/services/*" | head -5
find . -name "*.py" -path "*/models/*" | head -5
```

Read 1-2 reference files to extract:

- File structure (sections, imports, exports)
- Naming conventions (PascalCase, snake_case)
- Comment patterns (JSDoc, docstrings)
- Error handling patterns
- Type/interface patterns

### Step 3: Read Project Conventions

Check `AGENTS.md` for explicit conventions:

- Module structure rules
- Naming requirements
- Required boilerplate (license headers, type guards)
- Dependencies between modules

### Step 4: Generate Scaffold

Create the new files following discovered patterns:

1. **Source file(s)** with proper structure, imports, exports
2. **Test file(s)** matching the project's test conventions
3. **Index/barrel file** if the project uses them
4. **Type definitions** if the project has separate type files

Every generated file should:

- Follow the same import style as reference files
- Use the same export pattern
- Include the same boilerplate (error types, logging, etc.)
- Have placeholder implementations marked with `// TODO: implement` or `pass`

### Step 5: Verify Structure

```bash
# Show what was created
find <new-module-path> -type f
```

Check:

- File naming matches convention
- Directory placement is correct
- Imports resolve (no broken references)
- Types are consistent

### Step 6: Run Quick Check

If the project has a type checker:

```bash
npx tsc --noEmit  # TypeScript
mypy <module>      # Python
```

Verify the scaffold doesn't break the build.

## Rules

1. **Pattern first**: always analyze existing code before generating. Never use generic templates that don't match the project.
2. **Complete but minimal**: generate all required files (source, test, types) but keep implementations as stubs.
3. **No surprises**: the generated code should look like a team member wrote it. Same style, same patterns, same structure.
4. **Imports must resolve**: verify that all imports in the generated code point to real modules.
5. **Test file included**: always generate a corresponding test file, even if it only has a placeholder test.
6. **No built-in explore agent**: do NOT use the built-in `explore` subagent type.
