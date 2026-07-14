---
type: documentation
entity: feature
feature: "gated-work-package-execution"
version: 1.0
---

# Feature: Gated Work-Package Execution

> Part of [OpenCode Processing Skills](../overview.md)

## Summary

A significant implementation unit is executed through a visible blueprint, an explicit primary-agent gate, a stateful execution turn, and a compact digest. This lets the user or maintainer correct scope before code changes while keeping detailed execution context out of the primary conversation.

## How It Works

`execute-work-package` binds a specific phase or major slice to one `implementer` session. The implementer first returns an auditable step list without editing; after approval, the same session performs the work and verification, then reports changed paths, tests, and remaining issues in a bounded digest.

### User Flow

1. The user chooses an approved phase or otherwise well-bounded work package.
2. The maintainer sends the relevant plan, implementation plan, docs, constraints, and verification expectations to an implementer.
3. The implementer proposes a blueprint; the maintainer or user approves it or requests a correction.
4. The same implementer session executes the accepted steps and returns a digest.
5. The maintainer handles any required persistent plan update and reports the verified outcome.

### Technical Flow

1. The primary assembles the mandatory work-package inputs and starts the stateful protocol (`skills/execute-work-package/SKILL.md:75`, `skills/execute-work-package/SKILL.md:109`).
2. In BLUEPRINT mode, the implementer inspects context and returns ordered steps, files, verification commands, and risk notes without writing code (`skills/execute-work-package/SKILL.md:129`, `agents/implementer.md:39`).
3. The primary checks the blueprint against scope and explicitly gates execution.
4. The same `task_id` resumes in EXECUTE mode; the implementer applies the accepted work and runs the planned verification (`skills/execute-work-package/SKILL.md:147`, `agents/implementer.md:53`).
5. The implementer returns the required digest, and the primary selects success, failure, or blocked post-processing without manufacturing a green result (`skills/execute-work-package/SKILL.md:159`, `skills/execute-work-package/SKILL.md:168`).

## Implementation

| Module | Symbols | Role |
|--------|---------|------|
| [Workflow Skills](../modules/workflow-skills.md) | `execute-work-package` Protocol (`skills/execute-work-package/SKILL.md:107`), Step List Contract (`skills/execute-work-package/SKILL.md:190`), Digest Contract (`skills/execute-work-package/SKILL.md:204`) | Defines routing, statefulness, gate semantics, and bounded return contracts. |
| [Agent Personas](../modules/agent-personas.md) | `implementer` MODE: BLUEPRINT (`agents/implementer.md:39`), MODE: EXECUTE (`agents/implementer.md:53`), Hard Constraints (`agents/implementer.md:67`) | Performs the two execution turns, verifies changes, and avoids Git/docs/plan ownership. |
| [Agent Personas](../modules/agent-personas.md) | `maintainer` Execution Summary (`agents/maintainer.md:157`), Work Tracking (`agents/maintainer.md:173`) | Owns the gate, user communication, and persistent post-processing. |
| [Cursor Adapter](../modules/cursor-adapter.md) | Gated implementation mapping (`cursor/task-delegation.md:53`) | Maps the two-turn protocol to Cursor `Task` plus `resume`. |

## Configuration

The protocol itself has no feature flag. The chosen implementer model and optional generated variants come from `config.yaml`; OpenCode session continuation uses `task_id`, Claude Agent Teams use their platform continuation mechanism, and Cursor uses `Task` plus `resume`. Installation and model syntax are maintained in [Installation](../installation.md).

## Edge Cases & Limitations

- EXECUTE must resume the blueprint session; a new session loses the assumptions and inspection context that the gate approved.
- The implementer may write code and tests but must not perform Git operations or write framework-owned `docs/` and `plans/` artifacts.
- A failed verification remains failed in the digest. The primary must not advance plan state or claim completion without evidence.
- Small, bounded, low-risk edits may remain with the primary; the gated protocol is intended for significant units where an explicit blueprint reduces risk.
- Hosts without stateful subagent continuation need a documented fallback that persists and reloads the blueprint, with the resulting context loss acknowledged.

## Related Features

- [Persistent Planning Lifecycle](persistent-planning-lifecycle.md)
- [Independent Review and Remediation](independent-review-and-remediation.md)
- [Multi-Target Installation](multi-target-installation.md)
