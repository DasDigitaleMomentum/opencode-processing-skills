---
name: adr-create
description: Creates a single Architecture Decision Record (ADR) for a current technical decision. Unlike retrospective (which reconstructs past ADRs from git history), this skill documents decisions as they happen with full context, alternatives considered, and expected consequences.
license: MIT
compatibility: opencode
metadata:
  category: architecture
  phase: design
---

# Skill: ADR Create

## What This Skill Does

Documents a **technical decision as it happens** using the ADR (Architecture Decision Record) format. While `retrospective` reconstructs past decisions from git history (inferring context), this skill captures the full decision context in real-time — including alternatives considered, trade-offs evaluated, and expected consequences.

## When to Use

- When making a significant technical decision (new dependency, architecture change, pattern choice)
- When the user says "let's document this decision" or "why did we choose X?"
- Before implementing a controversial or non-obvious approach
- When `create-plan` involves architectural choices that should be recorded

## Execution Model

- **Always**: the primary agent runs this skill directly.
- **Output**: `docs/adrs/ADR-NNN-<title>.md`

## Workflow

### Step 1: Identify the Decision

Use the `question` tool to clarify:

1. What is the decision? (one sentence)
2. What triggered it? (new requirement, problem, tech debt)
3. What alternatives were considered?
4. What was chosen and why?

### Step 2: Gather Context

Collect context from the project:

- Related code or modules affected
- Existing patterns that influenced the decision
- Constraints (performance, compatibility, team skills)
- Reference materials (docs, benchmarks, discussions)

### Step 3: Determine ADR Number

```bash
# Find the next ADR number
ls docs/adrs/ 2>/dev/null | grep -o 'ADR-[0-9]*' | sort -t- -k2 -n | tail -1
```

If no `docs/adrs/` directory exists, create it and start with ADR-001.

### Step 4: Write the ADR

Create `docs/adrs/ADR-NNN-<slug>.md`:

```markdown
# ADR-NNN: <Title>

## Status

Accepted | Proposed | Superseded by ADR-NNN

## Date

YYYY-MM-DD

## Context

<What is the issue? What forces are at play? What constraints exist?>

## Decision

<What is the change that we're proposing and/or doing?>

## Alternatives Considered

### Alternative A: <name>
- **Pros**: ...
- **Cons**: ...
- **Why rejected**: ...

### Alternative B: <name>
- **Pros**: ...
- **Cons**: ...
- **Why rejected**: ...

## Consequences

### Positive
- <expected benefit>

### Negative
- <expected downside or trade-off>

### Risks
- <what could go wrong>

## References

- <related ADRs, docs, URLs>
```

### Step 5: Cross-Reference

- If this ADR supersedes a previous one, update the old ADR's status
- If this ADR relates to a plan, add a reference in the plan's changelog
- If this affects module documentation, note it for `update-docs`

## Rules

1. **Capture the WHY**: the most valuable part of an ADR is why the decision was made and why alternatives were rejected. Implementation details belong in docs, not ADRs.
2. **Alternatives are mandatory**: an ADR without alternatives considered is just a statement, not a decision record. Always document at least one alternative.
3. **Consequences are honest**: list both positive and negative consequences. Every decision has trade-offs.
4. **Keep it concise**: an ADR should be 1-2 pages. It's a record, not an essay.
5. **Immutable once accepted**: accepted ADRs are not edited. If a decision changes, create a new ADR that supersedes the old one.
6. **No built-in explore agent**: do NOT use the built-in `explore` subagent type.
