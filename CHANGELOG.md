# Changelog

All notable changes to this project will be documented in this file.

## Unreleased

### Added
- **Review skills**: Three new quality gate skills – `review-plan`, `review-implementation-plan`, `review-implementation` – for independent validation at each stage
- **Delegate agent**: New general-purpose subagent for framework-internal delegation (configurable model via config.yaml)
- **Additional delegates**: Support for named delegate variants (e.g., `delegate-review`, `delegate-fast`) with different models via `additional_delegates` config section
- **Testing & Verification Policy**: New maintainer section covering test integrity, inter-phase verification, e2e defaults, and Playwright/PTY capabilities
- **Model configuration**: `config.yaml.example` template for per-agent model selection; install.sh injects models during installation

### Changed
- **Renamed**: `execute-work-packet` → `execute-work-package` (skill directory and all references)
- **Terminology**: "work packet" → "work package" throughout all documentation
- **Maintainer agent**: Rewritten Operating Rules – numbered priorities with clear hierarchy (docs first, ask before assuming, delegate with references, context hygiene via DCP, coding standards reference)
- **Maintainer agent**: New Plan-to-Implementation Lifecycle table (8 steps: CREATE → REVIEW → IMPL PLAN → REVIEW → EXECUTE → REVIEW → UPDATE → HANDOVER)
- **Maintainer agent**: Clear agent routing – doc-explorer for docs/plans only, implementer for code only
- **execute-work-package skill**: Added Coding Standards section (no hardcoded defaults, root cause analysis, minimal changes, preserve patterns, no silent failures, respect dependency boundaries)
- **execute-work-package skill**: Reworked post-processing – three clear paths based on digest outcome (passed/failed/blocked), discourages re-running full test suites in primary session
- **author-and-verify-implementation-plan skill**: Added sequential processing rule to prevent cross-phase drift
- **author-and-verify-implementation-plan skill**: Added consistency check and fix step – agent resolves inconsistencies directly, only surfaces issues requiring user decisions
- **author-and-verify-implementation-plan skill**: Output Contract now requires Test Integrity Constraints subsection

### Fixed
- **README**: Corrected blueprint flow description (sub proposes blueprint, primary reviews – not the other way around)
- **README**: DCP credited as external plugin with link, not presented as built-in feature
- **README**: Fixed duplicate codeblock rendering bug in Planning section
- **README**: "How it fits together" diagram – commit responsibility correctly attributed to maintainer agent

## 0.1.0 – Initial Release

### Added
- 9 skills: `generate-docs`, `update-docs`, `create-plan`, `author-and-verify-implementation-plan`, `resume-plan`, `update-plan`, `generate-handover`, `execute-work-package`, `archive-legacy-docs`
- 4 agents: `maintainer` (primary), `doc-explorer`, `implementer`, `legacy-curator`
- `install.sh` for global installation to `~/.config/opencode/`
- README with workflows, example prompts, and honest framing
- MIT license
