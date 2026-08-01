import assert from "node:assert/strict";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from "node:fs";
import {
  access,
  copyFile,
  lstat,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

import * as checkpointCore from "../../packages/checkpoint-core/src/index.js";
import { createMcpRuntime, readTelemetry } from "../agent-checkpoint/server/checkpoint-mcp-runtime.mjs";
import {
  formatStatusline,
  normalizeStatuslineTelemetry,
  sidecarPathFor,
  writeAtomicSnapshot,
} from "../agent-checkpoint/scripts/checkpoint-statusline.mjs";

const REPOSITORY_ROOT = path.resolve(import.meta.dirname, "../..");
const PLUGIN_ROOT = path.join(REPOSITORY_ROOT, "claude/agent-checkpoint");
const SOURCE_HOOK_PATH = path.join(PLUGIN_ROOT, "scripts/checkpoint-hook.mjs");
const STATUSLINE_PATH = path.join(PLUGIN_ROOT, "scripts/checkpoint-statusline.mjs");
const INSPECT_PATH = path.join(REPOSITORY_ROOT, "packages/checkpoint-core/bin/checkpoint-inspect.js");
const INSTRUCTION_MARKER = "<!-- claude-checkpoint-instruction -->";
const CHECKPOINT_TOOL = "mcp__plugin_agent-checkpoint_checkpoint__checkpoint";
const CHECKPOINT_PATH_TOOL = "mcp__plugin_agent-checkpoint_checkpoint__checkpoint_path";
const RECORD_KEYS = [
  "timestamp",
  "session_id",
  "done",
  "next",
  "step_failed",
  "context_used",
  "agent",
  "session_title",
];

const HOOK_TEST_ROOT = mkdtempSync(path.join(os.tmpdir(), "checkpoint-claude-hook-layout-"));
const HOOK_WORKSPACE = path.join(HOOK_TEST_ROOT, "workspace");
const HOOK_PATH = path.join(HOOK_TEST_ROOT, "plugin/scripts/checkpoint-hook.mjs");
mkdirSync(path.dirname(HOOK_PATH), { recursive: true });
mkdirSync(path.join(HOOK_TEST_ROOT, "plugin/instructions"), { recursive: true });
mkdirSync(path.join(HOOK_TEST_ROOT, "plugin/server"), { recursive: true });
mkdirSync(HOOK_WORKSPACE, { recursive: true });
copyFileSync(SOURCE_HOOK_PATH, HOOK_PATH);
copyFileSync(
  path.join(PLUGIN_ROOT, "instructions/checkpoint.md"),
  path.join(HOOK_TEST_ROOT, "plugin/instructions/checkpoint.md"),
);
copyFileSync(
  path.join(REPOSITORY_ROOT, "packages/checkpoint-core/src/index.js"),
  path.join(HOOK_TEST_ROOT, "plugin/server/checkpoint-core.mjs"),
);
test.after(() => rmSync(HOOK_TEST_ROOT, { recursive: true, force: true }));

function runHook(input, hookPath = HOOK_PATH, { workspaceRoot, env = {} } = {}) {
  const inputWorkspace =
    input !== null && typeof input === "object" && existsSync(input.cwd ?? "")
      ? input.cwd
      : HOOK_WORKSPACE;
  const selectedWorkspace = workspaceRoot === undefined ? inputWorkspace : workspaceRoot;
  return spawnSync("node", [hookPath], {
    input: typeof input === "string" ? input : JSON.stringify(input),
    encoding: "utf8",
    env: {
      ...process.env,
      ...(selectedWorkspace === null ? { CLAUDE_PROJECT_DIR: "" } : { CLAUDE_PROJECT_DIR: selectedWorkspace }),
      ...env,
    },
  });
}

function runStatusline(input) {
  return spawnSync("node", [STATUSLINE_PATH], {
    input: typeof input === "string" ? input : JSON.stringify(input),
    encoding: "utf8",
  });
}

function statuslinePayload(overrides = {}) {
  return {
    session_id: "sess-1",
    session_name: "Demo Session",
    model: { id: "claude-opus", display_name: "Opus" },
    workspace: { project_dir: "/project", current_dir: "/project" },
    context_window_size: 200000,
    used_percentage: 42,
    remaining_percentage: 58,
    total_input_tokens: 84000,
    exceeds_200k_tokens: false,
    ...overrides,
  };
}

async function writeClaudeInstallerConfig(root) {
  const configFile = path.join(root, "installer.yaml");
  await writeFile(
    configFile,
    [
      "targets:",
      "  opencode:",
      "    enabled: true",
      "    home: /unused",
      "  codex:",
      "    enabled: false",
      "  claude:",
      "    enabled: true",
      "  cursor:",
      "    enabled: false",
      "  hermes:",
      "    enabled: false",
      "",
    ].join("\n"),
  );
  return configFile;
}

function runClaudeInstallerResult(args, { cwd, configFile, opencodeHome, claudeHome, syncClaude }) {
  return spawnSync("bash", [path.join(REPOSITORY_ROOT, "install.sh"), ...args], {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      HOME: cwd,
      OPS_CONFIG_FILE: configFile,
      OPS_OPENCODE_HOME: opencodeHome,
      OPS_CLAUDE_HOME: claudeHome,
      OPS_SYNC_CODEX: "false",
      OPS_SYNC_CURSOR: "false",
      OPS_SYNC_HERMES: "false",
      OPS_ANTIGRAVITY_PATH: path.join(cwd, "absent-antigravity"),
      ...(syncClaude === undefined ? {} : { OPS_SYNC_CLAUDE: syncClaude }),
    },
  });
}

function runClaudeInstaller(args, options) {
  const result = runClaudeInstallerResult(args, options);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  return result.stdout;
}

function withProjectDir(t, worktree) {
  const previous = process.env.CLAUDE_PROJECT_DIR;
  process.env.CLAUDE_PROJECT_DIR = worktree;
  t.after(() => {
    if (previous === undefined) {
      delete process.env.CLAUDE_PROJECT_DIR;
    } else {
      process.env.CLAUDE_PROJECT_DIR = previous;
    }
  });
}

