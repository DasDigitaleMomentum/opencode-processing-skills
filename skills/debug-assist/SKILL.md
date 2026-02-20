---
name: debug-assist
description: Structured debugging workflow that prevents circular debugging. Follows a systematic approach of Reproduce, Isolate, Hypothesize, Verify, Fix, Test. Logs the debugging path as an artifact to avoid revisiting dead ends.
license: MIT
compatibility: opencode
metadata:
  category: workflow
  phase: debugging
---

# Skill: Debug Assist

## What This Skill Does

Provides a **systematic debugging workflow** that prevents the common problem of circular debugging (try something → doesn't work → try something else → forget what was tried → repeat). Logs all hypotheses and results as a debugging trace.

## When to Use

- When a bug is non-trivial (not an obvious typo)
- When initial fix attempts haven't worked
- When the user says "I can't figure out why X happens"

## Execution Model

- **Always**: the primary agent runs this skill directly.
- **Output**: chat-based debugging trace + the fix itself.

## Workflow

### Step 1: Define the Bug

Clarify with the `question` tool:

1. **What's the expected behavior?**
2. **What's the actual behavior?**
3. **When did it start?** (after a specific change? always?)
4. **Is it reproducible?** (always, sometimes, only in certain conditions?)

### Step 2: Reproduce

Reproduce the bug locally:

```bash
# Run the failing scenario
<command that triggers the bug>
```

If it doesn't reproduce → it's environment-specific. Check: OS, versions, configuration, data.

**Log:** "Reproduced: Yes/No, with command: X"

### Step 3: Isolate

Narrow down the failure:

1. **Which file** is the error in? (from stack trace or error message)
2. **Which function** fails? (add logging if needed)
3. **Which input** triggers it? (test with minimal input)

**Log:** "Isolated to: <file>:<function>, triggered by: <input>"

### Step 4: Hypothesize

List possible causes (max 3):

1. Hypothesis A: <what might be wrong>
2. Hypothesis B: <alternative cause>
3. Hypothesis C: <less likely but possible>

**Do NOT fix yet.** Just list hypotheses.

### Step 5: Verify

Test each hypothesis:

- Add targeted logging or assertions
- Run the failing scenario
- Check which hypothesis matches

**Log each result:** "Hypothesis A: confirmed/rejected because <evidence>"

### Step 6: Fix

Apply the minimal fix for the confirmed hypothesis.

- **One change**: fix only the confirmed root cause
- **No refactoring**: fix the bug, nothing else

### Step 7: Test

1. Run the original failing scenario → must pass
2. Run the full test suite → no regressions
3. Remove any debugging logging

### Step 8: Document

If the bug was non-obvious, document it:

- What was the root cause?
- Why was it non-obvious?
- How to prevent it in the future?

Consider creating a test case that specifically prevents regression.

## Rules

1. **Log the path**: every hypothesis and its result must be recorded. This prevents circular debugging.
2. **Reproduce first**: never fix a bug you can't reproduce. You won't know if the fix works.
3. **Isolate before fixing**: narrow down to the smallest possible scope before changing code.
4. **One hypothesis at a time**: test one hypothesis, get a result, then move to the next.
5. **Minimal fix**: fix only the bug. No improvements, no refactoring, no "while I'm here."
6. **No built-in explore agent**: do NOT use the built-in `explore` subagent type.
