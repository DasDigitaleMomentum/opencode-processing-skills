---
name: execute-work-package
description: Execute a bounded implementation unit from authoritative plan references or an inline gated brief using a stateful subagent loop (steps -> gate -> execute -> digest) without creating new persistent artifacts.
license: MIT
compatibility:
  opencode: ">=0.1"
metadata:
  category: execution
  phase: implementation
---

# Skill: Execute Work Package

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

- A plan/phase (or a major slice of a phase) already has a clear **DoD** and **verification** approach; or
- A self-contained work package has an inline gated brief with its task, DoD, constraints, and approved broad/full final verification.
- You want to offload implementation to a subagent without causing primary context bloat.
- You want predictable, reviewable execution with a single explicit gate.

If persistent phase work has a vague or unverified implementation plan, run `author-and-verify-implementation-plan` first. Do not create a persistent plan solely because a bounded inline work package is significant or non-trivial.

**Multi-phase ordering:** When a plan has multiple phases, create **all** implementation plans first (via `author-and-verify-implementation-plan`), then execute phases **sequentially** — one at a time. Do not alternate between planning and executing per phase; the cross-phase view catches conflicts early and sequential execution avoids errors from interdependencies.

Do **not** use this skill to:

- (Re-)do planning (scope, risks, alternatives) — that is **Primary** work.
- Generate documentation/planning artifacts — use `generate-docs`, `create-plan`, `update-plan`, `update-docs`.

---

## Execution Model

### Roles

- **Primary (maintainer)**
  - Owns scope/DoD/risk decisions and gating.
  - Chooses the work package (phase, significant phase slice, or self-contained inline brief).
  - Owns Git operations (stage/commit/PR) unless explicitly delegated.
  - Updates plan/todo via `update-plan` as needed when a persistent plan exists.

- **Subagent (implementer)**
  - Does execution only for exactly one phase/work package in a fresh session.
  - First returns a **step list**.
  - May add a concise optional Package Sizing Note when natural execution slices exist, but never splits scope or chooses a slice; the Primary decides whether to approve the full package or issue a smaller fresh package.
  - After approval, executes those steps and returns a **digest**.
  - Uses `retriever` by default for separable evidence collection while retaining ownership of the Blueprint, edits, and verification.
  - Directly reads scoped source and compact targeted evidence, but keeps uncurated bulk evidence out of its context. It uses reliable focused filtering when sufficient and `retriever` for complete raw or coherent multi-file evidence.
  - BLUEPRINT remains command-free. In EXECUTE, potentially verbose output is spooled to a predictable path under `/tmp/opencode/`; the immediate context receives only path, command, exit status, and compact metadata/evidence.
  - Retires after the digest; another phase/work package starts with a fresh implementer.
  - Does not do Git operations.
  - Checkpoints after approved Blueprint steps or bounded parts of a large step, consulting the latest possibly lagged telemetry before deliberately starting another context-heavy unit.

## Routing Matrix (Who does what)

- **Writes**: code files in the target repository (working tree changes) and runs verification commands.
- **Does NOT write**: `plans/**` or `docs/**` artifacts.
- **Primary**: owns gating/approval, Git operations, and, when a persistent plan exists, updates to `plans/**` (typically via `update-plan`).
- **implementer**: execution only (blueprint → execute → digest), no Git.
- **Session boundary**: one fresh implementer per phase/work package; only that package's BLUEPRINT and EXECUTE calls share a session.
- **retriever**: default leaf for separable evidence collection by the implementer; no edits, decisions, or artifact ownership.
- **doc-explorer**: not used for this skill (unless you explicitly want docs/plan artifacts, in which case use the appropriate planning/doc skills).

### Authority and navigation

- `plans/` provides gated intent/DoD and references when the package belongs to a persistent plan lifecycle.
- Otherwise, the inline gated work-package brief is authoritative and supplies the task, DoD, constraints, and final verification.
- `docs/` (if present) provides curated inventories (modules/features/symbols) so the subagent does not rediscover everything.

### Statefulness

The protocol relies on continuing the subagent in the **same** session via **the same `task_id`**:

- **Call 1** (`task`): request "Step List only" → receive Blueprint
- Primary reviews and approves (internal gate)
- **Call 2** (`task` with same `task_id`): request "Execute approved steps" → receive Digest

This reuse remains mandatory even when a fresh lean session would normally be preferred: EXECUTE depends on the retained Blueprint inspection and explicit approval context.

