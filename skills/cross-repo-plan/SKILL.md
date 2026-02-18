---
name: cross-repo-plan
description: "EXPERIMENTAL: Creates and tracks implementation plans that span multiple repositories. Extends the single-repo plan model with a coordinator document that tracks per-repo progress, cross-repo dependencies, and execution order."
license: MIT
compatibility: opencode
metadata:
  category: planning
  phase: coordination
  status: experimental
---

# Skill: Cross-Repo Plan

> ⚠️ **Experimental**: This skill extends the plan model beyond single repositories. The execution is inherently serial (one repo at a time in OpenCode), which limits real-time coordination. Use this for planning and tracking, not for simultaneous multi-repo execution.

## What This Skill Does

Creates an **implementation plan that spans multiple repositories**. While the standard `create-plan` skill works within a single repo, many real-world features require coordinated changes across several repos (e.g., updating a shared library and then adapting all consumers).

Produces:

- **Coordinator plan** in the current repo with cross-repo phase dependencies
- **Per-repo phase documents** that reference the coordinator plan
- **Execution order** that respects inter-repo dependencies
- **Global progress tracking** across all involved repos

## When to Use

- When a feature requires changes in 2+ repositories
- When a shared library update needs coordinated consumer updates
- When a migration spans multiple services
- When the user says "this affects repo X and repo Y"

Do NOT use this for changes that fit within a single repository — use `create-plan` instead.

## Execution Model

- **Always**: the primary agent runs this skill directly.
- **Rationale**: cross-repo planning requires conversation context to understand repository relationships and user priorities. The plan structure is fundamentally a coordination document, not a deep codebase analysis.
- **Limitation**: OpenCode operates in one repo at a time. The coordinator plan lives in the "hub" repo; per-repo phases are executed when the user opens each respective repo.

## Workflow

### Step 1: Identify Repositories

Use the `question` tool to determine:

1. Which repositories are involved?
2. What is the relationship between them? (shared library → consumers, microservices, monorepo packages)
3. Which repo is the "hub" (where the coordinator plan will live)?
4. What is the execution order? (which repo must be changed first?)

### Step 2: Map Cross-Repo Dependencies

For each repository, understand:

- What it provides to other repos (shared types, API contracts, libraries)
- What it consumes from other repos (imported packages, API calls)
- What the planned change affects in each repo

Build a dependency graph:

```markdown
## Dependency Graph

repo-a (shared-lib)
  ↓ provides types + utilities
repo-b (api-service)
  ↓ provides API endpoints
repo-c (web-frontend)
  ↓ consumes API
repo-d (mobile-app)
```

### Step 3: Design Phase Structure

Create phases that respect the dependency order:

- **Phase 1**: Changes in the upstream/provider repo (e.g., shared library)
- **Phase 2**: Changes in direct consumers
- **Phase 3**: Changes in downstream consumers
- **Phase N**: Integration testing across repos

Each phase is tagged with its target repository:

```markdown
| Phase | Repo | Title | Depends On |
|-------|------|-------|------------|
| 1 | shared-lib | Update auth types | – |
| 2 | api-service | Adapt API to new types | Phase 1 |
| 3 | web-frontend | Update API client | Phase 2 |
| 4 | mobile-app | Update API client | Phase 2 |
| 5 | – (all) | Cross-repo integration test | Phases 2-4 |
```

### Step 4: Create Coordinator Plan

Write the coordinator plan to `plans/<name>/plan.md` in the hub repo, using the standard plan template with these additions:

1. **Repositories section**: list all involved repos with their roles
2. **Dependency graph**: visual representation of repo relationships
3. **Per-repo phases**: each phase tagged with its target repo
4. **Cross-repo acceptance criteria**: conditions that span repositories

### Step 5: Create Per-Repo Phase Documents

For each phase, create the standard phase and implementation plan documents. Add a header noting:

```markdown
---
type: phase
plan: <plan-name>
repo: <target-repo>
coordinator: <hub-repo>
---
```

This allows `resume-plan` in any repo to find and reference the coordinator plan.

### Step 6: Create Execution Checklist

Add a section to the coordinator plan's `todo.md` that tracks cross-repo execution:

```markdown
## Cross-Repo Execution

### Phase 1: shared-lib
- [ ] Open shared-lib repo
- [ ] Run resume-plan (references this coordinator plan)
- [ ] Implement Phase 1
- [ ] Publish / push changes
- [ ] Verify consumers can access new version

### Phase 2: api-service
- [ ] Verify Phase 1 artifact is available (new package version / merged PR)
- [ ] Open api-service repo
- [ ] Run resume-plan
- [ ] Implement Phase 2
```

### Step 7: Present and Confirm

Present the cross-repo plan to the user. Confirm:

- Are the repo dependencies correct?
- Is the execution order feasible?
- Are there deployment/release gates between phases?
- Who needs to be notified for each repo change?

## Limitations

1. **Serial execution**: OpenCode works in one repo at a time. Cross-repo phases must be executed sequentially by switching repos.
2. **No live status sync**: the coordinator plan is a planning document, not a live dashboard. Status updates happen when the user runs `update-plan` in each repo.
3. **Manual verification**: cross-repo acceptance criteria must be verified manually (e.g., "API contract matches between service and client").
4. **Hub repo responsibility**: the coordinator plan lives in one repo. If the hub repo is not the one currently open, the user must remember to update it.

## Rules

1. **One coordinator, many targets**: the coordinator plan lives in a single hub repo. Per-repo phases reference back to it.
2. **Respect dependency order**: never create a phase that runs before its upstream dependency is completed and available.
3. **Each phase = one repo**: a single phase should not span multiple repos. Split cross-repo work into repo-specific phases.
4. **Standard templates**: use the existing plan, phase, and implementation plan templates. The cross-repo additions are metadata (repo tag, dependency graph), not a new template.
5. **Track availability, not just completion**: a phase in repo-a is not just "completed" — its output must be "available" to repo-b (published package, merged PR, deployed service).
6. **No built-in explore agent**: do NOT use the built-in `explore` subagent type.
