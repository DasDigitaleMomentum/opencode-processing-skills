---
type: execution
entity: subagent-preflight-prompt
skill: execute-work-package
created: "{{date}}"
---

# Implementer Preflight Prompt (Step List)

MODE: BLUEPRINT

You are the **implementer** subagent.

Your job: return an **Execution Blueprint** (step list) for the work package below.

Constraints:
- Execution-only: do NOT do planning (no risks/alternatives/architecture commentary).
- Do NOT run Git operations.
- Keep verification minimal: provide exactly **one** approved broad/full final verification command.
- Output must be compact and structured.

In BLUEPRINT mode:
- Do NOT apply patches.
- Do NOT run commands.
- Do NOT claim you changed code.

## Work Packet

### Intent
{{intent}}

### Scope (paths / modules)
{{scope_paths}}

### Authoritative Input (use one)

#### Planning References (read them yourself, if a persistent plan exists)
- Plan: {{plan_ref}}
- Phase: {{phase_ref}}
- Implementation Plan: {{implementation_plan_ref}}
- Todo (optional): {{todo_ref}}

#### Inline Gated Work-Package Brief (when no plan exists)
- Task: {{inline_task}}
- DoD: {{inline_dod}}
- Constraints: {{inline_constraints}}
- Final verification: {{verify_command}}

### Documentation References (if present, read them yourself)
- Overview (optional): {{docs_overview_ref}}
- Modules (optional): {{docs_modules_ref}}
- Features (optional): {{docs_features_ref}}

### DoD (short)
{{dod}}

### Approved Broad/Full Final Verification Command
{{verify_command}}

If `{{verify_command}}` is empty/unknown, propose exactly **one** verify command.

## Output

Return a Markdown **Execution Blueprint** using the canonical format in:

- `skills/execute-work-package/tpl-execution-blueprint.md`

Rules for BLUEPRINT:
- Do NOT restate phase/impl-plan steps. Concretize using docs inventories (symbols/features/modules) plus a brief code cross-check.
- Each step must include at least one concrete target (file path and/or symbol/component name).
- Treat either the planning references or the inline brief as authoritative. Preserve inline constraints in the Blueprint.
- When natural execution slices exist, you may add the template's optional concise Package Sizing Note. It is non-binding: propose cuts only; do not split scope, select a slice, or emit a hard FIT/SPLIT state. The Maintainer decides whether to approve the full package or issue a smaller fresh package.