The statefulness ends with that package's digest. The Implementer retires after the digest; never reuse its `task_id` for another phase, work package, or post-digest continuation.

> **CRITICAL: Two separate `task` calls required.**
>
> BLUEPRINT and EXECUTE are **always two separate `task` tool invocations**. The primary must:
>
> 1. Make **Call 1** (`task(subagent_type="implementer", prompt="MODE: BLUEPRINT ...")`) and **wait for the response**.
> 2. Review the Blueprint, then gate/approve internally.
> 3. Make **Call 2** (`task(task_id="<from call 1>", subagent_type="implementer", prompt="MODE: EXECUTE ...")`) as a **new, separate tool call**.
>
> **Anti-pattern (WRONG):** Combining Blueprint and Execute in a single `task` call, or sending the Execute prompt before receiving the Blueprint response. The subagent session is still in BLUEPRINT mode until the first call completes — any Execute instructions in the same call will be ignored.

#### Platform-specific session resumption

The two-call pattern requires **session resumption** — continuing a subagent in the same conversation context. The mechanism differs by platform:

| Platform | Resumption mechanism | Notes |
|----------|---------------------|-------|
| **OpenCode** | `task(task_id="<from call 1>", ...)` | Pass `task_id` from Call 1 into Call 2. Native support. |
| **Claude Code** (with Agent Teams) | `SendMessage(to="<agent_id>", ...)` | Requires `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`. The `agent_id` is received after Call 1 completes. |
| **Claude Code** (without Agent Teams) | ❌ Not supported | Each `Agent` call creates a fresh context. **Workaround:** Write the Blueprint to a temp file, then start a second `Agent` call that reads the Blueprint file and executes. The subagent loses conversational context but retains the step list. |

> **Note:** In Claude Code v2.1.63+, the `Task` tool was renamed to `Agent` (the old name still works as an alias). The `SendMessage` tool is only available when Agent Teams are enabled.

---

## Protocol

### 0) Primary inputs (for any work package)

Before delegating:

- Ensure the work package is already gated (scope/DoD decided).
- Provide exactly one authoritative scope source:
  - **Persistent plan references**: an explicit task statement plus the relevant planning artifacts. The subagent reads these references itself (the primary does not paste their contents). Recommended references:
    - `plans/<plan>/plan.md`
    - `plans/<plan>/phases/phase-N.md`
    - `plans/<plan>/implementation/phase-N-impl.md`
    - `plans/<plan>/todo.md` (optional)
  - **Inline gated work-package brief**: task, DoD, constraints, and approved broad/full final verification. No `plans/` artifact is required.
- If project documentation exists, also provide references to it so the subagent can use the curated inventories
  (symbols, modules, features) instead of rediscovering everything from scratch:
  - `docs/overview.md` (optional)
  - `docs/modules/*.md` (optional)
  - `docs/features/*.md` (optional)
- Provide the approved broad/full **Verify Command** if one is already decided.
  If not, the subagent proposes exactly **one** verify command in the BLUEPRINT (to be gated by the primary).

### 1) MODE: BLUEPRINT (Execution Blueprint)

Primary delegates to `implementer` with a prompt based on `tpl-implementer-preflight-prompt.md`.

**Gate:** Primary reviews the step list and either:

- Approves (GO)
- Requests revision (feedback)
- Aborts and replans

When the Blueprint contains an optional Package Sizing Note, it is advisory only. The Primary either approves the complete package or aborts and issues a smaller fresh work package. The Implementer must not split the approved scope, select a slice, or emit a hard FIT/SPLIT state.

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

Owning verification does not imply consuming raw verbose output directly. The implementer spools complete potentially verbose output under `/tmp/opencode/`, then uses a reliable focused filter or asks `retriever` to analyze the raw path with a focused question. Spools support same-machine continuation after an agent or process interruption, not reboot durability. Numeric tool truncation is a safety net, not the routing rule.

The digest closes and retires this Implementer session.

### 4) Primary post-processing

Read the digest carefully. The subagent's verification result determines next steps:

- **Verification passed:** Spot-check with `git diff --stat` to confirm expected changes. Do not re-run the full test suite yourself – the subagent already did.
- **Verification failed or incomplete:** Decide the remaining bounded scope, then start a fresh Implementer work package rather than resuming the retired `task_id`. Do not run large test suites in the primary session.
- **BLOCKED / no verification ran:** Decide whether to provide missing input and re-delegate, or run a targeted check yourself.

