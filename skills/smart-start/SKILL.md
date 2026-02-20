---
name: smart-start
description: Intelligent session bootstrap that auto-detects project state (docs, plans, staleness) and recommends the right next action. Eliminates manual skill selection at session start. Use this skill when opening a project or starting a new session — it replaces the need to know which skill to load.
license: MIT
compatibility: opencode
metadata:
  category: workflow
  phase: execution
---

# Skill: Smart Start

## What This Skill Does

Answers the question: **"I just opened this project — what should I do?"**

Automatically detects the current state of documentation, plans, and code changes, then presents a unified assessment with concrete recommendations. The user does not need to know which skill exists or when to use it — `smart-start` figures that out.

This is the **entry point** to the entire framework. Instead of the user choosing between `generate-docs`, `resume-plan`, `update-docs`, or `validate-docs`, they load `smart-start` and get a guided recommendation.

## When to Use

- At the **start of any session** — the default "what's next?" skill
- When the user says "weiter", "continue", "what should I do?", "status?"
- When switching to a project after working on something else
- When unsure which skill to use

Do NOT use this skill mid-session for specific tasks. Once the session is bootstrapped, use the specific skills directly.

## Execution Model

- **Always**: the primary agent runs this skill directly.
- **Rationale**: smart-start is a context-building skill (like `resume-plan`). The primary needs the assessment to guide the session. Delegating to a subagent would build context in the wrong place.
- **Includes**: runs the `validate-docs` workflow internally (Steps 1-6 of validate-docs) as part of the documentation health check.
- **Token budget**: the entire smart-start assessment should cost ~3-5k tokens. If it costs more, something is wrong.

## Workflow

### Step 1: Check Documentation State

Check if project documentation exists:

1. Does `docs/` exist?
   - **No** → Note: "No documentation. Recommend `generate-docs`."
   - **Yes** → Continue to Step 1b.

2. Does `docs/overview.md` exist?
   - **No** → Note: "Partial documentation (modules/features exist but no overview). Recommend `generate-docs`."
   - **Yes** → Read only the frontmatter and `## Modules` table (not the full file).

3. Run the **validate-docs workflow** (Steps 1-6 of the `validate-docs` skill):
   - Get doc inventory + git timestamps
   - Extract source mappings from Structure sections
   - Check source changes via `git log --since`
   - Assess overview and feature staleness
   - Produce the staleness summary (Current/Stale/Missing counts)

### Step 2: Check Plan State

Check if any plans exist:

1. Does `plans/` exist?
   - **No** → Note: "No active plans."
   - **Yes** → List plan directories under `plans/`.

2. For each plan directory, read `plan.md` **frontmatter only** (first ~10 lines):

   ```yaml
   status: active  # draft | active | completed | abandoned
   ```

   - Filter to `active` or `draft` plans.

3. For the active plan (if any), read `todo.md` **frontmatter + Active Phase section** (first ~20 lines):
   - Which phase is active?
   - How many items: pending / in_progress / completed / blocked?
   - **IMPORTANT: Do NOT read the full phase documentation files at this stage. Leave deep context loading to `resume-plan` to avoid unnecessary context growth.**

4. Check for handovers:

   ```bash
   ls plans/<name>/handovers/
   ```

   - If handovers exist, note the most recent one (by filename sort).

### Step 3: Check Recent Activity

Get a quick picture of what happened recently:

```bash
git log --oneline -5
```

Note: are there uncommitted changes?

```bash
git status --short
```

This helps determine whether the session is a continuation of recent work or a fresh start.

### Step 4: Build the State Assessment

Combine all findings into a structured assessment. The assessment has four sections:

1. **Documentation Health** (from Step 1)
2. **Plan Status** (from Step 2)
3. **Recent Activity** (from Step 3)
4. **Recommended Actions** (derived from above)

### Step 5: Determine Recommended Actions

Apply these rules in order to determine what to recommend:

