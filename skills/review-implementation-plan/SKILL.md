---
name: review-implementation-plan
description: Independent review of a phase implementation plan against its scope, codebase reality, and actionability. Produces a structured review with severity-rated findings. Use after author-and-verify-implementation-plan to validate quality before execution.
license: MIT
compatibility:
  opencode: ">=0.1"
metadata:
  category: review
  phase: planning
---

# Skill: Review Implementation Plan

This skill provides an **independent quality gate** for implementation plans authored via `author-and-verify-implementation-plan`.

A fresh reviewer (with no authoring context) evaluates the implementation plan against the phase scope, existing codebase, and actionability criteria. The review is persisted as a plan artifact.

---

## When to Use

Use this skill when:

- An implementation plan has been authored/verified and you want to validate it before execution.
- You want to confirm that the implementation plan is concrete enough for `execute-work-packet`.
- The user explicitly requests an implementation plan review.

Do **not** use this skill to:

- Review the plan itself (use `review-plan`).
- Review a completed implementation (use `review-implementation`).
- Rewrite the implementation plan (the reviewer only reports findings).

---

## Execution Model

### Roles

- **Primary (maintainer)**
  - Invokes the review skill.
  - Delegates to `delegate` (default) or `general` (for same-model perspective).
  - Receives review summary and decides on follow-up actions.

- **Subagent (delegate / general)**
  - Reads plan, phase, and implementation plan with **no prior context**.
  - Examines the **actual codebase** to verify references and feasibility.
  - Writes the review artifact to `plans/<name>/reviews/impl-plan-review-phase-N.md`.

### Why `delegate` (not `doc-explorer`)

Same rationale as `review-plan`: the reviewer must approach the artifact cold, without authoring context. The review is a quality check, not a documentation task.

## Routing Matrix (Who does what)

- **Writes**: `plans/<name>/reviews/impl-plan-review-phase-N.md`
- **Does NOT write**: implementation plans, phase docs, or any other plan artifact.
- **Primary**: owns the decision of whether to act on findings.
- **delegate/general**: performs the review, including codebase verification.

---

## Workflow

### 1) Prepare references

Primary gathers:
- `plans/<name>/plan.md`
- `plans/<name>/phases/phase-N.md`
- `plans/<name>/implementation/phase-N-impl.md`
- `docs/overview.md`, `docs/modules/*.md` (if available)

### 2) Delegate

Primary delegates to `delegate` (or `general`) using `tpl-review-impl-plan-prompt.md`.

Provide:
- Plan, phase, and implementation plan paths
- Docs references (if available)
- Review output path: `plans/<name>/reviews/impl-plan-review-phase-N.md`

### 3) Receive summary

Subagent returns:
- Overall verdict (Ready / Needs Revision / Major Gaps)
- Finding count by severity
- Top 3 findings

### 4) Act on findings

Primary decides:
- **Ready**: Proceed to `execute-work-packet`.
- **Needs Revision**: Re-run `author-and-verify-implementation-plan` with specific corrections.
- **Major Gaps**: Discuss with user; potentially revise phase scope via `update-plan`.

---

## Output Contract

The review artifact `plans/<name>/reviews/impl-plan-review-phase-N.md` MUST:

- Follow the canonical template headings and frontmatter keys.
- Include a clear **Overall Assessment** with verdict and reasoning.
- Verify implementation steps against **actual codebase** (not just the plan text).
- Rate every finding with a **severity** (Critical / Major / Minor / Note).
- Address **Real-World Testing** explicitly.
- Validate the **Reality Check** section of the implementation plan.

---

## Rules

- The reviewer must examine the **actual codebase** — not just the plan documents. File paths and symbols in the implementation plan must be verified against current repo state.
- The reviewer must approach the plan **without prior context**. Fresh perspective is the value.
- Findings are **advisory**. The primary decides whether and how to act.
- Do not modify the implementation plan during review — only produce the review artifact.
- Ensure the `reviews/` directory exists before delegating (create if needed).

---

## Templates

- `tpl-impl-plan-review.md` — Canonical review output format with embedded review criteria
- `tpl-review-impl-plan-prompt.md` — Primary → delegate delegation prompt
