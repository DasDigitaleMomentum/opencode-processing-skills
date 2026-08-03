---
type: documentation
entity: feature
feature: "gated-work-package-execution"
version: 1.2
---

# Feature: Gated Work-Package Execution

> Part of [OpenCode Processing Skills](../overview.md)

## Summary

A bounded implementation unit is executed through a visible blueprint, an explicit primary-agent gate, a stateful execution turn, and a compact digest. Its authority may come from persistent plan references or an inline gated brief, so self-contained work does not need a plan solely because it is significant. The protocol lets the user or maintainer correct scope before code changes while keeping detailed execution context out of the primary conversation.

## How It Works

`execute-work-package` binds a work package to one compact `implementer` session. Persistent plan references are authoritative for plan-bound work; otherwise an inline brief supplies task, DoD, constraints, and approved broad/full final verification. The implementer returns an auditable step list and may add a concise non-binding Package Sizing Note when natural execution cuts exist. Only the Maintainer decides between approving the full package and issuing a smaller fresh package; there is no automatic split or FIT/SPLIT state.

### User Flow

1. The user chooses an approved phase or a bounded self-contained work package.
2. The maintainer sends either relevant plan references or an inline gated brief with task, DoD, constraints, and final verification, plus useful docs references.
3. The implementer proposes a blueprint and, optionally, natural sizing cuts; the maintainer or user approves the complete package, requests a correction, or issues a smaller fresh package.
4. The same implementer session executes the accepted steps, iterates with the smallest targeted behavioral tests, and runs the approved broad/full command when ready as the final gate.
5. If the broad gate fails, the implementer returns to targeted diagnosis/fix/retest before rerunning it; after the final result, the maintainer updates plan state only when a persistent plan exists. If a started execution returns no usable digest, the Maintainer selects its log with `checkpoint_path(task_id)`, inspects the log and working tree, maps progress to the approved Blueprint, and creates a smaller fresh recovery package.

### Technical Flow

1. The primary selects exactly one authoritative scope source—persistent plan references or an inline gated brief—and starts the stateful protocol (`skills/execute-work-package/SKILL.md:117`, `skills/execute-work-package/SKILL.md:121`).
2. In BLUEPRINT mode, the implementer uses native parallel reads for compact results and `retriever` for broad or exploratory evidence, then returns ordered steps without writing code. An optional Package Sizing Note proposes cuts but changes no scope.
3. The primary checks the blueprint against scope and explicitly gates execution.
4. The same `task_id` must resume in EXECUTE mode because it retains the inspected Blueprint and approval context (`skills/execute-work-package/SKILL.md:81`, `skills/execute-work-package/SKILL.md:155`).
5. EXECUTE uses targeted behavioral tests during implementation/fixing, then runs the approved broad/full command as the final gate. A broad failure returns the loop to targeted diagnosis before another broad run (`skills/execute-work-package/SKILL.md:233`, `agents/implementer.md:64`).
6. The implementer checkpoints after approved steps or bounded parts of a large step and returns the existing required digest. Empty/missing output after work began triggers selected-log plus current-tree recovery and a smaller fresh package, not a new digest state or resumption of the bloated session.

## Implementation

| Module | Symbols | Role |
|--------|---------|------|
| [Workflow Skills](../modules/workflow-skills.md) | `execute-work-package` statefulness, Package Sizing Note, Primary post-processing, and Rules | Defines proportional authority inputs, advisory sizing, normal gate-session reuse, staged verification, and interrupted-digest recovery. |
| [Agent Personas](../modules/agent-personas.md) | `implementer` Inputs (`agents/implementer.md:31`), MODE: BLUEPRINT (`agents/implementer.md:44`), MODE: EXECUTE (`agents/implementer.md:58`) | Performs the two execution turns, may gather bounded leaf evidence, stages verification, and avoids Git/docs/plan ownership. |
| [Agent Personas](../modules/agent-personas.md) | `maintainer` Persistent Lifecycle (`agents/maintainer.md:130`), Execution Summary (`agents/maintainer.md:173`), Verification Policy (`agents/maintainer.md:196`) | Chooses persistent versus inline authority, owns the gate and same-session continuation, and requires the final broad verification. |
| [Cursor Adapter](../modules/cursor-adapter.md) | Gated implementation mapping (`cursor/task-delegation.md:54`) | Maps the two-turn protocol to Cursor `Task` plus `resume`. |

## Configuration

The protocol itself has no feature flag. The chosen implementer model and optional generated variants come from `config.yaml`; OpenCode session continuation uses `task_id`, Claude Agent Teams use their platform continuation mechanism, and Cursor uses `Task` plus `resume`. Installation and model syntax are maintained in [Installation](../installation.md).

## Edge Cases & Limitations

- Normal EXECUTE must resume the blueprint session; an interrupted execution with an empty/missing digest is not resumed and instead becomes a smaller fresh package grounded in its checkpoint log, Blueprint, and current tree.
- Persistent plans are proportional rather than automatic. Inline execution is valid only when the brief is bounded and includes task, DoD, constraints, and final verification.
- The implementer may write code and tests but must not perform Git operations or write framework-owned `docs/` and `plans/` artifacts.
- Targeted tests support diagnosis but never replace or weaken the approved broad/full final gate. A failed final gate remains failed unless targeted repair succeeds and the unchanged broad gate is rerun successfully.
- Small, bounded, low-risk edits may remain with the primary; the gated protocol is intended for significant units where an explicit blueprint reduces risk.
- Hosts without stateful subagent continuation need a documented fallback that persists and reloads the blueprint, with the resulting context loss acknowledged.
- Package sizing is advisory. The Implementer never chooses a slice, and recovery introduces no handoff format, partial state, or automatic split.

## Related Features

- [Persistent Planning Lifecycle](persistent-planning-lifecycle.md)
- [Independent Review and Remediation](independent-review-and-remediation.md)
- [Multi-Target Installation](multi-target-installation.md)
