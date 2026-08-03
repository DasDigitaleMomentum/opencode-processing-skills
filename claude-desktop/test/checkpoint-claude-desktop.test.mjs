import assert from "node:assert/strict";
import {
  access,
  chmod,
  copyFile,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  symlink,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

import * as checkpointCore from "../../packages/checkpoint-core/src/index.js";

const RUNTIME_URL = new URL("../agent-checkpoint/checkpoint-mcp-runtime.mjs", import.meta.url);
const CONFIGURE_URL = new URL("../agent-checkpoint/configure-desktop.mjs", import.meta.url);
const CONFIGURE_PATH = fileURLToPath(CONFIGURE_URL);
const REPOSITORY_ROOT = path.resolve(import.meta.dirname, "../..");
const INSTALLER_PATH = path.join(REPOSITORY_ROOT, "install.sh");
const CONFIG_EXAMPLE_PATH = path.join(REPOSITORY_ROOT, "config.yaml.example");
const DESKTOP_README_PATH = path.join(
  REPOSITORY_ROOT,
  "claude-desktop/agent-checkpoint/README.md",
);

async function loadRuntime() {
  return import(RUNTIME_URL.href);
}

async function loadConfigureDesktop() {
  return import(CONFIGURE_URL.href);
}

function runConfigureDesktop(args) {
  return spawnSync("node", [CONFIGURE_PATH, ...args], { encoding: "utf8" });
}

async function createInstallerFixture(t, prefix) {
  const stage = await mkdtemp(path.join(os.tmpdir(), prefix));
  t.after(() => rm(stage, { recursive: true, force: true }));
  const home = path.join(stage, "home");
  const temp = path.join(stage, "tmp");
  const nodeBin = path.join(stage, "bin");
  const noNodeBin = path.join(stage, "no-node-bin");
  const opencodeHome = path.join(stage, "opencode");
  const claudeHome = path.join(stage, "claude-code");
  const desktopHome = path.join(stage, "Claude Desktop Home");
  const configFile = path.join(stage, "installer.yaml");
  await mkdir(home);
  await mkdir(temp);
  await mkdir(nodeBin);
  await mkdir(noNodeBin);
  await symlink(process.execPath, path.join(nodeBin, "node"));
  for (const command of ["awk", "dirname", "grep", "head", "sed", "tr"]) {
    const resolved = spawnSync("which", [command], { encoding: "utf8" });
    assert.equal(resolved.status, 0, `required test command not found: ${command}`);
    await symlink(resolved.stdout.trim(), path.join(noNodeBin, command));
  }
  await writeFile(
    configFile,
    [
      "targets:",
      "  opencode:",
      "    enabled: true",
      `    home: \"${opencodeHome}\"`,
      "  codex:",
      "    enabled: false",
      "  claude:",
      "    enabled: false",
      "  claude_desktop:",
      "    enabled: auto",
      `    home: \"${desktopHome}\"`,
      "  cursor:",
      "    enabled: false",
      "  hermes:",
      "    enabled: false",
      "",
    ].join("\n"),
  );
  return {
    stage,
    home,
    temp,
    nodeBin,
    noNodeBin,
    opencodeHome,
    claudeHome,
    desktopHome,
    configFile,
  };
}

function runInstaller(
  fixture,
  {
    args = [],
    syncDesktop,
    desktopHome = fixture.desktopHome,
    pathValue = `${fixture.nodeBin}:/usr/bin:/bin`,
  } = {},
) {
  return spawnSync("/bin/bash", [INSTALLER_PATH, ...args], {
    cwd: fixture.stage,
    encoding: "utf8",
    env: {
      ...process.env,
      HOME: fixture.home,
      TMPDIR: fixture.temp,
      PATH: pathValue,
      OPS_CONFIG_FILE: fixture.configFile,
      OPS_OPENCODE_HOME: fixture.opencodeHome,
      OPS_CODEX_HOME: path.join(fixture.stage, "codex"),
      OPS_CLAUDE_HOME: fixture.claudeHome,
      OPS_CLAUDE_DESKTOP_HOME: desktopHome,
      OPS_CURSOR_HOME: path.join(fixture.stage, "cursor"),
      OPS_HERMES_HOME: path.join(fixture.stage, "hermes"),
      OPS_SYNC_CODEX: "false",
      OPS_SYNC_CLAUDE: "false",
      OPS_SYNC_CURSOR: "false",
      OPS_SYNC_HERMES: "false",
      OPS_ANTIGRAVITY_PATH: path.join(fixture.stage, "absent-antigravity"),
      ...(syncDesktop === undefined
        ? {}
        : { OPS_SYNC_CLAUDE_DESKTOP: syncDesktop }),
    },
  });
}

async function callTool(runtime, name, args, id = 1) {
  return runtime.handleMessage({
    jsonrpc: "2.0",
    id,
    method: "tools/call",
    params: { name, arguments: args },
  });
}

async function expectNoCheckpointDirectory(workspaceRoot) {
  await assert.rejects(access(path.join(workspaceRoot, ".agent-checkpoints")), /ENOENT/);
}

test("desktop MCP initialization advertises the explicit identity boundary and exact tools", async () => {
  const { createMcpRuntime } = await loadRuntime();
  const runtime = createMcpRuntime({ checkpointCore });

  const initialize = await runtime.handleMessage({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: { protocolVersion: "2025-03-26" },
  });
  assert.equal(initialize.result.protocolVersion, "2025-03-26");
  assert.equal(initialize.result.serverInfo.name, "agent-checkpoint");
  assert.match(initialize.result.instructions, /one (?:unique|stable) session ID/i);
  assert.match(initialize.result.instructions, /reuse/i);
  assert.match(initialize.result.instructions, /absolute workspace/i);
  assert.equal(
    await runtime.handleMessage({ jsonrpc: "2.0", method: "notifications/initialized" }),
    null,
  );

  const listed = await runtime.handleMessage({
    jsonrpc: "2.0",
    id: 2,
    method: "tools/list",
  });
  assert.deepEqual(
    listed.result.tools.map((tool) => tool.name),
    ["checkpoint", "checkpoint_path"],
  );
  const [checkpointTool, pathTool] = listed.result.tools;
  assert.deepEqual(checkpointTool.inputSchema.required, [
    "workspace_root",
    "session_id",
    "done",
    "next",
  ]);
  assert.equal(checkpointTool.inputSchema.additionalProperties, false);
  assert.deepEqual(checkpointTool.inputSchema.properties.step_failed, {
    type: "boolean",
    default: false,
  });
  assert.deepEqual(checkpointTool.inputSchema.properties.close_session, {
    type: "boolean",
    default: false,
  });
  assert.deepEqual(pathTool.inputSchema.required, ["workspace_root", "session_id"]);
  assert.equal(pathTool.inputSchema.additionalProperties, false);
});

test("desktop MCP validates all public inputs before writing", async (t) => {
  const { createMcpRuntime } = await loadRuntime();
  const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), "checkpoint-desktop-validation-"));
  t.after(() => rm(workspaceRoot, { recursive: true, force: true }));
  const runtime = createMcpRuntime({ checkpointCore });
  const ordinaryFile = path.join(workspaceRoot, "ordinary-file");
  await writeFile(ordinaryFile, "not a directory\n");

  const invalidCheckpointArgs = [
    {
      workspace_root: "relative/workspace",
      session_id: "session",
      done: "Runtime validates input",
      next: "Tests inspect output",
    },
    {
      workspace_root: path.join(workspaceRoot, "missing"),
      session_id: "session",
      done: "Runtime validates input",
      next: "Tests inspect output",
    },
    {
      workspace_root: ordinaryFile,
      session_id: "session",
      done: "Runtime validates input",
      next: "Tests inspect output",
    },
    {
      workspace_root: workspaceRoot,
      session_id: " ",
      done: "Runtime validates input",
      next: "Tests inspect output",
    },
    {
      workspace_root: workspaceRoot,
      session_id: "session",
      done: "",
      next: "Tests inspect output",
    },
    {
      workspace_root: workspaceRoot,
      session_id: "session",
      done: 1,
      next: "Tests inspect output",
    },
    {
      workspace_root: workspaceRoot,
      session_id: "session",
      done: "Runtime validates input",
      next: " ",
    },
    {
      workspace_root: workspaceRoot,
      session_id: "session",
      done: "Runtime validates input",
      next: "Tests inspect output",
      step_failed: "false",
    },
    {
      workspace_root: workspaceRoot,
      session_id: "session",
      done: "Runtime validates input",
      next: "Tests inspect output",
      close_session: null,
    },
    {
      workspace_root: workspaceRoot,
      session_id: "session",
      done: "Runtime validates input",
      next: "Tests inspect output",
      unexpected: true,
    },
    [],
  ];

  for (const [index, args] of invalidCheckpointArgs.entries()) {
    const rejected = await callTool(runtime, "checkpoint", args, 10 + index);
    assert.equal(rejected.result.isError, true, `case ${index}`);
    assert.doesNotMatch(rejected.result.content[0].text, /saved|success/i);
  }
  await expectNoCheckpointDirectory(workspaceRoot);

  for (const [index, args] of [
    { workspace_root: "relative", session_id: "session" },
    { workspace_root: workspaceRoot, session_id: "" },
    { workspace_root: ordinaryFile, session_id: "session" },
  ].entries()) {
    const rejected = await callTool(runtime, "checkpoint_path", args, 30 + index);
    assert.equal(rejected.result.isError, true);
  }
  await expectNoCheckpointDirectory(workspaceRoot);

  const unknownTool = await callTool(runtime, "other_tool", {}, 40);
  assert.equal(unknownTool.result.isError, true);
  assert.match(unknownTool.result.content[0].text, /unknown tool/i);
  const unknownMethod = await runtime.handleMessage({
    jsonrpc: "2.0",
    id: 41,
    method: "resources/list",
  });
  assert.equal(unknownMethod.error.code, -32601);
  const invalidRequest = await runtime.handleMessage([]);
  assert.equal(invalidRequest.error.code, -32600);
});

