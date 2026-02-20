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
- **`execute-work-packet`** skill: gated execution protocol for scoped work packets via preflight + execute digest flow
- **`validate-docs`** skill: git-based documentation staleness detection (~2-3k tokens vs. 20-50k full scan)
- **`smart-start`** skill: intelligent session bootstrap with auto-detection of project state
- **`implement-phase`** skill: execute plan phases step by step with test verification and auto status updates
- **`fix-ci`** skill: diagnose and fix CI pipeline failures with structured root cause analysis
- **`pr-ready`** skill: prepare branch for PR with checks, description, changelog, and labels
- **`add-tests`** skill: generate tests matching project conventions (framework, patterns, style)
- **`test-strategy`** skill: generate test strategy with coverage gap analysis and priority matrix
- **`coverage-check`** skill: lightweight test coverage heuristic via source-to-test file matching
- **`adr-create`** skill: create Architecture Decision Records with context, alternatives, consequences
- **`scaffold`** skill: generate convention-aware boilerplate for new modules and features
- **`refactor`** skill: safe refactoring with test verification before and after, incremental changes
- **`release-notes`** skill: generate structured release notes from git log between tags
- **`ci-setup`** skill: generate production-ready CI pipeline (GitHub Actions) tailored to project stack
- **`dependency-audit`** skill: audit dependencies for staleness, vulnerabilities, and license issues
- **`context-compress`** skill: mid-session context compression to save tokens in long conversations
- **`debug-assist`** skill: structured debugging with hypothesis logging (Reproduce → Isolate → Fix)
- **`onboard-developer`** skill: generate developer onboarding guide (setup, workflows, conventions)
- **Plugin**: `opencode.json` manifest, `Makefile` with developer commands, installer `--uninstall` support
- **`implementer`** subagent: execution-only worker for approved `execute-work-packet` tasks
- CI pipeline with template sync check, markdown lint, and ShellCheck
- `coordinator-plan.md` template for cross-repo plans
- `execution-digest.md`, `implementer-preflight-prompt.md`, `implementer-execute-prompt.md` canonical templates
- `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `CHANGELOG.md`
- `LICENSE` (MIT — DasDigitaleMomentum)
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
  - `engineer`: primary agent for planning, implementation, and maintenance
  - `doc-explorer`: subagent for writing docs and plans
- 8 canonical templates for all entity types
- Global installer (`install.sh`)
