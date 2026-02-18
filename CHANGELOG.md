# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- **`generate-agents-md`** skill: generates project-specific AGENTS.md from config files and codebase conventions
- **`diff-review`** skill: structured code review with impact assessment, risk matrix, and documentation impact analysis
- **`retrospective`** skill: reconstructs ADRs, module timelines, and pattern evolution from git history
- **`analyze-impact`** skill: pre-implementation impact analysis for plan phases (dependencies, breaking changes, test gaps)
- **`cross-repo-plan`** skill: multi-repository plan coordination with dependency tracking and coordinator-plan template
- **`validate-docs`** skill: git-based documentation staleness detection (~2-3k tokens vs. 20-50k full scan)
- **`smart-start`** skill: intelligent session bootstrap with auto-detection of project state
- **Plugin**: `opencode.json` manifest, `Makefile` with developer commands, installer `--uninstall` support
- CI pipeline with template sync check, markdown lint, and ShellCheck
- `coordinator-plan.md` template for cross-repo plans
- `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `CHANGELOG.md`
- `LICENSE` (MIT — Martin Klein)
- `.gitignore`, `.editorconfig`, `.markdownlint-cli2.jsonc`
- GitHub issue templates (bug report, feature request)
- GitHub PR template
- `CODEOWNERS` file

## [1.0.0] - 2025-02-18

### Added

- Initial release with 8 core skills:
  - `generate-docs`: project, module, and feature documentation generation
  - `update-docs`: targeted documentation updates after code changes
  - `create-plan`: structured implementation plans with phases and todos
  - `update-plan`: plan status tracking and phase transitions
  - `resume-plan`: session bootstrap for plan continuation
  - `generate-handover`: session handover document generation
- Agent definitions:
  - `maintainer`: primary agent for documentation and planning workflows
  - `doc-explorer`: subagent for writing docs and plans
- 8 canonical templates for all entity types
- Global installer (`install.sh`)
