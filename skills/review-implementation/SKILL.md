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
- Fix implementation issues during the independent review pass. After the review is complete, accepted related findings may transition to `review-fix` in the same reviewer session.

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
  - Invokes the review skill after implementation is complete.
  - Delegates to `delegate-strong` (default) or `general` (for same-model perspective).
  - Receives review summary and decides on follow-up actions.
   - Retains the reviewer `task_id` while deciding whether its reasoning is valuable for possible remediation.

- **Subagent (delegate-strong / general)**
  - Reads plan, phase, implementation plan, and execution digest with **no prior context**.
  - Examines the **actual code changes** (via git diff or file reading).
  - Verifies acceptance criteria against real code and test output.
  - Writes the review artifact to `plans/<name>/reviews/impl-review-phase-N.md`.

### Why `delegate-strong` (not `doc-explorer` or `implementer`)

The reviewer must be independent from both the planner and the implementer. `delegate-strong` provides the judgment depth to evaluate code quality, test coverage, and acceptance criteria without the bias of having authored or implemented the work.

## Routing Matrix (Who does what)

- **Writes**: `plans/<name>/reviews/impl-review-phase-N.md`
- **Does NOT write**: code, plans, implementation plans, or any other artifact.
- **Primary**: owns the decision of whether to accept, request rework, or reject.
- **delegate-strong/general**: performs the review, including code examination and test verification.

The reviewer directly reads scoped source, authoritative plans/docs, symbols, and compact targeted evidence. It keeps uncurated bulk evidence out of its working context: use a reliable focused filter when sufficient, otherwise route the raw artifact, command, or path plus a focused question to `retriever`. This includes verbose diffs, command/test output, logs, generated dumps, broad searches, and coherent multi-file evidence. Numeric tool truncation is a safety net, not the routing rule.

---

## Workflow

### 1) Prepare references

Primary gathers:
- Review focus from the delegation prompt
- `plans/<name>/plan.md`
- `plans/<name>/phases/phase-N.md`
- `plans/<name>/implementation/phase-N-impl.md`
- Execution digest (from `execute-work-package` output) or git diff reference
- `docs/` references (if available)

### 2) Delegate

Primary delegates to `delegate-strong` (or `general`) using `tpl-review-impl-prompt.md`.

Provide:
- Plan, phase, implementation plan paths
- Digest reference or git diff base reference
- Review output path: `plans/<name>/reviews/impl-review-phase-N.md`
- Review focus (freetext — what to prioritize)

### 3) Receive summary

Subagent returns:
- Overall verdict (Accepted / Needs Rework / Rejected)
- Finding count by severity
- Top 3 findings

### 4) Act on findings

Primary decides:
- **Accepted**: Proceed to commit/merge. Update plan via `update-plan`.
- **Needs Rework**: After accepting findings, resume the same reviewer `task_id` through `review-fix` when it is available; otherwise use a fresh lean session. Related fixes may span multiple files, call sites, tests, and runtime code; size alone does not decide reuse.
- **Fresh lean work**: Use a fresh session when the reviewer session is unavailable or a fresh context is deliberately wanted. Use a new gated `execute-work-package` when the objective/gated scope changes, a new dependency or primary decision is required, or a fresh implementation context is explicitly chosen.
- **Rejected**: Discuss with user. May require replanning via `update-plan`.

The review pass ends before remediation begins. A reviewer that applies fixes is no longer independent; an additional review is optional and requires an explicit primary or user decision. Do not automatically chain review and remediation loops.

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
- Do not discard the reviewer `task_id` until the primary has decided whether remediation is needed.
- Ensure the `reviews/` directory exists before delegating (create if needed).
- **Test quality is a first-class concern.** A review that only checks "tests pass" without evaluating test meaningfulness is incomplete.
- When broad/full verification is supplied for review or remediation, use the smallest targeted tests for iterative diagnosis. Run the approved broad/full command once only when ready as the final gate; if it fails, return to targeted diagnosis and pass targeted tests before running the final gate again. Never weaken or omit it.
- Owning review and test verification does not imply consuming raw verbose output directly. Potentially verbose output should be spooled under `/tmp/opencode/`, with only path, command, exit status, and compact metadata/evidence retained; use focused filtering or `retriever` for analysis.
- Flag mock-only testing as a limitation unless the user explicitly waived real-world testing.

---

## Templates

- `tpl-impl-review.md` — Canonical review output format with embedded review criteria
- `tpl-review-impl-prompt.md` — Primary → reviewer delegation prompt
