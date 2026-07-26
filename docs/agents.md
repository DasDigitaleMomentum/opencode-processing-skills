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
- Persists curated documentation to `docs/` and uses `plans/` proportionally for multi-phase, multi-session, explicitly requested, or durably coordinated/tracked work
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

After an implementation or implementation-plan review, choose remediation-session reuse by retained context value versus context cost. Resume the reviewer through `review-fix` when its analysis, unresolved assumptions, or cross-file reasoning materially helps; prefer a fresh lean task, or a tiny primary check, for a fully specified fix, test, or command. File count and session age do not decide reuse. The review artifact remains unchanged, and no review/fix loop starts automatically.

For multiple implementation-plan reviews, the maintainer defaults to one reviewer session that is fresh from the authoring session, not one reviewer per phase. The reviewer works sequentially in dependency order, reuses consolidated evidence, writes each per-phase review artifact, performs one integrated consistency assessment, and returns one aggregate digest. Parallel per-phase reviewers and nested phase-oriented retriever fan-out are not defaults; oversized review is divided only into contiguous dependency/domain groups with a central cross-partition interface check.

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

BLUEPRINT and EXECUTE always use the same compact `task_id`: the second turn depends on the inspection and approval context retained from the first. This gate-specific requirement overrides the general preference for fresh lean sessions when old context has little value.

**Does:**
- Proposes step lists (blueprint mode)
- Implements changes and stages verification: smallest targeted tests while changing/fixing, then the approved broad/full command as the final gate
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

Reuse a delegate `task_id` when retained reasoning materially reduces reconstruction cost: follow-up analysis, unresolved assumptions, cross-file reasoning, or review remediation that depends on the original findings. Prefer a fresh lean task—or the primary for a tiny focused check—when a test, command, verification, or fully specified fix is self-contained, or accumulated context costs more than it contributes. BLUEPRINT → EXECUTE is the exception: it must reuse the same compact implementer session because execution depends on the approved Blueprint context. Start fresh for changed scope, parallel work, model/variant changes, or an independent opinion. `task_id`s are session-local; durable continuity belongs in files when a persistent workflow exists.

Batch implementation-plan review is another deliberate reuse case: the reviewer starts independently from the author, then keeps its session across the ordered phases because shared evidence and cross-phase reasoning are review inputs. Separate reviewers are exceptions for explicit independent perspectives, unrelated domains, specialist requirements, or impractical combined context—not an automatic phase fan-out.

### Aborted delegate recovery

Work likely to exhaust one session should be split before delegation by focused question, dependency group, or bounded work package. If a subagent aborts or returns no usable digest, its scope is treated as too large: the maintainer neither resumes the bloated session nor absorbs the remaining task. It uses the current working tree and any user-provided facts to create smaller focused tasks for fresh sessions. Primary takeover is reserved for a remainder that independently meets the normal self-execution threshold; fresh recovery inspects current state instead of replaying the original package.

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
               docs/ & proportional     code changes
               plans/ persistence       (maintainer commits
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

The file structure IS the durable interface. Framework docs persist in `docs/`; work that needs multi-phase or multi-session coordination, explicit planning, or durable tracking persists in `plans/`. A bounded self-contained package may instead go directly to `execute-work-package` with an inline gated brief containing task, DoD, constraints, and final verification. No magic durable state—just explicit files or the approved compact execution session.