If the Implementer began work but the digest is empty or missing, treat the call as interrupted rather than successful. Do not resume the bloated session. Use this recovery sequence:

1. Call `checkpoint_path` with the failed Implementer `task_id` to select its JSONL log.
2. Inspect that log and identify the last attempted and next announced units.
3. Inspect the current working tree without discarding or overwriting partial changes.
4. Map the logged units and current edits to the approved Blueprint, distinguishing completed, attempted, and remaining work.
5. Issue the unfinished bounded scope as a smaller fresh work package; its Implementer inspects current state rather than blindly replaying the original package.

This uses the existing Blueprint, checkpoint log, and working tree. It creates no new handoff format, digest outcome, partial state, or recovery schema.

Then:

- If a persistent plan exists, updates `plans/<plan>/todo.md` and phase status via `update-plan`.
- Commits / creates PR **only** when explicitly requested by the user

Optional but recommended (Primary):

- Before execute: capture baseline via `git status` / `git diff --name-only`
- After execute: confirm changes exist via `git diff --stat`

---

## Output Contracts

### Step List Contract (Subagent -> Primary)

Subagent returns an **Execution Blueprint** in the format of `tpl-execution-blueprint.md`.

The blueprint is expected to be **concrete** (file paths and/or symbol/component targets), not a restatement of plan text.

It may contain the template's optional **Package Sizing Note** only when natural execution slices would help the Primary gate a context-heavy package. The note is concise and non-binding; it proposes cuts but neither changes scope nor chooses one.

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
- Start a fresh Implementer for each phase/work package. Reuse its `task_id` only for that package's BLUEPRINT → EXECUTE pair, then retire it after the digest.
- Skill-first: when this skill is invoked, follow its MODE + output contracts before doing anything else.
- Keep the Blueprint to **one** explicit approved broad/full verify command unless the work package DoD requires more. It must exercise the changed behavior (for example, run relevant tests, hit the affected endpoint, or trigger the modified flow), not just compile, lint, or type-check.
- During EXECUTE, checkpoint after each approved Blueprint step or a bounded part of a large step. Treat approximately 75% context use and 220k used tokens as soft planning signals only; continuing toward approximately 300k is acceptable when remaining work is bounded. Telemetry may lag the active turn, and unknown remains unknown. Before deliberately starting another context-heavy unit, assess remaining work and headroom.
- During implementation and fixing, run the smallest targeted tests that exercise or reproduce the changed or problematic behavior. Do not run the approved broad/full command after every change or use it as the first iterative diagnostic step when a targeted test is known or can be identified.
- Run the approved broad/full command once only when implementation is ready, as the final gate. If that final gate exposes a failure, return to targeted diagnosis, fix, and retest. Only after targeted tests pass may the broad/full final gate run again. Never weaken or omit the final broad gate.
- No raw diffs or long logs in responses.
- If targeted verification or the final gate fails, apply **minimal, targeted fixes** (no refactors) under the staged sequence above. If a larger change is required, stop and report a digest with a minimal relevant excerpt.
- If the step list must change during execution: stop and ask Primary for a new gate.

---

## Coding Standards

These apply to all code written during execution – by the implementer subagent or the primary.

1. **No hardcoded defaults.** Use configuration files or environment variables for values that may change across environments.
2. **Analyze root cause.** Don't patch symptoms. Understand why something is broken before changing code.
3. **Minimal changes.** Only touch what the work package requires. Don't refactor adjacent code you weren't asked to change.
4. **Preserve existing patterns.** Match the conventions already established in the codebase (naming, structure, error handling).
5. **No silent failures.** Don't swallow errors or add fallbacks that hide problems. If something fails, it should be visible.
6. **Respect the dependency boundary.** Don't introduce new dependencies without explicit approval from the primary/user.

If `docs/coding-standards.md` exists in the target repo, read and follow it as well – project-specific standards take precedence.

---

## Templates

- `tpl-implementer-preflight-prompt.md` — Primary -> Subagent (MODE: BLUEPRINT) prompt
- `tpl-implementer-execute-prompt.md` — Primary -> Subagent (MODE: EXECUTE) prompt (same `task_id`)
- `tpl-execution-blueprint.md` — canonical blueprint format (step list)
- `tpl-execution-digest.md` — canonical digest format
