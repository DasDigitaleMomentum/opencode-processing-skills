import assert from "node:assert/strict";
import {
  access,
  lstat,
  mkdtemp,
  mkdir,
  readFile,
  readlink,
  readdir,
  realpath,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

import { main as inspectCheckpoint } from "../../packages/checkpoint-core/bin/checkpoint-inspect.js";
import * as checkpointCore from "../../packages/checkpoint-core/src/index.js";
import {
  createOpenCodeCheckpointPlugin,
  createOpenCodeContextTelemetry,
  createOpenCodeSessionTitle,
} from "../checkpoint-runtime.mjs";

const REPOSITORY_ROOT = path.resolve(import.meta.dirname, "../..");
const INSTRUCTION_MARKER = "<!-- opencode-checkpoint-instruction -->";

function schema() {
  return {
    optional() {
      return this;
    },
    default() {
      return this;
    },
  };
}

function fakeTool(definition) {
  return definition;
}
fakeTool.schema = {
  string: schema,
  boolean: schema,
};

function assistant({
  id,
  providerID = "provider-a",
  modelID = "model-a",
  input = 100,
  output = 20,
  reasoning = 0,
  cacheRead = 0,
  cacheWrite = 0,
}) {
  return {
    info: {
      id,
      role: "assistant",
      providerID,
      modelID,
      tokens: {
        input,
        output,
        reasoning,
        cache: { read: cacheRead, write: cacheWrite },
      },
    },
    parts: [],
  };
}

function fakeClient({
  messages,
  contextLimit = 1000,
  messageError,
  providerError,
  sessionError,
  sessionResponseError,
  title,
  expectedSessionId = "session-a",
} = {}) {
  return {
    session: {
      async get(options) {
        if (sessionError) throw sessionError;
        assert.deepEqual(options, {
          path: { id: expectedSessionId },
          query: { directory: "/workspace" },
        });
        if (sessionResponseError) return { error: sessionResponseError };
        return { data: { title } };
      },
      async messages(options) {
        if (messageError) throw messageError;
        assert.equal(options.path.id, expectedSessionId);
        assert.equal(options.query.directory, "/workspace");
        return { data: messages };
      },
    },
    provider: {
      async list(options) {
        if (providerError) throw providerError;
        assert.equal(options.query.directory, "/workspace");
        return {
          data: {
            all: [
              {
                id: "provider-a",
                models: { "model-a": { limit: { context: contextLimit } } },
              },
            ],
          },
        };
      },
    },
  };
}

async function inspect(selectedPath, cwd) {
  let stdout = "";
  let stderr = "";
  const status = await inspectCheckpoint([selectedPath], {
    cwd,
    stdout: (text) => {
      stdout += text;
    },
    stderr: (text) => {
      stderr += text;
    },
  });
  assert.equal(status, 0, stderr);
  return stdout;
}

function runInstallerResult(args, { cwd, configFile, opencodeHome }) {
  return spawnSync("bash", [path.join(REPOSITORY_ROOT, "install.sh"), ...args], {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      HOME: path.dirname(opencodeHome),
      OPS_CONFIG_FILE: configFile,
      OPS_OPENCODE_HOME: opencodeHome,
      OPS_SYNC_CODEX: "false",
      OPS_SYNC_CLAUDE: "false",
      OPS_SYNC_CURSOR: "false",
      OPS_SYNC_HERMES: "false",
      OPS_ANTIGRAVITY_PATH: path.join(cwd, "absent-antigravity"),
    },
  });
}

function runInstaller(args, options) {
  const result = runInstallerResult(args, options);
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

async function writeInstallerConfig(root) {
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
      "    enabled: false",
      "  cursor:",
      "    enabled: false",
      "  hermes:",
      "    enabled: false",
      "additional_delegates:",
      "  pilot: example/delegate",
      "additional_implementers:",
      "  pilot: example/implementer",
      "",
    ].join("\n"),
  );
  return configFile;
}