test("claude plugin manifest, MCP wiring, and hooks configs have the pinned shape", () => {
  const manifest = JSON.parse(readFileSync(path.join(PLUGIN_ROOT, ".claude-plugin/plugin.json"), "utf8"));
  assert.equal(manifest.name, "agent-checkpoint");
  assert.equal(typeof manifest.version, "string");
  assert.equal(typeof manifest.description, "string");
  assert.ok(manifest.author, "strict validation requires author information");

  const mcp = JSON.parse(readFileSync(path.join(PLUGIN_ROOT, ".mcp.json"), "utf8"));
  assert.deepEqual(Object.keys(mcp), ["mcpServers"]);
  assert.deepEqual(Object.keys(mcp.mcpServers), ["checkpoint"]);
  assert.deepEqual(mcp.mcpServers.checkpoint, {
    command: "node",
    args: ["${CLAUDE_PLUGIN_ROOT}/server/checkpoint-mcp-server.mjs"],
  });

  const hooks = JSON.parse(readFileSync(path.join(PLUGIN_ROOT, "hooks/hooks.json"), "utf8"));
  assert.deepEqual(Object.keys(hooks), ["hooks"]);
  const events = hooks.hooks;
  assert.deepEqual(Object.keys(events).sort(), [
    "PreToolUse",
    "SessionEnd",
    "SessionStart",
    "SubagentStart",
  ]);
  const command = "${CLAUDE_PLUGIN_ROOT}/scripts/checkpoint-hook.mjs";
  for (const eventName of ["SessionStart", "SubagentStart", "SessionEnd"]) {
    assert.equal(events[eventName].length, 1, eventName);
    assert.deepEqual(events[eventName][0].hooks, [{ type: "command", command }]);
  }
  assert.equal(events.PreToolUse.length, 2);
  assert.deepEqual(
    events.PreToolUse.map((entry) => entry.matcher).sort(),
    [`^${CHECKPOINT_PATH_TOOL}$`, `^${CHECKPOINT_TOOL}$`].sort(),
  );
  for (const entry of events.PreToolUse) {
    assert.deepEqual(entry.hooks, [{ type: "command", command }]);
  }
});

test("claude plugin passes strict validation on the pinned CLI", async (t) => {
  const version = spawnSync("claude", ["--version"], { encoding: "utf8" });
  assert.ok(
    !version.error && version.status === 0,
    "claude CLI is required for the checkpoint plugin smoke tests (pinned 2.1.170); install it or fix PATH",
  );
  const match = version.stdout.match(/(\d+)\.(\d+)\.(\d+)/);
  assert.ok(match, `could not parse claude version from: ${version.stdout}`);
  const [major, minor, patch] = match.slice(1).map(Number);
  assert.deepEqual(
    [major, minor, patch],
    [2, 1, 170],
    `claude ${major}.${minor}.${patch} does not match the required pinned version 2.1.170`,
  );

  const disposableHome = await mkdtemp(path.join(os.tmpdir(), "checkpoint-claude-validate-"));
  t.after(() => rm(disposableHome, { recursive: true, force: true }));
  const result = spawnSync("claude", ["plugin", "validate", "--strict", PLUGIN_ROOT], {
    encoding: "utf8",
    env: { ...process.env, CLAUDE_CONFIG_DIR: disposableHome },
  });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /Validation passed/);
});

