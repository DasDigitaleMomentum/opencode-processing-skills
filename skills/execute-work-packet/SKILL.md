---
name: execute-work-packet
description: Execute a significant implementation unit (phase or major slice) using a gated, stateful subagent loop (steps -> gate -> execute -> digest) without creating new persistent artifacts.
license: MIT
compatibility:
  opencode: ">=0.1"
metadata:
  category: execution
  phase: implementation
---

# Skill: Execute Work Packet

This skill standardizes **execution/implementation** once planning is complete.

It introduces a gated, stateful protocol:

1) **Subagent returns a step list** (Execution Blueprint)
2) **Primary gates/approves the step list**
3) **Subagent executes the approved steps** in the **same subagent session** (same `task_id`)
4) Subagent returns a **compact digest** (no raw logs/diffs)

This skill deliberately **does not** create new files under `docs/` or `plans/`.

---

## When to Use

Use this skill when:

- A plan/phase (or a major slice of a phase) already has a clear **DoD** and **verification** approach.
- You want to offload implementation to a subagent without causing primary context bloat.
- You want predictable, reviewable execution with a single explicit gate.

Do **not** use this skill to:

- (Re-)do planning (scope, risks, alternatives) — that is **Primary** work.
- Generate documentation/planning artifacts — use `generate-docs`, `create-plan`, `update-plan`, `update-docs`.

---

## Execution Model

### Roles

- **Primary (maintainer)**
  - Owns scope/DoD/risk decisions and gating.
  - Chooses the work packet (phase or significant phase slice).
  - Owns Git operations (stage/commit/PR) unless explicitly delegated.
  - Updates plan/todo via `update-plan` as needed.

- **Subagent (implementer)**
  - Does execution only.
  - First returns a **step list**.
  - After approval, executes those steps and returns a **digest**.
  - Does not do Git operations.

### Statefulness

The protocol relies on continuing the subagent in the **same** session via **the same `task_id`**:

- First `Task`: request “Step List only”
- Second `Task` (resume with `task_id`): request “Execute approved steps and return digest”

---

## Workflow

### 0) Primary prerequisites

Before delegating:

- Ensure the work packet is already gated (scope/DoD decided).
- Provide an explicit **task statement** plus **references** to the relevant planning artifacts.
  The subagent should read these references itself (the primary does not need to paste content).
  Recommended references:
  - `plans/<plan>/plan.md`
  - `plans/<plan>/phases/phase-N.md`
  - `plans/<plan>/implementation/phase-N-impl.md`
  - `plans/<plan>/todo.md` (optional)
- Provide a **Verify Command** if one is already decided.
  If not, the subagent must propose exactly **one** verify command (to be gated by the primary).

### 1) Step List (Execution Blueprint)

Primary delegates to `implementer` with a prompt based on `tpl-implementer-preflight-prompt.md`.

**Gate:** Primary reviews the step list and either:

- Approves (GO)
- Requests revision (feedback)
- Aborts and replans

### 2) Execute (same `task_id`)

Primary resumes the same subagent `task_id` and instructs it to execute the **approved** steps (see `tpl-implementer-execute-prompt.md`).

### 3) Digest back to Primary

Subagent responds with a compact digest:

- Outcome (succeeded/failed)
- Files changed (paths)
- Verification result (command + exit)
- If failure: only a small, relevant excerpt (no full logs)

### 4) Primary post-processing

Primary then:

- Runs `git status` / `git diff` as needed
- Runs any additional verification if desired
- Updates `plans/<plan>/todo.md` and phase status via `update-plan`
- Commits / creates PR **only** when explicitly requested by the user

---

## Output Contracts

### Step List Contract (Subagent -> Primary)

Subagent MUST return only:

1. **Steps** (numbered list)
2. **Touched files** (paths)
3. **Verify** (single command)

No risks, no alternatives, no architecture commentary.

### Digest Contract (Subagent -> Primary)

Subagent MUST return only:

- **Outcome**: succeeded | failed
- **Edits**: list of files changed + 1-line note each
- **Verify**: command + exit code + (if failed) small excerpt
- **Next**: 1–3 bullets (or “ready for Primary Git/commit”)

---

## Rules

- Subagent must not run Git operations (commit, rebase, push).
- Keep verification minimal: **one** explicit verify command unless the work packet DoD requires more.
- No raw diffs or long logs in responses.
- If verify fails: stop, report digest + minimal excerpt, do not attempt large refactors.
- If the step list must change during execution: stop and ask Primary for a new gate.

---

## Templates

- `tpl-implementer-preflight-prompt.md` — Primary -> Subagent request for step list
- `tpl-implementer-execute-prompt.md` — Primary -> Subagent execute request (same `task_id`)
- `tpl-execution-digest.md` — formatting reference for digest
