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
  - Routes a batch through one fresh reviewer session by default and retains that `task_id` for possible remediation.

- **Subagent (delegate-strong / general)**
  - Starts without authoring context, then retains shared review context across a batch.
  - Examines the **actual codebase** to verify references and feasibility.
  - Writes the existing review artifact for every reviewed phase at `plans/<name>/reviews/impl-plan-review-phase-N.md`.
  - Performs exactly one integrated cross-phase consistency assessment for a batch and returns one aggregate digest.

### Why `delegate-strong` (not `doc-explorer`)

Same rationale as `review-plan`: the reviewer must be independent from the authoring session. In batch mode that fresh reviewer keeps useful context between phases rather than repeatedly approaching each phase cold. `delegate-strong` provides the judgment depth needed to evaluate implementation feasibility and cross-reference plan claims against real code.

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
- `docs/overview.md`, `docs/modules/*.md` (if available)

### 2) Delegate

Primary delegates to `delegate-strong` (or `general`) using `tpl-review-impl-plan-prompt.md`.

Provide:
- Review mode and the ordered plan, phase, and implementation-plan paths
- Docs references (if available)
- One review output path per phase: `plans/<name>/reviews/impl-plan-review-phase-N.md`
- Review focus (freetext — what to prioritize)

In batch mode, use one fresh reviewer session independent from the authoring session by default. The reviewer:

1. Reviews phases sequentially in dependency order.
2. Collects shared or overlapping evidence once and reuses it across phase reviews.
3. Writes each per-phase review artifact as that phase is completed.
4. Performs exactly one integrated cross-phase consistency assessment after the per-phase passes and records it in one of those artifacts.
5. Returns one aggregate digest covering all reviewed phases.

Retriever delegation is evidence-oriented, not phase-oriented. Do not create nested per-phase retriever fan-out by default; delegate separable shared evidence once and request phase-specific evidence only where it is genuinely distinct.

Do not automatically create one reviewer per phase. Separate reviewers are allowed only for explicit independent perspectives, genuinely unrelated technical domains, specialist requirements, or when combined evidence exceeds practical context capacity. For an oversized batch, partition by contiguous dependency/domain groups rather than mechanically per phase. Completed phase reviews are not repeated; a central pass checks only interfaces crossing partitions.

### 3) Receive summary

For single-phase mode, the subagent returns the existing compact summary. For batch mode, it returns one aggregate digest containing:
- Overall and per-phase verdicts (Ready / Needs Revision / Major Gaps)
- Aggregate finding count by severity
- Top 3 findings across the batch
- The integrated cross-phase consistency result

### 4) Act on findings

Primary decides:
- **Ready**: Proceed to `execute-work-package`.
- **Needs Revision**: Prefer accepting the findings and resuming the same reviewer `task_id` through `review-fix`. Related implementation-plan corrections may span multiple steps, symbols, and references; size alone does not require a new authoring session.
- **New authoring pass**: Re-run `author-and-verify-implementation-plan` only when the objective/gated scope changes, a new primary decision or investigation is required, the reviewer session is unavailable, or the primary explicitly wants a fresh planning context.
- **Major Gaps**: Discuss with user; potentially revise phase scope via `update-plan`.

---

## Output Contract

Each review artifact `plans/<name>/reviews/impl-plan-review-phase-N.md` MUST:

- Follow the canonical template headings and frontmatter keys.
- Include a clear **Overall Assessment** with verdict and reasoning.
- Verify implementation steps against **actual codebase** (not just the plan text).
- Rate every finding with a **severity** (Critical / Major / Minor / Note).
- Address **Real-World Testing** explicitly.
- Validate the **Reality Check** section of the implementation plan.
- Validate that every step cites an authorizing gated item or preserved existing invariant and that blocking decisions stop dependent planning.

In batch mode, exactly one per-phase artifact MUST also include the optional **Cross-Phase Consistency** section and identify the reviewed phase set. This preserves existing artifact and review-fix compatibility without introducing a mandatory consolidated review type.

---

## Rules

- The reviewer must examine the **actual codebase** — not just the plan documents. File paths and symbols in the implementation plan must be verified against current repo state.
- The reviewer must begin fresh from the authoring context. In batch mode, retain review context across phases; fresh perspective does not require a cold reviewer per phase.
- Support both single-phase and batch review without changing the per-phase artifact naming convention.
- Batch review is sequential in dependency order and produces one aggregate digest plus exactly one integrated cross-phase consistency assessment.
- Automatic parallel reviewer-per-phase fan-out is prohibited by default. Apply only the explicit reviewer-separation and contiguous partitioning exceptions defined above, with a central consistency check limited to cross-partition interfaces.
- Retriever delegation is evidence-oriented: collect shared evidence once and avoid nested phase-oriented fan-out by default.
- Validate the authoring session's sequential plans and author-owned consistency QA proportionally; do not reconstruct the entire authoring pass.
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
