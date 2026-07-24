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
- Works itself: planning decisions, user negotiation, and bounded low-risk changes in known files
- Delegates: focused evidence retrieval, codebase exploration, doc generation, implementation, reviews

Maintainers may directly read scoped source, `docs/`/`plans/`, symbols, and compact targeted results. They keep uncurated bulk evidence out of the owning context: reliable focused filters are used when sufficient, while large logs, verbose command/test output, generated dumps, mass-search output, and evidence requiring broad assembly route to `retriever`.

### `maintainer-direct`

Non-interactive variant of `maintainer`. It uses the same routing, safety, testing, and planning rules, but asks questions only for genuine decisions and otherwise reports progress directly.

---

## Subagents

### `delegate`

The one canonical, skill-driven delegate persona. Skills provide task expertise, workflow, write boundaries, and output contracts.

**Typical tasks:**
- Codebase exploration
- Running commands (tests, builds, verification)
- Analyzing data or logs
- Research and synthesis

**Write boundary:** `delegate` is read/analyze/verify by default. It may write skill-defined artifacts with explicit output paths/templates, such as reviews and implementation plans. Larger ad-hoc writes with undefined shape/targets should start with an informal Blueprint for primary approval. Code changes normally route to `implementer`; delegates do not perform Git operations.

After an implementation or implementation-plan review, `review-fix` is the preferred same-session remediation path for accepted related findings, including multi-file runtime changes. The review artifact remains unchanged. A new implementation or authoring session is reserved for changed scope/objective, missing context, new primary decisions, or an explicit fresh perspective.

Delegates and reviewers send separable evidence collection to `retriever` by default, and may call `doc-explorer` only for genuinely documentation- or module-oriented child tasks. They may directly read scoped source, authoritative docs/plans, symbols, and compact targeted evidence, but route uncurated bulk evidence or coherent multi-file collection to `retriever`. The parent owns synthesis, verdicts, severity, scope interpretation, and final artifacts without repeating broad child retrieval.

**Model:** Configured via `config.yaml`. Defaults to provider's choice if not set.

**Why it exists:** The built-in `general` uses the provider's default model. `delegate` uses your configured model — cheaper, faster, and predictable for routine tasks.

### `retriever`

A non-editing leaf evidence worker for focused questions from maintainers, delegates, or implementers. It may use Read, Grep, Glob, Bash, available web crawlers for known URLs, and logs or other tool output. Unlike the owning agent, it is explicitly allowed to consume complete large raw artifacts when needed. It can assemble coherent evidence across definitions, call sites, configuration, tests, and observed behavior, then returns synthesis with concrete paths, symbols, line references, and command evidence rather than concatenated contents. If an approach was not useful, it recommends a better route instead of padding the result.

`retriever` does not synthesize verdicts, assign severity, write artifacts, or delegate further. Concision is usefulness-driven; there is no universal hard numeric read or output cap. Numeric tool truncation remains a safety net, not the routing rule.

Open-ended web search, source selection, and cross-source synthesis remain `delegate` work through `web-research`; a configured `delegate-fast` may handle the lighter cases.

Maintainers and workers directly read scoped source, docs/plans, symbols, and compact targeted results. A reliable focused filter may reduce raw evidence when it preserves the needed facts; otherwise broad searches, large or verbose output, generated dumps, and coherent multi-file evidence go to `retriever` with a focused question.

### `doc-explorer`

Docs-focused subagent for project documentation and selected template-governed planning artifacts.

**Writes to:**
- `docs/` — project documentation
- `plans/` — selected framework planning artifacts when explicitly routed by relevant skills

**Does NOT write:** Code files or ad-hoc analysis writeups; use `delegate` for those. Implementation plans default to the canonical delegate via `author-and-verify-implementation-plan`.

**Used by:** `generate-docs`, `update-docs`, `create-plan`, `update-plan`, `generate-handover`

### `implementer`

Executes code changes following the gated protocol.

The implementer directly reads scoped source, docs/plans, symbols, and compact targeted results, and uses `retriever` for separable bulk or coherent multi-file evidence while retaining ownership of its Blueprint, edits, and verification.
In BLUEPRINT it uses native parallel reads for compact independent results and `retriever` for broad, large, or exploratory evidence. BLUEPRINT remains command-free; focused Bash/Python extraction is limited to EXECUTE mode. In EXECUTE, potentially verbose command and verification output is spooled under `/tmp/opencode/` rather than ingested directly.

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

### Scope and review posture

**No Gold-Plating. No Adversarial Reviewing. No Scope Creep.** Maintainers and
delegates should pursue evidence-backed problems, not invent improvements,
hunt for gotchas, or broaden the objective. Related files, call sites,
integration points, and tests remain discoverable when they are required for
accepted work. Real defects must still be reported and fixed.

### Why delegate instead of doing everything in the primary?

**Context limits.** The primary reads a lot during exploration — file contents, search results, tool outputs. Most of it isn't needed long-term. Delegating keeps the primary lean.

**Cost predictability.** Subagents run on your configured model. The primary can use a frontier model for planning; subagents can use cheaper models for routine work.

**Separation of concerns.** Subagents write according to workflow ownership: docs-focused artifacts, skill-defined review/implementation-plan artifacts, or gated code execution. The primary orchestrates and owns the conversation.

### Raw command-output spooling

Potentially verbose commands spool their complete output to a predictable path under `/tmp/opencode/`. The owning maintainer, delegate/reviewer, or implementer retains the path, command, exit status, and compact metadata or decisive evidence. It can use a reliable focused filter or ask `retriever` to inspect the complete artifact. The spool aids continuation after an agent or process interruption on the same machine, but it is temporary and is not reboot-durable.

### When to use `retriever`, `delegate`, or `general`

| Agent | Model | Use when |
|-------|-------|----------|
| `retriever` | Your config | Scoped files, tool output, commands, or known-URL crawling |
| `delegate` | Your config | Analysis, open-ended research, synthesis, and artifacts |
| `general` (built-in) | Provider default | User explicitly asks, or you want a different perspective |

### Stateful delegate reuse

The primary should resume an existing delegate `task_id` for follow-ups within the same analysis, review, or debugging thread. This includes loading `review-fix` after an implementation or implementation-plan review. Start a new delegate for changed scope, parallel work, model/variant changes, fresh independent opinions, or stale context. `task_id`s are session-local; durable continuity belongs in `docs/`, `plans/`, todos, and handovers.

### When to use delegate variants

Additional delegates (`delegate-strong`, `delegate-fast`, etc.) are generated model aliases of `agents/delegate.md`, not separate personas. They let you change capacity without duplicating task expertise:

```
> use delegate-strong for this review
> use delegate-fast for this routine analysis
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
  retriever ........ focused read-only evidence collection
  delegate ......... exploration, research, reviews, implementation plans
  doc-explorer ..... docs/ and selected skill-governed plans/ artifacts
  implementer ...... code changes (gated execution)
  legacy-curator ... docs-legacy/ archive
  general (built-in) second opinion, user-requested
```

Maintainers call `retriever` at delegation level 1. Delegates, reviewers, and implementers use it at level 2 for separable evidence; delegates may also call `doc-explorer` for documentation/module child tasks. OpenCode v1.18.2+ requires top-level `subagent_depth: 2`; older versions do not support that setting. See [Installation → Nested Delegation](installation.md#nested-delegation-opencode).

The file structure IS the interface. Framework docs/plans persist in `docs/` and `plans/`, and the primary reads from them. No magic state, no hidden context — just files.