async function assertInstalledOpenCodePilot(home) {
  const plugin = await readFile(path.join(home, "plugins/checkpoint.ts"), "utf8");
  const runtime = await readFile(
    path.join(home, "lib/opencode-processing-skills/checkpoint-runtime.mjs"),
    "utf8",
  );
  const core = await readFile(
    path.join(home, "lib/opencode-processing-skills/checkpoint-core.mjs"),
    "utf8",
  );
  const watcherPath = path.join(
    home,
    "lib/opencode-processing-skills/checkpoint-watch/bin/checkpoint-watch.js",
  );
  const watcher = await readFile(watcherPath, "utf8");
  const watcherCore = await readFile(
    path.join(home, "lib/opencode-processing-skills/checkpoint-watch/src/index.js"),
    "utf8",
  );
  assert.match(plugin, /CheckpointPlugin/);
  assert.doesNotMatch(plugin, /^import .*@opencode-ai\/plugin/m);
  assert.match(plugin, /fallbackTool/);
  assert.match(plugin, /await import\("@opencode-ai\/plugin"\)/);
  assert.match(plugin, /createOpenCodeContextTelemetry\(pluginContext\?\.client\)/);
  assert.match(plugin, /createOpenCodeSessionTitle\(pluginContext\?\.client\)/);
  assert.match(runtime, /createOpenCodeCheckpointPlugin/);
  assert.match(core, /export async function checkpoint/);
  assert.match(watcher, /runLiveDashboard/);
  assert.match(watcherCore, /export function parseCheckpointJsonl/);

  for (const name of [
    "maintainer",
    "maintainer-direct",
    "delegate",
    "retriever",
    "doc-explorer",
    "implementer",
    "legacy-curator",
    "delegate-pilot",
    "implementer-pilot",
  ]) {
    const persona = await readFile(path.join(home, `agents/${name}.md`), "utf8");
    assert.equal(persona.split(INSTRUCTION_MARKER).length - 1, 1, name);
  }

  assert.match(
    await readFile(path.join(home, "skills/execute-work-package/SKILL.md"), "utf8"),
    /Execute Work Package/,
  );
}

test("native tools isolate parent and subagent logs with honest unknown telemetry", async (t) => {
  const worktree = await mkdtemp(path.join(os.tmpdir(), "checkpoint-opencode-tools-"));
  t.after(() => rm(worktree, { recursive: true, force: true }));
  const plugin = createOpenCodeCheckpointPlugin({ tool: fakeTool, checkpointCore });
  const hooks = await plugin({ worktree });

  const parentResult = await hooks.tool.checkpoint.execute(
    { done: "Parent task finished", next: "Delegate task started" },
    { sessionID: "parent/session", worktree },
  );
  const subagentResult = await hooks.tool.checkpoint.execute(
    {
      done: "Focused tests attempted",
      next: "Test failure correct",
      step_failed: true,
    },
    { sessionID: "subagent-session" },
  );

  assert.equal(
    parentResult,
    "Checkpoint saved.\nContext (previous completed step, TUI-equivalent): unknown\nRemaining K-tokens (context-window headroom): unknown",
  );
  assert.equal(subagentResult, parentResult);
  for (const sessionId of ["parent/session", "subagent-session"]) {
    const relativePath = checkpointCore.checkpointPath(sessionId);
    const raw = await readFile(path.join(worktree, ...relativePath.split("/")), "utf8");
    const [record] = checkpointCore.parseCheckpointJsonl(raw);
    assert.deepEqual(Object.keys(record), [
      "timestamp",
      "session_id",
      "done",
      "next",
      "step_failed",
      "context_used",
      "agent",
      "session_title",
    ]);
    assert.equal(record.session_id, sessionId);
    assert.equal(record.context_used, null);
    assert.equal(record.agent, null);
    assert.equal(record.session_title, null);
  }
  const subagentRaw = await readFile(
    path.join(worktree, ...checkpointCore.checkpointPath("subagent-session").split("/")),
    "utf8",
  );
  assert.equal(checkpointCore.parseCheckpointJsonl(subagentRaw)[0].step_failed, true);
  const parentPath = await hooks.tool.checkpoint_path.execute({ session_id: "parent/session" });
  const subagentPath = await hooks.tool.checkpoint_path.execute({ session_id: "subagent-session" });
  assert.equal(parentPath, ".agent-checkpoints/parent%2Fsession.jsonl");
  assert.equal(subagentPath, ".agent-checkpoints/subagent-session.jsonl");

  const parentBefore = await readFile(path.join(worktree, ...parentPath.split("/")));
  const subagentBeforeCorrection = await readFile(path.join(worktree, ...subagentPath.split("/")));
  const parentSummary = await inspect(parentPath, worktree);
  const failedSummary = await inspect(subagentPath, worktree);
  assert.match(parentSummary, /Session: parent\/session/);
  assert.match(parentSummary, /Work status: COMPLETED/);
  assert.match(parentSummary, /Context used: unknown/);
  assert.match(parentSummary, /Chain: 0\/0 \(n\/a\)/);
  assert.match(parentSummary, /Work: 1\/1 \(100%\)/);
  assert.match(parentSummary, /Three-word compliance: 2\/2 \(100%\)/);
  assert.match(failedSummary, /Work status: FAILED/);
  assert.match(failedSummary, /Chain: 0\/0 \(n\/a\)/);
  assert.match(failedSummary, /Work: 0\/1 \(0%\)/);
  assert.match(failedSummary, /Three-word compliance: 2\/2 \(100%\)/);
  assert.deepEqual(await readFile(path.join(worktree, ...parentPath.split("/"))), parentBefore);
  assert.deepEqual(
    await readFile(path.join(worktree, ...subagentPath.split("/"))),
    subagentBeforeCorrection,
  );

  await hooks.tool.checkpoint.execute(
    { done: "Test failure correct", next: "Run focused tests" },
    { sessionID: "subagent-session", worktree },
  );
  const correctedBefore = await readFile(path.join(worktree, ...subagentPath.split("/")));
  const correctedSummary = await inspect(subagentPath, worktree);
  assert.match(correctedSummary, /Last attempted: Test failure correct/);
  assert.match(correctedSummary, /Next announced: Run focused tests/);
  assert.match(correctedSummary, /Work status: COMPLETED/);
  assert.match(correctedSummary, /Chain: 1\/1 \(100%\)/);
  assert.match(correctedSummary, /Work: 1\/2 \(50%\)/);
  assert.match(correctedSummary, /Three-word compliance: 4\/4 \(100%\)/);
  assert.deepEqual(await readFile(path.join(worktree, ...subagentPath.split("/"))), correctedBefore);

  await hooks.tool.checkpoint.execute(
    { done: "not three", next: "still accepted" },
    { sessionID: "parent/session", worktree },
  );
  const parentRaw = await readFile(
    path.join(worktree, ...checkpointCore.checkpointPath("parent/session").split("/")),
    "utf8",
  );
  assert.equal(checkpointCore.parseCheckpointJsonl(parentRaw).length, 2);
});

