# Claude Desktop Agent Checkpoint

This directory is the dependency-free, MCP-only checkpoint adapter for Claude Desktop. It does not use Claude Code hooks, plugins, project discovery, or transcript parsing.

## Tools

- `checkpoint(workspace_root, session_id, done, next, step_failed=false, close_session=false)` appends a shared-contract checkpoint. Use `close_session=true` only for the conversation's final checkpoint.
- `checkpoint_path(workspace_root, session_id)` returns the encoded workspace-relative JSONL path without writing.

`workspace_root` must be an existing absolute directory. Create one unique, conversation-stable `session_id` and reuse it for every call in that Desktop conversation. If the workspace is unknown, ask the user to select its absolute path; the adapter never invents identity or chooses a filesystem target.

Claude Desktop exposes no defensible checkpoint telemetry or persona/title source. Records therefore persist `context_used`, `agent`, and `session_title` as honest `null` values.

## Installation and restart

Global installation places these files under:

`~/Library/Application Support/Claude/agent-checkpoint/`

It additively registers `mcpServers.agent-checkpoint` in:

`~/Library/Application Support/Claude/claude_desktop_config.json`

After installation, perform a full quit and restart of Claude Desktop. The installer reports this requirement but never terminates the application. MCP startup and protocol diagnostics are written by Claude Desktop to:

`~/Library/Logs/Claude/mcp-server-agent-checkpoint.log`

## Diagnostics and removal

Installation stops without mutation when the Desktop configuration is malformed, `mcpServers.agent-checkpoint` conflicts with the required registration, or the adapter/config destination is a symlink. Resolve the reported conflict or symlink deliberately, then rerun the installer.

To remove only this integration:

1. Remove only `mcpServers.agent-checkpoint` from `claude_desktop_config.json`, preserving every other value and MCP server.
2. Delete only `~/Library/Application Support/Claude/agent-checkpoint/`.
3. Fully quit and restart Claude Desktop.

Direct MCP protocol tests are automated proof of the adapter contract. They are not a substitute for the real Desktop-model E2E, which remains the Phase 2 gate.
