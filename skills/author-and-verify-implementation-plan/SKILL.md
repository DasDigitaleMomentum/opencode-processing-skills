---
name: author-and-verify-implementation-plan
description: Author and verify per-phase implementation plans by cross-checking the gated phase intent against the current source code and existing docs inventories.
license: MIT
compatibility:
  opencode: ">=0.1"
metadata:
  category: planning
  phase: implementation
---

# Skill: Author and Verify Implementation Plan

This skill standardizes the **second pass** between planning and execution:

- It **authors or refines** `plans/<plan>/implementation/phase-N-impl.md`
- It **verifies** the plan against the **current source code** (and uses `docs/**` inventories when present)

This skill exists to prevent “hand-wavy” implementation plans and reduce drift between phase intent and repo reality.

---

## When to Use

Use this skill when:

- The phase is already gated (scope/DoD decided in `plan.md` + `phases/phase-N.md`).
- You want the “how” (`implementation/phase-N-impl.md`) to be grounded in current code.
- You plan to delegate execution later via `execute-work-package`.

Do **not** use this skill to:

- Change the gated phase intent/scope (that is primary work via `update-plan`).
- Generate documentation (use `generate-docs` / `update-docs`).

---

## Execution Model

### Roles

- **Primary (maintainer)**
  - Owns phase gating and decisions.
  - Delegates authoring/verification of the implementation plan when helpful.
  - Reviews the resulting implementation plan for scope compliance.

- **Subagent (delegate or justified model alias)**
  - Uses one fresh Delegate session for exactly one phase implementation plan.
  - Reads: phase + existing implementation plan (if any) + relevant docs + relevant code.
  - Writes: `plans/**/implementation/phase-N-impl.md`.

## Routing Matrix (Who does what)

- **Writes**: `plans/<plan>/implementation/phase-N-impl.md` (authoring/refinement grounded against current code).
- **Does NOT write**: `plans/<plan>/plan.md` or `plans/<plan>/phases/**` (phase intent/scope/DoD remain gated by the primary).
- **Primary**: owns phase gating; reviews impl-plan for scope compliance.
- **delegate**: performs the author+verify pass and writes the impl-plan. Use `delegate-strong` only when phase complexity or risk justifies it.
- **implementer**: not used for plan artifacts in this skill.

### Why `plans/` and `docs/` matter

- `plans/` is the gated source of truth for intent/scope/DoD.
- `docs/` (if present) provides curated inventories (modules/features/symbols) to navigate quickly.

### Scope and Specification Boundary

Gold-plating is work not required by an explicit user requirement, gated scope/DoD, or a concrete existing invariant necessary for the requested behavior to function. It includes invented product rules or guardrails, speculative configurability, generalized abstractions or future-proofing, and exhaustive treatment of hypothetical edge cases. Do not invent product, policy, or operational rules or guardrails, and do not plan every conceivable edge case.

Minimal means the **smallest complete solution**, never an incomplete implementation plan: the requested behavior must work, affected real paths must integrate, applicable existing invariants must be preserved, and the approved verification must pass. Functionality and correctness come first; scope discipline is not permission to omit necessary work or obstruct progress.

Stop only when missing specification creates a genuine user-owned fork that changes observable behavior, scope/DoD, policy or rules, configuration behavior, or acceptance. Resolve codebase-answerable questions and select local, reversible technical details that do not change observable behavior. A Delegate cannot ask the user: record the exact blocking decision as a blocking **Reality Check**, stop dependent planning, and have the Maintainer obtain the user decision.

Required values that users or operators may reasonably change across environments—including URLs, addresses, ports, timeouts, and similar runtime values—belong in the project's existing configuration location or pattern, not in hidden code defaults or fallbacks. Do not invent a new configuration system or extra options unless gated scope requires them. If a required configurable value has no established project configuration location, or its behavior is a user-owned choice, record the blocking decision for the Maintainer. Fixed protocol or domain constants authorized by requirements do not become configurable merely to appear flexible.

---

## Workflow

### 0) Inputs (Primary → delegate)

Provide:

- Plan references:
  - `plans/<plan>/plan.md` (recommended: provides global constraints, scope language, and phase table)
  - `plans/<plan>/phases/phase-N.md` (required: gated intent/DoD for the target phase)
  - `plans/<plan>/implementation/phase-N-impl.md` (if exists)
  - `plans/<plan>/implementation/phase-(N-1)-impl.md` (optional: when the phase builds on previous technical decisions)
