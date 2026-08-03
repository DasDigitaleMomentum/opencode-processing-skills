import assert from "node:assert/strict";
import {
  access,
  copyFile,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  readlink,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

import * as checkpointCore from "../../packages/checkpoint-core/src/index.js";
import { createMcpRuntime } from "../checkpoint-mcp-runtime.mjs";

const REPOSITORY_ROOT = path.resolve(import.meta.dirname, "../..");
const HOOK_PATH = path.join(REPOSITORY_ROOT, "codex/checkpoint-hook.mjs");
const INSTRUCTION_MARKER = "<!-- codex-checkpoint-instruction -->";
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

function runHook(input, hookPath) {
  return spawnSync("node", [hookPath], {
    input: typeof input === "string" ? input : JSON.stringify(input),
    encoding: "utf8",
  });
}

async function stageHookAdapter(t, prefix = "checkpoint-codex-hook-") {
  const adapterDir = await mkdtemp(path.join(os.tmpdir(), prefix));
  t.after(() => rm(adapterDir, { recursive: true, force: true }));
  await copyFile(HOOK_PATH, path.join(adapterDir, "checkpoint-hook.mjs"));
  await copyFile(
    path.join(REPOSITORY_ROOT, "codex/checkpoint-instruction.md"),
    path.join(adapterDir, "checkpoint-instruction.md"),
  );
  await copyFile(
    path.join(REPOSITORY_ROOT, "packages/checkpoint-core/src/index.js"),
    path.join(adapterDir, "checkpoint-core.mjs"),
  );
  return {
    adapterDir,
    hookPath: path.join(adapterDir, "checkpoint-hook.mjs"),
  };
}

async function writeCodexInstallerConfig(root) {
  const configFile = path.join(root, "installer.yaml");
  await writeFile(
    configFile,
    [
      "targets:",
      "  opencode:",
      "    enabled: true",
      "    home: /unused",
      "  codex:",
      "    enabled: true",
      "  claude:",
      "    enabled: false",
      "  cursor:",
      "    enabled: false",
      "  hermes:",
      "    enabled: false",
      "",
    ].join("\n"),
  );
  return configFile;
}

function runCodexInstallerResult(
  args,
  { cwd, configFile, opencodeHome, codexHome, syncCodex },
) {
  return spawnSync("bash", [path.join(REPOSITORY_ROOT, "install.sh"), ...args], {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      HOME: path.dirname(opencodeHome),
      OPS_CONFIG_FILE: configFile,
      OPS_OPENCODE_HOME: opencodeHome,
      OPS_CODEX_HOME: codexHome,
      OPS_SYNC_CLAUDE: "false",
      OPS_SYNC_CURSOR: "false",
      OPS_SYNC_HERMES: "false",
      OPS_ANTIGRAVITY_PATH: path.join(cwd, "absent-antigravity"),
      ...(syncCodex === undefined ? {} : { OPS_SYNC_CODEX: syncCodex }),
    },
  });
}

function runCodexInstaller(args, options) {
  const result = runCodexInstallerResult(args, options);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  return result.stdout;
}

function assertOutputOrder(output, labels) {
  let previous = -1;
  for (const label of labels) {
    const index = output.indexOf(label);
    assert.ok(index >= 0, `missing installer output label: ${label}`);
    assert.ok(index > previous, `installer output is out of order at: ${label}`);
    previous = index;
  }
}

