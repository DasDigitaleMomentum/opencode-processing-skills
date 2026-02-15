---
name: generate-handover
description: Generate a session handover document that captures progress, decisions, and context for seamless session continuity. Use this skill at the end of a work session or when context transfer to a new session is needed.
license: MIT
compatibility: opencode
metadata:
  category: planning
  phase: maintenance
---

# Skill: Generate Handover

## What This Skill Does

Creates a session handover document (`plans/<name>/handovers/session-<date>.md`) that captures everything a new session needs to continue work seamlessly:

- What was accomplished in this session
- What is in progress (interrupted work)
- Key decisions made and their rationale
- Current state of modified files
- Blockers and issues discovered
- Concrete next steps
- Context that would be lost without the handover

## When to Use

- When the user asks to "create a handover" or "save session state"
- When ending a work session on a multi-phase plan
- When work is interrupted and will be continued later
- When switching between team members or agents

Do NOT generate handovers automatically. This skill is invoked manually by the user.

## Execution Model (Recommended)

- Preferred: the primary agent runs this skill and writes the handover under `plans/<name>/handovers/`.
- Rationale: a handover is a distilled session narrative (decisions, rationale, state). It should be authored where the session context lives.
- Optional: delegate `git status`/`git diff --stat` interpretation or bulk file listing to `doc-explorer`, but keep narrative/decisions in the primary.

## Workflow

### Step 1: Identify the Context

Determine what to capture:

- Which plan is being worked on? Check `plans/` directory
- What phase is active? Read `plan.md` and `todo.md`
- If no formal plan exists, create a standalone handover (see below)

### Step 2: Gather Session Information

Collect from the current session context:

**Progress:**
- What tasks were completed? (from todo list changes, commits, conversation)
- What is currently in progress? (incomplete work, partial implementations)
- What was planned but not started? (remaining todo items)

**Decisions:**
- What technical decisions were made? (architecture, library choices, approach)
- What alternatives were considered? (and why they were rejected)
- What trade-offs were accepted?

**Implementation State:**
- Which files were modified? Use `git diff --stat` or `git status`
- Are there uncommitted changes?
- What tests are pending?

**Issues:**
- Are there blockers? (dependencies, unclear requirements, technical issues)
- Were workarounds applied that need revisiting?

### Step 3: Write the Handover Document

Create `plans/<name>/handovers/session-<YYYY-MM-DD>.md`:

If multiple handovers on the same day, append a counter: `session-2025-02-14-2.md`.

Fill in all sections from the template:

1. **Session Summary**: 2-3 sentences describing what this session was about
2. **Progress**: Organized by completed / in-progress / not-started
3. **Key Decisions**: Table with decision, alternatives considered, and rationale
4. **Current State**: Modified files with what changed, pending tests
5. **Blockers & Issues**: What prevents progress, with potential solutions if known
6. **Next Steps**: Ordered list of what the next session should do first
7. **Context for Next Session**: Free-form section for anything that would be lost - partial reasoning, important constraints discovered, "watch out for" notes

### Step 4: Update the Todo List

After creating the handover:

- Ensure `todo.md` reflects the actual current state
- Mark completed items
- Add any newly discovered items
- Note blockers

### Step 5: Confirm with User

Use the `question` tool to ask:
- Is anything missing from the handover?
- Are the next steps correctly prioritized?

## Standalone Handovers (No Plan)

If there is no formal plan but a handover is needed:

- Create `docs/handovers/session-<date>.md` (in the docs directory instead of plans)
- Omit plan/phase references from the frontmatter
- Focus on the general session context, decisions, and next steps

## Rules

1. **Accuracy over completeness**: Only document what actually happened. Don't invent or assume progress.
2. **Concrete next steps**: "Continue working on auth" is useless. "Implement the JWT refresh token rotation in `src/auth/refresh.ts`, starting from the `rotateToken` function stub" is actionable.
3. **Decision rationale matters**: Capture *why* decisions were made, not just *what* was decided. The next session needs the reasoning to avoid re-evaluating the same options.
4. **File-based interface**: The handover document is the interface. All context goes into the file, not into chat messages.
5. **Don't duplicate the todo list**: Reference `todo.md` for task status. The handover captures *session context* (decisions, state, blockers), not a repeat of the task list.
6. **Use git for file state**: Use `git status` and `git diff --stat` to identify modified files rather than relying on memory.
7. **Multiple handovers are normal**: Each session can produce its own handover. They are additive, not replacements.
8. **Keep it scannable**: The next session's agent will read this to bootstrap context. Use clear headings, short bullet points, and tables where appropriate.
9. **Todo updates stay lightweight**: When updating `todo.md` in Step 4, make simple status changes directly. For complex plan restructuring, the `update-plan` skill should be used instead.

## Templates

This skill includes a normative template as a bundled file. Output MUST follow the template headings and frontmatter keys:

- `tpl-session-handover.md` - Structure for handover documents
