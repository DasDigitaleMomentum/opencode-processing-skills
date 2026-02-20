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

This skill standardizes **execution/implementation** once planning is gated.

It is a small, repeatable protocol:

1) **BLUEPRINT**: Subagent returns an **Execution Blueprint** (step list)
2) **GATE**: Primary approves (primary-internal)
3) **EXECUTE**: Subagent implements and verifies (same `task_id`)
4) **DIGEST**: Subagent returns a compact digest (no raw logs/diffs)

This skill deliberately **does not** create new persistent artifacts in `docs/` or `plans/`.

---

## When to Use

Use this skill when:

- A plan/phase (or a major slice of a phase) already has a clear **DoD** and **verification** approach.
- You want to offload implementation to a subagent without causing primary context bloat.
- You want predictable, reviewable execution with a single explicit gate.

If your phase implementation plan is still vague or unverified against the repo, run `author-and-verify-implementation-plan` first.

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

## Routing Matrix (Who does what)

- **Writes**: code files in the target repository (working tree changes) and runs verification commands.
- **Does NOT write**: `plans/**` or `docs/**` artifacts.
- **Primary**: owns gating/approval, Git operations, and any updates to `plans/**` (typically via `update-plan`).
- **implementer**: execution only (blueprint → execute → digest), no Git.
- **doc-explorer**: not used for this skill (unless you explicitly want docs/plan artifacts, in which case use the appropriate planning/doc skills).

### Why `docs/` and `plans/` matter here

- `plans/` provides the gated intent/DoD and references for what to implement.
- `docs/` (if present) provides curated inventories (modules/features/symbols) so the subagent does not rediscover everything.

### Statefulness

The protocol relies on continuing the subagent in the **same** session via **the same `task_id`**:

- First `Task`: request “Step List only”
- Second `Task` (resume with `task_id`): request “Execute approved steps and return digest”

---

## Protocol

### 0) Primary inputs (for any work packet)

Before delegating:

- Ensure the work packet is already gated (scope/DoD decided).
- Provide an explicit **task statement** plus **references** to the relevant planning artifacts.
  The subagent should read these references itself (the primary does not need to paste content).
  Recommended references:
  - `plans/<plan>/plan.md`
  - `plans/<plan>/phases/phase-N.md`
  - `plans/<plan>/implementation/phase-N-impl.md`
  - `plans/<plan>/todo.md` (optional)
- If project documentation exists, also provide references to it so the subagent can use the curated inventories
  (symbols, modules, features) instead of rediscovering everything from scratch:
  - `docs/overview.md` (optional)
  - `docs/modules/*.md` (optional)
  - `docs/features/*.md` (optional)
- Provide a **Verify Command** if one is already decided.
  If not, the subagent proposes exactly **one** verify command in the BLUEPRINT (to be gated by the primary).

### 1) MODE: BLUEPRINT (Execution Blueprint)

Primary delegates to `implementer` with a prompt based on `tpl-implementer-preflight-prompt.md`.

**Gate:** Primary reviews the step list and either:

- Approves (GO)
- Requests revision (feedback)
- Aborts and replans

#### Invariant: explicit approval token

Primary provides an explicit approval token before execution (primary-internal gate). Example:

- `APPROVE-WP1`

If the user requests changes, the step list must be revised and re-approved with a new approval token.

### 2) Execute (same `task_id`)

Primary resumes the same subagent `task_id` and instructs it to execute the **approved** steps (see `tpl-implementer-execute-prompt.md`).

#### Invariant: MODE lock

The execute resume prompt MUST start with a clear mode indicator:

- `MODE: EXECUTE`

and MUST include the approval token.

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

Optional but recommended (Primary):

- Before execute: capture baseline via `git status` / `git diff --name-only`
- After execute: confirm changes exist via `git diff --stat`

---

## Output Contracts

### Step List Contract (Subagent -> Primary)

Subagent returns an **Execution Blueprint** in the format of `tpl-execution-blueprint.md`.

The blueprint is expected to be **concrete** (file paths and/or symbol/component targets), not a restatement of plan text.

#### Mode: BLUEPRINT

In BLUEPRINT mode, the subagent must NOT:

- apply patches
- run commands
- claim that code was changed

### Digest Contract (Subagent -> Primary)

Subagent MUST return only:

- **Outcome**: succeeded | failed
- **Edits**: list of files changed + 1-line note each
- **Verify**: command + exit code + (if failed) small excerpt
- **Next**: 1–3 bullets (or “ready for Primary Git/commit”)

#### Mode: EXECUTE

In EXECUTE mode, the subagent must:

- implement changes (typically via patch/apply_patch)
- run the verify command (via bash)
- if neither happened: return **BLOCKED** with a concrete reason

---

## Rules

- Subagent must not run Git operations (commit, rebase, push).
- Skill-first: when this skill is invoked, follow its MODE + output contracts before doing anything else.
- Keep verification minimal: **one** explicit verify command unless the work packet DoD requires more.
- No raw diffs or long logs in responses.
- If verify fails: stop, report digest + minimal excerpt, do not attempt large refactors.
- If the step list must change during execution: stop and ask Primary for a new gate.
- If verify fails: the subagent may do minimal, targeted fixes and re-run verify; otherwise stop and report BLOCKED.

---

## Templates

- `tpl-implementer-preflight-prompt.md` — Primary -> Subagent (MODE: BLUEPRINT) prompt
- `tpl-implementer-execute-prompt.md` — Primary -> Subagent (MODE: EXECUTE) prompt (same `task_id`)
- `tpl-execution-blueprint.md` — canonical blueprint format (step list)
- `tpl-execution-digest.md` — canonical digest format
