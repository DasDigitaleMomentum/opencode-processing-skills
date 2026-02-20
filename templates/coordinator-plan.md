# {{plan_name}} — Cross-Repo Coordinator

## Status

{{status}}

## Objective

{{objective}}

## Repositories

| Repo | Role | Description |
|------|------|-------------|
| {{repo_name}} | {{role}} | {{description}} |

## Dependency Graph

```text
{{upstream_repo}} ({{role}})
  ↓ provides {{what}}
{{downstream_repo}} ({{role}})
```

## Phases

| Phase | Repo | Title | Depends On | Status |
|-------|------|-------|------------|--------|
| 1 | {{repo}} | {{title}} | – | {{status}} |
| 2 | {{repo}} | {{title}} | Phase 1 | {{status}} |

## Cross-Repo Acceptance Criteria

- [ ] {{criterion}}

## Execution Order

### Phase 1: {{repo}}

- [ ] Open {{repo}}
- [ ] Run `resume-plan` (references this coordinator)
- [ ] Implement phase
- [ ] Push / publish changes
- [ ] Verify downstream repos can access output

### Phase 2: {{repo}}

- [ ] Verify Phase 1 output is available
- [ ] Open {{repo}}
- [ ] Run `resume-plan`
- [ ] Implement phase

## Risks & Open Questions

| Risk | Impact | Mitigation |
|------|--------|------------|
| {{risk}} | {{impact}} | {{mitigation}} |

## Changelog

| Date | Change |
|------|--------|
| {{date}} | Plan created |