- Only relevant existing docs references, if they materially reduce code discovery
- Any constraints that must be preserved (naming conventions, verify command preference, etc.).

### 1) Author + verify

Primary starts a fresh canonical `delegate` session for the target phase using the bundled prompt template. A justified model alias may be selected without changing the workflow. This is a skill-defined artifact with an explicit output path and canonical template, so it does **not** require an informal Blueprint.

The delegate:

1. Reads the plan (for global context) and the phase intent/DoD.
2. Locates the relevant code areas using docs inventories and targeted code search.
3. Designs the **smallest complete technical change**, reusing current structures unless a new element is presently necessary.
4. Performs one deletion pass: removes or merges any step, new artifact, abstraction, or infrastructure that can be omitted without violating gated scope or a concrete existing invariant. This is author-owned QA, not a review loop.
5. Writes/updates the implementation plan using the template and ensures it is **concrete**:
   - references real file paths/symbols
   - traces every implementation step to an authorizing requirement, scope item, acceptance criterion, or existing invariant that must be preserved
   - explains present necessity in the step's **Why**, rather than adding future-oriented work
   - justifies new modules, layers, interfaces, shared utilities, migrations, or infrastructure with evidence that a direct change to existing structures is insufficient
   - includes a **single** proposed verify command (or preserves the given one)
   - captures only material mismatches as “Reality Check” notes
   - marks any necessary but ungated user-owned decision as blocking and does not plan work that depends on it

If the phase depends on previous phases, its fresh delegate reads the necessary completed implementation plans to keep continuity. The Maintainer retains phase ordering and cross-phase decisions.

### 2) Primary review

Primary confirms:

- The implementation plan stays within the gated phase scope.
- No evident step or new structure is unnecessary for the phase.
- The verify command is appropriate.
- The “Reality Check” section (if any) is acceptable.

---

## Output Contract

The generated/updated `plans/<plan>/implementation/phase-N-impl.md` MUST include:

- A **Required Context** section with specific files.
- **Implementation Steps** that reference concrete targets (files/symbols/components).
- An **Authorized By** reference for every implementation step.
- A **single** verify command in the Testing Plan that exercises changed behavior.
- A **Reality Check** section only when material mismatches or blocking decisions exist.

The implementation plan must follow the canonical frontmatter and required headings from the bundled template. Omit sections marked optional when irrelevant.

---

## Rules

- Skill-first: when invoked, follow this workflow and template.
- **Fresh phase sessions, sequential processing.** When authoring implementation plans for multiple phases, the Maintainer starts one fresh Delegate session per phase and processes phases strictly one at a time in dependency order. Each delegate writes only its target phase plan; do not reuse the authoring `task_id` for another phase or author phases in parallel.
- **Artifact-based cross-phase continuity.** Each later phase delegate reads the completed prior implementation plans and checks shared interfaces, naming, data-flow assumptions, and dependency ordering while authoring its own target. It reports any inconsistency that requires changing a prior artifact or gated decision to the Maintainer rather than silently taking ownership of another phase.
- **Independent review handoff.** After all phase plans are authored, hand the ordered set to one fresh reviewer session by default. Do not create a consolidated artifact.
- Do not change phase scope/DoD; record mismatches under "Reality Check" and raise to the primary.
- Produce the smallest complete solution, not the smallest edit at the expense of correctness. Cover necessary real paths and preserve necessary error handling, tests, and existing invariants while rejecting speculative completeness.
- Prefer direct changes and existing structures. Justify new modules, layers, interfaces, shared utilities, migrations, or infrastructure in the relevant step's **Why**.
- Do not generalize current work for hypothetical later phases. Preserve an already-gated cross-phase interface, but do not pre-implement or future-proof behavior.
- Unspecified product, policy, or operational behavior is not authorization to add rules or guardrails. Preserve applicable existing invariants and avoid concrete regressions, but do not invent policy or exhaustively plan hypothetical edge cases.
- If a necessary user-owned decision is not gated, record the exact decision as a blocking **Reality Check** item for the Maintainer and stop before planning dependent work. Resolve codebase-answerable questions and select purely local, reversible technical details when they do not change observable behavior.
- Omit testing detail beyond the primary verify command, rollback, edge-case, deployment, and documentation planning unless explicit scope or concrete risk needs it.
- Perform exactly one author-owned minimality pass before returning. Do not start an author/review/rewrite loop.

---

## Templates

- `tpl-implementation-plan.md` — canonical implementation plan format with “Reality Check” grounding section
- `tpl-author-and-verify-implementation-plan-prompt.md` — Primary → delegate delegation prompt
