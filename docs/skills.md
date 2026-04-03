# Skills Reference

Skills are loaded automatically by the agent when they match what you're asking for. You don't manually trigger them – just describe what you need.

---

## The Planning Process

### Entities

Planning uses a hierarchy of artifacts:

| Entity | File | Purpose |
|--------|------|---------|
| **Plan** | `plans/<name>/plan.md` | High-level objective, requirements, Definition of Done, phases overview |
| **Phase** | `plans/<name>/phases/phase-N.md` | What this phase delivers and why (scope + acceptance criteria) |
| **Implementation Plan** | `plans/<name>/implementation/phase-N-impl.md` | How to implement the phase (steps, files, symbols) |
| **Review** | `plans/<name>/reviews/*.md` | Independent quality gate (plan, impl-plan, or impl review) |
| **Todo** | `plans/<name>/todo.md` | Trackable items with status |
| **Handover** | `plans/<name>/handovers/session-*.md` | Session context for continuity |

### Directory Structure

```
plans/<name>/
├── plan.md                    # The plan
├── phases/
│   ├── phase-1.md             # What/why for phase 1
│   └── phase-2.md             # What/why for phase 2
├── implementation/
│   ├── phase-1-impl.md        # How for phase 1
│   └── phase-2-impl.md        # How for phase 2
├── reviews/
│   ├── plan-review.md         # Plan quality gate
│   ├── impl-plan-review-1.md  # Impl-plan quality gate
│   └── impl-review-1.md       # Implementation quality gate
├── todo.md                    # Current phase items
└── handovers/
    └── session-2024-01-15.md  # End-of-session context
```

### Typical Flow

```
1. Discuss        → User and agent clarify requirements
2. Create Plan    → create-plan (plan.md + phases + todo)
3. Review Plan    → review-plan (optional quality gate)
4. Author Impl    → author-and-verify-implementation-plan (per phase)
5. Review Impl    → review-implementation-plan (optional)
6. Implement      → execute-work-package (gated: blueprint → approve → execute)
7. Review Code    → review-implementation (optional)
8. Update Plan    → update-plan (track progress, transition phases)
9. Handover       → generate-handover (end of session)
```

**Key insight:** Phases define *what* and *why*. Implementation plans define *how*. This separation lets you change the technical approach without changing the scope.

**Batch authoring:** You can author all implementation plans at once (e.g., "write all implementation plans for this plan"). The skill processes them sequentially (phase 1, then 2, etc.) and runs a consistency check at the end — shared interfaces, naming, data flow assumptions — fixing any issues before returning.

---

## Documentation Skills

### `generate-docs`

Creates structured documentation in `docs/`:
- Project overview with architecture and module map
- Module docs with file/symbol inventories
- Feature docs explaining how things work

```
> Document this project
```

### `update-docs`

Updates existing docs after code changes. Detects outdated sections, refreshes inventories, maintains cross-references.

```
> Update the docs – I refactored the auth module
```

### `archive-legacy-docs`

For repos with scattered documentation (random READMEs, outdated wikis). Moves everything to `docs-legacy/` with a summary before generating fresh docs.

```
> Archive the existing docs before generating new ones
```

---

## Planning Skills

### `create-plan`

Creates a structured plan in `plans/<name>/`:
- `plan.md` — objective, requirements, DoD, phases overview
- `phases/phase-N.md` — scope definition per phase (what/why)
- `todo.md` — trackable items with status

This is a conversation, not a one-shot prompt. The model asks clarifying questions until the scope is clear.

```
> I want to add multi-tenant support. Let's think about what that involves.
  ... (back and forth, model asks questions, you refine scope) ...

> Good, let's create the plan based on what we discussed.
```

### `author-and-verify-implementation-plan`

Authors per-phase implementation plans (`implementation/phase-N-impl.md`) grounded against the actual codebase. Cross-checks file paths and symbols to prevent hand-wavy plans.

```
> Write the implementation plans and verify them against the codebase
```

### `update-plan`

Updates plan status, todo items, and phase transitions. Maintains the changelog. Typically triggered automatically by the maintainer after implementation — you rarely call this directly.

```
> (usually automatic after implementing a phase)
```

### `resume-plan`

Bootstraps a new session to continue an existing plan. Reads artifacts, validates prerequisites, prepares context.

```
> Let's continue with the multi-tenant plan
```

### `generate-handover`

Creates session handover docs for context transfer. Captures progress, decisions, and open questions.

```
> Create a handover for today's session
```

---

## Review Skills

Independent quality gates. A fresh subagent reviews artifacts without authoring context — catching gaps you've stopped seeing.

### `review-plan`

Reviews a plan for scope clarity, requirement coverage, DoD quality, testing strategy.

```
> Review the plan before we start implementing
```

### `review-implementation-plan`

Reviews an implementation plan for actionability, codebase grounding, feasibility.

```
> Review the implementation plan for phase 2
```

### `review-implementation`

Reviews completed code against acceptance criteria, test quality, coding standards.

```
> Review the implementation before I commit
```

---

## Execution Skills

### `execute-work-package`

Gated execution protocol:
1. **Blueprint** — subagent proposes step list
2. **Gate** — primary reviews and approves
3. **Execute** — subagent implements and verifies
4. **Digest** — compact summary returned

```
> Implement the next phase of the auth-refactor plan
```

The primary verifies understanding before any code gets written. Git operations stay with you.