test("claude MCP runtime handles the protocol and appends telemetry-fed contract records", async (t) => {
  const worktree = await mkdtemp(path.join(os.tmpdir(), "checkpoint-claude-mcp-"));
  t.after(() => rm(worktree, { recursive: true, force: true }));
  withProjectDir(t, worktree);
  const runtime = createMcpRuntime({ checkpointCore });

  writeAtomicSnapshot({
    session_id: "sess-parent",
    project_dir: worktree,
    used_percentage: 42,
    context_window_size: 200000,
    total_input_tokens: 84000,
    session_name: "Demo Session",
  });

  const initialize = await runtime.handleMessage({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: { protocolVersion: "2025-03-26" },
  });
  assert.equal(initialize.result.protocolVersion, "2025-03-26");
  assert.equal(initialize.result.serverInfo.name, "agent-checkpoint");
  assert.equal(
    await runtime.handleMessage({ jsonrpc: "2.0", method: "notifications/initialized" }),
    null,
  );

  const listed = await runtime.handleMessage({ jsonrpc: "2.0", id: 2, method: "tools/list" });
  assert.deepEqual(
    listed.result.tools.map((tool) => tool.name),
    ["checkpoint", "checkpoint_path"],
  );
  const schema = listed.result.tools[0].inputSchema;
  assert.deepEqual(schema.required, ["done", "next"]);
  assert.equal(schema.properties.step_failed.default, false);
  assert.deepEqual(schema.properties.close_session, { type: "boolean", default: false });
  for (const internal of ["_checkpoint_session_id", "_telemetry_session_id", "_agent_type"]) {
    assert.match(schema.properties[internal].description, /hook injected/);
  }

  const parentCall = await runtime.handleMessage({
    jsonrpc: "2.0",
    id: 3,
    method: "tools/call",
    params: {
      name: "checkpoint",
      arguments: {
        done: "Plugin wrote record",
        next: "Inspect record now",
        _checkpoint_session_id: "sess-parent",
        _telemetry_session_id: "sess-parent",
      },
    },
  });
  assert.equal(parentCall.result.isError, undefined);
  assert.match(parentCall.result.content[0].text, /Checkpoint saved\./);
  assert.match(parentCall.result.content[0].text, /harness telemetry\): ~42%/);
  assert.match(parentCall.result.content[0].text, /headroom\): ~116k/);

  const subagentCall = await runtime.handleMessage({
    jsonrpc: "2.0",
    id: 4,
    method: "tools/call",
    params: {
      name: "checkpoint",
      arguments: {
        done: "Inspect record now",
        next: "Suite continues forward",
        step_failed: true,
        close_session: true,
        _checkpoint_session_id: "sess-parent--agent-1",
        _telemetry_session_id: "sess-parent",
        _agent_type: "implementer",
      },
    },
  });
  assert.equal(subagentCall.result.isError, undefined);

  const parentFile = path.join(worktree, ".agent-checkpoints", "sess-parent.jsonl");
  const subagentFile = path.join(worktree, ".agent-checkpoints", "sess-parent--agent-1.jsonl");
  const parentRaw = await readFile(parentFile, "utf8");
  const subagentRaw = await readFile(subagentFile, "utf8");
  const [parentRecord] = checkpointCore.parseCheckpointJsonl(parentRaw);
  const [subagentRecord] = checkpointCore.parseCheckpointJsonl(subagentRaw);

  assert.deepEqual(Object.keys(parentRecord), RECORD_KEYS);
  assert.equal(parentRecord.session_id, "sess-parent");
  assert.equal(parentRecord.context_used, 0.42);
  assert.equal(parentRecord.agent, null);
  assert.equal(parentRecord.session_title, "Demo Session");
  assert.equal(parentRecord.step_failed, false);

  assert.deepEqual(Object.keys(subagentRecord), RECORD_KEYS);
  assert.equal(subagentRecord.session_id, "sess-parent--agent-1");
  assert.equal(subagentRecord.context_used, 0.42);
  assert.equal(subagentRecord.agent, "implementer");
  assert.equal(subagentRecord.session_title, "Demo Session");
  assert.equal(subagentRecord.step_failed, true);
  assert.deepEqual(
    checkpointCore.parseCheckpointLogJsonl(subagentRaw).map((record) => record.status ?? "checkpoint"),
    ["open", "checkpoint", "closed"],
  );
  assert.equal(checkpointCore.analyzeCheckpointLog(subagentRaw).state, "CLOSED");

  for (const raw of [parentRaw, subagentRaw]) {
    assert.doesNotMatch(
      raw,
      /_checkpoint_session_id|_telemetry_session_id|_agent_type|remainingKTokens|used_percentage|context_window_size|total_input_tokens|updated_at/,
    );
  }

  const pathResult = await runtime.handleMessage({
    jsonrpc: "2.0",
    id: 5,
    method: "tools/call",
    params: { name: "checkpoint_path", arguments: { session_id: "sess-parent--agent-1" } },
  });
  assert.equal(
    pathResult.result.content[0].text,
    ".agent-checkpoints/sess-parent--agent-1.jsonl",
  );

  for (const args of [
    { done: "No injection here", next: "Should not persist" },
    { done: "Partial injection", next: "Should not persist", _checkpoint_session_id: "x" },
  ]) {
    const rejected = await runtime.handleMessage({
      jsonrpc: "2.0",
      id: 6,
      method: "tools/call",
      params: { name: "checkpoint", arguments: args },
    });
    assert.equal(rejected.result.isError, true);
    assert.match(
      rejected.result.content[0].text,
      /_checkpoint_session_id and _telemetry_session_id/,
    );
  }

  for (const [index, close_session] of [null, "true", 1, [], {}].entries()) {
    const sessionId = `invalid-close-${index}`;
    const rejected = await runtime.handleMessage({
      jsonrpc: "2.0",
      id: 60 + index,
      method: "tools/call",
      params: {
        name: "checkpoint",
        arguments: {
          done: "Reject invalid closure",
          next: "Preserve empty output",
          close_session,
          _checkpoint_session_id: sessionId,
          _telemetry_session_id: sessionId,
        },
      },
    });
    assert.equal(rejected.result.isError, true);
    assert.match(rejected.result.content[0].text, /close_session must be a boolean/);
    await assert.rejects(
      access(path.join(worktree, ...checkpointCore.checkpointPath(sessionId).split("/"))),
      /ENOENT/,
    );
  }

  const reopened = await runtime.handleMessage({
    jsonrpc: "2.0",
    id: 70,
    method: "tools/call",
    params: {
      name: "checkpoint",
      arguments: {
        done: "Suite continues forward",
        next: "Session remains available",
        close_session: false,
        _checkpoint_session_id: "sess-parent--agent-1",
        _telemetry_session_id: "sess-parent",
        _agent_type: "implementer",
      },
    },
  });
  assert.equal(reopened.result.isError, undefined);
  assert.equal(
    checkpointCore.analyzeCheckpointLog(await readFile(subagentFile, "utf8")).state,
    "OPEN",
  );

  const unknown = await runtime.handleMessage({ jsonrpc: "2.0", id: 7, method: "resources/list" });
  assert.equal(unknown.error.code, -32601);
});

test("claude MCP checkpoint fails clearly without CLAUDE_PROJECT_DIR", async (t) => {
  const worktree = await mkdtemp(path.join(os.tmpdir(), "checkpoint-claude-noenv-"));
  t.after(() => rm(worktree, { recursive: true, force: true }));
  const previous = process.env.CLAUDE_PROJECT_DIR;
  delete process.env.CLAUDE_PROJECT_DIR;
  t.after(() => {
    if (previous !== undefined) {
      process.env.CLAUDE_PROJECT_DIR = previous;
    }
  });
  const runtime = createMcpRuntime({ checkpointCore });
  const result = await runtime.handleMessage({
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: {
      name: "checkpoint",
      arguments: {
        done: "Env missing now",
        next: "Should not persist",
        _checkpoint_session_id: "sess",
        _telemetry_session_id: "sess",
      },
    },
  });
  assert.equal(result.result.isError, true);
  assert.match(result.result.content[0].text, /CLAUDE_PROJECT_DIR/);
  await assert.rejects(access(path.join(worktree, ".agent-checkpoints")), /ENOENT/);
});

test("claude readTelemetry degrades to explicit unknowns on mismatch and invalid data", async (t) => {
  const worktree = await mkdtemp(path.join(os.tmpdir(), "checkpoint-claude-telemetry-"));
  t.after(() => rm(worktree, { recursive: true, force: true }));

  writeAtomicSnapshot({
    session_id: "sess-a",
    project_dir: worktree,
    used_percentage: null,
    context_window_size: 200000,
    total_input_tokens: 50000,
    session_name: null,
  });
  const nullPercentage = await readTelemetry(worktree, "sess-a");
  assert.equal(nullPercentage.contextUsed, null);
  assert.equal(nullPercentage.remainingKTokens, 150);
  assert.equal(nullPercentage.sessionTitle, null);

  const absent = await readTelemetry(worktree, "sess-absent");
  assert.deepEqual(absent, { contextUsed: null, remainingKTokens: null, sessionTitle: null });

  const otherProject = path.join(worktree, "elsewhere");
  await mkdir(otherProject);
  const sessionMismatch = await readTelemetry(otherProject, "sess-a");
  assert.equal(sessionMismatch.contextUsed, null);

  const foreignSidecar = sidecarPathFor(worktree, "sess-foreign");
  await mkdir(path.dirname(foreignSidecar), { recursive: true });
  await writeFile(
    foreignSidecar,
    `${JSON.stringify({
      session_id: "sess-foreign",
      project_dir: otherProject,
      updated_at: "2026-07-27T00:00:00.000Z",
      used_percentage: 90,
      context_window_size: 200000,
      total_input_tokens: 180000,
      session_name: "Foreign",
    })}\n`,
  );
  const projectMismatch = await readTelemetry(worktree, "sess-foreign");
  assert.deepEqual(projectMismatch, { contextUsed: null, remainingKTokens: null, sessionTitle: null });

  const invalidSidecar = sidecarPathFor(worktree, "sess-broken");
  await writeFile(invalidSidecar, "not json\n");
  const invalid = await readTelemetry(worktree, "sess-broken");
  assert.deepEqual(invalid, { contextUsed: null, remainingKTokens: null, sessionTitle: null });

  const outOfRangeSidecar = sidecarPathFor(worktree, "sess-range");
  await writeFile(
    outOfRangeSidecar,
    `${JSON.stringify({
      session_id: "sess-range",
      project_dir: worktree,
      updated_at: "2026-07-27T00:00:00.000Z",
      used_percentage: 140,
      context_window_size: 200000,
      total_input_tokens: 250000,
      session_name: null,
    })}\n`,
  );
  const outOfRange = await readTelemetry(worktree, "sess-range");
  assert.equal(outOfRange.contextUsed, null);
  assert.equal(outOfRange.remainingKTokens, 0);
});

