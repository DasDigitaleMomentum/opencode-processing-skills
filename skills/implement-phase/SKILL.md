---
name: implement-phase
description: Executes a plan phase step by step. Reads plan artifacts, follows implementation steps, runs tests after each change, and updates plan status automatically.
license: MIT
compatibility: opencode
metadata:
  category: implementation
  phase: execution
---

# Skill: Implement Phase

## What This Skill Does

Bridges the gap between **planning** and **code**. Takes a plan phase with its implementation plan and executes it systematically — step by step, with test verification after each step, and automatic plan status updates.

Without this skill, agents implement "freestyle" after reading a plan, often skipping steps, forgetting test runs, or not updating plan status. This skill enforces the discipline that makes plans actually useful.

## When to Use

- After `resume-plan` has briefed you on the current phase
- After `analyze-impact` has confirmed it's safe to proceed
- When the user says "implement this phase" or "start coding"

Do NOT use this for exploratory coding or quick fixes — it's designed for planned, multi-step work.

## Execution Model

- **Always**: the primary agent runs this skill directly.
- **Rationale**: implementation requires full tool access (file edits, terminal, tests) and conversation context for user feedback. Cannot be delegated.
- **Integration**: reads from `plans/<name>/`, writes code, runs tests, updates plan via `update-plan` patterns.

## Workflow

### Step 1: Load Phase Context

Read the phase artifacts in order:

1. `plans/<name>/plan.md` — overall objective and scope
2. `plans/<name>/phases/phase-N.md` — this phase's objective, scope, prerequisites, deliverables
3. `plans/<name>/implementation/phase-N-impl.md` — concrete implementation steps
4. `plans/<name>/implementation/phase-N-impact.md` — impact analysis (if exists)
5. `plans/<name>/todo.md` — current task status

Verify all prerequisites from the phase document are met before proceeding.

### Step 2: Create Implementation Checklist

Extract the implementation steps from `phase-N-impl.md` and create a structured checklist using `todowrite`:

- Each implementation step becomes a todo item
- Add a "run tests" item after each code change step
- Add a "verify" item at the end for acceptance criteria

### Step 3: Execute Steps Sequentially

For each implementation step:

1. **Read required context** referenced in the step (specific files, modules, docs)
2. **Implement the change** — write code, following project conventions from `AGENTS.md`
3. **Run relevant tests** immediately after the change
4. **Handle test failures** — fix before moving to the next step. Do NOT proceed with failing tests.
5. **Update todo** — mark step as completed via `todowrite`

### Step 4: Verify Acceptance Criteria

After all steps are completed:

1. Read the acceptance criteria from `phases/phase-N.md`
2. Verify each criterion is met
3. Run the full test suite (not just individual tests)
4. Check for any regressions

### Step 5: Update Plan Status

Do NOT update the plan files with ad-hoc manual edits. In the same primary-agent session, invoke exactly the `update-plan` skill to apply these patterns:

1. Update `todo.md` — mark all items completed
2. Update `phases/phase-N.md` — set status to completed
3. Update `plan.md` changelog — record completion
4. If this was the last phase, mark the plan as completed

### Step 6: Report to User

Present a summary:

- Steps completed
- Tests passed/failed
- Files changed
- Any deviations from the plan (and why)

Use the `question` tool to ask if the user wants to proceed to the next phase or review changes first.

## Rules

1. **Never skip steps**: execute implementation steps in order. If a step seems unnecessary, ask the user — don't skip silently.
2. **Tests after every change**: run relevant tests after each code modification. This catches regressions early.
3. **Fix before proceeding**: if tests fail, fix the issue before moving to the next step. Do not accumulate broken state.
4. **Update plan artifacts**: keep `todo.md` and phase status in sync throughout implementation. Do not batch updates.
5. **Respect AGENTS.md**: follow all project conventions documented in AGENTS.md (naming, patterns, style).
6. **Minimal diffs**: implement the minimal change that satisfies the step. Avoid scope creep.
7. **No built-in explore agent**: do NOT use the built-in `explore` subagent type.