test("session.created writes open while unsupported resume and close signals stay absent", async (t) => {
  const worktree = await mkdtemp(path.join(os.tmpdir(), "checkpoint-opencode-lifecycle-"));
  t.after(() => rm(worktree, { recursive: true, force: true }));
  const plugin = createOpenCodeCheckpointPlugin({ tool: fakeTool, checkpointCore });
  const hooks = await plugin({ worktree });

  assert.deepEqual(Object.keys(hooks.tool), ["checkpoint", "checkpoint_path"]);
  await assert.rejects(
    readFile(
      path.join(worktree, ...checkpointCore.checkpointPath("parent-created").split("/")),
      "utf8",
    ),
    /ENOENT/,
  );

  for (const sessionId of ["parent-created", "subagent-created"]) {
    await hooks.event({
      event: {
        type: "session.created",
        properties: { info: { id: sessionId, title: "not persisted" } },
      },
    });
    const raw = await readFile(
      path.join(worktree, ...checkpointCore.checkpointPath(sessionId).split("/")),
      "utf8",
    );
    const [record] = checkpointCore.parseCheckpointLogJsonl(raw);
    assert.deepEqual(Object.keys(record), ["timestamp", "session_id", "event", "status"]);
    assert.equal(record.session_id, sessionId);
    assert.equal(record.event, "session_status");
    assert.equal(record.status, "open");
    assert.equal(checkpointCore.analyzeCheckpointLog(raw).state, "OPEN");
    assert.doesNotMatch(raw, /"(?:title|agent|directory)"/);
  }

  const resumedSession = "resumed-checkpoint-only";
  await hooks.tool.checkpoint.execute(
    { done: "Existing session resumed", next: "Unsupported events ignored" },
    { sessionID: resumedSession, worktree },
  );
  for (const event of [
    undefined,
    { type: "session.created", properties: { info: { id: "   " } } },
    { type: "session.updated", properties: { info: { id: resumedSession } } },
    { type: "session.status", properties: { sessionID: resumedSession, status: { type: "busy" } } },
    { type: "session.idle", properties: { sessionID: resumedSession } },
    { type: "session.deleted", properties: { info: { id: resumedSession } } },
  ]) {
    await hooks.event({ event });
  }
  const resumedRaw = await readFile(
    path.join(worktree, ...checkpointCore.checkpointPath(resumedSession).split("/")),
    "utf8",
  );
  const resumedAnalysis = checkpointCore.analyzeCheckpointLog(resumedRaw);
  assert.equal(resumedAnalysis.state, "UNKNOWN");
  assert.equal(resumedAnalysis.records.length, 1);
  assert.equal(resumedAnalysis.checkpoints.length, 1);

  await hooks.tool.checkpoint.execute(
    { done: "Creation event recorded", next: "Checkpoint metrics preserved" },
    { sessionID: "parent-created", worktree },
  );
  await hooks.event({
    event: { type: "session.deleted", properties: { info: { id: "parent-created" } } },
  });
  const mixedRaw = await readFile(
    path.join(worktree, ...checkpointCore.checkpointPath("parent-created").split("/")),
    "utf8",
  );
  const mixed = checkpointCore.analyzeCheckpointLog(mixedRaw);
  assert.equal(mixed.state, "OPEN");
  assert.equal(mixed.records.length, 2);
  assert.equal(mixed.checkpoints.length, 1);
  assert.deepEqual(mixed.analysis.work, { success: 1, count: 1, percent: 100 });
  assert.equal(mixed.records.some((record) => record.status === "closed"), false);
});

