---
name: update-plan
description: Update an existing plan's status, todo list, and phase progress. Tracks what was done, updates completion status, and maintains the changelog. Use this skill during or after working on a plan phase to keep planning artifacts current.
license: MIT
compatibility: opencode
metadata:
  category: planning
  phase: maintenance
---

# Skill: Update Plan

## What This Skill Does

Keeps planning artifacts synchronized with actual progress:

- Updates todo items (mark done, add new items, note blockers)
- Updates phase status (pending → in_progress → completed)
- Updates plan status and changelog
- Updates implementation plan if approach changed during work
- Prepares for next phase when current phase completes

## When to Use

- During work on a plan phase: to track progress in real-time
- After completing work: to mark items and phases as done
- When blockers are discovered: to document them
- When the implementation approach changes: to update the implementation plan
- When the user asks to "update the plan" or "mark phase as done"

## Execution Model (Recommended)

- Preferred: the primary agent runs this skill and updates artifacts under `plans/<name>/`.
- Rationale: plan updates encode session decisions and current intent; the primary has the best access to that context.
- Use `doc-explorer` only if verifying acceptance criteria requires codebase analysis (results are written to `docs/`).
- Optional (edge cases): delegate mechanical edits (bulk todo moves, large reshuffles) to `doc-explorer` if needed.

## Routing Matrix (Who does what)

- **Writes**: updates under `plans/<name>/` including `plan.md`, `todo.md`, `phases/**`, and (when needed) `implementation/**`.
- **Primary**: preferred owner for updates (session decisions/intents live here).
- **doc-explorer**: optional helper for mechanical edits or codebase analysis to verify acceptance criteria.
- **implementer**: never used for plan maintenance.

## Workflow

### Step 1: Identify the Plan

Find the active plan:

- Check `plans/` directory for existing plans
- If multiple plans exist, use the `question` tool to ask the user which plan
- Read the plan's `plan.md` to understand the current status
- Read `todo.md` to see current task state

### Step 2: Determine What to Update

**Option A: Todo updates (most common)**
- Mark completed items: move from Pending/In Progress to Completed
- Add new items discovered during work
- Mark blocked items with reason
- Move next items to In Progress

**Option B: Phase completion**
- Verify all acceptance criteria from the phase document are met
- Update phase status in `phases/phase-N.md` frontmatter
- Update the phases table in `plan.md`
- Populate todo list with next phase's items (from implementation plan)
- Add changelog entry

**Option C: Implementation plan revision**
- If the technical approach changed during implementation
- Update the affected `implementation/phase-N-impl.md`
- Document the reason for the change
- Update any affected todo items

**Option D: Plan-level updates**
- Requirements changed → update `plan.md`
- New risks identified → add to risks table
- Scope adjustment → update scope section

### Step 3: Apply Updates

#### Updating Todo List (`todo.md`)

```markdown
### Completed
- [x] Implement user authentication endpoint (2025-02-14)

### In Progress
- [ ] Add input validation for login form

### Pending
- [ ] Write integration tests for auth flow

### Blocked
- [ ] Deploy to staging - waiting for CI pipeline fix
```

Always add a changelog entry:
```markdown
### 2025-02-14
- Completed: Implement user authentication endpoint
- Started: Add input validation for login form
- Blocked: Deploy to staging (CI pipeline issue)
```

#### Updating Phase Status

In `phases/phase-N.md` frontmatter:
```yaml
status: completed  # was: in_progress
updated: "2025-02-14"
```

#### Updating Plan Changelog

In `plan.md`:
```markdown
### 2025-02-14
- Phase 1 completed, Phase 2 started
```

### Step 4: Phase Transition

When a phase is completed and the next phase begins:

1. Mark current phase as `completed`
2. Mark next phase as `in_progress`
3. Read the next phase's implementation plan
4. Populate the todo list with the next phase's implementation steps
5. Update the todo list's Phase Context section: update phase/implementation links, relevant docs, and latest handover reference
6. Update plan status in `plan.md` if needed
7. Add changelog entry documenting the transition

**When the final phase is completed (Plan Completion):**

1. Mark the final phase as `completed`
2. Update plan status in `plan.md` frontmatter to `completed`
3. Verify that the overall Definition of Done is met
4. Add a final changelog entry: "Plan completed"
5. Clear the todo list's active phase header or add a "Plan Completed" note
6. Use the `question` tool to confirm with the user that the plan is truly done

### Step 5: Report

Summarize what was updated. If the phase is complete, highlight:
- What was achieved
- Whether all acceptance criteria were met
- What comes next

## Rules

1. **Always read before writing**: Read the current state of all affected files before making changes.
2. **Changelog is append-only**: Never modify or remove existing changelog entries. Only add new entries.
3. **Preserve history**: When moving todo items between sections, maintain the completion date annotation.
4. **Atomic updates**: Update all related files together (todo + phase + plan) - don't leave them in an inconsistent state.
5. **Phase transitions are explicit**: A phase is only `completed` when all acceptance criteria are verified. Use the `question` tool to confirm with the user if unsure.
6. **Track deviations**: If the actual implementation deviated from the plan, document the deviation in the implementation plan rather than silently updating.
7. **Use subagents sparingly**: Plan updates are typically small enough for the primary agent. Only use subagents if verifying acceptance criteria requires codebase analysis.
8. **File-based interface**: All updates are written to plan files. Do not return updated content as chat messages.

## Templates

This skill includes normative templates as bundled files. Only read the templates when processing them. Output MUST preserve template headings/frontmatter keys when updating plan artifacts:

 - `tpl-todo.md` - Expected structure for the todo list
 - `tpl-phase.md` - Expected structure for phase documents
 - `tpl-implementation-plan.md` - Expected structure for implementation plans
 - `tpl-plan.md` - Expected structure for the plan document (reference for changelog/phases table updates)