test("codex MCP runtime handles the protocol and appends shared-contract records", async (t) => {
  const worktree = await mkdtemp(path.join(os.tmpdir(), "checkpoint-codex-mcp-"));
  t.after(() => rm(worktree, { recursive: true, force: true }));
  const runtime = createMcpRuntime({ checkpointCore });

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
  assert.deepEqual(schema.properties.close_session, { type: "boolean", default: false });

  const called = await runtime.handleMessage({
    jsonrpc: "2.0",
    id: 3,
    method: "tools/call",
    params: {
      name: "checkpoint",
      arguments: {
        done: "Adapter wrote record",
        next: "Inspect record now",
        _workspace_root: worktree,
        _checkpoint_session_id: "codex-session",
      },
    },
  });
  assert.equal(called.result.isError, undefined);
  assert.match(called.result.content[0].text, /Checkpoint saved\./);
  assert.match(called.result.content[0].text, /Input usage .*: unknown/);
  assert.match(called.result.content[0].text, /Input K-tokens .*: unknown/);
  assert.match(called.result.content[0].text, /Remaining input K-tokens .*: unknown/);

  const relativePath = checkpointCore.checkpointPath("codex-session");
  const recordFile = path.join(worktree, ...relativePath.split("/"));
  const raw = await readFile(recordFile, "utf8");
  const [record] = checkpointCore.parseCheckpointJsonl(raw);
  assert.deepEqual(Object.keys(record), RECORD_KEYS);
  assert.equal(record.session_id, "codex-session");
  assert.equal(record.context_used, null);
  assert.equal(record.agent, null);
  assert.equal(record.session_title, null);
  assert.equal(record.step_failed, false);
  assert.doesNotMatch(raw, /_checkpoint_session_id|_workspace_root|turn|usedKTokens|remaining/i);

  const again = await runtime.handleMessage({
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
        _workspace_root: worktree,
        _checkpoint_session_id: "codex-session",
      },
    },
  });
  assert.equal(again.result.isError, undefined);
  const records = checkpointCore.parseCheckpointJsonl(await readFile(recordFile, "utf8"));
  assert.equal(records.length, 2);
  assert.equal(records[1].step_failed, true);
  let fullLog = checkpointCore.analyzeCheckpointLog(await readFile(recordFile, "utf8"));
  assert.equal(fullLog.state, "CLOSED");
  assert.deepEqual(
    fullLog.records.map((record) => record.status ?? "checkpoint"),
    ["open", "checkpoint", "open", "checkpoint", "closed"],
  );

  const reopened = await runtime.handleMessage({
    jsonrpc: "2.0",
    id: 41,
    method: "tools/call",
    params: {
      name: "checkpoint",
      arguments: {
        done: "Suite continues forward",
        next: "Session remains available",
        close_session: false,
        _workspace_root: worktree,
        _checkpoint_session_id: "codex-session",
      },
    },
  });
  assert.equal(reopened.result.isError, undefined);
  fullLog = checkpointCore.analyzeCheckpointLog(await readFile(recordFile, "utf8"));
  assert.equal(fullLog.state, "OPEN");
  assert.equal(fullLog.checkpoints.length, 3);

  const pathResult = await runtime.handleMessage({
    jsonrpc: "2.0",
    id: 5,
    method: "tools/call",
    params: { name: "checkpoint_path", arguments: { session_id: "lookup-only" } },
  });
  assert.equal(pathResult.result.content[0].text, ".agent-checkpoints/lookup-only.jsonl");
  await assert.rejects(
    access(path.join(worktree, ".agent-checkpoints", "lookup-only.jsonl")),
    /ENOENT/,
  );

  for (const args of [
    { done: "No injection here", next: "Should not persist" },
    { done: "Partial injection", next: "Should not persist", _workspace_root: worktree },
  ]) {
    const rejected = await runtime.handleMessage({
      jsonrpc: "2.0",
      id: 6,
      method: "tools/call",
      params: { name: "checkpoint", arguments: args },
    });
    assert.equal(rejected.result.isError, true);
    assert.match(rejected.result.content[0].text, /_workspace_root and _checkpoint_session_id/);
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
          _workspace_root: worktree,
          _checkpoint_session_id: sessionId,
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

  const unknown = await runtime.handleMessage({ jsonrpc: "2.0", id: 7, method: "resources/list" });
  assert.equal(unknown.error.code, -32601);
  const after = await runtime.handleMessage({ jsonrpc: "2.0", id: 8, method: "tools/list" });
  assert.equal(after.result.tools.length, 2);
});

