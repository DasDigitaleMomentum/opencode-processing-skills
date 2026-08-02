---
name: create-plan
description: Create a persistent structured plan (plan.md, phases/, todo.md) when work needs multi-phase or multi-session coordination, durable tracking, or an explicitly requested plan.
license: MIT
compatibility: opencode
metadata:
  category: planning
  phase: initial
---

# Skill: Create Plan

## What This Skill Does


Creates a complete **plan** with the artifacts required to execute work in phases. This documentation shall serve Agents and Humans when working in consecutive sessions with the project:

1. **Plan** (`plans/<name>/plan.md`) - Problem/context, target outcome, guiding decisions, requirements, DoD, phases overview
2. **Phases** (`plans/<name>/phases/phase-N.md`) - Scope definition per phase (what/why)
3. **Todo List** (`plans/<name>/todo.md`) - Trackable items with status

This skill intentionally does **not** author per-phase implementation plans (`plans/<name>/implementation/phase-N-impl.md`).

Default next step (second pass): use `author-and-verify-implementation-plan` to author/verify the per-phase implementation plan against current repo reality.

## When to Use

- When work is multi-phase or too large for a single session.
- When the user explicitly requests a persistent plan.
- When durable coordination or tracking is needed across agents, contributors, or sessions.

Do NOT use for a single bounded work package that can be gated with an inline brief containing its task, DoD, constraints, and final verification. Significance or non-triviality alone does not require `plans/` persistence.

## Execution Model (Recommended)

- Preferred: the primary agent runs this skill and writes artifacts under `plans/<name>/`.
- Rationale: plans are conversation-anchored (requirements, trade-offs, sequencing, DoD). Moving authorship to a subagent risks losing intent and introducing gaps.
- Read existing documentation first. Use `doc-explorer` only when bounded codebase impact/symbol analysis is necessary; do not create documentation merely to complete a plan template.
- Optional (edge cases): use `doc-explorer` only to materialize/format a large set of plan files after the primary has finalized content and structure.

## Routing Matrix (Who does what)

- **Writes**: `plans/<name>/plan.md`, `plans/<name>/phases/**`, `plans/<name>/todo.md`, and creates directories under `plans/<name>/`.
- **Does NOT write**: `plans/<name>/implementation/**` (use `author-and-verify-implementation-plan`).
- **Primary**: owns requirements, scope, DoD, phase breakdown, gating.
- **doc-explorer**: optional for repo-anchored analysis persisted into `docs/**` and/or mechanical plan materialization.
- **implementer**: never used for plan authoring.

## Workflow

### Step 1: Understand the Objective

Gather requirements from the user using the `question` tool:

- What is the goal? (feature, bugfix, refactoring, migration)
- What problem or current state motivates the change, and what target outcome should replace it?
- Which user-approved decisions and constraints bind the solution?
- What are the functional requirements?
- Which non-functional requirements are explicit, or required by a concrete existing invariant or demonstrated risk?
- What is explicitly out of scope?
- What defines "done"? (Definition of Done)
- What testing strategy is expected?
- Are there assumptions that materially bound scope or acceptance?

If the user provided a detailed brief, extract these from the brief and confirm with the `question` tool.

### Step 2: Analyze the Codebase (if applicable)

If the plan involves changes to existing code:

- Read existing project documentation (`docs/overview.md`, module docs) if available
- Use the Task tool with `doc-explorer` only for decision-relevant gaps that the existing docs and targeted reads cannot resolve
- Identify only dependencies and risks that can change scope, sequencing, acceptance, or feasibility
- Carry decision-relevant context into the plan, but reference detailed architecture documentation instead of reproducing it.

### Step 3: Design the Phase Structure

Design the **smallest sufficient plan**: use the fewest phases needed for the confirmed outcome and stable execution boundaries. Omit phases that are useful only for hypothetical future requirements or can be merged without losing a required outcome.

**Single-phase plans** (work that otherwise warrants persistence):
- One phase covering the entire scope
- Create only the plan, phase, and todo artifacts currently needed
- Use this structure only because the work needs persistent coordination or tracking, or the user requested it; a single-phase shape alone is not a reason to create a plan.

**Multi-phase plans** (complex features):
- Each phase must be completable in a single session
- Phases should have clear boundaries - no phase should depend on "half-done" work from another phase
- Each phase should produce a testable, committable result
- Order phases by actual dependency while preferring the smallest end-to-end outcome. A separate foundation phase is valid only when its result is immediately required and cannot be delivered directly in the consuming phase.