test("claude MCP writes stay eight-field while legacy six-field logs remain readable", async (t) => {
  const worktree = await mkdtemp(path.join(os.tmpdir(), "checkpoint-claude-legacy-"));
  t.after(() => rm(worktree, { recursive: true, force: true }));
  withProjectDir(t, worktree);
  const runtime = createMcpRuntime({ checkpointCore });

  await runtime.handleMessage({
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: {
      name: "checkpoint",
      arguments: {
        done: "Fresh write follows",
        next: "Legacy read follows",
        _checkpoint_session_id: "fresh",
        _telemetry_session_id: "fresh",
      },
    },
  });
  const freshRaw = await readFile(
    path.join(worktree, ...checkpointCore.checkpointPath("fresh").split("/")),
    "utf8",
  );
  const [fresh] = checkpointCore.parseCheckpointJsonl(freshRaw);
  assert.deepEqual(Object.keys(fresh), RECORD_KEYS);
  assert.equal(fresh.context_used, null);
  assert.equal(fresh.session_title, null);

  const legacy = {
    timestamp: "2026-07-27T00:00:00.000Z",
    session_id: "legacy",
    done: "one two three",
    next: "four five six",
    step_failed: false,
    context_used: 0.5,
  };
  const legacyFile = path.join(worktree, ".agent-checkpoints", "legacy.jsonl");
  await writeFile(legacyFile, `${JSON.stringify(legacy)}\n`);
  const [legacyRecord] = checkpointCore.parseCheckpointJsonl(await readFile(legacyFile, "utf8"));
  assert.equal(legacyRecord.context_used, 0.5);
  assert.equal(legacyRecord.agent, null);
  assert.equal(legacyRecord.session_title, null);
});

test("claude MCP stdio server flushes tool-call responses before exiting", async (t) => {
  const worktree = await mkdtemp(path.join(os.tmpdir(), "checkpoint-claude-stdio-"));
  t.after(() => rm(worktree, { recursive: true, force: true }));
  // The server resolves checkpoint-core.mjs as an install-time sibling;
  // assemble the installed layout in a temporary server directory.
  const serverDir = path.join(worktree, "server");
  await mkdir(serverDir);
  await copyFile(
    path.join(PLUGIN_ROOT, "server/checkpoint-mcp-server.mjs"),
    path.join(serverDir, "checkpoint-mcp-server.mjs"),
  );
  await copyFile(
    path.join(PLUGIN_ROOT, "server/checkpoint-mcp-runtime.mjs"),
    path.join(serverDir, "checkpoint-mcp-runtime.mjs"),
  );
  await copyFile(
    path.join(REPOSITORY_ROOT, "packages/checkpoint-core/src/index.js"),
    path.join(serverDir, "checkpoint-core.mjs"),
  );
  const requests = [
    { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-03-26" } },
    { jsonrpc: "2.0", method: "notifications/initialized" },
    {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: {
        name: "checkpoint",
        arguments: {
          done: "Stdio flush verified",
          next: "Record read back",
          _checkpoint_session_id: "stdio-session",
          _telemetry_session_id: "stdio-session",
        },
      },
    },
    {
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: { name: "checkpoint_path", arguments: { session_id: "stdio-session" } },
    },
  ];
  const server = spawnSync("node", [path.join(serverDir, "checkpoint-mcp-server.mjs")], {
    input: `${requests.map((request) => JSON.stringify(request)).join("\n")}\n`,
    encoding: "utf8",
    env: { ...process.env, CLAUDE_PROJECT_DIR: worktree },
  });
  assert.equal(server.status, 0, server.stderr);
  const responses = server.stdout.trim().split("\n").map((line) => JSON.parse(line));
  assert.equal(responses.length, 3);
  assert.equal(responses[0].result.protocolVersion, "2025-03-26");
  assert.match(responses[1].result.content[0].text, /Checkpoint saved\./);
  assert.match(responses[1].result.content[0].text, /harness telemetry\): unknown/);
  assert.equal(responses[2].result.content[0].text, ".agent-checkpoints/stdio-session.jsonl");
  const raw = await readFile(
    path.join(worktree, ...checkpointCore.checkpointPath("stdio-session").split("/")),
    "utf8",
  );
  const [record] = checkpointCore.parseCheckpointJsonl(raw);
  assert.deepEqual(Object.keys(record), RECORD_KEYS);
  assert.equal(record.session_id, "stdio-session");
});

test("claude-produced logs pass the shared selected-path inspection", async (t) => {
  const worktree = await mkdtemp(path.join(os.tmpdir(), "checkpoint-claude-inspect-"));
  t.after(() => rm(worktree, { recursive: true, force: true }));
  withProjectDir(t, worktree);
  const runtime = createMcpRuntime({ checkpointCore });
  for (const [done, next] of [
    ["First step done", "Second step now"],
    ["Second step now", "Third step later"],
  ]) {
    await runtime.handleMessage({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: "checkpoint",
        arguments: {
          done,
          next,
          _checkpoint_session_id: "inspect-me",
          _telemetry_session_id: "inspect-me",
        },
      },
    });
  }
  const logPath = path.join(worktree, ".agent-checkpoints", "inspect-me.jsonl");
  const inspection = spawnSync("node", [INSPECT_PATH, logPath], { encoding: "utf8" });
  assert.equal(inspection.status, 0, inspection.stderr);
  assert.match(inspection.stdout, /Session: inspect-me/);
  assert.match(inspection.stdout, /Chain: 1\/1 \(100%\)/);
  assert.match(inspection.stdout, /Context used: unknown/);
});

