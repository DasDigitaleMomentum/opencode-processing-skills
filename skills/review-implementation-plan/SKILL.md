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
- You want to confirm that the implementation plan is concrete enough for `execute-work-package`.
- The user explicitly requests an implementation plan review.

Do **not** use this skill to:

- Review the plan itself (use `review-plan`).
- Review a completed implementation (use `review-implementation`).
- Rewrite the implementation plan during the independent review pass. After review completion, accepted related findings may transition to `review-fix` in the same reviewer session.

## Review Focus

The primary specifies the review focus when delegating. The default focus is **functional and technical findings** — correctness, feasibility, completeness of the solution.

### Review posture

**No Gold-Plating. No Adversarial Reviewing. No Scope Creep.** Report only
evidence-backed problems that affect correctness, security, acceptance, or the
reviewed objective. Do not hunt for gotchas, invent improvements, or keep a
review/fix loop alive to create more work. This does not mean overlooking real
defects.

**Formal criteria** (DoD compliance checklists, NFR conformance, reference consistency, documentation cleanup) are secondary. Only include formal findings when they reveal **real problems** — not as standard checkboxes to fill. A review cluttered with formal nitpicking buries the findings that matter.

The primary passes the focus via `{{focus}}` in the delegation prompt. If no focus is specified, use the default.

---

## Execution Model

### Roles

- **Primary (maintainer)**
  - Invokes the review skill.
  - Delegates to `delegate-strong` (default) or `general` (for same-model perspective).
  - Receives review summary and decides on follow-up actions.
  - Retains the reviewer `task_id` for possible remediation.

- **Subagent (delegate-strong / general)**
  - Reads plan, phase, and implementation plan with **no prior context**.
  - Examines the **actual codebase** to verify references and feasibility.
  - Writes the review artifact to `plans/<name>/reviews/impl-plan-review-phase-N.md`.

### Why `delegate-strong` (not `doc-explorer`)

Same rationale as `review-plan`: the reviewer must approach the artifact cold, without authoring context. `delegate-strong` provides the judgment depth needed to evaluate implementation feasibility and cross-reference plan claims against real code.

## Routing Matrix (Who does what)

- **Writes**: `plans/<name>/reviews/impl-plan-review-phase-N.md`
- **Does NOT write**: implementation plans, phase docs, or any other plan artifact.
- **Primary**: owns the decision of whether to act on findings.
- **delegate-strong/general**: performs the review, including codebase verification.

---

## Workflow

### 1) Prepare references

Primary gathers:
- Review focus from the delegation prompt
- `plans/<name>/plan.md`
- `plans/<name>/phases/phase-N.md`
- `plans/<name>/implementation/phase-N-impl.md`
- `docs/overview.md`, `docs/modules/*.md` (if available)

### 2) Delegate

Primary delegates to `delegate-strong` (or `general`) using `tpl-review-impl-plan-prompt.md`.

Provide:
- Plan, phase, and implementation plan paths
- Docs references (if available)
- Review output path: `plans/<name>/reviews/impl-plan-review-phase-N.md`
- Review focus (freetext — what to prioritize)

### 3) Receive summary

Subagent returns:
- Overall verdict (Ready / Needs Revision / Major Gaps)
- Finding count by severity
- Top 3 findings

### 4) Act on findings

Primary decides:
- **Ready**: Proceed to `execute-work-package`.
- **Needs Revision**: Prefer accepting the findings and resuming the same reviewer `task_id` through `review-fix`. Related implementation-plan corrections may span multiple steps, symbols, and references; size alone does not require a new authoring session.
- **New authoring pass**: Re-run `author-and-verify-implementation-plan` only when the objective/gated scope changes, a new primary decision or investigation is required, the reviewer session is unavailable, or the primary explicitly wants a fresh planning context.
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
- Validate that every step cites an authorizing gated item or preserved existing invariant and that blocking decisions stop dependent planning.

---

## Rules

- The reviewer must examine the **actual codebase** — not just the plan documents. File paths and symbols in the implementation plan must be verified against current repo state.
- The reviewer must approach the plan **without prior context**. Fresh perspective is the value.
- Findings are **advisory**. The primary decides whether and how to act.
- Do not modify the implementation plan during review — only produce the review artifact.
- Do not discard the reviewer `task_id` until the primary has decided whether remediation is needed.
- Ensure the `reviews/` directory exists before delegating (create if needed).
- Review testing, rollback, edge cases, security, deployment, and documentation only where required by explicit scope or concrete risk. Accept `N/A` with a short reason and do not require infrastructure merely to satisfy a template.
- Unspecified product, policy, security, privacy, compliance, authorization, or operational behavior is not missing scope. Flag concrete regressions or vulnerabilities, but do not invent policy.
- A review may report zero findings when no evidence-backed defect exists; do not manufacture findings or search for extra scope.

---

## Templates

- `tpl-impl-plan-review.md` — Canonical review output format with embedded review criteria
- `tpl-review-impl-plan-prompt.md` — Primary → reviewer delegation prompt