test("desktop MCP delegates lifecycle and path operations to the real shared core", async (t) => {
  const { createMcpRuntime } = await loadRuntime();
  const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), "checkpoint-desktop-core-"));
  t.after(() => rm(workspaceRoot, { recursive: true, force: true }));
  const runtime = createMcpRuntime({ checkpointCore });
  const sessionId = "desktop/session";

  const saved = await callTool(runtime, "checkpoint", {
    workspace_root: workspaceRoot,
    session_id: sessionId,
    done: "Desktop adapter implemented",
    next: "Inspect persisted lifecycle",
    step_failed: false,
    close_session: true,
  });
  assert.equal(saved.result.isError, undefined);
  assert.deepEqual(saved.result.structuredContent, {
    session_id: sessionId,
    path: ".agent-checkpoints/desktop%2Fsession.jsonl",
    checkpoint: {
      contextUsed: null,
      usedKTokens: null,
      remainingKTokens: null,
    },
  });
  assert.match(saved.result.content[0].text, /Checkpoint saved/);

  const checkpointFile = path.join(
    workspaceRoot,
    ...checkpointCore.checkpointPath(sessionId).split("/"),
  );
  const raw = await readFile(checkpointFile, "utf8");
  const analysis = checkpointCore.analyzeCheckpointLog(raw);
  assert.equal(analysis.state, "CLOSED");
  assert.deepEqual(
    analysis.records.map((record) => record.status ?? "checkpoint"),
    ["open", "checkpoint", "closed"],
  );
  const [record] = analysis.checkpoints;
  assert.equal(record.session_id, sessionId);
  assert.equal(record.done, "Desktop adapter implemented");
  assert.equal(record.next, "Inspect persisted lifecycle");
  assert.equal(record.step_failed, false);
  assert.equal(record.context_used, null);
  assert.equal(record.agent, null);
  assert.equal(record.session_title, null);

  const lookupId = "lookup/only";
  const lookup = await callTool(runtime, "checkpoint_path", {
    workspace_root: workspaceRoot,
    session_id: lookupId,
  });
  assert.deepEqual(lookup.result.structuredContent, {
    session_id: lookupId,
    path: ".agent-checkpoints/lookup%2Fonly.jsonl",
  });
  await assert.rejects(
    access(path.join(workspaceRoot, ...checkpointCore.checkpointPath(lookupId).split("/"))),
    /ENOENT/,
  );
});