test("claude hook injects the checkpoint instruction on SessionStart and SubagentStart", () => {
  const parent = runHook({
    hook_event_name: "SessionStart",
    session_id: "sess-123",
    transcript_path: null,
    cwd: "/workspace",
    permission_mode: "default",
    source: "startup",
  });
  assert.equal(parent.status, 0, parent.stderr);
  const parentOutput = JSON.parse(parent.stdout);
  assert.deepEqual(Object.keys(parentOutput), ["hookSpecificOutput"]);
  assert.deepEqual(Object.keys(parentOutput.hookSpecificOutput).sort(), [
    "additionalContext",
    "hookEventName",
  ]);
  assert.equal(parentOutput.hookSpecificOutput.hookEventName, "SessionStart");
  assert.ok(parentOutput.hookSpecificOutput.additionalContext.includes(INSTRUCTION_MARKER));
  assert.ok(parentOutput.hookSpecificOutput.additionalContext.includes(
    "subagent sets `close_session=true` only on its final checkpoint",
  ));
  assert.ok(parentOutput.hookSpecificOutput.additionalContext.includes(
    "Maintainer or parent leaves it false",
  ));
  assert.ok(
    parentOutput.hookSpecificOutput.additionalContext.includes("Session checkpoint ID: sess-123"),
  );

  const subagent = runHook({
    hook_event_name: "SubagentStart",
    session_id: "sess-123",
    agent_id: "agent-9",
    agent_type: "implementer",
    transcript_path: null,
    cwd: "/workspace",
    permission_mode: "default",
  });
  assert.equal(subagent.status, 0, subagent.stderr);
  const subagentOutput = JSON.parse(subagent.stdout);
  assert.equal(subagentOutput.hookSpecificOutput.hookEventName, "SubagentStart");
  assert.ok(subagentOutput.hookSpecificOutput.additionalContext.includes(INSTRUCTION_MARKER));
  assert.ok(subagentOutput.hookSpecificOutput.additionalContext.includes("close_session=true"));
  assert.ok(
    subagentOutput.hookSpecificOutput.additionalContext.includes(
      "Session checkpoint ID: sess-123--agent-9",
    ),
  );
});

test("claude lifecycle hooks append observed parent and subagent status only", async (t) => {
  const worktree = await mkdtemp(path.join(os.tmpdir(), "checkpoint-claude-lifecycle-"));
  t.after(() => rm(worktree, { recursive: true, force: true }));

  const parentStart = runHook({
    hook_event_name: "SessionStart",
    session_id: "parent-status",
    cwd: worktree,
    source: "startup",
  });
  assert.equal(parentStart.status, 0, parentStart.stderr);
  assert.equal(JSON.parse(parentStart.stdout).hookSpecificOutput.hookEventName, "SessionStart");

  const childStart = runHook({
    hook_event_name: "SubagentStart",
    session_id: "parent-status",
    agent_id: "child-1",
    agent_type: "implementer",
    cwd: worktree,
  });
  assert.equal(childStart.status, 0, childStart.stderr);
  assert.equal(JSON.parse(childStart.stdout).hookSpecificOutput.hookEventName, "SubagentStart");

  const parentEnd = runHook({
    hook_event_name: "SessionEnd",
    session_id: "parent-status",
    cwd: worktree,
    reason: "logout",
  });
  assert.equal(parentEnd.status, 0, parentEnd.stderr);
  assert.equal(parentEnd.stdout, "");

  const parentRecords = (await readFile(
    path.join(worktree, ".agent-checkpoints/parent-status.jsonl"),
    "utf8",
  )).trim().split("\n").map(JSON.parse);
  assert.deepEqual(parentRecords.map(({ event, status, session_id }) => ({ event, status, session_id })), [
    { event: "session_status", status: "open", session_id: "parent-status" },
    { event: "session_status", status: "closed", session_id: "parent-status" },
  ]);
  for (const record of parentRecords) {
    assert.deepEqual(Object.keys(record).sort(), ["event", "session_id", "status", "timestamp"]);
  }

  const childRecords = (await readFile(
    path.join(worktree, ".agent-checkpoints/parent-status--child-1.jsonl"),
    "utf8",
  )).trim().split("\n").map(JSON.parse);
  assert.equal(childRecords.length, 1);
  assert.deepEqual(
    { event: childRecords[0].event, status: childRecords[0].status, session_id: childRecords[0].session_id },
    { event: "session_status", status: "open", session_id: "parent-status--child-1" },
  );

  const missingIdentity = runHook(
    { hook_event_name: "SessionStart", cwd: worktree },
    HOOK_PATH,
    { workspaceRoot: worktree },
  );
  assert.equal(missingIdentity.status, 1);
  assert.match(missingIdentity.stderr, /non-empty session_id/);

  const missingWorkspace = runHook(
    { hook_event_name: "SessionStart", session_id: "no-workspace" },
    HOOK_PATH,
    { workspaceRoot: null },
  );
  assert.equal(missingWorkspace.status, 1);
  assert.match(missingWorkspace.stderr, /CLAUDE_PROJECT_DIR or hook cwd/);
});

test("claude SubagentStart requires native parent and child identity before writing", async (t) => {
  const worktree = await mkdtemp(path.join(os.tmpdir(), "checkpoint-claude-subagent-identity-"));
  t.after(() => rm(worktree, { recursive: true, force: true }));

  for (const { input, error } of [
    {
      input: {
        hook_event_name: "SubagentStart",
        agent_id: "child-1",
        agent_type: "implementer",
        cwd: worktree,
      },
      error: /non-empty session_id/,
    },
    {
      input: {
        hook_event_name: "SubagentStart",
        session_id: "parent-status",
        agent_type: "implementer",
        cwd: worktree,
      },
      error: /non-empty agent_id/,
    },
  ]) {
    const result = runHook(input);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, error);
    await assert.rejects(access(path.join(worktree, ".agent-checkpoints")), /ENOENT/);
  }
});

