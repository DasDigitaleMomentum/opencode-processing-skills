---
type: planning
entity: todo
plan: "{{plan_name}}"
updated: "{{date}}"
---

# Todo: {{plan_name}}

> Tracking [{{plan_name}}](plan.md)

## Active Phase: {{phase_number}} - {{phase_title}}

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