test("telemetry uses the latest completed assistant step and sums all token categories", async () => {
  const telemetry = createOpenCodeContextTelemetry(
    fakeClient({
      messages: [
        assistant({ id: "older", input: 50, output: 10 }),
        assistant({
          id: "completed",
          input: 400,
          output: 100,
          reasoning: 50,
          cacheRead: 200,
          cacheWrite: 50,
        }),
        assistant({ id: "active", input: 900, output: 0 }),
      ],
    }),
  );

  assert.deepEqual(await telemetry({ sessionID: "session-a", directory: "/workspace" }), {
    contextUsed: 0.8,
    remainingKTokens: 0.2,
  });
});

test("native checkpoints snapshot parent and subagent persona and session title", async (t) => {
  const worktree = await mkdtemp(path.join(os.tmpdir(), "checkpoint-opencode-metadata-"));
  t.after(() => rm(worktree, { recursive: true, force: true }));
  const titles = new Map([
    ["parent-session", "Parent planning session"],
    ["subagent-session", "Focused implementation"],
  ]);
  const calls = [];
  const client = {
    session: {
      async get(options) {
        calls.push(options);
        return { data: { title: titles.get(options.path.id) } };
      },
    },
  };
  const plugin = createOpenCodeCheckpointPlugin({
    tool: fakeTool,
    checkpointCore,
    getSessionTitle: createOpenCodeSessionTitle(client),
  });
  const hooks = await plugin({ worktree });

  await hooks.tool.checkpoint.execute(
    { done: "Parent metadata captured", next: "Delegate metadata capture" },
    {
      sessionID: "parent-session",
      directory: "/workspace",
      worktree,
      agent: "maintainer",
    },
  );
  await hooks.tool.checkpoint.execute(
    { done: "Delegate metadata capture", next: "Review metadata records" },
    {
      sessionID: "subagent-session",
      directory: "/workspace",
      worktree,
      agent: "implementer",
    },
  );
  titles.set("parent-session", "Renamed parent session");
  await hooks.tool.checkpoint.execute(
    { done: "Delegate metadata capture", next: "Review metadata records" },
    {
      sessionID: "parent-session",
      directory: "/workspace",
      worktree,
      agent: "maintainer-direct",
    },
  );

  const parentRaw = await readFile(
    path.join(worktree, ...checkpointCore.checkpointPath("parent-session").split("/")),
    "utf8",
  );
  const subagentRaw = await readFile(
    path.join(worktree, ...checkpointCore.checkpointPath("subagent-session").split("/")),
    "utf8",
  );
  const parentRecords = checkpointCore.parseCheckpointJsonl(parentRaw);
  const [subagentRecord] = checkpointCore.parseCheckpointJsonl(subagentRaw);
  assert.deepEqual(
    parentRecords.map(({ agent, session_title: sessionTitle }) => ({ agent, sessionTitle })),
    [
      { agent: "maintainer", sessionTitle: "Parent planning session" },
      { agent: "maintainer-direct", sessionTitle: "Renamed parent session" },
    ],
  );
  assert.equal(subagentRecord.agent, "implementer");
  assert.equal(subagentRecord.session_title, "Focused implementation");
  assert.deepEqual(calls, [
    { path: { id: "parent-session" }, query: { directory: "/workspace" } },
    { path: { id: "subagent-session" }, query: { directory: "/workspace" } },
    { path: { id: "parent-session" }, query: { directory: "/workspace" } },
  ]);
});