test("codex MCP stdio server flushes tool-call responses before exiting", async (t) => {
  const worktree = await mkdtemp(path.join(os.tmpdir(), "checkpoint-codex-stdio-"));
  t.after(() => rm(worktree, { recursive: true, force: true }));
  // The server resolves checkpoint-core.mjs as an install-time sibling;
  // assemble the installed layout in a temporary adapter directory.
  const adapterDir = path.join(worktree, "adapter");
  await mkdir(adapterDir);
  await copyFile(
    path.join(REPOSITORY_ROOT, "codex/checkpoint-mcp-server.mjs"),
    path.join(adapterDir, "checkpoint-mcp-server.mjs"),
  );
  await copyFile(
    path.join(REPOSITORY_ROOT, "codex/checkpoint-mcp-runtime.mjs"),
    path.join(adapterDir, "checkpoint-mcp-runtime.mjs"),
  );
  await copyFile(
    path.join(REPOSITORY_ROOT, "packages/checkpoint-core/src/index.js"),
    path.join(adapterDir, "checkpoint-core.mjs"),
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
          _workspace_root: worktree,
          _checkpoint_session_id: "stdio-session",
        },
      },
    },
    { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "checkpoint_path", arguments: { session_id: "stdio-session" } } },
  ];
  const server = spawnSync("node", [path.join(adapterDir, "checkpoint-mcp-server.mjs")], {
    input: `${requests.map((request) => JSON.stringify(request)).join("\n")}\n`,
    encoding: "utf8",
  });
  assert.equal(server.status, 0, server.stderr);
  const responses = server.stdout.trim().split("\n").map((line) => JSON.parse(line));
  assert.equal(responses.length, 3);
  assert.equal(responses[0].result.protocolVersion, "2025-03-26");
  assert.match(responses[1].result.content[0].text, /Checkpoint saved\./);
  assert.equal(responses[2].result.content[0].text, ".agent-checkpoints/stdio-session.jsonl");
  const raw = await readFile(
    path.join(worktree, ...checkpointCore.checkpointPath("stdio-session").split("/")),
    "utf8",
  );
  const [record] = checkpointCore.parseCheckpointJsonl(raw);
  assert.deepEqual(Object.keys(record), RECORD_KEYS);
  assert.equal(record.session_id, "stdio-session");
});

test("codex MCP writes stay eight-field while legacy six-field logs remain readable", async (t) => {
  const worktree = await mkdtemp(path.join(os.tmpdir(), "checkpoint-codex-legacy-"));
  t.after(() => rm(worktree, { recursive: true, force: true }));
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
        _workspace_root: worktree,
        _checkpoint_session_id: "fresh",
      },
    },
  });
  const freshRaw = await readFile(
    path.join(worktree, ...checkpointCore.checkpointPath("fresh").split("/")),
    "utf8",
  );
  const [fresh] = checkpointCore.parseCheckpointJsonl(freshRaw);
  assert.deepEqual(Object.keys(fresh), RECORD_KEYS);

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