test("claude hook rewrites checkpoint PreToolUse inputs for parent and subagent", () => {
  const parent = runHook({
    hook_event_name: "PreToolUse",
    session_id: "sess-xyz",
    transcript_path: null,
    cwd: "/workspace",
    permission_mode: "default",
    tool_name: CHECKPOINT_TOOL,
    tool_input: {
      done: "a b c",
      next: "d e f",
      step_failed: true,
      close_session: true,
      _checkpoint_session_id: "stale-id",
      _telemetry_session_id: "stale-telemetry",
      _agent_type: "stale-agent",
    },
    tool_use_id: "toolu_1",
  });
  assert.equal(parent.status, 0, parent.stderr);
  const parentSpecific = JSON.parse(parent.stdout).hookSpecificOutput;
  assert.deepEqual(Object.keys(parentSpecific).sort(), [
    "hookEventName",
    "permissionDecision",
    "updatedInput",
  ]);
  assert.equal(parentSpecific.hookEventName, "PreToolUse");
  assert.equal(parentSpecific.permissionDecision, "allow");
  assert.deepEqual(parentSpecific.updatedInput, {
    done: "a b c",
    next: "d e f",
    step_failed: true,
    close_session: true,
    _checkpoint_session_id: "sess-xyz",
    _telemetry_session_id: "sess-xyz",
  });

  const subagent = runHook({
    hook_event_name: "PreToolUse",
    session_id: "sess-xyz",
    agent_id: "agent-7",
    agent_type: "delegate",
    transcript_path: null,
    cwd: "/workspace",
    permission_mode: "default",
    tool_name: CHECKPOINT_TOOL,
    tool_input: { done: "a b c", next: "d e f", close_session: false },
    tool_use_id: "toolu_2",
  });
  assert.equal(subagent.status, 0, subagent.stderr);
  const subagentSpecific = JSON.parse(subagent.stdout).hookSpecificOutput;
  assert.deepEqual(subagentSpecific.updatedInput, {
    done: "a b c",
    next: "d e f",
    close_session: false,
    _checkpoint_session_id: "sess-xyz--agent-7",
    _telemetry_session_id: "sess-xyz",
    _agent_type: "delegate",
  });

  for (const close_session of [null, "true", 1, [], {}]) {
    const invalid = runHook({
      hook_event_name: "PreToolUse",
      session_id: "sess-invalid",
      cwd: "/workspace",
      tool_name: CHECKPOINT_TOOL,
      tool_input: { done: "a b c", next: "d e f", close_session },
    });
    assert.equal(invalid.status, 1);
    assert.equal(invalid.stdout, "");
    assert.match(invalid.stderr, /close_session must be a boolean/);
  }
  assert.notEqual(
    subagentSpecific.updatedInput._checkpoint_session_id,
    parentSpecific.updatedInput._checkpoint_session_id,
  );
});

test("claude hook allows checkpoint_path unchanged and ignores other tools and events", () => {
  const pathCall = runHook({
    hook_event_name: "PreToolUse",
    session_id: "sess-xyz",
    transcript_path: null,
    cwd: "/workspace",
    permission_mode: "default",
    tool_name: CHECKPOINT_PATH_TOOL,
    tool_input: { session_id: "public-session" },
    tool_use_id: "toolu_3",
  });
  assert.equal(pathCall.status, 0, pathCall.stderr);
  const pathSpecific = JSON.parse(pathCall.stdout).hookSpecificOutput;
  assert.equal(pathSpecific.permissionDecision, "allow");
  assert.deepEqual(pathSpecific.updatedInput, { session_id: "public-session" });

  const otherTool = runHook({
    hook_event_name: "PreToolUse",
    session_id: "s",
    transcript_path: null,
    cwd: "/w",
    permission_mode: "p",
    tool_name: "mcp__other__ping",
    tool_input: {},
    tool_use_id: "u",
  });
  assert.equal(otherTool.status, 0, otherTool.stderr);
  assert.equal(otherTool.stdout, "");

  const otherEvent = runHook({
    hook_event_name: "PostToolUse",
    session_id: "s",
    transcript_path: null,
    cwd: "/w",
    permission_mode: "p",
    tool_name: CHECKPOINT_TOOL,
    tool_input: {},
    tool_response: {},
    tool_use_id: "u",
  });
  assert.equal(otherEvent.status, 0, otherEvent.stderr);
  assert.equal(otherEvent.stdout, "");

  const invalid = runHook("not json");
  assert.equal(invalid.status, 1);
  assert.match(invalid.stderr, /invalid JSON/);
});

test("claude SessionEnd closes the parent and removes only its telemetry sidecar", async (t) => {
  const worktree = await mkdtemp(path.join(os.tmpdir(), "checkpoint-claude-sessionend-"));
  t.after(() => rm(worktree, { recursive: true, force: true }));
  writeAtomicSnapshot({
    session_id: "sess-end",
    project_dir: worktree,
    used_percentage: 10,
    context_window_size: 200000,
    total_input_tokens: 20000,
    session_name: null,
  });
  writeAtomicSnapshot({
    session_id: "sess-keep",
    project_dir: worktree,
    used_percentage: 20,
    context_window_size: 200000,
    total_input_tokens: 40000,
    session_name: null,
  });
  const result = runHook({
    hook_event_name: "SessionEnd",
    session_id: "sess-end",
    transcript_path: null,
    cwd: worktree,
    permission_mode: "default",
    reason: "logout",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, "");
  await assert.rejects(access(sidecarPathFor(worktree, "sess-end")), /ENOENT/);
  await access(sidecarPathFor(worktree, "sess-keep"));
  const statusRecord = JSON.parse(
    (await readFile(path.join(worktree, ".agent-checkpoints/sess-end.jsonl"), "utf8")).trim(),
  );
  assert.equal(statusRecord.session_id, "sess-end");
  assert.equal(statusRecord.event, "session_status");
  assert.equal(statusRecord.status, "closed");
});

test("claude hook runs when invoked through a symlinked install path", async (t) => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "checkpoint-claude-hook-link-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await mkdir(path.join(dir, "scripts"));
  await mkdir(path.join(dir, "instructions"));
  await mkdir(path.join(dir, "server"));
  await copyFile(SOURCE_HOOK_PATH, path.join(dir, "scripts", "checkpoint-hook.mjs"));
  await copyFile(
    path.join(PLUGIN_ROOT, "instructions/checkpoint.md"),
    path.join(dir, "instructions", "checkpoint.md"),
  );
  await copyFile(
    path.join(REPOSITORY_ROOT, "packages/checkpoint-core/src/index.js"),
    path.join(dir, "server", "checkpoint-core.mjs"),
  );
  const result = runHook(
    {
      hook_event_name: "SessionStart",
      session_id: "linked-session",
      transcript_path: null,
      cwd: "/w",
      permission_mode: "p",
      source: "startup",
    },
    path.join(dir, "scripts", "checkpoint-hook.mjs"),
  );
  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.equal(output.hookSpecificOutput.hookEventName, "SessionStart");
  assert.ok(
    output.hookSpecificOutput.additionalContext.includes("Session checkpoint ID: linked-session"),
  );
});

