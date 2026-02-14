---
name: create-plan
description: Create a structured implementation plan for a feature or change. Produces a plan with requirements, phases, implementation steps, todo list, and Definition of Done. Use this skill when the user wants to plan a non-trivial feature before implementing it.
license: MIT
compatibility: opencode
metadata:
  category: planning
  phase: initial
---

# Skill: Create Plan

## What This Skill Does

Creates a complete implementation plan with all associated artifacts:

1. **Plan** (`plans/<name>/plan.md`) - Objective, requirements, DoD, phases overview
2. **Phases** (`plans/<name>/phases/phase-N.md`) - Scope definition per phase (what/why)
3. **Implementation Plans** (`plans/<name>/implementation/phase-N-impl.md`) - Technical approach per phase (how)
4. **Todo List** (`plans/<name>/todo.md`) - Trackable items with status
5. Creates the directory structure for future **Handovers**

## When to Use

- When the user wants to plan a feature, refactoring, or migration before implementing
- When a task is too large for a single session and needs phasing
- When the user asks to "create a plan" or "plan this feature"

Do NOT use for simple, one-shot tasks that don't need formal planning.

## Workflow

### Step 1: Understand the Objective

Gather requirements from the user using the `question` tool:

- What is the goal? (feature, bugfix, refactoring, migration)
- What are the functional requirements?
- What are the non-functional requirements? (performance, compatibility, etc.)
- What is explicitly out of scope?
- What defines "done"? (Definition of Done)
- What testing strategy is expected?

If the user provided a detailed brief, extract these from the brief and confirm with the `question` tool.

### Step 2: Analyze the Codebase (if applicable)

If the plan involves changes to existing code:

- Use the Task tool with `explore` subagents to understand the affected modules
- Read existing project documentation (`docs/overview.md`, module docs) if available
- Identify dependencies and potential risks

### Step 3: Design the Phase Structure

Determine if phasing is needed:

**Single-phase plans** (simple features):
- One phase covering the entire scope
- One implementation plan
- Still create the full directory structure for consistency

**Multi-phase plans** (complex features):
- Each phase must be completable in a single session
- Phases should have clear boundaries - no phase should depend on "half-done" work from another phase
- Each phase should produce a testable, committable result
- Order phases by dependency (foundational first, then building on top)

Guidelines for phase sizing:
- A phase should represent roughly one focused work session
- If a phase requires reading/modifying more than ~15-20 files, consider splitting
- Each phase should end with passing tests and a clean commit

### Step 4: Create the Plan Document

Create `plans/<name>/plan.md`:

- Clear objective statement
- Motivation (why is this needed)
- Functional and non-functional requirements
- Scope (in/out)
- Definition of Done
- Testing strategy
- Phases table with titles and brief descriptions
- Risks and open questions
- Initialize the changelog

### Step 5: Create Phase Documents

For each phase, create `plans/<name>/phases/phase-N.md`:

- Phase objective (What and Why)
- Scope: what this phase includes and explicitly excludes
- Prerequisites (what must be true before starting)
- Deliverables (concrete outputs)
- Acceptance criteria (how to verify the phase is done)
- Dependencies on other phases

### Step 6: Create Implementation Plans

For each phase, create `plans/<name>/implementation/phase-N-impl.md`:

- Technical approach (How)
- Affected modules with expected changes
- Implementation steps (ordered, each with what/where/why)
- Testing plan for this phase
- Rollback strategy
- Open technical decisions

If project documentation exists (`docs/modules/`), reference it in the affected modules section.

### Step 7: Create the Todo List

Create `plans/<name>/todo.md`:

- Populate with items from Phase 1 (the starting phase)
- All items start as "Pending"
- Initialize the changelog with the plan creation entry

### Step 8: Create the Handover Directory

Create `plans/<name>/handovers/` directory with a `.gitkeep` file.

### Step 9: Review with User

Present the plan summary to the user:

- Total phases with brief descriptions
- Key requirements and DoD
- Identified risks

Use the `question` tool to confirm the plan or gather adjustments.

## Rules

1. **File-based interface**: All artifacts go into `plans/<name>/` directory structure. The directory name should be lowercase, hyphenated, descriptive.
2. **Phase independence**: Each phase must end in a stable state. No phase should leave the codebase broken.
3. **Phase describes scope, implementation plan describes approach**: Keep these concerns separated. The phase says what/why, the implementation plan says how.
4. **Reference, don't duplicate**: Implementation plans reference module docs and phase docs. Don't repeat requirements from the plan in each phase.
5. **Realistic sizing**: Phases must be completable in a single session. When in doubt, make phases smaller.
6. **Use subagents for codebase analysis**: Delegate large exploration to `explore` subagents via the Task tool.
7. **Always ask for confirmation**: Use the `question` tool to validate requirements, phase structure, and scope with the user before creating artifacts.
8. **Initialize changelog**: The plan's changelog should document its creation with the current date.
9. **Create all directories**: Ensure the full directory structure exists: `plans/<name>/`, `phases/`, `implementation/`, `handovers/`.

## Templates

This skill includes reference templates as bundled files. Use them as structural guides when creating plan artifacts:

- `tpl-plan.md` - Structure for the plan document
- `tpl-phase.md` - Structure for phase documents
- `tpl-implementation-plan.md` - Structure for implementation plans
- `tpl-todo.md` - Structure for the todo list
