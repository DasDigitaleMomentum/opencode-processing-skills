---
type: execution
entity: blueprint
skill: execute-work-package
created: "{{date}}"
---

# Execution Blueprint (Step List)

## Work Packet

- intent: {{intent}}
- scope_paths: {{scope_paths}}

## References

### Plans (when present)
- plan: {{plan_ref}}
- phase: {{phase_ref}}
- implementation_plan: {{implementation_plan_ref}}
- todo (optional): {{todo_ref}}

### Inline Gated Brief (when no plan exists)
- task: {{inline_task}}
- DoD: {{inline_dod}}
- constraints: {{inline_constraints}}

### Docs (optional)
- overview: {{docs_overview_ref}}
- modules: {{docs_modules_ref}}
- features: {{docs_features_ref}}

## Steps

1. <concrete step; include file path and/or symbol/component>
2. ...

## Touched Files

- path/to/file

## Verify

`<single command>`