test("desktop MCP reports shared-core filesystem failures without false success", async (t) => {
  const { createMcpRuntime } = await loadRuntime();
  const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), "checkpoint-desktop-io-"));
  t.after(() => rm(workspaceRoot, { recursive: true, force: true }));
  await writeFile(path.join(workspaceRoot, ".agent-checkpoints"), "blocks directory\n");
  const runtime = createMcpRuntime({ checkpointCore });

  const failed = await callTool(runtime, "checkpoint", {
    workspace_root: workspaceRoot,
    session_id: "io-failure",
    done: "Filesystem write attempted",
    next: "Report failure honestly",
  });
  assert.equal(failed.result.isError, true);
  assert.match(failed.result.content[0].text, /failed/i);
  assert.doesNotMatch(failed.result.content[0].text, /saved|success/i);
});

test("desktop MCP stdio server serializes requests and flushes pending I/O", async (t) => {
  const stage = await mkdtemp(path.join(os.tmpdir(), "checkpoint-desktop-stdio-"));
  t.after(() => rm(stage, { recursive: true, force: true }));
  const adapterDir = path.join(stage, "adapter");
  const workspaceRoot = path.join(stage, "workspace");
  await mkdir(adapterDir);
  await mkdir(workspaceRoot);
  for (const [source, destination] of [
    [
      path.join(REPOSITORY_ROOT, "claude-desktop/agent-checkpoint/checkpoint-mcp-runtime.mjs"),
      path.join(adapterDir, "checkpoint-mcp-runtime.mjs"),
    ],
    [
      path.join(REPOSITORY_ROOT, "claude-desktop/agent-checkpoint/checkpoint-mcp-server.mjs"),
      path.join(adapterDir, "checkpoint-mcp-server.mjs"),
    ],
    [
      path.join(REPOSITORY_ROOT, "packages/checkpoint-core/src/index.js"),
      path.join(adapterDir, "checkpoint-core.mjs"),
    ],
  ]) {
    await copyFile(source, destination);
  }

  const requests = [
    "{",
    JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: { protocolVersion: "2025-03-26" },
    }),
    JSON.stringify({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: {
        name: "checkpoint",
        arguments: {
          workspace_root: workspaceRoot,
          session_id: "stdio-session",
          done: "First request handled",
          next: "Second request handled",
        },
      },
    }),
    JSON.stringify({
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: {
        name: "checkpoint",
        arguments: {
          workspace_root: workspaceRoot,
          session_id: "stdio-session",
          done: "Second request handled",
          next: "Inspect ordered records",
          close_session: true,
        },
      },
    }),
    JSON.stringify({
      jsonrpc: "2.0",
      id: 4,
      method: "tools/call",
      params: {
        name: "checkpoint_path",
        arguments: { workspace_root: workspaceRoot, session_id: "stdio-session" },
      },
    }),
  ];
  const result = spawnSync("node", [path.join(adapterDir, "checkpoint-mcp-server.mjs")], {
    input: `${requests.join("\n")}\n`,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, "");
  const responses = result.stdout
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
  assert.equal(responses.length, 5);
  assert.equal(responses[0].error.code, -32700);
  assert.equal(responses[1].result.protocolVersion, "2025-03-26");
  assert.equal(responses[2].result.isError, undefined);
  assert.equal(responses[3].result.isError, undefined);
  assert.equal(
    responses[4].result.structuredContent.path,
    ".agent-checkpoints/stdio-session.jsonl",
  );

  const raw = await readFile(
    path.join(workspaceRoot, ".agent-checkpoints", "stdio-session.jsonl"),
    "utf8",
  );
  assert.deepEqual(
    checkpointCore
      .parseCheckpointLogJsonl(raw)
      .map((record) => record.status ?? record.done),
    [
      "open",
      "First request handled",
      "open",
      "Second request handled",
      "closed",
    ],
  );
});

