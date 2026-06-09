# Codex install layer

Static artifacts installed by `./install.sh` when the Codex target is enabled.

| Path | Installed to | Purpose |
|------|--------------|---------|
| `AGENTS.snippet.md` | `~/.codex/ops/AGENTS.snippet.md` | Merge into `~/.codex/AGENTS.md` or project `AGENTS.md` |

Workflow skills are **not** duplicated here — `install.sh` already syncs `skills/` to `~/.codex/skills/`, where Codex discovers them natively.

Agent definitions (`agents/*.md`) are not installed: Codex has no subagent tool. The snippet maps the orchestration workflow (docs/plans interface, skill lifecycle, blueprint gate) onto a single Codex session instead.

When `agents/maintainer.md` or `skills/execute-work-package/SKILL.md` change materially, update `AGENTS.snippet.md` manually.
