---
type: planning
entity: todo
plan: "{{plan_name}}"
updated: "{{date}}"
---

# Todo: {{plan_name}}

> Tracking [{{plan_name}}](plan.md)

## Active Phase: {{phase_number}} - {{phase_title}}

### Phase Context

<!-- Updated on each phase transition by update-plan -->

- **Scope**: [Phase {{phase_number}}](phases/phase-{{phase_number}}.md)
- **Implementation**: [Phase {{phase_number}} Plan](implementation/phase-{{phase_number}}-impl.md)
- **Latest Handover**: [Session {{date}}](handovers/session-{{date}}.md) <!-- update when handover is created -->
- **Relevant Docs**: <!-- list module docs relevant to this phase -->

### Pending

- [ ] {{task_description}} <!-- added: {{date}} -->

### In Progress

- [ ] {{task_description}} <!-- started: {{date}} -->

### Completed

- [x] {{task_description}} <!-- completed: {{date}} -->

### Blocked

- [ ] {{task_description}} <!-- blocked: {{date}}, reason: {{reason}} -->

## Changelog

<!-- Append-only log of significant changes and decisions -->

### {{date}}

- {{what_happened}}
