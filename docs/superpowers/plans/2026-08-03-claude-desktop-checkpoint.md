# Claude Desktop Checkpoint Integration Implementation Plan

> **For agentic workers:** Execute this plan task-by-task with TDD. Keep branch and commit names neutral; do not add agent, tool, or workflow prefixes.

**Goal:** Install an additive local MCP adapter that lets the real Claude Desktop 1.24012.9 (`03c61d`) model write shared-contract checkpoints into an explicit workspace.

**Architecture:** A dedicated dependency-free stdio runtime accepts public `workspace_root` and `session_id` inputs because Claude Desktop has no Claude Code hooks. A small Node configuration helper atomically adds one MCP server entry to the Desktop JSON file; the existing Claude Code plugin and shared core remain unchanged.

**Tech Stack:** Node.js ESM and `node:test`, Bash installer, JSON-RPC/MCP over stdio, macOS Claude Desktop configuration, existing checkpoint core and native watcher.

## Global Constraints

- Target Claude Desktop 1.24012.9 (`03c61d`) on macOS.
- Use only documented local stdio MCP configuration; no DXT/MCPB, daemon, remote MCP, OAuth, marketplace, transcript parsing, or undocumented Claude internals.
- Keep `context_used`, `agent`, and `session_title` exactly `null` for Desktop records.
- Never weaken the Claude Code hook-injected identity boundary or change the shared JSONL contract.
- Treat direct MCP round trips, Claude Code, mocked UI, and synthetic JSONL as supporting evidence only; completion requires a real Desktop-model tool call.
- Preserve unrelated Desktop configuration semantically and fail closed on malformed JSON, conflicting keys, or symlinks.
- Keep all branch and commit names free of agent, tool, and workflow prefixes.

---

## File Map

- Create `claude-desktop/agent-checkpoint/checkpoint-mcp-runtime.mjs`: Desktop-only tool schemas, validation, MCP instructions, and shared-core calls.
- Create `claude-desktop/agent-checkpoint/checkpoint-mcp-server.mjs`: serialized newline-delimited JSON-RPC stdio entrypoint.
- Create `claude-desktop/agent-checkpoint/configure-desktop.mjs`: validate, plan, and atomically merge the one Desktop MCP entry.
- Create `claude-desktop/agent-checkpoint/README.md`: behavior, activation, limitations, logs, and removal.
- Create `claude-desktop/test/checkpoint-claude-desktop.test.mjs`: runtime, protocol, installer, and negative-path regression suite.
- Modify `install.sh`: independent Desktop detection, adapter installation, preflight, registration, and summary.
- Modify `config.yaml.example`: independent `claude_desktop` target and environment-variable documentation.
- Modify `docs/installation.md`: Desktop paths, restart, logs, and uninstall guidance.
- Modify `docs/agent-checkpoint-heartbeat.md`: Desktop harness row and honest capability limits.
- Modify `README.md` and `CHANGELOG.md`: concise target/verification update.
- Modify `docs/superpowers/specs/2026-08-03-claude-desktop-checkpoint-design.md`: mark implementation status without altering the approved design.

### Task 1: Desktop MCP runtime and protocol server

**Files:**
- Create: `claude-desktop/agent-checkpoint/checkpoint-mcp-runtime.mjs`
- Create: `claude-desktop/agent-checkpoint/checkpoint-mcp-server.mjs`
- Create: `claude-desktop/test/checkpoint-claude-desktop.test.mjs`

**Interfaces:**
- Consumes: `checkpointCore.checkpoint(options): Promise<feedback>` and `checkpointCore.checkpointPath(sessionId): string`.
- Produces: `createMcpRuntime({ checkpointCore, serverName?, serverVersion? })` with `listTools()`, `callTool(name, args)`, and `handleMessage(message)`.
- Produces tools `checkpoint(workspace_root, session_id, done, next, step_failed?, close_session?)` and `checkpoint_path(workspace_root, session_id)`.

- [ ] **Step 1: Write failing schema, instruction, validation, lifecycle, and protocol tests**

Add tests that construct the runtime with the real shared core and assert:

```js
const initialized = await runtime.handleMessage({
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: { protocolVersion: "2024-11-05" },
});
assert.match(initialized.result.instructions, /one unique session_id per conversation/i);

const listed = await runtime.handleMessage({ jsonrpc: "2.0", id: 2, method: "tools/list" });
assert.deepEqual(listed.result.tools.map(({ name }) => name), ["checkpoint", "checkpoint_path"]);
assert.deepEqual(listed.result.tools[0].inputSchema.required,
  ["workspace_root", "session_id", "done", "next"]);
```

