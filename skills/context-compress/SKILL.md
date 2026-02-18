---
name: context-compress
description: Compresses the current session context by identifying relevant info, summarizing key findings, and discarding noise. Produces a compact briefing that replaces long conversation history. The mid-session equivalent of generate-handover.
license: MIT
compatibility: opencode
metadata:
  category: session
  phase: optimization
---

# Skill: Context Compress

## What This Skill Does

**Mid-session reset for long conversations.** When a session grows too long and context becomes expensive, this skill compresses the relevant context into a compact briefing — keeping what matters, discarding noise.

Think of it as `generate-handover` but for the middle of a session, not the end.

## When to Use

- When a session is running long (50+ messages)
- When the conversation has explored multiple tangents
- When you notice repetition or context confusion
- Before switching to a different task within the same session

Do NOT use at session end — use `generate-handover` for that.

## Execution Model

- **Always**: the primary agent runs this skill directly.
- **Token budget**: ~2-3k tokens to produce the summary. Goal: save 10-20k+ tokens going forward.
- **Output**: chat-based briefing (not persisted — it IS the new context).

## Workflow

### Step 1: Identify Active Context

1. **Active task**: what are we working on right now?
2. **Key decisions made**: what was decided and why?
3. **Current file state**: which files were modified?
4. **Pending items**: what still needs to be done?
5. **Blockers**: any unresolved issues?

### Step 2: Identify Noise

Flag context that can be discarded:

- Exploratory discussions that led nowhere
- Debugging steps that were dead ends
- Verbose tool output that's been processed
- Repeated explanations and off-topic tangents

### Step 3: Generate Compressed Context

```markdown
## Session Context (Compressed)

### Active Task
<one sentence: what we're doing right now>

### Progress
- ✅ <completed step>
- 🔄 <current step>
- ⬜ <pending step>

### Key Decisions
- <decision>: <rationale>

### Modified Files
- `<file>`: <what changed>

### Next Steps
1. <immediate next action>
2. <after that>
```

### Step 4: Confirm with User

Use the `question` tool: "I've compressed the session context. Anything important I missed?"

## Rules

1. **Relevance over completeness**: include only what's needed to continue the current task.
2. **Decisions are critical**: always preserve key decisions and their rationale.
3. **File state matters**: list modified files so the agent doesn't re-read unchanged files.
4. **Be honest about what's lost**: note when detail is omitted.
5. **No built-in explore agent**: do NOT use the built-in `explore` subagent type.
