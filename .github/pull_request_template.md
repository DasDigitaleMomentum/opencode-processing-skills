## Summary

<!-- Brief description of what this PR does -->

## Type of Change

- [ ] New skill
- [ ] Skill improvement
- [ ] Agent change
- [ ] Template change
- [ ] CI/infrastructure
- [ ] Documentation
- [ ] Bug fix

## Changes

<!-- List the key changes -->

## CI Checklist

- [ ] `npx markdownlint-cli2 "**/*.md"` — 0 errors
- [ ] `./scripts/check-template-sync.sh` — all in sync
- [ ] README updated (if adding/changing skills)
- [ ] CHANGELOG updated

## For New Skills

- [ ] SKILL.md follows the standard structure (What, When, Execution Model, Workflow, Rules)
- [ ] Frontmatter includes name, description, license, compatibility, metadata
- [ ] Execution model documented (primary vs. subagent, with rationale)
- [ ] Token budget estimated
- [ ] Integration with existing skills documented
- [ ] Added to README skill table and project structure