test("desktop config planner preserves unrelated values and rejects unsafe shapes", async () => {
  const { planDesktopConfig } = await loadConfigureDesktop();
  const desired = { command: "/absolute/node", args: ["/absolute/server.mjs"] };
  const current = {
    theme: "dark",
    mcpServers: {
      existing: { command: "/existing", args: ["--serve"] },
    },
  };

  const planned = planDesktopConfig(current, desired);
  assert.equal(planned.status, "changed");
  assert.deepEqual(planned.config, {
    theme: "dark",
    mcpServers: {
      existing: { command: "/existing", args: ["--serve"] },
      "agent-checkpoint": desired,
    },
  });
  assert.deepEqual(current, {
    theme: "dark",
    mcpServers: {
      existing: { command: "/existing", args: ["--serve"] },
    },
  });

  assert.deepEqual(planDesktopConfig(undefined, desired), {
    status: "changed",
    config: { mcpServers: { "agent-checkpoint": desired } },
  });
  const identical = { mcpServers: { "agent-checkpoint": desired }, other: [1, 2] };
  assert.deepEqual(planDesktopConfig(identical, desired), {
    status: "unchanged",
    config: identical,
  });

  for (const invalid of [null, [], "object", 1]) {
    assert.throws(() => planDesktopConfig(invalid, desired), /root.*object/i);
  }
  for (const invalidMcpServers of [null, [], "object", 1]) {
    assert.throws(
      () => planDesktopConfig({ mcpServers: invalidMcpServers }, desired),
      /mcpServers.*object/i,
    );
  }
  assert.throws(
    () => planDesktopConfig({}, { command: "node", args: ["relative-server.mjs"] }),
    /desired.*absolute/i,
  );
  for (const conflict of [
    { command: "/other-node", args: ["/absolute/server.mjs"] },
    { command: "/absolute/node", args: ["/other-server.mjs"] },
    { command: "/absolute/node", args: ["/absolute/server.mjs"], extra: true },
    null,
  ]) {
    assert.throws(
      () =>
        planDesktopConfig(
          { mcpServers: { "agent-checkpoint": conflict } },
          desired,
        ),
      /conflicting.*agent-checkpoint/i,
    );
  }
});

