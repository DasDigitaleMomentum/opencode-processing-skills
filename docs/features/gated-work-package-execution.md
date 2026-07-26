---
type: documentation
entity: feature
feature: "gated-work-package-execution"
version: 1.1
---

# Feature: Gated Work-Package Execution

> Part of [OpenCode Processing Skills](../overview.md)

## Summary

A bounded implementation unit is executed through a visible blueprint, an explicit primary-agent gate, a stateful execution turn, and a compact digest. Its authority may come from persistent plan references or an inline gated brief, so self-contained work does not need a plan solely because it is significant. The protocol lets the user or maintainer correct scope before code changes while keeping detailed execution context out of the primary conversation.

## How It Works

`execute-work-package` binds a work package to one compact `implementer` session. Persistent plan references are authoritative for plan-bound work; otherwise an inline brief supplies task, DoD, constraints, and approved broad/full final verification. The implementer uses native parallel reads for compact independent results and sends broad, large, or exploratory evidence to the leaf retriever by default. It returns an auditable step list before the same approved session performs the work with staged verification.

### User Flow

1. The user chooses an approved phase or a bounded self-contained work package.
2. The maintainer sends either relevant plan references or an inline gated brief with task, DoD, constraints, and final verification, plus useful docs references.
3. The implementer proposes a blueprint; the maintainer or user approves it or requests a correction.
4. The same implementer session executes the accepted steps, iterates with the smallest targeted behavioral tests, and runs the approved broad/full command when ready as the final gate.
5. If the broad gate fails, the implementer returns to targeted diagnosis/fix/retest before rerunning it; after the final result, the maintainer updates plan state only when a persistent plan exists.

### Technical Flow

1. The primary selects exactly one authoritative scope source—persistent plan references or an inline gated brief—and starts the stateful protocol (`skills/execute-work-package/SKILL.md:117`, `skills/execute-work-package/SKILL.md:121`).
2. In BLUEPRINT mode, the implementer uses native parallel reads for compact results and `retriever` for broad or exploratory evidence, then returns ordered steps without writing code (`skills/execute-work-package/SKILL.md:137`, `agents/implementer.md:44`).
3. The primary checks the blueprint against scope and explicitly gates execution.
4. The same `task_id` must resume in EXECUTE mode because it retains the inspected Blueprint and approval context (`skills/execute-work-package/SKILL.md:81`, `skills/execute-work-package/SKILL.md:155`).
5. EXECUTE uses targeted behavioral tests during implementation/fixing, then runs the approved broad/full command as the final gate. A broad failure returns the loop to targeted diagnosis before another broad run (`skills/execute-work-package/SKILL.md:233`, `agents/implementer.md:64`).
6. The implementer returns the required digest, and the primary selects success, failure, or blocked post-processing without manufacturing a green result (`skills/execute-work-package/SKILL.md:167`, `skills/execute-work-package/SKILL.md:178`).

## Implementation

| Module | Symbols | Role |
|--------|---------|------|
| [Workflow Skills](../modules/workflow-skills.md) | `execute-work-package` Primary Inputs (`skills/execute-work-package/SKILL.md:117`), Statefulness (`skills/execute-work-package/SKILL.md:81`), Rules (`skills/execute-work-package/SKILL.md:233`) | Defines proportional authority inputs, mandatory gate-session reuse, staged verification, and bounded return contracts. |
| [Agent Personas](../modules/agent-personas.md) | `implementer` Inputs (`agents/implementer.md:31`), MODE: BLUEPRINT (`agents/implementer.md:44`), MODE: EXECUTE (`agents/implementer.md:58`) | Performs the two execution turns, may gather bounded leaf evidence, stages verification, and avoids Git/docs/plan ownership. |
| [Agent Personas](../modules/agent-personas.md) | `maintainer` Persistent Lifecycle (`agents/maintainer.md:121`), Execution Summary (`agents/maintainer.md:160`), Verification Policy (`agents/maintainer.md:183`) | Chooses persistent versus inline authority, owns the gate and same-session continuation, and requires the final broad verification. |
| [Cursor Adapter](../modules/cursor-adapter.md) | Gated implementation mapping (`cursor/task-delegation.md:53`) | Maps the two-turn protocol to Cursor `Task` plus `resume`. |

## Configuration

The protocol itself has no feature flag. The chosen implementer model and optional generated variants come from `config.yaml`; OpenCode session continuation uses `task_id`, Claude Agent Teams use their platform continuation mechanism, and Cursor uses `Task` plus `resume`. Installation and model syntax are maintained in [Installation](../installation.md).

## Edge Cases & Limitations

- EXECUTE must resume the blueprint session; a new session loses the assumptions and inspection context that the gate approved.
- Persistent plans are proportional rather than automatic. Inline execution is valid only when the brief is bounded and includes task, DoD, constraints, and final verification.
- The implementer may write code and tests but must not perform Git operations or write framework-owned `docs/` and `plans/` artifacts.
- Targeted tests support diagnosis but never replace or weaken the approved broad/full final gate. A failed final gate remains failed unless targeted repair succeeds and the unchanged broad gate is rerun successfully.
- Small, bounded, low-risk edits may remain with the primary; the gated protocol is intended for significant units where an explicit blueprint reduces risk.
- Hosts without stateful subagent continuation need a documented fallback that persists and reloads the blueprint, with the resulting context loss acknowledged.

## Related Features

- [Persistent Planning Lifecycle](persistent-planning-lifecycle.md)
- [Independent Review and Remediation](independent-review-and-remediation.md)
- [Multi-Target Installation](multi-target-installation.md)