test("session title failures and empty host metadata persist null without blocking", async (t) => {
  const worktree = await mkdtemp(path.join(os.tmpdir(), "checkpoint-opencode-title-error-"));
  t.after(() => rm(worktree, { recursive: true, force: true }));
  const cases = [
    { sessionId: "title-throws", client: fakeClient({ sessionError: new Error("unavailable"), expectedSessionId: "title-throws" }) },
    { sessionId: "title-errors", client: fakeClient({ sessionResponseError: { message: "missing" }, expectedSessionId: "title-errors" }) },
    { sessionId: "title-empty", client: fakeClient({ title: "   ", expectedSessionId: "title-empty" }) },
  ];

  for (const { sessionId, client } of cases) {
    const plugin = createOpenCodeCheckpointPlugin({
      tool: fakeTool,
      checkpointCore,
      getSessionTitle: createOpenCodeSessionTitle(client),
    });
    const hooks = await plugin({ worktree });
    await hooks.tool.checkpoint.execute(
      { done: "Session title queried", next: "Checkpoint persistence verified" },
      { sessionID: sessionId, directory: "/workspace", worktree, agent: "" },
    );
    const raw = await readFile(
      path.join(worktree, ...checkpointCore.checkpointPath(sessionId).split("/")),
      "utf8",
    );
    const [record] = checkpointCore.parseCheckpointJsonl(raw);
    assert.equal(record.agent, null);
    assert.equal(record.session_title, null);
  }
});

test("telemetry clamps exhausted context and rejects malformed host data", async () => {
  const exhausted = createOpenCodeContextTelemetry(
    fakeClient({ messages: [assistant({ id: "large", input: 1000, output: 500 })] }),
  );
  assert.deepEqual(await exhausted({ sessionID: "session-a", directory: "/workspace" }), {
    contextUsed: 1,
    remainingKTokens: 0,
  });

  for (const client of [
    fakeClient({ messages: [assistant({ id: "invalid", reasoning: Number.NaN })] }),
    fakeClient({ messages: [assistant({ id: "unmatched", providerID: "missing" })] }),
    fakeClient({ messages: [assistant({ id: "invalid-limit" })], contextLimit: 0 }),
    fakeClient({ messages: undefined }),
  ]) {
    const telemetry = createOpenCodeContextTelemetry(client);
    assert.deepEqual(await telemetry({ sessionID: "session-a", directory: "/workspace" }), {
      contextUsed: null,
      remainingKTokens: null,
    });
  }
});

test("SDK telemetry failures fall back to null without blocking persistence", async (t) => {
  const worktree = await mkdtemp(path.join(os.tmpdir(), "checkpoint-opencode-telemetry-error-"));
  t.after(() => rm(worktree, { recursive: true, force: true }));
  const getContextTelemetry = createOpenCodeContextTelemetry(
    fakeClient({ messages: [], messageError: new Error("SDK unavailable") }),
  );
  const plugin = createOpenCodeCheckpointPlugin({ tool: fakeTool, checkpointCore, getContextTelemetry });
  const hooks = await plugin({ worktree });

  const result = await hooks.tool.checkpoint.execute(
    { done: "Host query attempted", next: "Checkpoint write verified" },
    { sessionID: "session-a", directory: "/workspace", worktree },
  );
  assert.match(result, /TUI-equivalent\): unknown/);
  const raw = await readFile(
    path.join(worktree, ...checkpointCore.checkpointPath("session-a").split("/")),
    "utf8",
  );
  const [record] = checkpointCore.parseCheckpointJsonl(raw);
  assert.deepEqual(Object.keys(record), [
    "timestamp",
    "session_id",
    "done",
    "next",
      "step_failed",
      "context_used",
      "agent",
      "session_title",
  ]);
  assert.equal(record.context_used, null);
  assert.equal(record.agent, null);
  assert.equal(record.session_title, null);
  assert.doesNotMatch(raw, /remaining|telemetry|provider|model/i);
});

