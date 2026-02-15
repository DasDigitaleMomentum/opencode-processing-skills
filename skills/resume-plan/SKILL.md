---
name: resume-plan
description: Bootstrap a new session to continue working on an existing plan. Reads plan artifacts, builds context, validates prerequisites, and prepares the agent for implementation. Use this skill at the start of a session when continuing a multi-session plan.
license: MIT
compatibility: opencode
metadata:
  category: planning
  phase: execution
---

# Skill: Resume Plan

## What This Skill Does

Bridges the gap between planning artifacts and implementation. When a new session starts and the agent needs to continue work on an existing plan, this skill:

1. **Finds** the active plan and identifies the current phase
2. **Reads** all relevant artifacts in the correct order (context bootstrap)
3. **Validates** that prerequisites for the current phase are met
4. **Presents** a concise briefing to the agent/user: what to do, where to look, what was decided
5. **Prepares** the todo list as the working entry point

## Why This Skill Exists

Planning skills (`create-plan`, `update-plan`) produce artifacts. Implementation happens across sessions. Without a defined bootstrap procedure, every new session starts with ad-hoc exploration -- the agent must independently discover which plan exists, which phase is active, what was decided, and what files to read. This wastes context budget and risks missing critical decisions from prior sessions.

This skill codifies the read-path that complements the write-path of the other planning skills.

## When to Use

- At the start of a new session when continuing a multi-session plan
- When the user says "continue with the plan", "resume phase N", or "what's next"
- After a session handover was created in a previous session
- When onboarding a different agent to an existing plan

Do NOT use this skill to create or modify plans -- use `create-plan` or `update-plan` instead.

## Execution Model

- **Always**: the primary agent runs this skill directly.
- **Rationale**: session bootstrap is fundamentally a context-building activity. The primary needs the context to guide the implementation session. Delegating to a subagent would build context in the wrong place.
- **Use `doc-explorer`**: optionally, to validate prerequisites that require codebase inspection (e.g., "Phase 1 tests must pass"). Results are written to `docs/`, not returned as text.
- **Do NOT delegate to `doc-explorer`**: this skill reads artifacts, it does not write them.

## Workflow

### Step 1: Discover the Plan

Find active plans:

- Check `plans/` directory for existing plan directories
- For each plan, read the frontmatter of `plan.md` to check status (`active` or `draft`)
- If multiple active plans exist, use the `question` tool to ask the user which plan to resume
- If no plans exist, inform the user and suggest using `create-plan`

### Step 2: Read the Plan Hub (Ordered)

Read artifacts in this specific order -- each builds on the previous:

1. **`plans/<name>/plan.md`** -- Understand objective, requirements, DoD, phase overview
2. **`plans/<name>/todo.md`** -- Identify the active phase, current task state, and Phase Context links
3. **Latest handover** in `plans/<name>/handovers/` (most recent by filename) -- Session context, decisions, blockers, next steps from the last session
4. **Active phase document** `plans/<name>/phases/phase-N.md` -- What/Why for the current phase, acceptance criteria
5. **Active implementation plan** `plans/<name>/implementation/phase-N-impl.md` -- How to implement, Required Context files, implementation steps

This order is intentional:
- Plan gives the big picture (why we're here)
- Todo gives the current state (where we are)
- Handover gives the session narrative (what happened last time)
- Phase gives the scope (what we need to do)
- Implementation plan gives the approach (how to do it)

### Step 3: Read Required Context

From the implementation plan's `Required Context` section, read each listed file:

- Module documentation (`docs/modules/<name>.md`) -- understand the code being modified
- Feature documentation (`docs/features/<name>.md`) -- understand the feature being built
- Any other files listed as required context

If `Required Context` is empty or the section doesn't exist, check the `Affected Modules` table for module doc links and read those instead.

If no project documentation exists under `docs/`, note this as a gap and suggest running `generate-docs`.

### Step 4: Validate Prerequisites

Check the phase document's `Prerequisites` section:

- For checklist items that can be verified from artifacts (e.g., "Phase 1 completed"): verify by reading the referenced phase's frontmatter status
- For checklist items that require codebase inspection (e.g., "Phase 1 tests pass"): optionally delegate to `doc-explorer` via Task tool
- For items that cannot be verified automatically: use the `question` tool to confirm with the user

If prerequisites are not met, inform the user and stop. Do not proceed with implementation on unmet prerequisites.

### Step 5: Present the Briefing

Summarize what was gathered into a concise briefing for the session. This is NOT written to a file -- it is presented in the conversation to establish shared context:

**Briefing structure:**

1. **Plan**: Name, objective (one line)
2. **Active Phase**: Number, title, objective (one line)
3. **Last Session**: Key decisions, blockers resolved/remaining (from handover)
4. **Current State**: What's completed, what's in progress, what's pending (from todo)
5. **This Session's Focus**: The next 3-5 concrete tasks from the todo list
6. **Key Files**: The specific files the agent will need to modify (from implementation plan steps)

### Step 6: Confirm and Begin

Use the `question` tool to confirm with the user:

- Does this briefing match their intent?
- Should the focus be adjusted?
- Are there any new constraints or changes since the last session?

After confirmation, the session is bootstrapped. The agent can begin implementation, using `update-plan` to track progress as work proceeds.

## Integration with Other Skills

| Skill              | Relationship                                                                            |
|--------------------|-----------------------------------------------------------------------------------------|
| `create-plan`      | Creates the artifacts that `resume-plan` reads. Must run before `resume-plan` is useful. |
| `update-plan`      | Used DURING implementation (after `resume-plan` bootstraps context) to track progress.  |
| `generate-handover`| Creates the handover that `resume-plan` reads at session start.                         |
| `generate-docs`    | Creates module/feature docs referenced by implementation plans' Required Context.       |
| `update-docs`      | Should run after implementation to keep docs in sync with code changes.                 |

## Rules

1. **Read-only**: This skill does NOT create or modify any files. It builds context from existing artifacts.
2. **Order matters**: Read artifacts in the specified order (Step 2). Each document builds understanding that informs the next.
3. **Don't skip handovers**: If a handover exists, it MUST be read. It contains decisions and context that no other artifact captures.
4. **Briefing is conversation, not a file**: The briefing (Step 5) is presented in chat, not written to `plans/`. It is ephemeral session context.
5. **Prerequisites are gates**: Do not proceed past Step 4 if prerequisites are unmet. Inform the user.
6. **Suggest missing artifacts**: If `docs/` doesn't exist, suggest `generate-docs`. If no handover exists, note it (first session on this plan -- that's fine).
7. **No built-in explore agent**: Do NOT use the built-in `explore` subagent type.
8. **Use `question` tool**: For plan selection, prerequisite confirmation, and briefing sign-off.