test("desktop config CLI checks read-only and writes through an atomic sibling", async (t) => {
  const stage = await mkdtemp(path.join(os.tmpdir(), "checkpoint-desktop-config-"));
  t.after(() => rm(stage, { recursive: true, force: true }));
  const configPath = path.join(stage, "claude_desktop_config.json");
  const nodeBin = "/absolute/node";
  const serverPath = "/absolute/server.mjs";

  const missingCheck = runConfigureDesktop(["--check", configPath, nodeBin, serverPath]);
  assert.equal(missingCheck.status, 0, missingCheck.stderr);
  assert.equal(missingCheck.stdout, "changed\n");
  await assert.rejects(access(configPath), /ENOENT/);

  const initial = `${JSON.stringify({ keep: true, mcpServers: { other: { command: "x" } } }, null, 2)}\n`;
  await writeFile(configPath, initial);
  await chmod(configPath, 0o640);
  const before = await stat(configPath);
  const checked = runConfigureDesktop(["--check", configPath, nodeBin, serverPath]);
  assert.equal(checked.status, 0, checked.stderr);
  assert.equal(checked.stdout, "changed\n");
  assert.equal(await readFile(configPath, "utf8"), initial);

  const written = runConfigureDesktop(["--write", configPath, nodeBin, serverPath]);
  assert.equal(written.status, 0, written.stderr);
  assert.equal(written.stdout, "changed\n");
  const after = await stat(configPath);
  assert.notEqual(after.ino, before.ino);
  assert.equal(after.mode & 0o777, 0o640);
  assert.deepEqual(JSON.parse(await readFile(configPath, "utf8")), {
    keep: true,
    mcpServers: {
      other: { command: "x" },
      "agent-checkpoint": { command: nodeBin, args: [serverPath] },
    },
  });
  assert.deepEqual(
    (await readdir(stage)).filter((name) => name.includes(".agent-checkpoint.tmp-")),
    [],
  );

  const identicalBytes = await readFile(configPath);
  const identical = runConfigureDesktop(["--write", configPath, nodeBin, serverPath]);
  assert.equal(identical.status, 0, identical.stderr);
  assert.equal(identical.stdout, "unchanged\n");
  assert.deepEqual(await readFile(configPath), identicalBytes);
});

test("desktop config CLI preserves a pre-existing predicted temp sibling", async (t) => {
  const stage = await mkdtemp(path.join(os.tmpdir(), "checkpoint-desktop-config-collision-"));
  t.after(() => rm(stage, { recursive: true, force: true }));
  const configPath = path.join(stage, "claude_desktop_config.json");
  const preloadPath = path.join(stage, "create-collision.mjs");
  const markerPath = path.join(stage, "collision-path.txt");
  const fixedNow = "1700000000123";
  const initial = '{"keep":true}\n';
  const sentinel = Buffer.from("foreign temp sibling sentinel\n");
  await writeFile(configPath, initial);
  await writeFile(
    preloadPath,
    [
      'import { writeFile } from "node:fs/promises";',
      'import path from "node:path";',
      'const fixedNow = Number(process.env.COLLISION_FIXED_NOW);',
      'Date.now = () => fixedNow;',
      'const configPath = process.env.COLLISION_CONFIG_PATH;',
      'const temporaryPath = path.join(',
      '  path.dirname(configPath),',
      '  `.${path.basename(configPath)}.agent-checkpoint.tmp-${process.pid}-${fixedNow}`,',
      ');',
      'await writeFile(temporaryPath, Buffer.from(process.env.COLLISION_SENTINEL, "base64"), { flag: "wx" });',
      'await writeFile(process.env.COLLISION_MARKER_PATH, temporaryPath, "utf8");',
      '',
    ].join("\n"),
  );

  const result = spawnSync(
    "node",
    [
      "--import",
      preloadPath,
      CONFIGURE_PATH,
      "--write",
      configPath,
      "/absolute/node",
      "/absolute/server.mjs",
    ],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        COLLISION_CONFIG_PATH: configPath,
        COLLISION_FIXED_NOW: fixedNow,
        COLLISION_MARKER_PATH: markerPath,
        COLLISION_SENTINEL: sentinel.toString("base64"),
      },
    },
  );

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /EEXIST/);
  assert.equal(await readFile(configPath, "utf8"), initial);
  const temporaryPath = await readFile(markerPath, "utf8");
  let collisionBytes;
  try {
    collisionBytes = await readFile(temporaryPath);
  } catch (error) {
    assert.fail(`pre-existing temp sibling was removed: ${error.message}`);
  }
  assert.deepEqual(collisionBytes, sentinel);
});