test("global installer deploys assets and idempotent instructions while preserving symlinks", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "checkpoint-opencode-global-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const home = path.join(root, "OpenCode Home");
  const configFile = await writeInstallerConfig(root);

  const syntax = spawnSync("bash", ["-n", path.join(REPOSITORY_ROOT, "install.sh")]);
  assert.equal(syntax.status, 0);
  const output = runInstaller([], { cwd: root, configFile, opencodeHome: home });
  assert.match(output, /Checkpoint plugin:/);
  assert.match(output, /Restart OpenCode/);
  const watcherPath = path.join(home, "lib/opencode-processing-skills/checkpoint-watch/bin/checkpoint-watch.js");
  assert.match(output, new RegExp(`Checkpoint watcher: ${watcherPath.replaceAll("\\", "\\\\")}`));
  assert.match(output, new RegExp(`Launch command: node "${watcherPath.replaceAll("\\", "\\\\")}"`));
  assertOutputOrder(output, [
    "Checkpoint adapter upgrade prerequisite:",
    "Step 1.1:",
    "Installed: lib/opencode-processing-skills/checkpoint-core.mjs",
    "Installed: lib/opencode-processing-skills/checkpoint-watch/bin/checkpoint-watch.js",
    "Installed: lib/opencode-processing-skills/checkpoint-watch/src/index.js",
    "Installed: lib/opencode-processing-skills/checkpoint-runtime.mjs",
    "Installed: plugins/checkpoint.ts",
    "Startup order (dashboard before status-writing harnesses):",
    "Launch command:",
    "Restart OpenCode",
  ]);
  await assertInstalledOpenCodePilot(home);

  const once = spawnSync("node", [watcherPath, "--once"], { cwd: root, encoding: "utf8" });
  assert.equal(once.status, 0, once.stderr);
  assert.match(once.stdout, /No direct \.agent-checkpoints/);

  const runtimePath = path.join(home, "lib/opencode-processing-skills/checkpoint-runtime.mjs");
  const protectedFile = path.join(root, "protected-runtime.mjs");
  await writeFile(protectedFile, "protected\n");
  await rm(runtimePath);
  await symlink(protectedFile, runtimePath);
  await writeFile(path.join(home, "plugins/checkpoint.ts"), "stale\n");
  const protectedPersona = path.join(root, "protected-persona.md");
  const protectedAgent = path.join(home, "agents/custom-protected.md");
  await writeFile(protectedPersona, "protected persona\n");
  await symlink(protectedPersona, protectedAgent);
  runInstaller([], { cwd: root, configFile, opencodeHome: home });
  assert.equal(await readFile(runtimePath, "utf8"), "protected\n");
  assert.equal(await readFile(protectedAgent, "utf8"), "protected persona\n");
  assert.match(await readFile(watcherPath, "utf8"), /runLiveDashboard/);
  assert.match(await readFile(path.join(home, "plugins/checkpoint.ts"), "utf8"), /CheckpointPlugin/);
  for (const name of ["maintainer", "delegate-pilot", "implementer-pilot"]) {
    const persona = await readFile(path.join(home, `agents/${name}.md`), "utf8");
    assert.equal(persona.split(INSTRUCTION_MARKER).length - 1, 1, name);
  }
});

