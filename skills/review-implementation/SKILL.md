---
name: review-implementation
description: Independent review of a completed implementation against its plan, acceptance criteria, and code quality standards. Produces a structured review with severity-rated findings. Use after execute-work-package to validate implementation quality.
license: MIT
compatibility:
  opencode: ">=0.1"
metadata:
  category: review
  phase: implementation
---

# Skill: Review Implementation

This skill provides an **independent quality gate** for completed implementations executed via `execute-work-package`.

A fresh reviewer (with no implementation context) evaluates the actual code changes against the plan, acceptance criteria, and coding standards. The review is persisted as a plan artifact.

---

## When to Use

Use this skill when:

- A phase has been implemented via `execute-work-package` and you want to validate before committing/merging.
- You want to verify that acceptance criteria are actually met (not just claimed).
- You want an independent assessment of test quality and coverage.
- The user explicitly requests an implementation review.

Do **not** use this skill to:

- Review the plan itself (use `review-plan`).
- Review an implementation plan before execution (use `review-implementation-plan`).
- Fix implementation issues (the reviewer only reports findings; fixes go through `execute-work-package`).

---

## Execution Model

### Roles

- **Primary (maintainer)**
  - Invokes the review skill after implementation is complete.
  - Delegates to `delegate` (default) or `general` (for same-model perspective).
  - Receives review summary and decides on follow-up actions.

- **Subagent (delegate / general)**
  - Reads plan, phase, implementation plan, and execution digest with **no prior context**.
  - Examines the **actual code changes** (via git diff or file reading).
  - Verifies acceptance criteria against real code and test output.
  - Writes the review artifact to `plans/<name>/reviews/impl-review-phase-N.md`.

### Why `delegate` (not `doc-explorer` or `implementer`)

The reviewer must be independent from both the planner and the implementer. `delegate` provides a clean separation — no authoring or implementation context to bias the review.

## Routing Matrix (Who does what)

- **Writes**: `plans/<name>/reviews/impl-review-phase-N.md`
- **Does NOT write**: code, plans, implementation plans, or any other artifact.
- **Primary**: owns the decision of whether to accept, request rework, or reject.
- **delegate/general**: performs the review, including code examination and test verification.

---

## Workflow

### 1) Prepare references

Primary gathers:
- `plans/<name>/plan.md`
- `plans/<name>/phases/phase-N.md`
- `plans/<name>/implementation/phase-N-impl.md`
- Execution digest (from `execute-work-package` output) or git diff reference
- `docs/` references (if available)

### 2) Delegate

Primary delegates to `delegate` (or `general`) using `tpl-review-impl-prompt.md`.

Provide:
- Plan, phase, implementation plan paths
- Digest reference or git diff base reference
- Review output path: `plans/<name>/reviews/impl-review-phase-N.md`

### 3) Receive summary

Subagent returns:
- Overall verdict (Accepted / Needs Rework / Rejected)
- Finding count by severity
- Top 3 findings

### 4) Act on findings

Primary decides:
- **Accepted**: Proceed to commit/merge. Update plan via `update-plan`.
- **Needs Rework**: Delegate fixes via `execute-work-package` (new work packet for specific fixes).
- **Rejected**: Discuss with user. May require replanning via `update-plan`.

---

## Output Contract

The review artifact `plans/<name>/reviews/impl-review-phase-N.md` MUST:

- Follow the canonical template headings and frontmatter keys.
- Include a clear **Overall Assessment** with verdict and reasoning.
- Verify EACH **acceptance criterion** against actual code with evidence.
- Assess **test quality** beyond pass/fail (meaningful? behavioral? regression-catching?).
- Address **Real-World Testing** explicitly (performed, not performed, waived).
- Evaluate **code quality** against the coding standards from `execute-work-package`.
- Rate every finding with a **severity** (Critical / Major / Minor / Note).

---

## Rules

- The reviewer must examine **actual code**, not just the execution digest. The digest is a starting point, not the truth.
- The reviewer must approach the implementation **without prior context**. Independent perspective is the value.
- Findings are **advisory**. The primary decides whether and how to act.
- Do not modify code or plan artifacts during review — only produce the review artifact.
- Ensure the `reviews/` directory exists before delegating (create if needed).
- **Test quality is a first-class concern.** A review that only checks "tests pass" without evaluating test meaningfulness is incomplete.
- Flag mock-only testing as a limitation unless the user explicitly waived real-world testing.

---

## Templates

- `tpl-impl-review.md` — Canonical review output format with embedded review criteria
- `tpl-review-impl-prompt.md` — Primary → delegate delegation prompt
