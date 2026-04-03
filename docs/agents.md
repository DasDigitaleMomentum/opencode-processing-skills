# Agents Reference

The agent architecture is designed around **delegation** and **file-based persistence**. The primary agent orchestrates; subagents do the heavy lifting.

---

## Primary Agent

### `maintainer`

The orchestrator. Handles planning decisions, user interaction, and Git operations.

**What it does:**
- Loads skills automatically based on what you're asking for
- Delegates expensive exploration to subagents
- Keeps context lean by receiving digests instead of full outputs
- Persists everything to `docs/` and `plans/`
- Commits only when you ask

**When it works itself vs. delegates:**
- Works itself: planning decisions, user negotiation, trivially small edits
- Delegates: codebase exploration, doc generation, implementation, reviews

---

## Subagents

### `delegate`

General-purpose subagent for any task the primary needs to offload.

**Typical tasks:**
- Codebase exploration
- Running commands (tests, builds, verification)
- Analyzing data or logs
- Quick lookups and research

**Model:** Configured via `config.yaml`. Defaults to provider's choice if not set.

**Why it exists:** The built-in `general` uses the provider's default model. `delegate` uses your configured model — cheaper, faster, and predictable for routine tasks.

### `doc-explorer`

Writes documentation and planning artifacts.

**Writes to:**
- `docs/` — project documentation
- `plans/` — planning artifacts

**Does NOT write:** Code files.

**Used by:** `generate-docs`, `update-docs`, `create-plan`, `update-plan`, `author-and-verify-implementation-plan`, `generate-handover`

### `implementer`

Executes code changes following the gated protocol.

**Protocol:** BLUEPRINT → GATE → EXECUTE → DIGEST

**Does:**
- Proposes step lists (blueprint mode)
- Implements changes and runs verification (execute mode)
- Returns compact digests

**Does NOT:**
- Git operations (commit, push, rebase)
- Write to `docs/` or `plans/`

### `legacy-curator`

Handles legacy repo cleanup before generating fresh docs.

**Does:**
- Moves scattered documentation to `docs-legacy/`
- Generates `docs-legacy/summary.md`

**Does NOT:** Commit changes (you review and commit).

---

## Delegation Philosophy

### Why delegate instead of doing everything in the primary?

**Context limits.** The primary reads a lot during exploration — file contents, search results, tool outputs. Most of it isn't needed long-term. Delegating keeps the primary lean.

**Cost predictability.** Subagents run on your configured model. The primary can use a frontier model for planning; subagents can use cheaper models for routine work.

**Separation of concerns.** Subagents write to specific domains (docs, plans, code). The primary orchestrates and owns the conversation.

### When to use `delegate` vs `general`

| Agent | Model | Use when |
|-------|-------|----------|
| `delegate` | Your config | Default for routine tasks |
| `general` (built-in) | Provider default | User explicitly asks, or you want a different perspective |

### When to use delegate variants

Additional delegates (`delegate-review`, `delegate-fast`, etc.) let you switch models on demand:

```
> use delegate-opus for this review
> delegate to delegate-fast for a quick lookup
```

See [Installation → Additional Delegate Variants](installation.md#additional-delegate-variants) for setup.

---

## Agent Routing

```
You ──prompt──▸ @maintainer ──delegates──▸ subagents
                    │                         │
                    │  skills loaded           │  writes to disk
                    │  automatically           │  returns digest
                    ▼                         ▼
               docs/ & plans/           code changes
               (persistent)             (maintainer commits
                                         when you ask)

Delegation targets:
  delegate ......... exploration, research, commands
  doc-explorer ..... docs/ and plans/ artifacts
  implementer ...... code changes (gated execution)
  legacy-curator ... docs-legacy/ archive
  general (built-in) second opinion, user-requested
```

The file structure IS the interface. Subagents write to `docs/` and `plans/`, the primary reads from them. No magic state, no hidden context — just files.
