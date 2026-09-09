# Cursor install layer

Static artifacts installed by `./install.sh` when the Cursor target is enabled.

| Path | Installed to | Purpose |
|------|--------------|---------|
| `skills/ops-orchestrator/` | `~/.cursor/skills/` or `.cursor/skills/` | Orchestration skill (report-first; asks only at genuine choices) |
| `task-delegation.md` | copied into the orchestrator skill dir | Task tool routing reference |
| `AGENTS.snippet.md` | `~/.cursor/ops/` or `.cursor/ops/` | Merge into project `AGENTS.md` |
| `tpl-orchestrator.mdc` | `.cursor/rules/` (project mode only) | Optional planning trigger rule |

Subagent personas are **not** duplicated here — `install.sh` copies `agents/{delegate,doc-explorer,implementer,legacy-curator}.md` to `subagents/` with frontmatter stripped, keeping personas in sync with OpenCode agents.

When `agents/maintainer.md` changes materially, update `cursor/skills/ops-orchestrator/SKILL.md` manually.