**Rule 1: No docs exist → generate-docs first**
Documentation is the foundation. Without it, plans and implementation lack context.

**Rule 2: Active plan exists → resume-plan**
If there's an active plan, the primary action is to continue it. Include staleness info as a side note.

**Rule 3: Docs exist but are stale → update-docs (targeted)**
If docs exist and are stale, recommend a targeted update-docs run. List which modules are stale.

**Rule 4: Everything current, no plan → ready for new work**
Inform the user that docs are current and no plan is active. Suggest what might come next based on recent activity.

**Rule 5: Completed plan → suggest update-docs + next steps**
If the most recent plan is `completed`, docs likely need updating to reflect the implementation.

### Step 6: Present and Confirm

Present the assessment in chat using the format below. Then use the `question` tool to ask:

- Does this match the user's intent for this session?
- Should the focus be adjusted?
- Ready to proceed with the recommended action?

After confirmation, the primary agent loads/executes the recommended skill.

## Assessment Format

The assessment follows this structure:

```markdown
## Session Assessment

### Documentation
<status: Current | Partially stale | Missing>
<if stale: list stale modules with commit counts>
<if missing: suggest generate-docs>

### Plans
<status: Active plan | Draft plan | No plans>
<if active: plan name, active phase, todo summary>
<if handover exists: note and date>

### Recent Activity
<last 3-5 commits, one line each>
<uncommitted changes: Yes/No>

### Recommended Actions
1. <primary action with rationale>
2. <secondary action if applicable>
3. <optional follow-up>
```

## Decision Matrix

| Docs | Plan | Recent Commits | Recommendation |
|------|------|---------------|----------------|
| Missing | Any | Any | `generate-docs` first |
| Current | Active | Any | `resume-plan` |
| Stale | Active | Any | `resume-plan`, then `update-docs` after phase |
| Stale | None | Yes | `update-docs` (targeted) |
| Current | None | Yes | Ready for new work or `create-plan` |
| Current | Completed | Any | `update-docs`, then new work |
| Stale | Completed | Any | `update-docs` (targeted) |

## Integration with Other Skills

| Skill | Relationship |
|-------|-------------|
| `validate-docs` | smart-start runs validate-docs internally as Step 1. |
| `resume-plan` | If an active plan is detected, smart-start recommends resume-plan and may pre-load plan context. |
| `generate-docs` | If no docs exist, smart-start recommends generate-docs as the first action. |
| `update-docs` | If docs are stale, smart-start provides the targeted staleness info for update-docs. |
| `create-plan` | If docs are current and no plan is active, smart-start may suggest create-plan for new work. |
| `generate-handover` | Not directly invoked, but smart-start checks for existing handovers to inform the assessment. |

## Rules

1. **Speed over depth**: smart-start must be fast. Use git commands and frontmatter reads only. Never read full documentation files, source files, or plan details beyond what's needed for the assessment.
2. **One clear recommendation**: always end with a single primary recommended action. Additional actions are secondary. Don't overwhelm the user with options.
3. **Include validate-docs**: always run the documentation staleness check. This is the primary value-add over manually loading resume-plan.
4. **Assessment is conversation, not a file**: do NOT write the assessment to a file. It is ephemeral session context, like the resume-plan briefing.
5. **Use the `question` tool**: confirm the recommended action with the user before proceeding. The user may have a different priority for this session.
6. **Respect user intent**: if the user already stated what they want to do (e.g., "fix bug X"), acknowledge the assessment briefly and proceed with their request. Don't force the full workflow.
7. **Under 10 tool calls**: the entire assessment should complete in under 10 tool calls. If you need more, you're over-reading.
8. **No built-in explore agent**: do NOT use the built-in `explore` subagent type.
9. **Graceful degradation**: if the project has no docs and no plans (brand new to the framework), provide a useful "getting started" recommendation rather than an empty assessment.