test("desktop config CLI preserves malformed, conflicting, and symlinked inputs", async (t) => {
  const stage = await mkdtemp(path.join(os.tmpdir(), "checkpoint-desktop-config-fail-"));
  t.after(() => rm(stage, { recursive: true, force: true }));
  const nodeBin = "/absolute/node";
  const serverPath = "/absolute/server.mjs";

  for (const [name, bytes] of [
    ["malformed.json", "{broken\n"],
    ["array.json", "[]\n"],
    ["null.json", "null\n"],
    ["mcp-array.json", '{"mcpServers":[]}\n'],
    [
      "conflict.json",
      '{"mcpServers":{"agent-checkpoint":{"command":"other","args":[]}}}\n',
    ],
  ]) {
    const configPath = path.join(stage, name);
    await writeFile(configPath, bytes);
    const result = runConfigureDesktop(["--write", configPath, nodeBin, serverPath]);
    assert.notEqual(result.status, 0, name);
    assert.equal(result.stdout, "", name);
    assert.equal(await readFile(configPath, "utf8"), bytes, name);
  }

  const target = path.join(stage, "real-config.json");
  const link = path.join(stage, "linked-config.json");
  await writeFile(target, '{"keep":true}\n');
  await symlink(target, link);
  const linked = runConfigureDesktop(["--write", link, nodeBin, serverPath]);
  assert.notEqual(linked.status, 0);
  assert.match(linked.stderr, /symlink/i);
  assert.equal((await lstat(link)).isSymbolicLink(), true);
  assert.equal(await readFile(target, "utf8"), '{"keep":true}\n');
  assert.deepEqual(
    (await readdir(stage)).filter((name) => name.includes(".agent-checkpoint.tmp-")),
    [],
  );
});

