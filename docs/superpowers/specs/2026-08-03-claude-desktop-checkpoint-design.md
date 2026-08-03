# Claude Desktop Checkpoint Integration Design

**Date:** 2026-08-03  
**Target:** Claude Desktop 1.24012.9 (`03c61d`) on macOS  
**Status:** User-approved architecture; written-spec review pending

## Goal

Add a real Claude Desktop checkpoint integration beside the existing Claude Code plugin. A Claude Desktop model call must invoke the local `agent-checkpoint` MCP server and append a valid shared-contract JSONL checkpoint beneath an explicitly selected workspace. The global installer must install and register the adapter additively without disturbing other Claude Desktop or Claude Code configuration.

## Scope

The adapter is deliberately MCP-only because Claude Desktop does not expose the Claude Code hook, plugin, or `CLAUDE_PROJECT_DIR` surfaces. Only the Desktop adapter therefore receives `workspace_root` and `session_id` as explicit tool inputs.

In scope:

- a dependency-free stdio MCP server dedicated to Claude Desktop;
- `checkpoint` and `checkpoint_path` tools using the existing shared checkpoint core;
- additive, atomic registration in Claude Desktop's macOS configuration;
- focused tests, installer isolation tests, documentation, global installation, and a real Desktop-model E2E;
- the existing watcher and inspection path, unchanged.

Out of scope:

- DXT/MCPB packaging, extension-directory publication, daemons, remote MCP, OAuth, or a marketplace;
- synthetic conversation discovery, transcript parsing, or undocumented Claude internals;
- context telemetry that Claude Desktop cannot source defensibly;
- changes to OpenCode, Codex, Claude Code, Hermes, or the shared JSONL contract except regression fixes required by this adapter.

## Architecture

Create a separate `claude-desktop/agent-checkpoint/` adapter rather than weakening the Claude Code server's hook-injected identity boundary. It contains a small stdio server/runtime and reuses an installed copy of `packages/checkpoint-core/src/index.js`.

The public tools are:

- `checkpoint(workspace_root, session_id, done, next, step_failed=false, close_session=false)`
- `checkpoint_path(workspace_root, session_id)`

`workspace_root` must be an existing absolute directory. `session_id`, `done`, and `next` must be non-empty strings; booleans are strict. The server never invents identity or chooses a filesystem target. Its MCP initialization instructions and tool descriptions direct Claude to create one unique session ID for a conversation, reuse it for that conversation, and ask for an absolute workspace when none is known.

Desktop records keep `context_used`, `agent`, and `session_title` as honest `null` values. Successful checkpoints preserve the existing open/checkpoint/optional-close lifecycle and shared eight-field record contract. A final checkpoint uses `close_session=true`.

## Installation and Configuration

In global mode, the installer detects the macOS Claude Desktop configuration independently of Claude Code. It installs the adapter under:

`~/Library/Application Support/Claude/agent-checkpoint/`

It then adds exactly one entry to:

`~/Library/Application Support/Claude/claude_desktop_config.json`

The key is `mcpServers.agent-checkpoint`; its command and server argument are absolute paths. Existing top-level keys and all other MCP servers remain semantically unchanged.

The configuration update is fail-closed:

- malformed or non-object JSON stops before mutation;
- an absent `mcpServers` object is created;
- an identical existing entry is an idempotent no-op;
- a conflicting `agent-checkpoint` entry stops with manual-resolution guidance;
- a temporary sibling file is validated and atomically renamed over the original;
- symlinked adapter destinations or configuration files are preserved and reported rather than followed.

The installer does not terminate Claude Desktop. It reports that a full quit and restart is required. Claude Code's files and activation remain unchanged.

## Data Flow

1. Claude Desktop starts the configured local stdio server.
2. MCP initialization exposes the two tools and the Desktop-specific identity/workspace instructions.
3. Claude calls `checkpoint` with the conversation's stable ID and absolute workspace.
4. The adapter validates the public inputs and delegates the write to the shared checkpoint core.
5. The core appends the lifecycle and checkpoint records to `.agent-checkpoints/<encoded-session-id>.jsonl`.
6. The tool returns the session ID, workspace-relative path, and checkpoint result; the unchanged watcher observes the file.

Invalid inputs and filesystem errors return MCP tool errors and do not report success. Diagnostic messages go only to stderr so they cannot corrupt stdio JSON-RPC.

## Verification

Automated proof must cover:

- MCP initialization, advertised instructions, tool schemas, protocol round trips, strict validation, lifecycle writes, path lookup, and honest-null metadata;
- additive and idempotent installer behavior with temporary Claude Desktop homes;
- preservation of pre-existing configuration values and other MCP entries;
- malformed JSON, conflicting key, symlink, missing Node, and project-mode negative paths;
- the existing full Node, Hermes, shell-syntax, scriptc build, and native watcher gates.

The completion gate additionally requires a real live E2E on Claude Desktop 1.24012.9 (`03c61d`):

1. install the adapter into the real Claude Desktop configuration;
2. fully restart Claude Desktop;
3. verify the server connects without MCP log errors;
4. send a prompt through the actual Desktop UI that makes the real model call `checkpoint` for a disposable workspace and close the session;
5. verify the resulting JSONL contains the expected checkpoint and `closed` status;
6. verify `checkpoint-watch` displays that real record.

A direct MCP round trip, Claude Code run, mocked UI, or synthetic JSONL file is not a substitute for this Desktop-model E2E. If macOS or Claude requires a user permission click, that explicit approval is the only allowed manual boundary.

## Documentation and Delivery

Update the installation guide, checkpoint harness matrix, configuration example, and a focused Claude Desktop README. Install all enabled agent targets again after the regression gate. Commit and push the implementation to `feature/agent-checkpoint-heartbeat`; do not create a new branch or PR.