Use `mkdtemp()` for a real workspace. Assert relative/nonexistent `workspace_root`, blank strings, non-boolean flags, and unknown tools return `isError: true` without creating `.agent-checkpoints`. Assert a valid final call creates exactly open/checkpoint/closed records whose checkpoint has null Desktop metadata.

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
node --test claude-desktop/test/checkpoint-claude-desktop.test.mjs
```

Expected: FAIL because the Desktop runtime/server files do not exist.

- [ ] **Step 3: Implement the minimal runtime**

Use these exact public schemas and initialization instruction:

```js
const DESKTOP_INSTRUCTIONS =
  "For checkpoint tools, create one unique non-empty session_id per conversation and reuse it for every call in that conversation. Pass the existing absolute workspace_root explicitly; ask the user when it is unknown. Use exactly three words for done and next, reuse the previous next as the following done, and set close_session=true only for the final checkpoint.";

function checkpointToolSchema() {
  return {
    name: "checkpoint",
    description: DESKTOP_INSTRUCTIONS,
    inputSchema: {
      type: "object",
      properties: {
        workspace_root: { type: "string", description: "Existing absolute workspace directory." },
        session_id: { type: "string", description: "Conversation-stable ID created and reused by Claude." },
        done: { type: "string" },
        next: { type: "string" },
        step_failed: { type: "boolean", default: false },
        close_session: { type: "boolean", default: false },
      },
      required: ["workspace_root", "session_id", "done", "next"],
    },
  };
}
```

Validate `path.isAbsolute(workspaceRoot)`, `stat(workspaceRoot).isDirectory()`, all required non-empty strings, and strict booleans before calling:

```js
await checkpointCore.checkpoint({
  workspaceRoot,
  sessionId,
  done,
  next,
  stepFailed: args.step_failed === true,
  closeSession: args.close_session,
  contextUsed: null,
  agent: null,
  sessionTitle: null,
  usedKTokens: null,
  remainingKTokens: null,
});
```

`checkpoint_path` validates the same workspace and returns `checkpointCore.checkpointPath(sessionId)` without writing. Include `instructions: DESKTOP_INSTRUCTIONS` in the initialize result.

- [ ] **Step 4: Implement the serialized stdio entrypoint**

Follow the existing server queue contract exactly: `readline.createInterface({ input: process.stdin, terminal: false })`, chain each parsed line through one promise queue, write only JSON-RPC to stdout, diagnostics to stderr, and exit only after the queue settles on stdin close.

- [ ] **Step 5: Run the focused suite and verify GREEN**

Run the same command. Expected: all Desktop runtime/protocol tests pass with zero skips.

- [ ] **Step 6: Commit the runtime slice**

```bash
git add claude-desktop/agent-checkpoint/checkpoint-mcp-runtime.mjs \
  claude-desktop/agent-checkpoint/checkpoint-mcp-server.mjs \
  claude-desktop/test/checkpoint-claude-desktop.test.mjs
