# Contributing to OpenCode Processing Skills

Thank you for your interest in contributing! This project provides skills, agents, and templates for AI coding agents working with [OpenCode](https://github.com/sst/opencode).

## How to Contribute

### Reporting Issues

- Use the [Bug Report](.github/ISSUE_TEMPLATE/bug_report.md) template for bugs
- Use the [Feature Request](.github/ISSUE_TEMPLATE/feature_request.md) template for new ideas
- Check existing issues first to avoid duplicates

### Pull Requests

1. Fork the repository
2. Create a feature branch: `feat/<skill-name>` or `fix/<description>`
3. Make your changes
4. Ensure CI passes locally:
   - `npx markdownlint-cli2 "**/*.md"` — zero errors
   - `./scripts/check-template-sync.sh` — all templates in sync
5. Submit a PR using the [PR template](.github/pull_request_template.md)

### Adding a New Skill

1. Create `skills/<skill-name>/SKILL.md` with YAML frontmatter:

   ```yaml
   ---
   name: <skill-name>
   description: <one-line description>
   license: MIT
   compatibility: opencode
   metadata:
     category: documentation | planning | workflow | review
     phase: <when in the lifecycle>
   ---
   ```

2. Follow the structure of existing skills (see `skills/validate-docs/SKILL.md` as a reference)
3. Include sections: What This Skill Does, When to Use, Execution Model, Workflow, Rules
4. If the skill uses templates, copy them from `templates/` as `tpl-<name>.md`
5. Update `README.md`: skill table, project structure, roadmap
6. Update `install.sh` if needed (new skills are auto-discovered)
7. Run CI checks before submitting

### Modifying Templates

Templates live in `templates/` and are copied into skill directories as `tpl-<name>.md`. When modifying a template:

1. Edit the canonical version in `templates/`
2. Copy to all skill directories that use it
3. Run `./scripts/check-template-sync.sh` to verify all copies match
4. **Never edit a `tpl-*` file directly** — always edit the canonical template first

### Code Style

- **Markdown**: must pass `markdownlint-cli2` with the project's `.markdownlint.yaml` config
- **Shell scripts**: must pass `shellcheck` (if applicable)
- **Commit messages**: use [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `ci:`)
- **Branch names**: `feat/<name>`, `fix/<name>`, `docs/<name>`, `ci/<name>`

## Development Setup

```bash
git clone https://github.com/<your-fork>/opencode-processing-skills.git
cd opencode-processing-skills

# Install skills locally
./install.sh

# Run CI checks
npx markdownlint-cli2 "**/*.md"
./scripts/check-template-sync.sh
```

## Questions?

Open a [Discussion](https://github.com/DasDigitaleMomentum/opencode-processing-skills/discussions) or file an issue.