test("installer stops loudly before writers when required OpenCode reader paths contain symlinks", async (t) => {
  const cases = [
    {
      name: "support-tree",
      relativePath: "lib/opencode-processing-skills",
      directory: true,
    },
    {
      name: "shared-core",
      relativePath: "lib/opencode-processing-skills/checkpoint-core.mjs",
      directory: false,
    },
    {
      name: "watcher-tree",
      relativePath: "lib/opencode-processing-skills/checkpoint-watch",
      directory: true,
    },
    {
      name: "watcher-bin-directory",
      relativePath: "lib/opencode-processing-skills/checkpoint-watch/bin",
      directory: true,
    },
    {
      name: "watcher-bin",
      relativePath: "lib/opencode-processing-skills/checkpoint-watch/bin/checkpoint-watch.js",
      directory: false,
    },
    {
      name: "watcher-src-directory",
      relativePath: "lib/opencode-processing-skills/checkpoint-watch/src",
      directory: true,
    },
    {
      name: "watcher-core",
      relativePath: "lib/opencode-processing-skills/checkpoint-watch/src/index.js",
      directory: false,
    },
  ];

  for (const scenario of cases) {
    const root = await mkdtemp(path.join(os.tmpdir(), `checkpoint-opencode-${scenario.name}-link-`));
    t.after(() => rm(root, { recursive: true, force: true }));
    const home = path.join(root, "opencode-home");
    const configFile = await writeInstallerConfig(root);
    const protectedTarget = path.join(root, `protected-${scenario.name}`);
    const protectedBytes = `protected ${scenario.name}\n`;
    if (scenario.directory) {
      await mkdir(protectedTarget);
      await writeFile(path.join(protectedTarget, "sentinel.txt"), protectedBytes);
    } else {
      await writeFile(protectedTarget, protectedBytes);
    }
    const requiredPath = path.join(home, ...scenario.relativePath.split("/"));
    await mkdir(path.dirname(requiredPath), { recursive: true });
    await symlink(protectedTarget, requiredPath);
    const staleWriter = path.join(home, "plugins/checkpoint.ts");
    await mkdir(path.dirname(staleWriter), { recursive: true });
    await writeFile(staleWriter, "stale writer remains\n");

    const result = runInstallerResult([], { cwd: root, configFile, opencodeHome: home });
    assert.notEqual(result.status, 0);
    assert.match(result.stdout, /Checkpoint adapter upgrade prerequisite:/);
    assert.doesNotMatch(result.stdout, /Step 1\.1:/);
    assert.match(result.stderr, /required checkpoint reader\/core is a symlink/);
    assert.ok(result.stderr.includes(requiredPath), result.stderr);
    assert.match(result.stderr, /Update the user-managed symlink target/);
    assert.match(result.stderr, /rerun install\.sh/);
    assert.equal((await lstat(requiredPath)).isSymbolicLink(), true);
    assert.equal(await readlink(requiredPath), protectedTarget);
    if (scenario.directory) {
      assert.deepEqual(await readdir(protectedTarget), ["sentinel.txt"]);
      assert.equal(await readFile(path.join(protectedTarget, "sentinel.txt"), "utf8"), protectedBytes);
    } else {
      assert.equal(await readFile(protectedTarget, "utf8"), protectedBytes);
    }
    assert.equal(await readFile(staleWriter, "utf8"), "stale writer remains\n");
    await assert.rejects(access(path.join(home, "skills")), /ENOENT/);
  }
});

test("project installer preflights required readers before project-local writer changes", async (t) => {
  const cases = [
    {
      name: "support-tree",
      relativePath: "lib/opencode-processing-skills",
      directory: true,
    },
    {
      name: "shared-core",
      relativePath: "lib/opencode-processing-skills/checkpoint-core.mjs",
      directory: false,
    },
    {
      name: "watcher-bin-directory",
      relativePath: "lib/opencode-processing-skills/checkpoint-watch/bin",
      directory: true,
    },
    {
      name: "watcher-src-directory",
      relativePath: "lib/opencode-processing-skills/checkpoint-watch/src",
      directory: true,
    },
  ];

  for (const scenario of cases) {
    const root = await mkdtemp(
      path.join(os.tmpdir(), `checkpoint-opencode-project-${scenario.name}-link-`),
    );
    t.after(() => rm(root, { recursive: true, force: true }));
    const project = path.join(root, "project");
    await mkdir(project);
    const configFile = await writeInstallerConfig(root);
    const requiredPath = path.join(
      project,
      ".opencode",
      ...scenario.relativePath.split("/"),
    );
    const protectedTarget = path.join(root, `protected-project-${scenario.name}`);
    const protectedBytes = `protected project ${scenario.name}\n`;
    if (scenario.directory) {
      await mkdir(protectedTarget);
      await writeFile(path.join(protectedTarget, "sentinel.txt"), protectedBytes);
    } else {
      await writeFile(protectedTarget, protectedBytes);
    }
    await mkdir(path.dirname(requiredPath), { recursive: true });
    await symlink(protectedTarget, requiredPath);

    const result = runInstallerResult(["--project"], {
      cwd: project,
      configFile,
      opencodeHome: path.join(root, "forbidden-global"),
    });
    assert.notEqual(result.status, 0);
    assert.doesNotMatch(result.stdout, /Step 1\.1:/);
    assert.match(result.stderr, /required checkpoint reader\/core is a symlink/);
    assert.ok(result.stderr.includes(requiredPath), result.stderr);
    assert.match(result.stderr, /Update the user-managed symlink target/);
    assert.match(result.stderr, /rerun install\.sh/);
    assert.equal((await lstat(requiredPath)).isSymbolicLink(), true);
    assert.equal(await readlink(requiredPath), protectedTarget);
    if (scenario.directory) {
      assert.deepEqual(await readdir(protectedTarget), ["sentinel.txt"]);
      assert.equal(await readFile(path.join(protectedTarget, "sentinel.txt"), "utf8"), protectedBytes);
    } else {
      assert.equal(await readFile(protectedTarget, "utf8"), protectedBytes);
    }
    await assert.rejects(access(path.join(project, ".opencode/plugins/checkpoint.ts")), /ENOENT/);
  }
});

