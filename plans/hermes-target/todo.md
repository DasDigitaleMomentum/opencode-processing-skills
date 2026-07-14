---
type: planning
entity: todo
plan: "hermes-target"
updated: "2026-07-14"
---

# Todo: hermes-target

> Tracking [hermes-target](plan.md)

## Active Phase: 1 - Hermes install target

### Phase Context

- **Scope**: [Phase 1](phases/phase-1.md)
- **Implementation**: implementation/phase-1-impl.md (not authored — single-phase change of ~40 script lines, executed directly in-session; see PR)
- **Latest Handover**: — (none yet)
- **Relevant Docs**: `install.sh` header comment (target/override contract), `config.yaml.example`

### Pending

- [ ] Add hermes target resolution block to install.sh (HERMES_HOME, HERMES_STATE, OPS_ overrides) <!-- added: 2026-07-14 -->
- [ ] Wire hermes into SKILLS_DESTS + status output + DESCRIPTION.md generation <!-- added: 2026-07-14 -->
- [ ] Verify --project mode excludes hermes <!-- added: 2026-07-14 -->
- [ ] Update config.yaml.example with targets.hermes <!-- added: 2026-07-14 -->
- [ ] Update README.md target sentence <!-- added: 2026-07-14 -->
- [ ] Sandboxed verification: enabled / disabled / auto-missing / idempotency / symlink / project mode <!-- added: 2026-07-14 -->
- [ ] Static checks: bash -n, shellcheck (if available) <!-- added: 2026-07-14 -->
- [ ] Real-machine smoke test into ~/.hermes <!-- added: 2026-07-14 -->

### In Progress

### Completed

- [x] Add hermes target resolution block to install.sh (HERMES_HOME, HERMES_STATE, OPS_ overrides) <!-- completed: 2026-07-14 -->
- [x] Wire hermes into SKILLS_DESTS + status output + DESCRIPTION.md generation <!-- completed: 2026-07-14 -->
- [x] Verify --project mode excludes hermes <!-- completed: 2026-07-14 -->
- [x] Update config.yaml.example with targets.hermes <!-- completed: 2026-07-14 -->
- [x] Update README.md target sentence <!-- completed: 2026-07-14 -->
- [x] Sandboxed verification: enabled / disabled / auto-missing / idempotency / symlink / project mode <!-- completed: 2026-07-14 -->
- [x] Static checks: bash -n, shellcheck (if available) <!-- completed: 2026-07-14 -->
- [x] Real-machine smoke test into ~/.hermes <!-- completed: 2026-07-14 -->

### Blocked

## Changelog

### 2026-07-14

- Plan created; todo initialized with Phase 1 items

- All Phase 1 items completed: implementation, docs (incl. docs/installation.md), sandbox verification (24/24), static checks, real-machine smoke test with Hermes-discovery validation
