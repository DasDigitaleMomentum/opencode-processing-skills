---
name: review-implementation-plan
description: Independent single-phase or batch review of implementation plans against scope, codebase reality, actionability, and cross-phase consistency. Produces per-phase structured reviews with severity-rated findings.
license: MIT
compatibility:
  opencode: ">=0.1"
metadata:
  category: review
  phase: planning
---

# Skill: Review Implementation Plan

This skill provides an **independent quality gate** for implementation plans authored via `author-and-verify-implementation-plan`.

A reviewer fresh from the authoring context evaluates one implementation plan or an ordered batch against phase scope, existing code, and actionability criteria. Fresh independence does not mean starting a cold reviewer for every phase. Each review remains a per-phase plan artifact.

---

## When to Use

Use this skill when:

- An implementation plan has been authored/verified and you want to validate it before execution.
- Multiple implementation plans have been authored sequentially and should be reviewed together as a dependency-ordered batch.
- You want to confirm that the implementation plan is concrete enough for `execute-work-package`.
- The user explicitly requests an implementation plan review.

Do **not** use this skill to:

- Review the plan itself (use `review-plan`).
- Review a completed implementation (use `review-implementation`).
- Rewrite the implementation plan during the independent review pass. After review completion, accepted related findings may transition to `review-fix` in the same reviewer session.

## Review Focus

The default priority is the smallest sufficient implementation: confirm that phase obligations are covered and no implementation step or new artifact is unauthorized, unnecessary, or needlessly indirect. Use the actual codebase to substantiate material concerns, but record only evidence-backed exceptions. The primary may add a focus via `{{focus}}`.

### Review posture

**Detect existing gold-plating without becoming an adversarial reviewer.** A reduction finding must name a concrete planned step/artifact and show missing authorization, missing present necessity, or a smaller sufficient path in the current codebase. Do not invent ideal architecture, hardening, tests, infrastructure, policy, or replacement work. Zero findings remains valid.

Testing, references, Reality Check wording, documentation, and other formal criteria are not checklist obligations. Report them only when a concrete defect would block or misdirect execution.

---

## Execution Model

### Roles

- **Primary (maintainer)**
  - Invokes the review skill.
  - Delegates to `delegate-strong` (default) or `general` (for same-model perspective).
  - Receives review summary and decides on follow-up actions.
  - Routes a batch through one fresh reviewer session by default and retains that `task_id` for possible remediation.

- **Subagent (delegate-strong / general)**
  - Starts without authoring context, then retains shared review context across a batch.
  - Uses the actual codebase selectively when a material concern needs evidence.
  - Writes the existing review artifact for every reviewed phase at `plans/<name>/reviews/impl-plan-review-phase-N.md`.
  - Reports material cross-phase conflicts in the relevant artifact and returns one aggregate digest.

### Why `delegate-strong` (not `doc-explorer`)

Same rationale as `review-plan`: the reviewer must be independent from the authoring work. In batch mode that fresh reviewer keeps useful context between phases rather than repeatedly approaching each phase cold. `delegate-strong` provides the judgment depth needed to evaluate implementation feasibility and cross-reference plan claims against real code.

## Routing Matrix (Who does what)

- **Writes**: one or more existing `plans/<name>/reviews/impl-plan-review-phase-N.md` artifacts; no consolidated artifact is required.
- **Does NOT write**: implementation plans, phase docs, or any other plan artifact.
- **Primary**: owns the decision of whether to act on findings.
- **delegate-strong/general**: performs the review, including codebase verification.

---

## Workflow

### 1) Select review mode and prepare references

Primary gathers:
- Review focus from the delegation prompt
- `plans/<name>/plan.md`
- One phase/implementation-plan pair for **single-phase mode**, or all selected pairs in dependency order for **batch mode**
- Relevant existing docs only when they reduce a material code lookup

### 2) Delegate

Primary delegates to `delegate-strong` (or `general`) using `tpl-review-impl-plan-prompt.md`.

Provide:
- Review mode and the ordered plan, phase, and implementation-plan paths
- Docs references (if available)
- One review output path per phase: `plans/<name>/reviews/impl-plan-review-phase-N.md`
- Review focus (freetext — what to prioritize)

