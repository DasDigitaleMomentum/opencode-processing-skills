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

The primary specifies the review focus when delegating. The default focus is **functional and technical findings** — correctness, feasibility, and whether intent/scope/context are sufficient for the later implementation-plan pass.

### Review posture

**No Gold-Plating. No Adversarial Reviewing. No Scope Creep.** Report only
evidence-backed problems that affect correctness, security, acceptance, or the
reviewed objective. Do not hunt for gotchas, invent improvements, or turn a
review into a search for work. This does not mean overlooking real defects.

**Formal criteria** (DoD compliance checklists, NFR conformance, reference consistency, documentation cleanup) are secondary. Only include formal findings when they reveal **real problems** — not as standard checkboxes to fill. A review cluttered with formal nitpicking buries the findings that matter.

The primary passes the focus via `{{focus}}` in the delegation prompt. If no focus is specified, use the default.

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
  - Evaluates against the structured criteria embedded in the review template.
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
- Finding count by severity
- Top 3 findings

### 4) Act on findings

Primary decides:
- **Ready**: Proceed to `author-and-verify-implementation-plan`.
- **Needs Revision**: Update plan via `update-plan`, then optionally re-review.
- **Major Gaps**: Discuss with user before proceeding.

Plans remain conversation-owned by the primary. Resume the same reviewer `task_id` for clarification of findings instead of creating a new delegate, but apply plan changes through `update-plan`. `review-fix` is reserved for implementation plans and implementations.

---

## Output Contract

The review artifact `plans/<name>/reviews/plan-review.md` MUST:

- Follow the canonical template headings and frontmatter keys.
- Include a clear **Overall Assessment** with verdict and reasoning.
- Rate every finding with a **severity** (Critical / Major / Minor / Note).
- Include a **Findings Summary** table consolidating all findings.
- Assess testing only where required by explicit objectives, use cases, acceptance criteria, or concrete risk; justified `N/A` is acceptable.

---

## Rules

- The reviewer must approach the plan **without prior context**. Do not include plan content in the delegation prompt — the reviewer reads it themselves.
- Findings are **advisory**. The primary decides whether and how to act.
- Do not rewrite or modify the plan during review — only produce the review artifact.
- Retain the reviewer `task_id` until finding clarification is complete.
- Ensure the `reviews/` directory exists before delegating (create if needed).
- A review may report zero findings when no evidence-backed gaps are found. Do not manufacture findings or search for missing extra scope.
- Flag omissions only when required by an explicit objective, use case, requirement, or acceptance criterion. Do not add product, policy, security, privacy, compliance, authorization, operational, infrastructure, deployment, or documentation scope during review.

---

## Templates

- `tpl-plan-review.md` — Canonical review output format with embedded review criteria
- `tpl-review-plan-prompt.md` — Primary → reviewer delegation prompt
