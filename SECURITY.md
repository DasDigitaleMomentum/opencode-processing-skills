# Security Policy

## Scope

This project contains **Markdown-based skill definitions, agent configurations, and templates**. It does not include executable code that runs in production environments. The shell scripts (`install.sh`, `scripts/check-template-sync.sh`) are local development tools only.

## Reporting a Vulnerability

If you discover a security issue, please report it responsibly:

1. **Do NOT open a public issue**
2. Email the maintainer at the address listed in the repository's GitHub profile
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
4. Allow up to 72 hours for an initial response

## Security Considerations

### Skill Execution

Skills are Markdown documents interpreted by AI agents. They instruct agents to run shell commands (e.g., `git log`, `grep`). While the skills themselves are not executable, they influence agent behavior:

- Skills should **never** instruct agents to run destructive commands (e.g., `rm -rf`, `DROP TABLE`)
- Skills should **never** instruct agents to make network requests or install packages
- Skills should **never** instruct agents to read or write files outside the project directory (except `docs/` and `plans/`)
- The `install.sh` script copies files to `~/.config/opencode/` — review before running

### Template Safety

Templates contain placeholder text with `{{variables}}`. These are not dynamically evaluated — they are replaced by the AI agent during document generation. There is no template injection risk.

## Supported Versions

| Version | Supported |
|---------|-----------|
| main branch | Yes |
| Other branches | No |