git commit -m "feat: add Claude Desktop checkpoint server"
```

### Task 2: Additive Desktop configuration and installer

**Files:**
- Create: `claude-desktop/agent-checkpoint/configure-desktop.mjs`
- Modify: `claude-desktop/test/checkpoint-claude-desktop.test.mjs`
- Modify: `install.sh`
- Modify: `config.yaml.example`

**Interfaces:**
- Produces CLI: `node configure-desktop.mjs --check|--write <config> <node-bin> <server-path>`.
- Produces environment overrides: `OPS_CLAUDE_DESKTOP_HOME` and `OPS_SYNC_CLAUDE_DESKTOP`.
- Produces installer function: `install_claude_desktop_checkpoint "$CLAUDE_DESKTOP_HOME"`.

- [ ] **Step 1: Write failing configuration-helper tests**

Test exported `planDesktopConfig(current, desired)` and the CLI with temporary files. Required cases:

```js
assert.deepEqual(
  planDesktopConfig({ preferences: { theme: "dark" } }, desired).next,
  { preferences: { theme: "dark" }, mcpServers: { "agent-checkpoint": desired } },
);
```

Also assert identical entry is `unchanged`, other MCP entries survive, conflicting `agent-checkpoint` throws, arrays/null/non-object roots throw, non-object `mcpServers` throws, `--check` never changes bytes, and `--write` produces parseable JSON through sibling-temp rename.

- [ ] **Step 2: Run the focused helper tests and verify RED**

Run the Desktop test file. Expected: FAIL because `configure-desktop.mjs` does not exist.

- [ ] **Step 3: Implement the minimal helper**

Use plain-object validation and exact desired entry:

```js
const desired = { command: nodeBin, args: [serverPath] };
```

Compare existing values by deterministic JSON serialization. `--check` parses and plans only. `--write` writes `${configPath}.${process.pid}.tmp`, parses the staged bytes again, applies the original mode when the file existed, then `rename()`s it. Remove only that temp file on error. Print only `changed` or `unchanged` to stdout.

- [ ] **Step 4: Write failing isolated-installer tests**

Invoke `install.sh` with temporary OpenCode/Claude/Claude-Desktop homes and `OPS_SYNC_*` overrides. Assert:

```js
assert.deepEqual(after.preferences, before.preferences);
assert.deepEqual(after.mcpServers.existing, before.mcpServers.existing);
assert.deepEqual(after.mcpServers["agent-checkpoint"], {
  command: process.execPath,
  args: [path.join(desktopHome, "agent-checkpoint", "checkpoint-mcp-server.mjs")],
});
```

Snapshot config bytes around failed malformed/conflict/symlink runs and assert no adapter files were installed. Verify a second successful run is idempotent. Verify `--project` never touches Desktop. Verify disabling Desktop skips all Desktop artifacts while Claude Code can remain enabled.

- [ ] **Step 5: Run installer tests and verify RED**

Run the Desktop suite. Expected: the new installer cases fail because Desktop detection and installation are absent.

- [ ] **Step 6: Implement independent target detection and preflight**

Add default home `$HOME/Library/Application Support/Claude`, YAML target `claude_desktop`, and the two overrides. In auto mode enable only when that directory exists. Before copying anything, require absolute `node`, reject symlinked config/adapter destinations, and run the helper's `--check` mode.

- [ ] **Step 7: Install and register the adapter**

Copy runtime, server, config helper, and shared core into `$CLAUDE_DESKTOP_HOME/agent-checkpoint/`; keep executable mode on the server/helper. Then call helper `--write` with absolute Node and installed server paths. Global mode only. Add a summary that says full quit/restart is required and points to `$HOME/Library/Logs/Claude/mcp-server-agent-checkpoint.log`.

- [ ] **Step 8: Run focused tests and shell syntax; verify GREEN**

```bash
node --test claude-desktop/test/checkpoint-claude-desktop.test.mjs
bash -n install.sh
```

Expected: all Desktop tests pass, zero skips; shell syntax exits 0.

- [ ] **Step 9: Commit the installer slice**

```bash
git add claude-desktop/agent-checkpoint/configure-desktop.mjs \
  claude-desktop/test/checkpoint-claude-desktop.test.mjs install.sh config.yaml.example