test("codex SessionStart sources append open and preserve exact instruction output", async (t) => {
  const { adapterDir, hookPath } = await stageHookAdapter(t);
  for (const source of ["startup", "resume", "clear", "compact"]) {
    const sessionId = `sess-${source}`;
    const result = runHook({
      hook_event_name: "SessionStart",
      session_id: sessionId,
      transcript_path: null,
      cwd: adapterDir,
      model: "gpt-x",
      permission_mode: "default",
      source,
    }, hookPath);
    assert.equal(result.status, 0, result.stderr);
    const output = JSON.parse(result.stdout);
    assert.deepEqual(Object.keys(output), ["hookSpecificOutput"]);
    assert.deepEqual(Object.keys(output.hookSpecificOutput).sort(), [
      "additionalContext",
      "hookEventName",
    ]);
    assert.equal(output.hookSpecificOutput.hookEventName, "SessionStart");
    const context = output.hookSpecificOutput.additionalContext;
    assert.ok(context.includes(INSTRUCTION_MARKER));
    assert.ok(context.includes(`Session checkpoint ID: ${sessionId}`));
    assert.ok(context.includes("subagent sets `close_session=true` only on its final checkpoint"));
    assert.ok(context.includes("Maintainer or parent leaves it false"));
    assert.ok(context.includes("reported **input usage**"));
    assert.ok(context.includes("Across providers"));
    assert.ok(context.includes("approximately 220k input tokens are a soft planning signal"));
    assert.ok(context.includes("At or above approximately 272k input tokens"));
    assert.ok(context.includes("372k input rejection boundary is emergency headroom"));
    assert.ok(context.includes("previous completed step or latest harness snapshot"));

    const raw = await readFile(
      path.join(adapterDir, ...checkpointCore.checkpointPath(sessionId).split("/")),
      "utf8",
    );
    const [record] = checkpointCore.parseCheckpointLogJsonl(raw);
    assert.deepEqual(Object.keys(record), ["timestamp", "session_id", "event", "status"]);
    assert.equal(record.session_id, sessionId);
    assert.equal(record.event, "session_status");
    assert.equal(record.status, "open");
    assert.doesNotMatch(raw, /"(?:source|model|transcript_path|turn_id)"/);
  }

  const duplicate = runHook({
    hook_event_name: "SessionStart",
    session_id: "sess-startup",
    transcript_path: null,
    cwd: adapterDir,
    model: "gpt-x",
    permission_mode: "default",
    source: "resume",
  }, hookPath);
  assert.equal(duplicate.status, 0, duplicate.stderr);
  const runtime = createMcpRuntime({ checkpointCore });
  const checkpoint = await runtime.handleMessage({
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: {
      name: "checkpoint",
      arguments: {
        done: "Codex session opened",
        next: "Mixed log inspected",
        _workspace_root: adapterDir,
        _checkpoint_session_id: "sess-startup",
      },
    },
  });
  assert.equal(checkpoint.result.isError, undefined);
  const mixedRaw = await readFile(
    path.join(adapterDir, ...checkpointCore.checkpointPath("sess-startup").split("/")),
    "utf8",
  );
  const mixed = checkpointCore.analyzeCheckpointLog(mixedRaw);
  assert.equal(mixed.state, "OPEN");
  assert.equal(mixed.records.length, 4);
  assert.equal(mixed.checkpoints.length, 1);
  assert.deepEqual(mixed.analysis.work, { success: 1, count: 1, percent: 100 });

  for (const input of [
    { hook_event_name: "SessionStart", session_id: "", cwd: adapterDir },
    { hook_event_name: "SessionStart", session_id: "missing-cwd", cwd: "" },
  ]) {
    const invalid = runHook(input, hookPath);
    assert.equal(invalid.status, 1);
    assert.equal(invalid.stdout, "");
    assert.match(invalid.stderr, /SessionStart requires a non-empty/);
  }

  const notDirectory = path.join(adapterDir, "not-a-workspace");
  await writeFile(notDirectory, "ordinary file\n");
  const writeFailure = runHook({
    hook_event_name: "SessionStart",
    session_id: "write-failure",
    cwd: notDirectory,
    source: "startup",
  }, hookPath);
  assert.equal(writeFailure.status, 1);
  assert.equal(writeFailure.stdout, "");
  assert.match(writeFailure.stderr, /^agent-checkpoint hook: /);
  assert.match(writeFailure.stderr, /ENOTDIR|not a directory/i);
});

