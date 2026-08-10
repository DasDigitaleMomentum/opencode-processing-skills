---
name: review-plan
description: Independent review of a plan against its requirements, scope, and completeness. Produces a structured review with severity-rated findings. Use after create-plan to validate quality before execution.
license: MIT
compatibility:
  opencode: ">=0.1"
metadata:
  category: review
  phase: planning
---

# Skill: Review Plan

This skill provides an **independent quality gate** for plans created via `create-plan`.

A fresh reviewer (with no authoring context) evaluates the plan against structured criteria. The review is persisted as a plan artifact for traceability.

---

## When to Use

Use this skill when:

- A plan has been created via `create-plan` and you want to validate it before proceeding.
- You want a second opinion on plan quality (scope clarity, DoD, testing strategy, etc.).
- The user explicitly requests a plan review.

Do **not** use this skill to:

- Review implementation plans (use `review-implementation-plan`).
- Review completed implementations (use `review-implementation`).
- Fix or rewrite the plan (the reviewer only reports findings; the primary decides how to act).

## Review Focus

The default priority is the smallest complete scope: confirm that requested outcomes are covered and that no phase or material deliverable is unauthorized, unnecessary, or needlessly separate. Inspect the relevant plan elements, but record only evidence-backed exceptions. The primary may add a focus via `{{focus}}`.

### Review posture

**Detect existing gold-plating without becoming an adversarial reviewer.** A scope-reduction finding must identify a concrete planned item and show missing authorization, missing present necessity, or a smaller path that remains complete: the requested behavior must still work, affected real paths must still integrate, and applicable existing invariants must be preserved. Scope discipline is not permission to omit necessary work. Do not invent requirements, ideal architectures, hardening, infrastructure, or findings. Zero findings remains valid.

DoD wording, testing, references, documentation, and other formal criteria are not checklist obligations. Report them only when a concrete defect would block or misdirect execution.

---

## Execution Model

### Roles

- **Primary (maintainer)**
  - Invokes the review skill.
  - Delegates the review to `delegate-strong` (default) or `general` (for same-model perspective).
  - Receives the review summary and decides on follow-up actions.
  - Updates the plan via `update-plan` if findings require changes.

- **Subagent (delegate-strong / general)**
  - Reads plan + phase documents with **no prior context** (fresh eyes).
  - Applies this skill's exception-based review focus.
  - Writes the review artifact to `plans/<name>/reviews/plan-review.md`.

### Why `delegate-strong` (not `doc-explorer`)

The reviewer must approach the plan without authoring context — fresh eyes catch what familiarity misses. `delegate-strong` provides the judgment depth needed to evaluate scope, consistency, and completeness. Writing docs or selected plan artifacts belongs to the relevant authoring workflow, not the review workflow.

## Routing Matrix (Who does what)

- **Writes**: `plans/<name>/reviews/plan-review.md`
- **Does NOT write**: `plans/<name>/plan.md`, `plans/<name>/phases/**`, or any other plan artifact.
- **Primary**: owns the decision of whether to act on findings.
- **delegate-strong/general**: performs the review and writes the review artifact.

---

## Workflow

### 1) Prepare references

Primary gathers:
- Review focus from the delegation prompt
- `plans/<name>/plan.md`
- `plans/<name>/phases/` (all phase docs)

### 2) Delegate

Primary delegates to `delegate-strong` (or `general`) using `tpl-review-plan-prompt.md`.

Provide:
- Plan path
- Phases directory path
- Review output path: `plans/<name>/reviews/plan-review.md`
- Review focus (freetext — what to prioritize)

### 3) Receive summary

Subagent returns:
- Overall verdict (Ready / Needs Revision / Major Gaps)
- Reduction required (Yes / No)
- Finding count by severity and the top 3 actionable findings
- Required next action

### 4) Act on findings

Primary decides:
- **Ready**: Proceed to `author-and-verify-implementation-plan` only when reduction is not required and no Critical/Major findings remain.
- **Needs Revision**: Do not proceed. Accept or explicitly reject each blocking finding. Apply accepted plan reductions once through the review-remediation mode of `update-plan`.
- **Major Gaps**: Stop and discuss the missing intent or authorization with the user before restructuring the plan.

Plans remain conversation-owned by the primary. Resume the same reviewer `task_id` only for clarification; apply accepted changes through `update-plan`. The remediation digest closes that pass. Do not automatically re-review or continue until zero findings. A fresh review requires an explicit user/primary decision or materially changed scope.

---

## Output Contract

The review artifact `plans/<name>/reviews/plan-review.md` MUST:

- Follow the canonical template headings and frontmatter keys.
- Include a clear assessment with verdict, reduction flag, and brief reasoning.
- Report only exceptions; do not reproduce coverage matrices or certify clean phases/deliverables individually.
- Give every finding a stable ID, severity, evidence, and concrete action.
- State `No findings` when the review finds no material problem.

Verdict rules:

- `Ready` requires `Reduction Required: No` and zero Critical/Major findings.
- Any executable phase or deliverable without clear authorization or present necessity is at least Major and requires `Needs Revision`.
- Use `Major Gaps` when missing intent or authorization prevents a defensible reduction decision and needs user input.

---

## Rules

- The reviewer must approach the plan **without prior context**. Do not include plan content in the delegation prompt — the reviewer reads it themselves.
- Findings are **advisory decisions**, not automatic edits. The primary must accept or explicitly reject blocking findings before progression.
- Do not rewrite or modify the plan during review — only produce the review artifact.
- Retain the reviewer `task_id` until finding clarification is complete.
- Ensure the `reviews/` directory exists before delegating (create if needed).
- Zero findings is valid. Flag only concrete gaps or unnecessary planned work; do not invent requirements, policy, infrastructure, or replacement scope.
- Pay particular attention to foundations, shared abstractions, cleanup, generic infrastructure, and future-phase preparation, but report only concrete unnecessary work.
- Once a review is invoked, `Reduction Required: Yes` or unresolved Critical/Major findings block progression until the primary remediates or explicitly rejects them with rationale.
- One review plus one accepted remediation pass is the default bound. Never start an automatic review/fix/re-review loop.

---

## Templates

- `tpl-plan-review.md` — Canonical compact review output
- `tpl-review-plan-prompt.md` — Primary → reviewer delegation prompt
