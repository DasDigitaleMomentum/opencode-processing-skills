# Changelog

All notable changes to this project will be documented in this file.

## 0.5.6 — 2026-08-03

### Changed
- **Input-only capacity feedback**: Supported adapters now report input usage against a common 372k operational limit, input K-tokens, and remaining input K-tokens with explicit previous-step/latest-snapshot lag semantics. The existing `context_used` JSON key now carries this input fraction; older logs may retain its previous context-fraction meaning.
- **Input-budget guidance**: Across providers, approximately 220k input tokens are a soft planning signal; at or above approximately 272k, agents stop expanding work and use the remaining budget for a coherent checkpointed digest or handoff. The 372k rejection boundary is emergency headroom rather than a working target.
- **Proportional cadence**: Implementers checkpoint after approved Blueprint steps or bounded parts of large steps, while Delegates checkpoint after bounded investigation, synthesis, or artifact units.
- **Advisory package sizing**: Blueprints may include a concise optional Package Sizing Note, but only the Maintainer may approve the full package or issue a smaller fresh package.

### Fixed
- **Interrupted digest recovery**: Maintainers now resolve `checkpoint_path(task_id)`, inspect the selected log and current tree, map progress to the approved Blueprint or original delegated objective, and issue a smaller fresh task instead of resuming a bloated session.
- **OpenCode cached-input accounting**: Input usage now sums uncached input, cache-read input, and cache-write input before applying the 372k operational limit; output and reasoning remain excluded.
- **Claude statusline input path**: The wrapper now reads the documented `context_window.total_input_tokens` value, which already includes cache reads and writes, instead of an absent top-level field.
- **Native watcher verification**: Global installation now rejects a scriptc-built watcher unless real 80- and 120-column PTY smokes prove raw-key handling, Ctrl-C cleanup, cursor restoration, and exact terminal-flag restoration; the installed Node watcher remains the fail-closed fallback.
- **Codex Desktop checkpoints**: The generated layered profile explicitly approves only `checkpoint` and `checkpoint_path`, preventing Codex Desktop 26.727.51351 from cancelling unattended heartbeat calls, and prints the Desktop/current-runtime `-p` activation alongside the pinned CLI `--profile-v2` form.
- **Hermes 0.19.1 verification**: The pinned Hermes gate and documentation now match the locally installed v0.19.1 runtime proven by the real plugin/tool/lifecycle E2E.

## 0.5.5 — 2026-08-02

### Changed
- **Smallest-sufficient planning**: Plan scope and the minimum necessary phase set are confirmed before artifact creation; authors prefer direct reuse, justify present need for new foundations/abstractions, and perform one bounded deletion pass.
- **Exception-based scope reviews**: Plan and implementation-plan reviews check for both gaps and unnecessary work but persist only evidence-backed exceptions, without clean-item matrices or formal completeness certification.
- **Compact reduction digests**: Reviews report verdict, reduction-required status, severity counts, actionable findings, and the next decision without mandatory before/after bookkeeping.
- **Bounded remediation gate**: Once an optional review is invoked, blocking scope findings must be applied or explicitly rejected before progression. Plan reductions use one `update-plan` pass; implementation-plan reductions use one `review-fix` pass; automatic re-review loops remain prohibited.
- **On-demand planning artifacts**: Empty implementation and handover directories and unresolved todo links are no longer scaffolded during plan creation.

## 0.5.4 — 2026-07-26

### Fixed
- **Aborted delegate recovery**: A subagent abort without a usable digest now triggers smaller fresh delegations instead of resuming a bloated session or moving the remaining task into the primary context.

## 0.5.3 — 2026-07-26

### Changed
- **Proportional work packages**: Bounded single-work-package changes can proceed directly through an inline gated Blueprint instead of requiring a persistent plan.
- **Context-aware session reuse**: Reviewer and implementer sessions are resumed only when retained reasoning outweighs accumulated context; self-contained follow-ups prefer lean sessions.
- **Staged verification**: Iterative fixes use targeted tests, with the approved broad verification reserved for the final gate and rerun only after targeted failures pass.
- **Batch implementation-plan review**: Multiple phase plans default to one fresh reviewer session that reviews sequentially, reuses shared evidence, writes per-phase artifacts, and performs one integrated cross-phase consistency assessment.

## 0.5.2 — 2026-07-24

### Changed
- **Bulk evidence handling**: Large uncurated logs, verbose command output, generated dumps, and mass-grep results are spooled or routed to the retriever instead of being ingested into the owning agent's working context.
- **Retriever evidence assembly**: The retriever may consume complete raw artifacts and assemble coherent multi-file evidence with referenced synthesis.

## 0.5.1 — 2026-07-21

### Fixed
- **Planning workflow**: Plans now preserve problem context, target outcomes, and binding constraints; implementation steps trace back to gated scope, blocking decisions remain explicit, and proportional reviews no longer turn plan gaps into gold-plated policy, security, or testing work.

## 0.5.0 — 2026-07-13

### Added
- **`delegate-analysis` skill**: Moves routine exploration, targeted reading, web research, and deep-dive expertise out of the delegate persona.
- **`review-fix` skill**: Resumes the same reviewer session for accepted related implementation or implementation-plan findings.
- **Cursor target**: Installer support, orchestrator skills, subagent mapping, and project-local rules for using the workflows in Cursor.
- **GPT-5.6 model configuration**: Example routing for Sol as the core maintainer, delegate, and implementer model, with Luna and alternative-provider aliases for focused work.

