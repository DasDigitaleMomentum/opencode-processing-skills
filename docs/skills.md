# Skills Reference

Skills are loaded automatically by the agent when they match what you're asking for. You don't manually trigger them – just describe what you need.

---

## The Planning Process

### Entities

When work is multi-phase, multi-session, explicitly requested as a plan, or needs durable coordination/tracking, planning uses this persistent hierarchy:

| Entity | File | Purpose |
|--------|------|---------|
| **Plan** | `plans/<name>/plan.md` | High-level objective, requirements, Definition of Done, phases overview |
| **Phase** | `plans/<name>/phases/phase-N.md` | What this phase delivers and why (scope + acceptance criteria) |
| **Implementation Plan** | `plans/<name>/implementation/phase-N-impl.md` | How to implement the phase (steps, files, symbols) |
| **Review** | `plans/<name>/reviews/*.md` | Independent quality gate (plan, impl-plan, or impl review) |
| **Todo** | `plans/<name>/todo.md` | Trackable items with status |
| **Handover** | `plans/<name>/handovers/session-*.md` | Session context for continuity |

### Directory Structure

The tree grows on demand. `create-plan` initially writes only `plan.md`, `phases/`, and `todo.md`; `implementation/`, `reviews/`, and `handovers/` appear when their respective workflows first create an artifact.

```
plans/<name>/
├── plan.md                    # The plan
├── phases/
│   ├── phase-1.md             # What/why for phase 1
│   └── phase-2.md             # What/why for phase 2
├── implementation/
│   ├── phase-1-impl.md        # How for phase 1
│   └── phase-2-impl.md        # How for phase 2
├── reviews/
│   ├── plan-review.md         # Plan quality gate
│   ├── impl-plan-review-phase-1.md  # Impl-plan quality gate
│   └── impl-review-1.md       # Implementation quality gate
├── todo.md                    # Current phase items
└── handovers/
    └── session-2024-01-15.md  # End-of-session context
```

### Persistent Plan Flow

```
1. Discuss        → User and agent clarify requirements
2. Create Plan    → create-plan (confirm, then write smallest sufficient plan)
3. Review Plan    → review-plan (optional; binding once invoked)
4. Author Impl    → author-and-verify-implementation-plan (smallest sufficient, per phase)
5. Review Impl    → review-implementation-plan (optional; binding once invoked)
6. Implement      → execute-work-package (gated: blueprint → approve → execute)
7. Review Code    → review-implementation (optional)
8. Fix Findings   → review-fix (reuse reviewer when retained reasoning is valuable)
9. Update Plan    → update-plan (track progress, transition phases)
10. Handover      → generate-handover (end of session)
```

A bounded self-contained work package does not automatically require this hierarchy. It can go directly to `execute-work-package` with an inline gated brief containing the task, DoD, constraints, and approved broad/full final verification.

Plan and implementation-plan authors each perform one author-owned deletion pass before handoff. Reviews remain optional, but plan-oriented reviews audit scope in both directions: every confirmed obligation needs an owner, and every phase, step, or new artifact needs authorization and present necessity. This is evidence-backed scope discipline, not adversarial reviewing or a pretext for replacement work.

Once a review is invoked, `Reduction Required: Yes` or unresolved Critical/Major findings block progression until the primary remediates or explicitly rejects them with rationale. Remediation is bounded to one pass; there is no automatic re-review loop.

Across analysis, review, and execution workflows, the owning maintainer, delegate/reviewer, or implementer may directly read scoped source, authoritative docs/plans, symbols, and compact targeted results. Large uncurated logs, verbose command/test output, generated dumps, mass-search output, and evidence requiring coherent multi-file assembly are reliably filtered or routed to `retriever` instead. There is no universal hard numeric read cap; tool truncation is only a safety net.

**Key insight:** Phases define *what* and *why*. Implementation plans define *how*. This separation lets you change the technical approach without changing the scope.

**Multi-phase authoring:** The Maintainer processes implementation plans sequentially with one fresh Delegate session per phase. Each later delegate reads completed prior plans to preserve shared interfaces, naming, data-flow assumptions, and dependency order; durable artifacts, not a retained authoring session, carry context forward.

**Batch review:** Multiple authored implementation plans default to one fresh reviewer session independent from the authoring work. It reviews phases sequentially in dependency order, reuses shared evidence, writes the existing per-phase review artifacts, records only material cross-phase conflicts in affected artifacts, and returns one aggregate digest. This validates artifact-based continuity proportionally rather than reconstructing the complete authoring work.

---

## Documentation Skills

### `generate-docs`

Creates structured documentation in `docs/`:
- Project overview with architecture and module map
- Module docs with file/symbol inventories
- Feature docs explaining how things work

```
> Document this project
```

### `update-docs`

Updates existing docs after code changes. Detects outdated sections, refreshes inventories, maintains cross-references.

```
> Update the docs – I refactored the auth module
```

### `archive-legacy-docs`

For repos with scattered documentation (random READMEs, outdated wikis). Moves everything to `docs-legacy/` with a summary before generating fresh docs.

```
> Archive the existing docs before generating new ones
```

---

## Planning Skills

### `create-plan`

Creates a structured plan in `plans/<name>/`:
- `plan.md` — objective, requirements, DoD, phases overview
- `phases/phase-N.md` — scope definition per phase (what/why)
- `todo.md` — trackable items with status

This is a conversation, not a one-shot prompt. The model asks clarifying questions, proposes the fewest necessary phases, performs one deletion/merge pass, and confirms the scope and structure before writing artifacts. The plan's phase table explains only each phase's contribution and why it needs a separate boundary; phase documents define what and why without repeating authorization. Empty implementation, review, and handover directories are not scaffolded.