Guidelines for phase sizing:
- A phase should represent roughly one focused work session
- Split only when a real dependency boundary or demonstrated single-session capacity limit requires it; file count alone is not sufficient
- Each phase should end with passing tests and a clean commit

Perform one compact deletion pass before presenting the structure: identify anything that can be removed or merged without violating the confirmed outcome, acceptance criteria, or existing invariants. Apply those reductions once; do not create an internal review loop.

### Step 4: Confirm Scope and Structure

Before writing artifacts, present:

- The confirmed outcome and scope boundaries
- The proposed phase count and one-line necessity of each phase
- Any unresolved decision that blocks a phase

Use the `question` tool to confirm the smallest sufficient scope and phase structure or gather adjustments. Do not create plan artifacts before this gate.

### Step 5: Create the Plan Document

Create `plans/<name>/plan.md`:

- Concise problem/current-state context and target outcome
- Binding guiding decisions and constraints
- Assumptions only when they materially bound scope or acceptance
- Functional requirements and only applicable non-functional requirements
- Scope (in/out)
- Definition of Done
- Testing strategy
- Phases table with titles and brief descriptions
- Decision-relevant risks and open questions, or omit the optional section
- Initialize the changelog

### Step 6: Create Phase Documents

For each phase, create `plans/<name>/phases/phase-N.md`:

- Phase objective and contribution to the plan goal
- Scope: what this phase includes and explicitly excludes
- Prerequisites (what must be true before starting)
- Deliverables (concrete outputs)
- Acceptance criteria (how to verify the phase is done)
- Dependencies on other phases

### Step 7: Create the Todo List

Create `plans/<name>/todo.md`:

- Populate with items from Phase 1 (the starting phase)
- All items start as "Pending"
 - Fill in the Phase Context section with links to the phase doc and relevant module docs
 - Add the implementation-plan link only after `author-and-verify-implementation-plan` creates that artifact
- Initialize the changelog with the plan creation entry

Create `implementation/` when the first implementation plan is authored and `handovers/` only when a handover is requested. Empty scaffolding is not a deliverable.

## Rules

1. **File-based interface**: All artifacts go into `plans/<name>/` directory structure. The directory name should be lowercase, hyphenated, descriptive.
2. **Phase independence**: Each phase must end in a stable state. No phase should leave the codebase broken.
3. **Phase describes scope**: Keep phase docs focused on what/why and acceptance criteria. The per-phase implementation approach (how) is authored later via `author-and-verify-implementation-plan`.
4. **Reference, don't duplicate**: Implementation plans reference module docs and phase docs. Don't repeat requirements from the plan in each phase.
5. **Smallest sufficient phase set**: Use the fewest phases that preserve a stable result and fit demonstrated execution boundaries. Uncertainty alone is not a reason to split.
6. **No built-in explore agent**: Do NOT use the built-in `explore` subagent type in this framework.
7. **Use `doc-explorer` for codebase analysis**: Delegate deep symbol/dependency analysis via the Task tool. Results are written to `docs/`, not returned as text.
8. **Two-pass default for implementation plans**: Implementation plans are authored/verified separately via `author-and-verify-implementation-plan` before executing a phase.
9. **Always ask for confirmation before writing**: Validate requirements, the smallest sufficient phase structure, and scope with the user before creating artifacts.
10. **Initialize changelog**: The plan's changelog should document its creation with the current date.
11. **Create artifacts on demand**: Create only directories and files needed by the current workflow. Do not scaffold empty implementation or handover directories.
12. **Preserve framing without duplication**: Include the problem/current state, target outcome, and binding guiding decisions needed to interpret scope. Reference detailed architecture docs rather than turning the plan into an architecture inventory.
13. **Material assumptions only**: Record an assumption only when it constrains scope, acceptance, or a later decision.
14. **No speculative completeness**: Optional template categories may be omitted or marked `N/A` with a short reason. Never invent NFRs, risks, deliverables, infrastructure, or future-proofing to fill a heading.
15. **Present necessity**: Keep foundation, migration, cleanup, or preparatory phases only when the confirmed outcome needs them now.

## Templates

This skill includes normative templates as bundled files. Only read the templates when processing them. Output MUST preserve template frontmatter and required headings; sections marked optional may be omitted rather than filled speculatively:

- `tpl-plan.md` - Structure for the plan document
- `tpl-phase.md` - Structure for phase documents
- `tpl-todo.md` - Structure for the todo list