### Changed
- **Canonical delegate persona**: Generated `delegate-*` agents are model aliases of one skill-driven definition rather than separate role definitions.
- **Delegation routing**: Routine analysis uses `delegate`; `delegate-strong` is reserved for independent reviews and genuinely difficult or high-risk work.
- **Delegation threshold**: Bounded low-risk mechanical edits may remain in the primary even when they touch multiple known files.
- **Review workflow**: Review findings now receive stable IDs and same-session remediation preserves the original reviewer context.
- **Review remediation policy**: Same-session `review-fix` is now the preferred path for accepted related findings, including multi-file runtime fixes. New work packages and follow-up reviews require an actual scope/context/decision reason or explicit request; automatic review loops are prohibited.
- **Review discipline**: Maintainers, delegates, Cursor rules, and review skills now share the explicit reminder: “No Gold-Plating. No Adversarial Reviewing. No Scope Creep.” Evidence-backed defects and required related changes remain in scope.
- **README story**: Documents the project's evolution from DCP-assisted frontier-model usage to fresh-context subagent orchestration and the GPT-5.6 family.
- **DCP positioning**: Dynamic Context Pruning is now an optional companion rather than a workflow expectation.

### Fixed
- **macOS installer**: Restored compatibility with BSD `sed`.

## 0.2.0 — 2026-06-04

### Added
- **Review skills**: Three new quality gate skills – `review-plan`, `review-implementation-plan`, `review-implementation` – for independent validation at each stage
- **Delegate agent**: New general-purpose subagent for framework-internal delegation (configurable model via config.yaml)
- **Additional delegates**: Support for named delegate variants (e.g., `delegate-fast`, `delegate-strong`) with different models via `additional_delegates` config section
- **Additional implementers**: Support for named implementer variants (e.g., `implementer-fast`) with different models via `additional_implementers` config section — same pattern as additional_delegates
- **Agent options injection**: Per-agent model parameters (`reasoningEffort`, `temperature`, `top_p`, `maxTokens`) via object syntax in `additional_*` config sections, injected into agent frontmatter as an `options:` block — routed to OpenCode provider options
- **`maintainer-direct` agent**: Non-interactive maintainer variant for environments without the `question` tool. Asks only for genuine choice decisions, ends turns with status statements
- **`install.sh --project`**: Local installation flag that installs into `./.opencode/` instead of the global config directory, for per-project versioning and CI reproducibility
- **Delegation anti-patterns**: Concrete "wrong → right" table in maintainer Operating Rules, covering exploration, multi-file edits, bug investigation, and research
- **Testing & Verification Policy**: New maintainer section covering test integrity, inter-phase verification, e2e defaults, and Playwright/PTY capabilities
- **Model configuration**: `config.yaml.example` template for per-agent model selection; install.sh injects models during installation

### Changed
- **Renamed**: `execute-work-packet` → `execute-work-package` (skill directory and all references)
- **Terminology**: "work packet" → "work package" throughout all documentation
- **Maintainer agent**: Rewritten Operating Rules – numbered priorities with clear hierarchy (docs first, ask before assuming, delegate with references, context hygiene via DCP, coding standards reference)
- **Maintainer agent**: New Plan-to-Implementation Lifecycle table (8 steps: CREATE → REVIEW → IMPL PLAN → REVIEW → EXECUTE → REVIEW → UPDATE → HANDOVER)
- **Maintainer agent**: Clear agent routing – doc-explorer for docs/plans only, implementer for code only
- **Maintainer agent**: Delegation rules sharpened — "default to delegation" culture, context-as-budget rule, Blueprint-as-default for all non-trivial edits (single trivial edit → self; everything else → implementer)
- **Maintainer agent**: Both maintainers include `implementer-fast` in agent routing
- **execute-work-package skill**: Added Coding Standards section (no hardcoded defaults, root cause analysis, minimal changes, preserve patterns, no silent failures, respect dependency boundaries)
- **execute-work-package skill**: Reworked post-processing – three clear paths based on digest outcome (passed/failed/blocked), discourages re-running full test suites in primary session
- **author-and-verify-implementation-plan skill**: Added sequential processing rule to prevent cross-phase drift
- **author-and-verify-implementation-plan skill**: Added consistency check and fix step – agent resolves inconsistencies directly, only surfaces issues requiring user decisions
- **author-and-verify-implementation-plan skill**: Output Contract now requires Test Integrity Constraints subsection
- **config.yaml.example**: Reworked — removed github-copilot references, uses openai/deepseek/anthropic/alibaba providers, documents object syntax with options, adds DeepSeek and qwen3.7-max examples

### Fixed
- **README**: Corrected blueprint flow description (sub proposes blueprint, primary reviews – not the other way around)
- **README**: DCP credited as external plugin with link, not presented as built-in feature
- **README**: Fixed duplicate codeblock rendering bug in Planning section
- **README**: "How it fits together" diagram – commit responsibility correctly attributed to maintainer agent

## 0.1.0 — Initial Release

### Added
- 9 skills: `generate-docs`, `update-docs`, `create-plan`, `author-and-verify-implementation-plan`, `resume-plan`, `update-plan`, `generate-handover`, `execute-work-package`, `archive-legacy-docs`
- 4 agents: `maintainer` (primary), `doc-explorer`, `implementer`, `legacy-curator`
- `install.sh` for global installation to `~/.config/opencode/`
- README with workflows, example prompts, and honest framing
- MIT license