test("claude statusline normalizes, formats, and atomically replaces the latest snapshot", async (t) => {
  const worktree = await mkdtemp(path.join(os.tmpdir(), "checkpoint-claude-statusline-"));
  t.after(() => rm(worktree, { recursive: true, force: true }));

  const normalized = normalizeStatuslineTelemetry(statuslinePayload({ workspace: { project_dir: worktree } }));
  assert.deepEqual(normalized, {
    session_id: "sess-1",
    project_dir: worktree,
    used_percentage: 42,
    context_window_size: 200000,
    total_input_tokens: 84000,
    session_name: "Demo Session",
  });
  assert.equal(formatStatusline(normalized), "Checkpoint context: 42%");
  assert.equal(formatStatusline(null), "Checkpoint context: unknown");
  assert.equal(normalizeStatuslineTelemetry(null), null);
  assert.equal(normalizeStatuslineTelemetry({ session_id: "s" }), null);
  assert.equal(
    normalizeStatuslineTelemetry({ workspace: { project_dir: worktree } }),
    null,
  );

  const payload = statuslinePayload({ workspace: { project_dir: worktree } });
  const first = runStatusline(payload);
  assert.equal(first.status, 0, first.stderr);
  assert.equal(first.stdout, "Checkpoint context: 42%\n");
  const sidecar = sidecarPathFor(worktree, "sess-1");
  const snapshot = JSON.parse(await readFile(sidecar, "utf8"));
  assert.deepEqual(Object.keys(snapshot).sort(), [
    "context_window_size",
    "project_dir",
    "session_id",
    "session_name",
    "total_input_tokens",
    "updated_at",
    "used_percentage",
  ]);
  assert.equal(snapshot.used_percentage, 42);
  assert.equal(snapshot.session_name, "Demo Session");

  // Null percentage (pre-first-response / post-compaction) replaces the
  // previous value atomically instead of fabricating one.
  const compacted = runStatusline(statuslinePayload({
    workspace: { project_dir: worktree },
    used_percentage: null,
    total_input_tokens: 90000,
  }));
  assert.equal(compacted.status, 0, compacted.stderr);
  assert.equal(compacted.stdout, "Checkpoint context: unknown\n");
  const replaced = JSON.parse(await readFile(sidecar, "utf8"));
  assert.equal(replaced.used_percentage, null);
  assert.equal(replaced.total_input_tokens, 90000);

  const runtimeEntries = await readdir(path.dirname(sidecar));
  assert.deepEqual(runtimeEntries.filter((entry) => entry.endsWith(".tmp")), []);

  const malformed = runStatusline("not json");
  assert.equal(malformed.status, 0);
  assert.equal(malformed.stdout, "Checkpoint context: unknown\n");
  assert.match(malformed.stderr, /agent-checkpoint statusline/);

  const noIdentity = runStatusline({ model: { id: "m" } });
  assert.equal(noIdentity.status, 0);
  assert.equal(noIdentity.stdout, "Checkpoint context: unknown\n");
  assert.deepEqual(
    (await readdir(path.dirname(sidecar))).filter((entry) => entry !== "sess-1.json"),
    [],
  );
});

test("claude installer deploys the plugin and preserves base configuration", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "checkpoint-claude-install-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const opencodeHome = path.join(root, "opencode-home");
  const claudeHome = path.join(root, "Claude Home");
  await mkdir(claudeHome, { recursive: true });
  const baseSettings = path.join(claudeHome, "settings.json");
  const baseSettingsContent = '{\n  "model": "claude-opus",\n  "statusLine": { "type": "command", "command": "user-statusline" }\n}\n';
  await writeFile(baseSettings, baseSettingsContent);
  const claudeJson = path.join(root, ".claude.json");
  const claudeJsonContent = '{"projects":{},"numStartups":7}\n';
  await writeFile(claudeJson, claudeJsonContent);
  const configFile = await writeClaudeInstallerConfig(root);

  const output = runClaudeInstaller([], { cwd: root, configFile, opencodeHome, claudeHome });
  assert.match(output, /Claude Code checkpoint plugin/);
  assert.match(output, /agent-checkpoint\.settings\.json/);
  assert.match(output, /--settings/);
  assert.match(output, /stop every live checkpoint-watch dashboard.*OpenCode.*codex.*Claude Code.*Hermes/is);
  assert.ok(
    output.indexOf("skills/agent-checkpoint/server/checkpoint-core.mjs") <
      output.indexOf("skills/agent-checkpoint/scripts/checkpoint-hook.mjs"),
    "Claude bundled core must install before the status-capable hook",
  );
  assert.ok(
    output.indexOf("Launch command:") < output.indexOf("Start/restart Claude Code"),
    "the compatible dashboard launch must precede Claude restart",
  );

  assert.equal(await readFile(baseSettings, "utf8"), baseSettingsContent);
  assert.equal(await readFile(claudeJson, "utf8"), claudeJsonContent);
  assert.match(
    await readFile(path.join(claudeHome, "skills/execute-work-package/SKILL.md"), "utf8"),
    /Execute Work Package/,
  );
  assert.match(
    await readFile(path.join(claudeHome, "agents/delegate.md"), "utf8"),
    /Delegate/,
  );

  const pluginDir = path.join(claudeHome, "skills/agent-checkpoint");
  for (const name of [
    ".claude-plugin/plugin.json",
    ".mcp.json",
    "hooks/hooks.json",
    "instructions/checkpoint.md",
    "scripts/checkpoint-hook.mjs",
    "scripts/checkpoint-statusline.mjs",
    "server/checkpoint-mcp-runtime.mjs",
    "server/checkpoint-mcp-server.mjs",
    "server/checkpoint-core.mjs",
    "README.md",
  ]) {
    const content = await readFile(path.join(pluginDir, name), "utf8");
    assert.ok(content.length > 0, name);
  }
  assert.match(
    await readFile(path.join(pluginDir, "server/checkpoint-core.mjs"), "utf8"),
    /export async function checkpoint/,
  );
  assert.match(
    await readFile(path.join(pluginDir, "instructions/checkpoint.md"), "utf8"),
    /claude-checkpoint-instruction/,
  );

  const settingsRaw = await readFile(path.join(claudeHome, "agent-checkpoint.settings.json"), "utf8");
  const settings = JSON.parse(settingsRaw);
  assert.deepEqual(Object.keys(settings), ["statusLine"]);
  assert.equal(settings.statusLine.type, "command");
  const commandMatch = settings.statusLine.command.match(/^"([^"]+)" "([^"]+)"$/);
  assert.ok(commandMatch, settings.statusLine.command);
  await access(commandMatch[1]);
  assert.equal(
    commandMatch[2],
    path.join(pluginDir, "scripts/checkpoint-statusline.mjs"),
  );
  await access(commandMatch[2]);

  // Symlink protection: destinations that are symlinks are preserved.
  const protectedHook = path.join(root, "protected-hook.mjs");
  await writeFile(protectedHook, "protected\n");
  await rm(path.join(pluginDir, "scripts/checkpoint-hook.mjs"));
  await symlink(protectedHook, path.join(pluginDir, "scripts/checkpoint-hook.mjs"));
  const protectedSettings = path.join(root, "protected-settings.json");
  await writeFile(protectedSettings, "protected\n");
  await rm(path.join(claudeHome, "agent-checkpoint.settings.json"));
  await symlink(protectedSettings, path.join(claudeHome, "agent-checkpoint.settings.json"));
  await writeFile(path.join(pluginDir, "server/checkpoint-mcp-server.mjs"), "stale\n");

  runClaudeInstaller([], { cwd: root, configFile, opencodeHome, claudeHome });
  assert.equal(
    await readFile(path.join(pluginDir, "scripts/checkpoint-hook.mjs"), "utf8"),
    "protected\n",
  );
  assert.equal(
    await readFile(path.join(claudeHome, "agent-checkpoint.settings.json"), "utf8"),
    "protected\n",
  );
  assert.match(
    await readFile(path.join(pluginDir, "server/checkpoint-mcp-server.mjs"), "utf8"),
    /createMcpRuntime/,
  );
  assert.equal(await readFile(baseSettings, "utf8"), baseSettingsContent);
  assert.equal(await readFile(claudeJson, "utf8"), claudeJsonContent);
});