git commit -m "feat: install Claude Desktop checkpoint adapter"
```

### Task 3: Documentation and complete automated regression

**Files:**
- Create: `claude-desktop/agent-checkpoint/README.md`
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify: `docs/installation.md`
- Modify: `docs/agent-checkpoint-heartbeat.md`
- Modify: `docs/superpowers/specs/2026-08-03-claude-desktop-checkpoint-design.md`
- Modify: `claude-desktop/test/checkpoint-claude-desktop.test.mjs`

**Interfaces:**
- Documents exact public tool inputs, null telemetry, restart/log paths, removal, and the difference from Claude Code.

- [ ] **Step 1: Write failing documentation assertions**

Extend the Desktop test to require the docs to contain `Claude Desktop 1.24012.9`, `workspace_root`, `session_id`, `claude_desktop_config.json`, `mcp-server-agent-checkpoint.log`, and an explicit statement that Claude Code hooks are not used by this adapter.

- [ ] **Step 2: Run the focused test and verify RED**

Expected: FAIL on missing Desktop documentation.

- [ ] **Step 3: Write the minimal documentation**

Document:

```text
Claude Desktop is a separate MCP-only target. It requires an explicit absolute
workspace_root and one conversation-stable session_id. Desktop telemetry fields
remain null. Fully quit and restart Claude Desktop after installation.
```

Include exact installed/config/log paths, tool signatures, conflict behavior, uninstall steps (remove only the `agent-checkpoint` key and adapter directory), and the real-E2E requirement. Mark the approved design status `implemented; live verification pending` until Task 4 passes.

- [ ] **Step 4: Run focused docs tests and verify GREEN**

Run the Desktop suite. Expected: all tests pass.

- [ ] **Step 5: Run the full automated gate**

```bash
node --test packages/checkpoint-core/test/*.test.js opencode/test/*.test.mjs \
  codex/test/*.test.mjs claude/test/*.test.mjs claude-desktop/test/*.test.mjs
python3 -m unittest discover -s hermes/test
bash -n install.sh
```

Run the native watcher gate exactly:

```bash
bash -c 'set -euo pipefail; stage="$(mktemp -d "${TMPDIR:-/tmp}/checkpoint-watch-verify.XXXXXX")"; trap '\''rm -rf "$stage"'\'' EXIT; mkdir -p "$stage/bin" "$stage/src" "$stage/workspace/.agent-checkpoints" "$stage/native-live"; cp packages/checkpoint-core/bin/checkpoint-watch.js "$stage/bin/checkpoint-watch.js"; cp packages/checkpoint-core/src/index.js "$stage/src/index.js"; scriptc coverage "$stage/bin/checkpoint-watch.js" >"$stage/coverage.txt" 2>&1; ! grep -q "SC2002" "$stage/coverage.txt"; ! grep -Eq "Number of unknown values.*SC2020|SC2020.*Number of unknown values" "$stage/coverage.txt"; scriptc build "$stage/bin/checkpoint-watch.js" -o "$stage/checkpoint-watch" --no-keep-c; test -x "$stage/checkpoint-watch"; "$stage/checkpoint-watch" --help >"$stage/help.txt"; grep -q "Usage: checkpoint-watch" "$stage/help.txt"; (cd "$stage/workspace" && ../checkpoint-watch --once >"$stage/once.txt"); grep -q "Checkpoint sessions" "$stage/once.txt"; python3 packages/checkpoint-core/test/native-checkpoint-watch-smoke.py "$stage/checkpoint-watch" "$stage/native-live"'
```

Expected: zero failures/skips in required suites; scriptc produces an executable whose native PTY smoke passes. Confirm `file "$stage/checkpoint-watch"` reports ARM64 in the retained live installation check because this disposable command removes its stage on exit.

- [ ] **Step 6: Commit the documented automated slice**

```bash
git add README.md CHANGELOG.md docs/installation.md docs/agent-checkpoint-heartbeat.md \
  docs/superpowers/specs/2026-08-03-claude-desktop-checkpoint-design.md \
  claude-desktop/agent-checkpoint/README.md claude-desktop/test/checkpoint-claude-desktop.test.mjs
git commit -m "docs: document Claude Desktop checkpoints"
```

### Task 4: Real installation and Claude Desktop model E2E

**Files:**
- Modify real installation: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Install real adapter: `~/Library/Application Support/Claude/agent-checkpoint/`
- Create disposable evidence workspace under the OS temporary directory.
- Modify: `docs/superpowers/specs/2026-08-03-claude-desktop-checkpoint-design.md`

**Interfaces:**
- Consumes the real Claude Desktop app, installed MCP server, app MCP logs, and native watcher.
- Produces one real model-authored closed checkpoint JSONL log.

- [ ] **Step 1: Re-read and snapshot safe real state**

Confirm app bundle version/build, list only config top-level keys and MCP server names, ensure the worktree is clean except understood plan changes, and create a disposable workspace with `.agent-checkpoints/` absent.

- [ ] **Step 2: Run the global installer for every enabled agent target**

Run `./install.sh` with the repository's current configuration. Verify installed adapter bytes equal source bytes and `mcpServers.agent-checkpoint` contains the absolute Node/server paths. Do not print unrelated config values or secrets.

- [ ] **Step 3: Fully restart Claude Desktop and inspect MCP logs**

Quit and relaunch `/Applications/Claude.app` using the sanctioned macOS UI-control path. Confirm a fresh `mcp-server-agent-checkpoint.log` contains no startup/protocol error and the tool appears in the Desktop connectors UI.

- [ ] **Step 4: Execute the real model checkpoint**

Set `e2e_workspace` to the disposable workspace's printed absolute path and `e2e_id` to `claude-desktop-live-$(date +%s)`. Send the following text through the actual Claude Desktop UI after replacing both shell-variable tokens with their resolved literal values:

```text
Use the agent-checkpoint MCP tool now. workspace_root is ${e2e_workspace}.
Use session_id ${e2e_id}. Write exactly one final checkpoint
with done="Desktop MCP verified", next="Live validation complete",
step_failed=false, and close_session=true. Reply only after the tool succeeds.
```

Approve the tool call if Claude presents its normal permission dialog. A real model/tool response is mandatory.

- [ ] **Step 5: Verify persisted and visible evidence**

Run `checkpoint-inspect` on the selected JSONL path and run native `checkpoint-watch --once` inside the disposable workspace. Require exactly one checkpoint record between open/closed lifecycle records, `CLOSED`, the requested three-word strings, `step_failed=false`, and all three Desktop metadata fields null.

- [ ] **Step 6: Mark the live gate complete and run final verification**

Change the design status to `implemented and live-verified` and rerun the complete automated gate plus `git diff --check`. Verify installed source parity and a clean Desktop MCP log after the call.

- [ ] **Step 7: Request focused implementation review and remediate accepted findings**

Review the full diff against the design and this plan. Fix Critical/Important findings with a fresh RED/GREEN cycle; rerun the complete gate after any change.

- [ ] **Step 8: Commit final live evidence metadata and push**

```bash
git add docs/superpowers/specs/2026-08-03-claude-desktop-checkpoint-design.md
git commit -m "test: verify Claude Desktop checkpoint E2E"
git push origin feature/agent-checkpoint-heartbeat
```

Do not commit temporary workspaces, Claude logs, user configuration, credentials, or generated checkpoint JSONL.