test("codex hook pairs allow with updatedInput for the checkpoint PreToolUse", async (t) => {
  const { hookPath } = await stageHookAdapter(t);
  const result = runHook({
    hook_event_name: "PreToolUse",
    session_id: "sess-xyz",
    turn_id: "turn-1",
    transcript_path: null,
    cwd: "/workspace with space",
    model: "gpt-x",
    permission_mode: "default",
    tool_name: "mcp__agent_checkpoint__checkpoint",
    tool_input: {
      done: "a b c",
      next: "d e f",
      step_failed: true,
      close_session: false,
      _workspace_root: "/stale",
      _checkpoint_session_id: "stale-id",
    },
    tool_use_id: "toolu_1",
  }, hookPath);
  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  const specific = output.hookSpecificOutput;
  assert.deepEqual(Object.keys(specific).sort(), [
    "hookEventName",
    "permissionDecision",
    "updatedInput",
  ]);
  assert.equal(specific.hookEventName, "PreToolUse");
  assert.equal(specific.permissionDecision, "allow");
  assert.deepEqual(specific.updatedInput, {
    done: "a b c",
    next: "d e f",
    step_failed: true,
    close_session: false,
    _workspace_root: "/workspace with space",
    _checkpoint_session_id: "sess-xyz",
  });
});

test("codex hook runs when invoked through a symlinked install path", async (t) => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "checkpoint-codex-hook-link-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await copyFile(HOOK_PATH, path.join(dir, "checkpoint-hook.mjs"));
  await copyFile(
    path.join(REPOSITORY_ROOT, "codex/checkpoint-instruction.md"),
    path.join(dir, "checkpoint-instruction.md"),
  );
  await copyFile(
    path.join(REPOSITORY_ROOT, "packages/checkpoint-core/src/index.js"),
    path.join(dir, "checkpoint-core.mjs"),
  );
  const result = spawnSync("node", [path.join(dir, "checkpoint-hook.mjs")], {
    input: JSON.stringify({
      hook_event_name: "SessionStart",
      session_id: "linked-session",
      transcript_path: null,
      cwd: dir,
      model: "m",
      permission_mode: "p",
      source: "startup",
    }),
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.equal(output.hookSpecificOutput.hookEventName, "SessionStart");
  assert.ok(output.hookSpecificOutput.additionalContext.includes("Session checkpoint ID: linked-session"));
});

test("codex hook ignores Stop, other tools, and unknown events", async (t) => {
  const { adapterDir, hookPath } = await stageHookAdapter(t);
  const opened = runHook({
    hook_event_name: "SessionStart",
    session_id: "s",
    transcript_path: null,
    cwd: adapterDir,
    model: "m",
    permission_mode: "p",
    source: "startup",
  }, hookPath);
  assert.equal(opened.status, 0, opened.stderr);
  const logFile = path.join(adapterDir, ...checkpointCore.checkpointPath("s").split("/"));
  const before = await readFile(logFile, "utf8");

  const otherTool = runHook({
    hook_event_name: "PreToolUse",
    session_id: "s",
    turn_id: "t",
    transcript_path: null,
    cwd: "/w",
    model: "m",
    permission_mode: "p",
    tool_name: "mcp__other__ping",
    tool_input: {},
    tool_use_id: "u",
  }, hookPath);
  assert.equal(otherTool.status, 0, otherTool.stderr);
  assert.equal(otherTool.stdout, "");

  for (const otherEvent of [
    {
      hook_event_name: "Stop",
      session_id: "s",
      turn_id: "turn-1",
      stop_hook_active: false,
      cwd: adapterDir,
    },
    { hook_event_name: "SessionEnd", session_id: "s", cwd: adapterDir },
    {
      hook_event_name: "PostToolUse",
      session_id: "s",
      turn_id: "t",
      transcript_path: null,
      cwd: adapterDir,
      model: "m",
      permission_mode: "p",
      tool_name: "mcp__agent_checkpoint__checkpoint",
      tool_input: {},
      tool_response: {},
      tool_use_id: "u",
    },
  ]) {
    const result = runHook(otherEvent, hookPath);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, "");
  }
  const after = await readFile(logFile, "utf8");
  assert.equal(after, before);
  assert.equal(checkpointCore.analyzeCheckpointLog(after).state, "OPEN");
  assert.equal(after.includes('"status":"closed"'), false);

  const invalid = runHook("not json", hookPath);
  assert.equal(invalid.status, 1);
  assert.match(invalid.stderr, /invalid JSON/);
});