test("lifecycle documentation preserves honest events and ordered upgrade steps", async () => {
  const installation = await readFile(path.join(REPOSITORY_ROOT, "docs/installation.md"), "utf8");
  assert.match(installation, /OpenCode writes `open` only for verified `session\.created`/);
  assert.match(installation, /pinned Codex writes `open` for `SessionStart`; neither writes `closed`/);
  assert.match(installation, /Pinned Claude Code writes parent\/subagent `open` and native-parent `SessionEnd` `closed`/);
  assert.match(installation, /Pinned Hermes writes only new-parent, parent-owned `open` and never fabricates child attribution or `closed`/);
  assertOutputOrder(installation, [
    "Before `./install.sh`, stop every live dashboard",
    "Run the installer.",
    "Run the exact printed `Launch command`",
    "Restart OpenCode.",
    "start/restart `codex --profile-v2 agent-checkpoint`",
    "start/restart Claude Code",
    "start/restart Hermes",
  ]);

  const heartbeat = await readFile(
    path.join(REPOSITORY_ROOT, "docs/agent-checkpoint-heartbeat.md"),
    "utf8",
  );
  assert.match(heartbeat, /OpenCode schreibt `open` ausschließlich bei einem verifizierten `session\.created`/);
  assert.match(heartbeat, /`Stop` enthält eine `turn_id` und beendet nur einen Turn/);
  assert.match(heartbeat, /Claude Code schreibt Parent-\/Subagent-`open`/);
  assert.match(heartbeat, /Hermes schreibt nur beim beobachteten neuen Parent-`on_session_start`/);
  assertOutputOrder(heartbeat, [
    "laufendes Dashboard sowie alle Writer-fähigen OpenCode-, Checkpoint-Profil-Codex-, Claude-Code- und Hermes-Sessions vor der Installation stoppen",
    "Reader und Writer installieren",
    "das kompatible Dashboard mit diesem Befehl starten",
    "erst anschließend die Harnesses neu starten",
  ]);

  const codexReadme = await readFile(path.join(REPOSITORY_ROOT, "codex/README.md"), "utf8");
  assert.match(codexReadme, /codex-cli 0\.131\.0 has no `SessionEnd`/);
  assert.match(codexReadme, /`Stop`[\s\S]*never mapped to\s+`closed`/);
  assertOutputOrder(codexReadme, [
    "Stop every live `checkpoint-watch`",
    "Run `./install.sh`",
    "Start the dashboard with the installer's exact `Launch command`",
    "Restart OpenCode, then start/restart Codex",
  ]);
});

test("project installer targets only the workspace .opencode directory", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "checkpoint-opencode-project-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const project = path.join(root, "project workspace");
  const forbiddenGlobal = path.join(root, "global-opencode");
  await mkdir(project);
  const configFile = await writeInstallerConfig(root);

  const output = runInstaller(["--project"], {
    cwd: project,
    configFile,
    opencodeHome: forbiddenGlobal,
  });
  // Bash reports the physical $PWD, which canonicalizes macOS /var symlinks;
  // compare installer output against the real path.
  const canonicalProject = await realpath(project);
  assert.match(output, new RegExp(`Project mode: installing into ${canonicalProject.replaceAll("\\", "\\\\")}`));
  const projectHome = path.join(project, ".opencode");
  await assertInstalledOpenCodePilot(projectHome);
  const watcherPath = path.join(
    canonicalProject,
    ".opencode/lib/opencode-processing-skills/checkpoint-watch/bin/checkpoint-watch.js",
  );
  assert.match(output, new RegExp(`Launch command: node "${watcherPath.replaceAll("\\", "\\\\")}"`));
  assertOutputOrder(output, [
    "Checkpoint adapter upgrade prerequisite:",
    "Step 1.1:",
    "Installed: lib/opencode-processing-skills/checkpoint-core.mjs",
    "Installed: lib/opencode-processing-skills/checkpoint-watch/bin/checkpoint-watch.js",
    "Installed: lib/opencode-processing-skills/checkpoint-watch/src/index.js",
    "Installed: lib/opencode-processing-skills/checkpoint-runtime.mjs",
    "Installed: plugins/checkpoint.ts",
    "Launch command:",
    "Restart OpenCode",
  ]);
  await assert.rejects(readFile(path.join(forbiddenGlobal, "plugins/checkpoint.ts")), /ENOENT/);
});