test("claude required-core symlink preflight stops before any installation mutation", async (t) => {
  for (const relativeLink of [
    "skills/agent-checkpoint/server/checkpoint-core.mjs",
    "skills/agent-checkpoint/server",
    "skills/agent-checkpoint",
  ]) {
    await t.test(relativeLink, async (t) => {
      const root = await mkdtemp(path.join(os.tmpdir(), "checkpoint-claude-reader-link-"));
      t.after(() => rm(root, { recursive: true, force: true }));
      const opencodeHome = path.join(root, "opencode-home");
      const claudeHome = path.join(root, "claude-home");
      await mkdir(claudeHome, { recursive: true });
      const configFile = await writeClaudeInstallerConfig(root);
      const linkPath = path.join(claudeHome, relativeLink);
      const protectedPath = path.join(root, `protected-${relativeLink.replaceAll("/", "-")}`);
      const isLeaf = relativeLink.endsWith("checkpoint-core.mjs");
      if (isLeaf) {
        await mkdir(path.dirname(linkPath), { recursive: true });
        await writeFile(protectedPath, "stale protected core\n");
      } else {
        await mkdir(path.dirname(linkPath), { recursive: true });
        await mkdir(protectedPath, { recursive: true });
        const protectedCore = relativeLink.endsWith("server")
          ? path.join(protectedPath, "checkpoint-core.mjs")
          : path.join(protectedPath, "server/checkpoint-core.mjs");
        await mkdir(path.dirname(protectedCore), { recursive: true });
        await writeFile(protectedCore, "stale protected core\n");
      }
      await symlink(protectedPath, linkPath);

      const result = runClaudeInstallerResult([], {
        cwd: root,
        configFile,
        opencodeHome,
        claudeHome,
      });
      assert.notEqual(result.status, 0, `${result.stdout}\n${result.stderr}`);
      assert.match(result.stderr, /required checkpoint reader\/core is a symlink/);
      assert.ok(result.stderr.includes(linkPath), result.stderr);
      assert.match(result.stderr, /update.*target.*remove\/replace.*rerun/is);
      assert.equal(result.stdout.includes("Step 1."), false, result.stdout);
      assert.equal((await readFile(
        isLeaf
          ? protectedPath
          : relativeLink.endsWith("server")
            ? path.join(protectedPath, "checkpoint-core.mjs")
            : path.join(protectedPath, "server/checkpoint-core.mjs"),
        "utf8",
      )), "stale protected core\n");
      assert.equal((await lstat(linkPath)).isSymbolicLink(), true);
      await assert.rejects(access(path.join(claudeHome, "agent-checkpoint.settings.json")), /ENOENT/);
      await assert.rejects(access(path.join(opencodeHome, "plugins/checkpoint.ts")), /ENOENT/);
    });
  }
});

test("claude installer skips all plugin artifacts when the target is disabled", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "checkpoint-claude-disabled-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const opencodeHome = path.join(root, "opencode-home");
  const claudeHome = path.join(root, "claude-home");
  await mkdir(claudeHome, { recursive: true });
  const configFile = await writeClaudeInstallerConfig(root);

  runClaudeInstaller([], { cwd: root, configFile, opencodeHome, claudeHome, syncClaude: "false" });
  await assert.rejects(access(path.join(claudeHome, "skills/agent-checkpoint")), /ENOENT/);
  await assert.rejects(access(path.join(claudeHome, "agent-checkpoint.settings.json")), /ENOENT/);
  await assert.rejects(access(path.join(claudeHome, "skills")), /ENOENT/);
  await assert.rejects(access(path.join(claudeHome, "agents")), /ENOENT/);
  assert.match(
    await readFile(path.join(opencodeHome, "plugins/checkpoint.ts"), "utf8"),
    /CheckpointPlugin/,
  );
});

test("claude installer skips the plugin in project mode", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "checkpoint-claude-project-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const project = path.join(root, "project workspace");
  await mkdir(project);
  const opencodeHome = path.join(root, "forbidden-opencode");
  const claudeHome = path.join(root, "claude-home");
  await mkdir(claudeHome, { recursive: true });
  const configFile = await writeClaudeInstallerConfig(root);

  runClaudeInstaller(["--project"], { cwd: project, configFile, opencodeHome, claudeHome });
  await assert.rejects(access(path.join(claudeHome, "skills/agent-checkpoint")), /ENOENT/);
  await assert.rejects(access(path.join(claudeHome, "agent-checkpoint.settings.json")), /ENOENT/);
  assert.match(
    await readFile(path.join(project, ".opencode/plugins/checkpoint.ts"), "utf8"),
    /CheckpointPlugin/,
  );
});
