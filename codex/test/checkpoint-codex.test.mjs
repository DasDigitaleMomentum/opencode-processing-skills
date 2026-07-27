import assert from "node:assert/strict";
import { access, copyFile, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
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

function runHook(input) {
  return spawnSync("node", [HOOK_PATH], {
    input: typeof input === "string" ? input : JSON.stringify(input),
    encoding: "utf8",
  });
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

function runCodexInstaller(args, { cwd, configFile, opencodeHome, codexHome, syncCodex }) {
  const result = spawnSync("bash", [path.join(REPOSITORY_ROOT, "install.sh"), ...args], {
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
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  return result.stdout;
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
  assert.match(called.result.content[0].text, /harness telemetry\): unknown/);
  assert.match(called.result.content[0].text, /headroom\): unknown/);

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
  assert.doesNotMatch(raw, /_checkpoint_session_id|_workspace_root|turn|remaining/i);

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
        _workspace_root: worktree,
        _checkpoint_session_id: "codex-session",
      },
    },
  });
  assert.equal(again.result.isError, undefined);
  const records = checkpointCore.parseCheckpointJsonl(await readFile(recordFile, "utf8"));
  assert.equal(records.length, 2);
  assert.equal(records[1].step_failed, true);

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
  assert.equal(records.length, 2);

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

test("codex hook injects the checkpoint instruction and session ID on SessionStart", () => {
  const result = runHook({
    hook_event_name: "SessionStart",
    session_id: "sess-123",
    transcript_path: null,
    cwd: "/workspace",
    model: "gpt-x",
    permission_mode: "default",
    source: "startup",
  });
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
  assert.ok(context.includes("Session checkpoint ID: sess-123"));
});

test("codex hook pairs allow with updatedInput for the checkpoint PreToolUse", () => {
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
      _workspace_root: "/stale",
      _checkpoint_session_id: "stale-id",
    },
    tool_use_id: "toolu_1",
  });
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
  const result = spawnSync("node", [path.join(dir, "checkpoint-hook.mjs")], {
    input: JSON.stringify({
      hook_event_name: "SessionStart",
      session_id: "linked-session",
      transcript_path: null,
      cwd: "/w",
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

test("codex hook ignores other tools and events and rejects invalid JSON", () => {
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
  });
  assert.equal(otherTool.status, 0, otherTool.stderr);
  assert.equal(otherTool.stdout, "");

  const otherEvent = runHook({
    hook_event_name: "PostToolUse",
    session_id: "s",
    turn_id: "t",
    transcript_path: null,
    cwd: "/w",
    model: "m",
    permission_mode: "p",
    tool_name: "mcp__agent_checkpoint__checkpoint",
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
  assert.match(output, /codex --profile-v2 agent-checkpoint/);

  assert.equal(await readFile(baseConfig, "utf8"), baseContent);
  assert.match(await readFile(path.join(opencodeHome, "plugins/checkpoint.ts"), "utf8"), /CheckpointPlugin/);
  assert.match(
    await readFile(path.join(codexHome, "skills/execute-work-package/SKILL.md"), "utf8"),
    /Execute Work Package/,
  );

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
  assert.match(
    await readFile(path.join(adapterDir, "checkpoint-instruction.md"), "utf8"),
    /codex-checkpoint-instruction/,
  );

  const profile = await readFile(path.join(codexHome, "agent-checkpoint.config.toml"), "utf8");
  assert.match(profile, /\[features\]\nhooks = true/);
  assert.match(profile, /\[mcp_servers\.agent_checkpoint\]/);
  assert.match(profile, /enabled_tools = \["checkpoint", "checkpoint_path"\]/);
  assert.match(profile, /default_tools_approval_mode = "auto"/);
  assert.match(profile, /\[\[hooks\.SessionStart\]\]/);
  assert.match(profile, /\[\[hooks\.PreToolUse\]\]/);
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