Use it proportionally: for multi-phase or multi-session work, an explicitly requested persistent plan, or durable coordination/tracking. Significance alone does not require a plan when one bounded package can be gated inline.

```
> I want to add multi-tenant support. Let's think about what that involves.
  ... (back and forth, model asks questions, you refine scope) ...

> Good, let's create the plan based on what we discussed.
```

### `author-and-verify-implementation-plan`

Authors the smallest sufficient per-phase implementation plans (`implementation/phase-N-impl.md`) grounded against the actual codebase. Steps use `What`, `Where`, `Authorized By`, `Why`, and `Considerations`, and survive one author-owned deletion pass. Testing names one primary verify command plus optional checks; `Reality Check` is omitted unless a material mismatch or blocking decision exists.

Default routing: the canonical `delegate` writes the explicit implementation-plan artifact using the skill's template. Use `delegate-strong` only when phase complexity or risk justifies the premium model.

```
> Write the implementation plans and verify them against the codebase
```

### `update-plan`

Updates plan status, todo items, phase transitions, and changelog. After a plan review, the primary also uses it for one bounded accepted-finding remediation pass, updates directly affected references, records finding decisions, and stops without automatic re-review.

```
> (usually automatic after implementing a phase)
```

### `resume-plan`

Bootstraps a new session to continue an existing plan. Reads artifacts, validates prerequisites, prepares context.

```
> Let's continue with the multi-tenant plan
```

### `generate-handover`

Creates session handover docs for context transfer. Captures progress, decisions, and open questions.

```
> Create a handover for today's session
```

---

## Review Skills

Independent quality gates. A fresh subagent reviews artifacts without authoring context — catching gaps you've stopped seeing. For an implementation-plan batch, freshness is relative to the authoring work, not each phase: one reviewer normally retains useful review context across the ordered batch.

### `review-plan`

Reviews a plan for gaps and unnecessary work before secondary readiness concerns. It persists only evidence-backed exceptions, with a verdict, `Reduction Required` flag, stable severity-rated findings, and concrete actions; clean phases and deliverables are not certified individually. Once requested, blocking results must be remediated or explicitly rejected before implementation-plan authoring.

```
> Review the plan before we start implementing
```

### `review-implementation-plan`

Reviews one implementation plan or an ordered batch for gaps, unnecessary work, codebase grounding, feasibility, and material cross-phase conflicts. It persists only evidence-backed exceptions. Batch review is sequential, writes one per-phase artifact, and returns a compact aggregate digest with verdicts, reduction flags, severity counts, top actionable findings, and the next action. Retriever delegation follows evidence boundaries: overlapping evidence is collected once rather than through nested phase-oriented fan-out.

Automatic reviewer-per-phase parallelism is not the default. Separate reviewers are reserved for an explicit independent perspective, genuinely unrelated domains, specialist requirements, or impractical combined context. Oversized batches are split only into contiguous dependency/domain groups; a central check covers cross-partition interfaces without re-reviewing completed phases.

```
> Review the implementation plan for phase 2
> Review all implementation plans as one ordered batch
```

### `review-implementation`

Reviews completed code against acceptance criteria, test quality, coding standards.

The reviewer owns findings and verdicts but does not need to ingest raw verbose evidence. Potentially verbose test or command output is spooled under `/tmp/opencode/`; focused filtering or `retriever` analysis supplies compact referenced evidence.

```
> Review the implementation before I commit
```

### `review-fix`

Applies accepted related findings from an implementation or implementation-plan review in one bounded pass. It verifies only changed or directly affected checks and reports fixed/unresolved finding IDs, edits, verification, and next action. Resume the reviewer when retained analysis materially benefits remediation; otherwise prefer a fresh lean session. The immutable review plus one remediation digest ends the pass—further review requires an explicit decision, not an automatic loop.

```
> Fix findings F-1 and F-3 from that review in the same delegate session
```

---

## Execution Skills

### `delegate-analysis`

Provides the canonical delegate with explicit modes for code exploration, targeted reading, web research, and deep-dive investigation. Model variants use this same skill and persona. Delegates read scoped and compact evidence directly, but route uncurated bulk artifacts and coherent multi-file evidence to `retriever`.

### `execute-work-package`

Gated execution protocol:
1. **Blueprint** — subagent proposes step list
2. **Gate** — primary reviews and approves
3. **Execute** — subagent implements and verifies
4. **Digest** — compact summary returned

```
> Implement the next phase of the auth-refactor plan
> Execute this bounded inline brief without creating a persistent plan
```

The authoritative input can be persistent plan references or an inline gated brief containing task, DoD, constraints, and final verification. The primary verifies understanding before any code gets written. BLUEPRINT and EXECUTE are separate calls but must reuse the same compact implementer `task_id`, because execution depends on the approved Blueprint context. Git operations stay with you.

Verification is staged during execution and remediation: use the smallest targeted test to exercise or reproduce behavior while iterating, then run the approved broad/full command only when ready as the final gate. If that gate fails, return to targeted diagnosis, fix, and retest before rerunning it. Targeted tests never replace or weaken the final broad verification.

During Execute, complete potentially verbose command and verification output is spooled to a predictable path under `/tmp/opencode/`. The owning context retains the path, command, exit status, and compact metadata/evidence; `retriever` may inspect the complete spool when needed. These temporary files aid same-machine continuation after an interruption, but are not reboot-durable.