test("codex installer deploys adapter/profile and preserves the base config", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "checkpoint-codex-install-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const opencodeHome = path.join(root, "opencode-home");
  const codexHome = path.join(root, "Codex Home");
  await mkdir(codexHome, { recursive: true });
  const baseConfig = path.join(codexHome, "config.toml");
  const baseContent = 'model = "gpt-5"\n\n[profiles.alt]\napproval_policy = "never"\n';
  await writeFile(baseConfig, baseContent);
  const configFile = await writeCodexInstallerConfig(root);

  const output = runCodexInstaller([], { cwd: root, configFile, opencodeHome, codexHome });
  assert.match(output, /Codex checkpoint adapter/);
  assert.match(output, /agent-checkpoint\.config\.toml/);
  assert.match(output, /Codex Desktop runtime:\s+codex -p agent-checkpoint/);
  assert.match(output, /codex --profile-v2 agent-checkpoint/);
  assertOutputOrder(output, [
    "Checkpoint adapter upgrade prerequisite:",
    "Step 1.1:",
    "Installed: lib/opencode-processing-skills/checkpoint-core.mjs",
    "Installed: lib/opencode-processing-skills/checkpoint-watch/bin/checkpoint-watch.js",
    "Installed: lib/opencode-processing-skills/checkpoint-watch/src/index.js",
    "Installed: lib/opencode-processing-skills/checkpoint-runtime.mjs",
    "Installed: plugins/checkpoint.ts",
    "Step 7: Installing Codex checkpoint adapter",
    "Installed: agent-checkpoint/checkpoint-core.mjs",
    "Installed: agent-checkpoint/checkpoint-mcp-runtime.mjs",
    "Installed: agent-checkpoint/checkpoint-mcp-server.mjs",
    "Installed: agent-checkpoint/checkpoint-hook.mjs",
    "Installed: agent-checkpoint.config.toml",
    "Launch command:",
    "Restart OpenCode",
    "Start/restart Codex only after the dashboard",
    "Activate with:",
  ]);

  assert.equal(await readFile(baseConfig, "utf8"), baseContent);
  assert.match(await readFile(path.join(opencodeHome, "plugins/checkpoint.ts"), "utf8"), /CheckpointPlugin/);
  const executionSkill = await readFile(
    path.join(codexHome, "skills/execute-work-package/SKILL.md"),
    "utf8",
  );
  assert.match(executionSkill, /Execute Work Package/);
  assert.match(executionSkill, /Package Sizing Note/);
  assert.match(executionSkill, /Call `checkpoint_path` with the failed Implementer `task_id`/);

  const adapterDir = path.join(codexHome, "agent-checkpoint");
  for (const name of [
    "checkpoint-hook.mjs",
    "checkpoint-instruction.md",
    "checkpoint-mcp-runtime.mjs",
    "checkpoint-mcp-server.mjs",
    "checkpoint-core.mjs",
  ]) {
    const content = await readFile(path.join(adapterDir, name), "utf8");
    assert.ok(content.length > 0, name);
  }
  assert.match(
    await readFile(path.join(adapterDir, "checkpoint-core.mjs"), "utf8"),
    /export async function checkpoint/,
  );
  const instruction = await readFile(path.join(adapterDir, "checkpoint-instruction.md"), "utf8");
  assert.match(instruction, /codex-checkpoint-instruction/);
  assert.match(instruction, /close_session=true/);
  assert.match(instruction, /child declaration closes that shared persisted row/);

  const profile = await readFile(path.join(codexHome, "agent-checkpoint.config.toml"), "utf8");
  assert.match(profile, /\[features\]\nhooks = true/);
  assert.match(profile, /\[mcp_servers\.agent_checkpoint\]/);
  assert.match(profile, /enabled_tools = \["checkpoint", "checkpoint_path"\]/);
  assert.match(profile, /default_tools_approval_mode = "auto"/);
  assert.match(
    profile,
    /\[mcp_servers\.agent_checkpoint\.tools\.checkpoint\]\napproval_mode = "approve"/,
  );
  assert.match(
    profile,
    /\[mcp_servers\.agent_checkpoint\.tools\.checkpoint_path\]\napproval_mode = "approve"/,
  );
  assert.match(profile, /Codex Desktop runtime: codex -p agent-checkpoint/);
  assert.match(profile, /\[\[hooks\.SessionStart\]\]/);
  assert.match(profile, /\[\[hooks\.PreToolUse\]\]/);
  assert.doesNotMatch(profile, /hooks\.(?:Stop|SessionEnd)/);
  assert.match(profile, /matcher = "mcp__agent_checkpoint__checkpoint"/);
  assert.ok(
    profile.includes(`args = ["${adapterDir}/checkpoint-mcp-server.mjs"]`),
    profile,
  );
  assert.ok(
    profile.includes(`\\"${adapterDir}/checkpoint-hook.mjs\\"`),
    profile,
  );
  const nodeMatch = profile.match(/^command = "(\/[^"]+)"/m);
  assert.ok(nodeMatch, profile);
  await access(nodeMatch[1]);

  const protectedHook = path.join(root, "protected-hook.mjs");
  await writeFile(protectedHook, "protected\n");
  await rm(path.join(adapterDir, "checkpoint-hook.mjs"));
  await symlink(protectedHook, path.join(adapterDir, "checkpoint-hook.mjs"));
  const protectedProfile = path.join(root, "protected.toml");
  await writeFile(protectedProfile, "protected\n");
  await rm(path.join(codexHome, "agent-checkpoint.config.toml"));
  await symlink(protectedProfile, path.join(codexHome, "agent-checkpoint.config.toml"));
  await writeFile(path.join(adapterDir, "checkpoint-mcp-server.mjs"), "stale\n");

  runCodexInstaller([], { cwd: root, configFile, opencodeHome, codexHome });
  assert.equal(await readFile(path.join(adapterDir, "checkpoint-hook.mjs"), "utf8"), "protected\n");
  assert.equal(
    await readFile(path.join(codexHome, "agent-checkpoint.config.toml"), "utf8"),
    "protected\n",
  );
  assert.match(
    await readFile(path.join(adapterDir, "checkpoint-mcp-server.mjs"), "utf8"),
    /createMcpRuntime/,
  );
  assert.equal(await readFile(baseConfig, "utf8"), baseContent);
});

