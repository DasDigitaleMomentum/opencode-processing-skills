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
- You plan to delegate execution later via `execute-work-packet`.

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

- **Subagent (doc-explorer)**
  - Reads: phase + existing implementation plan (if any) + relevant docs + relevant code.
  - Writes: `plans/**/implementation/phase-N-impl.md`.

## Routing Matrix (Who does what)

- **Writes**: `plans/<plan>/implementation/phase-N-impl.md` (authoring/refinement grounded against current code).
- **Does NOT write**: `plans/<plan>/plan.md` or `plans/<plan>/phases/**` (phase intent/scope/DoD remain gated by the primary).
- **Primary**: owns phase gating; reviews impl-plan for scope compliance.
- **doc-explorer**: performs the author+verify pass and writes the impl-plan.
- **implementer**: not used for plan artifacts in this skill.

### Why `plans/` and `docs/` matter

- `plans/` is the gated source of truth for intent/scope/DoD.
- `docs/` (if present) provides curated inventories (modules/features/symbols) to navigate quickly.

---

## Workflow

### 0) Inputs (Primary → doc-explorer)

Provide:

- Plan references:
  - `plans/<plan>/plan.md` (recommended: provides global constraints, scope language, and phase table)
  - `plans/<plan>/phases/phase-N.md` (required: gated intent/DoD for the target phase)
  - `plans/<plan>/implementation/phase-N-impl.md` (if exists)
  - `plans/<plan>/implementation/phase-(N-1)-impl.md` (optional: when the phase builds on previous technical decisions)
  - `plans/<plan>/implementation/phase-(N+1)-impl.md` (optional: when this phase must align with a later interface)
- Docs references (optional but recommended):
  - `docs/overview.md`
  - `docs/modules/*.md`
  - `docs/features/*.md`
- Any constraints that must be preserved (naming conventions, verify command preference, etc.).

### 1) Author + verify

doc-explorer:

1. Reads the plan (for global context) and the phase intent/DoD.
2. Locates the relevant code areas using docs inventories and targeted code search.
3. Writes/updates the implementation plan using the template.
4. Ensures the plan is **concrete**:
   - references real file paths/symbols
   - includes a **single** proposed verify command (or preserves the given one)
   - captures mismatches as “Reality Check” notes

If the phase depends on previous phases, doc-explorer should read the necessary prior implementation plans to keep continuity.

### 2) Primary review

Primary confirms:

- The implementation plan stays within the gated phase scope.
- The verify command is appropriate.
- The “Reality Check” section (if any) is acceptable.

---

## Output Contract

The generated/updated `plans/<plan>/implementation/phase-N-impl.md` MUST include:

- A **Required Context** section with specific files.
- **Implementation Steps** that reference concrete targets (files/symbols/components).
- A **single** verify command in the Testing Plan.
- A **Reality Check** section:
  - code anchors (files/symbols) used to ground the plan
  - mismatches or open questions (if discovered)

The implementation plan must follow the canonical headings and frontmatter keys from the bundled template.

---

## Rules

- Skill-first: when invoked, follow this workflow and template.
- **Sequential processing only.** When authoring implementation plans for multiple phases, process them strictly one at a time (phase 1, then phase 2, etc.). Parallel authoring causes drift – later phases cannot account for decisions made in earlier ones.
- **Consistency check and fix after completion.** Once all phase implementation plans are authored, verify cross-phase consistency: shared interfaces, naming, data flow assumptions, and dependency ordering. Fix any inconsistencies directly in the implementation plans – the agent is authoring them, so they should be delivered in a consistent state. Only flag issues under "Reality Check" that require a user decision or cannot be resolved without changing the gated phase scope.
- Do not change phase scope/DoD; record mismatches under "Reality Check" and raise to the primary.
- Prefer minimal, accurate plan updates over speculative completeness.

---

## Templates

- `tpl-implementation-plan.md` — canonical implementation plan format with “Reality Check” grounding section
- `tpl-author-and-verify-implementation-plan-prompt.md` — Primary → doc-explorer delegation prompt
