# Changelog

All notable changes to this project will be documented in this file.

## Unreleased

### Added
- **`delegate-analysis` skill**: Moves routine exploration, targeted reading, web research, and deep-dive expertise out of the delegate persona.
- **`review-fix` skill**: Resumes the same reviewer session for accepted related implementation or implementation-plan findings.

### Changed
- **Canonical delegate persona**: Generated `delegate-*` agents are model aliases of one skill-driven definition rather than separate role definitions.
- **Delegation routing**: Routine analysis uses `delegate`; `delegate-strong` is reserved for independent reviews and genuinely difficult or high-risk work.
- **Delegation threshold**: Bounded low-risk mechanical edits may remain in the primary even when they touch multiple known files.
- **Review workflow**: Review findings now receive stable IDs and same-session remediation preserves the original reviewer context.
- **Review remediation policy**: Same-session `review-fix` is now the preferred path for accepted related findings, including multi-file runtime fixes. New work packages and follow-up reviews require an actual scope/context/decision reason or explicit request; automatic review loops are prohibited.
- **Review discipline**: Maintainers, delegates, Cursor rules, and review skills now share the explicit reminder: “No Gold-Plating. No Adversarial Reviewing. No Scope Creep.” Evidence-backed defects and required related changes remain in scope.

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