In batch mode, one fresh reviewer processes phases sequentially, reuses shared evidence, writes each per-phase artifact, reports only material shared-interface conflicts, and returns one aggregate digest. Split the batch only when unrelated domains or practical context capacity require it.

### 3) Receive summary

For single-phase mode, the subagent returns the same fields for that phase. For batch mode, it returns one aggregate digest containing:
- Overall and per-phase verdicts (Ready / Needs Revision / Major Gaps)
- Overall and per-phase reduction flags
- Aggregate finding count by severity
- Top 3 actionable findings across the batch
- Required next action

### 4) Act on findings

Primary decides:
- **Ready**: Proceed to `execute-work-package` only when reduction is not required and no Critical/Major findings remain.
- **Needs Revision**: Do not execute. Accept or explicitly reject each blocking finding. Apply accepted implementation-plan reductions once through `review-fix`, reusing the reviewer only when retained reasoning materially helps; otherwise use a fresh lean path.
- **New authoring pass**: Re-run `author-and-verify-implementation-plan` only when the objective/gated scope changes, a new primary decision or investigation is required, the reviewer session is unavailable, or the primary explicitly wants a fresh planning context.
- **Major Gaps**: Discuss with user; potentially revise phase scope via `update-plan`.

The remediation digest closes the accepted pass. Do not automatically re-review or continue until zero findings. A fresh review requires an explicit user/primary decision or materially changed scope/risk.

---

## Output Contract

Each review artifact `plans/<name>/reviews/impl-plan-review-phase-N.md` MUST:

- Follow the canonical template headings and frontmatter keys.
- Include a clear assessment with verdict, reduction flag, and brief reasoning.
- Use current code evidence for material feasibility or minimality findings; do not exhaustively revalidate every reference when no concern exists.
- Report only exceptions; do not reproduce phase-coverage or per-step disposition tables.
- Give every finding a stable ID, severity, evidence, and concrete action.
- State `No findings` when the review finds no material problem.

In batch mode, record material cross-phase findings in the affected per-phase artifact. Do not create a mandatory consistency section or consolidated artifact.

Verdict rules:

- `Ready` requires `Reduction Required: No` and zero Critical/Major findings.
- Any executable step or new artifact without clear authorization or present necessity is at least Major and requires `Needs Revision`.
- Use `Major Gaps` when missing gated intent or an unresolved blocking decision prevents a defensible technical plan.

---

## Rules

- Examine the actual codebase only as needed to judge feasibility and substantiate findings. Do not perform exhaustive path/symbol certification as a formal exercise.
- The reviewer must begin fresh from the authoring context. In batch mode, retain review context across phases; fresh perspective does not require a cold reviewer per phase.
- Support both single-phase and batch review without changing the per-phase artifact naming convention.
- Batch review is sequential in dependency order and produces one aggregate digest. Cross-phase checks are limited to actual shared interfaces and dependencies.
- Do not fan out one reviewer per phase by default or reconstruct each authoring pass.
- Findings are **advisory decisions**, not automatic edits. The primary must accept or explicitly reject blocking findings before progression.
- Do not modify the implementation plan during review — only produce the review artifact.
- Do not discard the reviewer `task_id` until the primary has decided whether remediation is needed.
- Ensure the `reviews/` directory exists before delegating (create if needed).
- Zero findings is valid. Report testing, rollback, security, deployment, documentation, or policy only when a concrete defect exists; do not invent requirements or infrastructure.
- Pay particular attention to new layers, modules, interfaces, generic infrastructure, cleanup, and future-phase preparation, but report only concrete unnecessary work.
- Once a review is invoked, `Reduction Required: Yes` or unresolved Critical/Major findings block progression until the primary remediates or explicitly rejects them with rationale.
- One review plus one accepted remediation pass is the default bound. Never start an automatic review/fix/re-review loop.

---

## Templates

- `tpl-impl-plan-review.md` — Canonical compact per-phase review output
- `tpl-review-impl-plan-prompt.md` — Primary → reviewer delegation prompt