test("codex installer preserves a symlinked whole adapter directory and stops before activation", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "checkpoint-codex-dir-link-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const opencodeHome = path.join(root, "opencode-home");
  const codexHome = path.join(root, "codex-home");
  const protectedDir = path.join(root, "protected-adapter");
  await mkdir(codexHome, { recursive: true });
  await mkdir(protectedDir);
  const sentinel = path.join(protectedDir, "sentinel.txt");
  await writeFile(sentinel, "keep every byte\n");
  const adapterLink = path.join(codexHome, "agent-checkpoint");
  await symlink(protectedDir, adapterLink);
  const configFile = await writeCodexInstallerConfig(root);
  const beforeEntries = await readdir(protectedDir);
  const beforeSentinel = await readFile(sentinel);

  const result = runCodexInstallerResult([], {
    cwd: root,
    configFile,
    opencodeHome,
    codexHome,
  });

  assert.notEqual(result.status, 0);
  assert.equal((await lstat(adapterLink)).isSymbolicLink(), true);
  assert.equal(await readlink(adapterLink), protectedDir);
  assert.deepEqual(await readdir(protectedDir), beforeEntries);
  assert.deepEqual(await readFile(sentinel), beforeSentinel);
  assert.doesNotMatch(result.stdout, /Step 1\.1:/);
  assert.match(result.stderr, /required checkpoint reader\/core is a symlink/);
  assert.ok(result.stderr.includes(adapterLink), result.stderr);
  assert.match(result.stderr, /Update the user-managed symlink target/);
  assert.match(result.stderr, /rerun install\.sh/);
  await assert.rejects(access(path.join(codexHome, "agent-checkpoint.config.toml")), /ENOENT/);
  await assert.rejects(access(path.join(opencodeHome, "plugins/checkpoint.ts")), /ENOENT/);
});