test("desktop config CLI executes from an installed path containing spaces", async (t) => {
  const stage = await mkdtemp(path.join(os.tmpdir(), "checkpoint-desktop-config-installed-"));
  t.after(() => rm(stage, { recursive: true, force: true }));
  const adapterDir = path.join(stage, "Claude Desktop Home", "agent-checkpoint");
  const binDir = path.join(stage, "bin");
  await mkdir(adapterDir, { recursive: true });
  await mkdir(binDir);
  const installedHelper = path.join(adapterDir, "configure-desktop.mjs");
  const nodeLink = path.join(binDir, "node");
  const configPath = path.join(stage, "Claude Desktop Home", "claude_desktop_config.json");
  await copyFile(CONFIGURE_PATH, installedHelper);
  await symlink(process.execPath, nodeLink);
  await writeFile(configPath, '{"keep":true}\n');

  const direct = spawnSync(process.execPath, [installedHelper, "--check", configPath, nodeLink, path.join(adapterDir, "checkpoint-mcp-server.mjs")], {
    encoding: "utf8",
  });
  assert.equal(direct.status, 0, direct.stderr);
  assert.equal(direct.stdout, "changed\n");

  const result = spawnSync(nodeLink, [installedHelper, "--write", configPath, nodeLink, path.join(adapterDir, "checkpoint-mcp-server.mjs")], {
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, "changed\n");
  assert.deepEqual(JSON.parse(await readFile(configPath, "utf8")), {
    keep: true,
    mcpServers: {
      "agent-checkpoint": {
        command: nodeLink,
        args: [path.join(adapterDir, "checkpoint-mcp-server.mjs")],
      },
    },
  });
});

test("configuration example and focused README document the independent Desktop target", async () => {
  const example = await readFile(CONFIG_EXAMPLE_PATH, "utf8");
  assert.match(example, /claude_desktop:/);
  assert.match(example, /OPS_CLAUDE_DESKTOP_HOME/);
  assert.match(example, /OPS_SYNC_CLAUDE_DESKTOP/);
  assert.match(example, /Library\/Application Support\/Claude/);

  const readme = await readFile(DESKTOP_README_PATH, "utf8");
  assert.match(
    readme,
    /checkpoint\(workspace_root, session_id, done, next, step_failed=false, close_session=false\)/,
  );
  assert.match(readme, /checkpoint_path\(workspace_root, session_id\)/);
  assert.match(readme, /existing absolute.*workspace_root|workspace_root.*existing absolute/is);
  assert.match(readme, /stable.*session_id|session_id.*stable/is);
  assert.match(readme, /context_used.*null/is);
  assert.match(readme, /agent.*null/is);
  assert.match(readme, /session_title.*null/is);
  assert.match(readme, /Library\/Application Support\/Claude\/agent-checkpoint/);
  assert.match(readme, /claude_desktop_config\.json/);
  assert.match(readme, /mcp-server-agent-checkpoint\.log/);
  assert.match(readme, /full quit.*restart/is);
  assert.match(readme, /conflict/is);
  assert.match(readme, /symlink/is);
  assert.match(readme, /remove.*mcpServers\.agent-checkpoint/is);
  assert.match(readme, /MCP-only/is);
  assert.match(readme, /does not use Claude Code hooks/is);
  assert.match(readme, /direct MCP.*automated proof/is);
  assert.match(readme, /real.*model.*Phase 2/is);
});

test("desktop installer globally installs and idempotently registers an isolated target", async (t) => {
  const fixture = await createInstallerFixture(t, "checkpoint-desktop-installer-");
  await mkdir(fixture.desktopHome);
  await mkdir(fixture.claudeHome);
  const claudeSettings = path.join(fixture.claudeHome, "settings.json");
  const claudeSentinel = path.join(fixture.claudeHome, "sentinel.txt");
  await writeFile(claudeSettings, '{"claudeCode":true}\n');
  await writeFile(claudeSentinel, "claude code bytes\n");
  const configPath = path.join(fixture.desktopHome, "claude_desktop_config.json");
  await writeFile(
    configPath,
    `${JSON.stringify(
      {
        theme: "dark",
        mcpServers: { other: { command: "/other/server", args: ["--serve"] } },
      },
      null,
      2,
    )}\n`,
  );

  const first = runInstaller(fixture);
  assert.equal(first.status, 0, `${first.stdout}\n${first.stderr}`);
  assert.match(first.stdout, /Claude Desktop integration: enabled/);
  assert.match(first.stdout, /Claude Desktop:/);
  assert.match(first.stdout, /full quit.*restart/is);
  assert.match(first.stdout, /mcp-server-agent-checkpoint\.log/);

  const adapterDir = path.join(fixture.desktopHome, "agent-checkpoint");
  const sourceMap = new Map([
    ["checkpoint-core.mjs", "packages/checkpoint-core/src/index.js"],
    [
      "checkpoint-mcp-runtime.mjs",
      "claude-desktop/agent-checkpoint/checkpoint-mcp-runtime.mjs",
    ],
    [
      "checkpoint-mcp-server.mjs",
      "claude-desktop/agent-checkpoint/checkpoint-mcp-server.mjs",
    ],
    ["configure-desktop.mjs", "claude-desktop/agent-checkpoint/configure-desktop.mjs"],
    ["README.md", "claude-desktop/agent-checkpoint/README.md"],
  ]);
  for (const [installedName, sourceName] of sourceMap) {
    assert.deepEqual(
      await readFile(path.join(adapterDir, installedName)),
      await readFile(path.join(REPOSITORY_ROOT, sourceName)),
      installedName,
    );
  }
  assert.notEqual((await stat(path.join(adapterDir, "checkpoint-mcp-server.mjs"))).mode & 0o111, 0);
  assert.deepEqual(JSON.parse(await readFile(configPath, "utf8")), {
    theme: "dark",
    mcpServers: {
      other: { command: "/other/server", args: ["--serve"] },
      "agent-checkpoint": {
        command: path.join(fixture.nodeBin, "node"),
        args: [path.join(adapterDir, "checkpoint-mcp-server.mjs")],
      },
    },
  });
  assert.equal(await readFile(claudeSettings, "utf8"), '{"claudeCode":true}\n');
  assert.equal(await readFile(claudeSentinel, "utf8"), "claude code bytes\n");

  const configBytes = await readFile(configPath);
  const installedBytes = await readFile(path.join(adapterDir, "checkpoint-mcp-runtime.mjs"));
  const second = runInstaller(fixture);
  assert.equal(second.status, 0, `${second.stdout}\n${second.stderr}`);
  assert.deepEqual(await readFile(configPath), configBytes);
  assert.deepEqual(await readFile(path.join(adapterDir, "checkpoint-mcp-runtime.mjs")), installedBytes);
});

test("desktop installer auto-detects independently and skips disabled or project targets", async (t) => {
  const autoFixture = await createInstallerFixture(t, "checkpoint-desktop-auto-");
  await mkdir(autoFixture.desktopHome);
  const auto = runInstaller(autoFixture);
  assert.equal(auto.status, 0, `${auto.stdout}\n${auto.stderr}`);
  assert.match(auto.stdout, /Claude Desktop integration: enabled/);
  await access(path.join(autoFixture.desktopHome, "agent-checkpoint", "checkpoint-mcp-server.mjs"));
  assert.deepEqual(
    Object.keys(
      JSON.parse(
        await readFile(
          path.join(autoFixture.desktopHome, "claude_desktop_config.json"),
          "utf8",
        ),
      ).mcpServers,
    ),
    ["agent-checkpoint"],
  );

  const disabledFixture = await createInstallerFixture(t, "checkpoint-desktop-disabled-");
  await mkdir(disabledFixture.desktopHome);
  const disabledConfig = path.join(
    disabledFixture.desktopHome,
    "claude_desktop_config.json",
  );
  await writeFile(disabledConfig, '{"keep":"disabled"}\n');
  const disabled = runInstaller(disabledFixture, { syncDesktop: "false" });
  assert.equal(disabled.status, 0, `${disabled.stdout}\n${disabled.stderr}`);
  assert.match(disabled.stdout, /Claude Desktop integration: disabled/);
  assert.equal(await readFile(disabledConfig, "utf8"), '{"keep":"disabled"}\n');
  await assert.rejects(
    access(path.join(disabledFixture.desktopHome, "agent-checkpoint")),
    /ENOENT/,
  );

  const projectFixture = await createInstallerFixture(t, "checkpoint-desktop-project-");
  await mkdir(projectFixture.desktopHome);
  const projectConfig = path.join(projectFixture.desktopHome, "claude_desktop_config.json");
  await writeFile(projectConfig, '{"keep":"project"}\n');
  const project = runInstaller(projectFixture, {
    args: ["--project"],
    syncDesktop: "true",
  });
  assert.equal(project.status, 0, `${project.stdout}\n${project.stderr}`);
  assert.equal(await readFile(projectConfig, "utf8"), '{"keep":"project"}\n');
  await assert.rejects(
    access(path.join(projectFixture.desktopHome, "agent-checkpoint")),
    /ENOENT/,
  );
});

test("desktop installer preflight failures preserve every target before mutation", async (t) => {
  for (const [name, prepare, options, stderrPattern] of [
    [
      "malformed",
      async (fixture) => {
        await mkdir(fixture.desktopHome);
        await writeFile(
          path.join(fixture.desktopHome, "claude_desktop_config.json"),
          "{broken\n",
        );
      },
      {},
      /malformed/i,
    ],
    [
      "conflict",
      async (fixture) => {
        await mkdir(fixture.desktopHome);
        await writeFile(
          path.join(fixture.desktopHome, "claude_desktop_config.json"),
          '{"mcpServers":{"agent-checkpoint":{"command":"other","args":[]}}}\n',
        );
      },
      {},
      /conflict/i,
    ],
    [
      "config-symlink",
      async (fixture) => {
        await mkdir(fixture.desktopHome);
        const target = path.join(fixture.stage, "outside-config.json");
        await writeFile(target, '{"outside":true}\n');
        await symlink(
          target,
          path.join(fixture.desktopHome, "claude_desktop_config.json"),
        );
      },
      {},
      /symlink/i,
    ],
    [
      "adapter-symlink",
      async (fixture) => {
        await mkdir(fixture.desktopHome);
        const outside = path.join(fixture.stage, "outside-adapter");
        await mkdir(outside);
        await writeFile(path.join(outside, "sentinel"), "outside\n");
        await symlink(outside, path.join(fixture.desktopHome, "agent-checkpoint"));
      },
      {},
      /symlink/i,
    ],
    [
      "missing-node",
      async (fixture) => {
        await mkdir(fixture.desktopHome);
      },
      { pathValue: "fixture-no-node" },
      /node.*not found/i,
    ],
  ]) {
    await t.test(`preflight: ${name}`, async (inner) => {
      const fixture = await createInstallerFixture(inner, `checkpoint-desktop-${name}-`);
      await prepare(fixture);
      const beforeConfigPath = path.join(
        fixture.desktopHome,
        "claude_desktop_config.json",
      );
      let beforeConfig;
      try {
        beforeConfig = await readFile(beforeConfigPath);
      } catch {
        beforeConfig = null;
      }
      const runOptions = { syncDesktop: "true", ...options };
      if (runOptions.pathValue === "fixture-no-node") {
        runOptions.pathValue = fixture.noNodeBin;
      }
      const result = runInstaller(fixture, runOptions);
      assert.notEqual(result.status, 0, name);
      assert.match(result.stderr, stderrPattern, name);
      await assert.rejects(access(fixture.opencodeHome), /ENOENT/);
      if (beforeConfig !== null) {
        assert.deepEqual(await readFile(beforeConfigPath), beforeConfig, name);
      }
      if (name === "adapter-symlink") {
        assert.equal(
          (await lstat(path.join(fixture.desktopHome, "agent-checkpoint"))).isSymbolicLink(),
          true,
        );
        assert.equal(
          await readFile(path.join(fixture.desktopHome, "agent-checkpoint", "sentinel"), "utf8"),
          "outside\n",
        );
      } else {
        await assert.rejects(
          access(path.join(fixture.desktopHome, "agent-checkpoint")),
          /ENOENT/,
        );
      }
    });
  }
});
