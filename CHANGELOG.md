# Changelog

All notable changes to this project will be documented in this file.

## Unreleased

### Changed
- **Maintainer agent**: Rewritten Operating Rules – numbered priorities with clear hierarchy (docs first, ask before assuming, delegate with references, context hygiene via DCP, coding standards reference)
- **execute-work-package skill**: Added Coding Standards section (no hardcoded defaults, root cause analysis, minimal changes, preserve patterns, no silent failures, respect dependency boundaries)
- **execute-work-package skill**: Reworked post-processing – three clear paths based on digest outcome (passed/failed/blocked), discourages re-running full test suites in primary session
- **author-and-verify-implementation-plan skill**: Added sequential processing rule to prevent cross-phase drift
- **author-and-verify-implementation-plan skill**: Added consistency check and fix step – agent resolves inconsistencies directly, only surfaces issues requiring user decisions

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