test("codex installer stops before hook and profile changes for a bundled-core symlink", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "checkpoint-codex-core-link-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const opencodeHome = path.join(root, "opencode-home");
  const codexHome = path.join(root, "codex-home");
  const adapterDir = path.join(codexHome, "agent-checkpoint");
  await mkdir(adapterDir, { recursive: true });
  const protectedCore = path.join(root, "protected-core.mjs");
  await writeFile(protectedCore, "protected core\n");
  const coreLink = path.join(adapterDir, "checkpoint-core.mjs");
  await symlink(protectedCore, coreLink);
  const staleHook = path.join(adapterDir, "checkpoint-hook.mjs");
  await writeFile(staleHook, "stale hook remains\n");
  const profile = path.join(codexHome, "agent-checkpoint.config.toml");
  await writeFile(profile, "stale profile remains\n");
  const baseConfig = path.join(codexHome, "config.toml");
  await writeFile(baseConfig, 'model = "unchanged"\n');
  const configFile = await writeCodexInstallerConfig(root);

  const result = runCodexInstallerResult([], {
    cwd: root,
    configFile,
    opencodeHome,
    codexHome,
  });
  assert.notEqual(result.status, 0);
  assert.doesNotMatch(result.stdout, /Step 1\.1:/);
  assert.match(result.stderr, /required checkpoint reader\/core is a symlink/);
  assert.ok(result.stderr.includes(coreLink), result.stderr);
  assert.match(result.stderr, /rerun install\.sh/);
  assert.equal((await lstat(coreLink)).isSymbolicLink(), true);
  assert.equal(await readlink(coreLink), protectedCore);
  assert.equal(await readFile(protectedCore, "utf8"), "protected core\n");
  assert.equal(await readFile(staleHook, "utf8"), "stale hook remains\n");
  assert.equal(await readFile(profile, "utf8"), "stale profile remains\n");
  assert.equal(await readFile(baseConfig, "utf8"), 'model = "unchanged"\n');
  await assert.rejects(access(path.join(opencodeHome, "plugins/checkpoint.ts")), /ENOENT/);
});

test("codex installer skips all adapter artifacts when the target is disabled", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "checkpoint-codex-disabled-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const opencodeHome = path.join(root, "opencode-home");
  const codexHome = path.join(root, "codex-home");
  await mkdir(codexHome, { recursive: true });
  const configFile = await writeCodexInstallerConfig(root);

  runCodexInstaller([], { cwd: root, configFile, opencodeHome, codexHome, syncCodex: "false" });
  await assert.rejects(access(path.join(codexHome, "agent-checkpoint")), /ENOENT/);
  await assert.rejects(access(path.join(codexHome, "agent-checkpoint.config.toml")), /ENOENT/);
  await assert.rejects(access(path.join(codexHome, "skills")), /ENOENT/);
  assert.match(await readFile(path.join(opencodeHome, "plugins/checkpoint.ts"), "utf8"), /CheckpointPlugin/);
});

test("codex installer skips the adapter in project mode", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "checkpoint-codex-project-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const project = path.join(root, "project workspace");
  await mkdir(project);
  const opencodeHome = path.join(root, "forbidden-opencode");
  const codexHome = path.join(root, "codex-home");
  await mkdir(codexHome, { recursive: true });
  const configFile = await writeCodexInstallerConfig(root);

  runCodexInstaller(["--project"], { cwd: project, configFile, opencodeHome, codexHome });
  await assert.rejects(access(path.join(codexHome, "agent-checkpoint")), /ENOENT/);
  await assert.rejects(access(path.join(codexHome, "agent-checkpoint.config.toml")), /ENOENT/);
  assert.match(
    await readFile(path.join(project, ".opencode/plugins/checkpoint.ts"), "utf8"),
    /CheckpointPlugin/,
  );
});
