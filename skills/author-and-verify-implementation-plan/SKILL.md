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

---

## Workflow

### 0) Inputs (Primary → delegate)

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

Primary delegates directly to the canonical `delegate` using the bundled prompt template. A justified model alias may be selected without changing the workflow. This is a skill-defined artifact with an explicit output path and canonical template, so it does **not** require an informal Blueprint.

The delegate:

1. Reads the plan (for global context) and the phase intent/DoD.
2. Locates the relevant code areas using docs inventories and targeted code search.
3. Writes/updates the implementation plan using the template.
4. Ensures the plan is **concrete**:
   - references real file paths/symbols
   - traces every implementation step to an authorizing requirement, scope item, acceptance criterion, or existing invariant that must be preserved
   - includes a **single** proposed verify command (or preserves the given one)
   - captures mismatches as “Reality Check” notes
   - marks any necessary but ungated decision as blocking and does not plan work that depends on it

If the phase depends on previous phases, the delegate should read the necessary prior implementation plans to keep continuity.

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
- An **Authorized By** reference for every implementation step.
- A **single** verify command in the Testing Plan that exercises changed behavior.
- A **Test Integrity Constraints** subsection identifying which existing tests are affected and how.
- A **Reality Check** section:
  - code anchors (files/symbols) used to ground the plan
  - mismatches or open questions (if discovered)
  - blocking decisions that prevent dependent planning

The implementation plan must follow the canonical headings and frontmatter keys from the bundled template.

---

## Rules

- Skill-first: when invoked, follow this workflow and template.
- **Sequential processing only.** When authoring implementation plans for multiple phases, process them strictly one at a time (phase 1, then phase 2, etc.). Parallel authoring causes drift – later phases cannot account for decisions made in earlier ones.
- **Consistency check and fix after completion.** Once all phase implementation plans are authored, verify cross-phase consistency: shared interfaces, naming, data flow assumptions, and dependency ordering. Fix any inconsistencies directly in the implementation plans – the agent is authoring them, so they should be delivered in a consistent state. Only flag issues under "Reality Check" that require a user decision or cannot be resolved without changing the gated phase scope.
- Do not change phase scope/DoD; record mismatches under "Reality Check" and raise to the primary.
- Prefer minimal, accurate plan updates over speculative completeness.
- Unspecified product, policy, security, privacy, compliance, authorization, or operational behavior is not authorization to add it. Preserve applicable existing invariants and avoid concrete regressions or vulnerabilities, but do not invent new policy.
- If a necessary decision is not gated, record it under **Reality Check → Blocking Decisions** and stop before selecting an answer or planning dependent work. Purely local, reversible technical details may be selected when they do not change observable behavior or policy.
- Make testing, rollback, edge-case, deployment, and documentation planning proportional to the phase and concrete risk. `N/A` with a short reason is valid; do not create infrastructure merely to satisfy a template.

---

## Templates

- `tpl-implementation-plan.md` — canonical implementation plan format with “Reality Check” grounding section
- `tpl-author-and-verify-implementation-plan-prompt.md` — Primary → delegate delegation prompt
