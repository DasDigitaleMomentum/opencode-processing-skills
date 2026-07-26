import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

import { main as inspectCheckpoint } from "../../packages/checkpoint-core/bin/checkpoint-inspect.js";
import * as checkpointCore from "../../packages/checkpoint-core/src/index.js";
import {
  createOpenCodeCheckpointPlugin,
  createOpenCodeContextTelemetry,
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

function fakeClient({ messages, contextLimit = 1000, messageError, providerError } = {}) {
  return {
    session: {
      async messages(options) {
        if (messageError) throw messageError;
        assert.equal(options.path.id, "session-a");
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

function runInstaller(args, { cwd, configFile, opencodeHome }) {
  const result = spawnSync("bash", [path.join(REPOSITORY_ROOT, "install.sh"), ...args], {
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
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  return result.stdout;
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
    ]);
    assert.equal(record.session_id, sessionId);
    assert.equal(record.context_used, null);
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
  assert.match(parentSummary, /Chain: n\/a/);
  assert.match(parentSummary, /Three-word compliance: 100%/);
  assert.match(failedSummary, /Work status: FAILED/);
  assert.match(failedSummary, /Chain: n\/a/);
  assert.match(failedSummary, /Three-word compliance: 100%/);
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
  assert.match(correctedSummary, /Chain: 100%/);
  assert.match(correctedSummary, /Three-word compliance: 100%/);
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
  ]);
  assert.equal(record.context_used, null);
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
  const protectedWatcher = path.join(root, "protected-watcher.js");
  await writeFile(protectedWatcher, "protected watcher\n");
  await rm(watcherPath);
  await symlink(protectedWatcher, watcherPath);

  runInstaller([], { cwd: root, configFile, opencodeHome: home });
  assert.equal(await readFile(runtimePath, "utf8"), "protected\n");
  assert.equal(await readFile(protectedAgent, "utf8"), "protected persona\n");
  assert.equal(await readFile(watcherPath, "utf8"), "protected watcher\n");
  assert.match(await readFile(path.join(home, "plugins/checkpoint.ts"), "utf8"), /CheckpointPlugin/);
  for (const name of ["maintainer", "delegate-pilot", "implementer-pilot"]) {
    const persona = await readFile(path.join(home, `agents/${name}.md`), "utf8");
    assert.equal(persona.split(INSTRUCTION_MARKER).length - 1, 1, name);
  }
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
  assert.match(output, new RegExp(`Project mode: installing into ${project.replaceAll("\\", "\\\\")}`));
  const projectHome = path.join(project, ".opencode");
  await assertInstalledOpenCodePilot(projectHome);
  const watcherPath = path.join(projectHome, "lib/opencode-processing-skills/checkpoint-watch/bin/checkpoint-watch.js");
  assert.match(output, new RegExp(`Launch command: node "${watcherPath.replaceAll("\\", "\\\\")}"`));
  await assert.rejects(readFile(path.join(forbiddenGlobal, "plugins/checkpoint.ts")), /ENOENT/);
});
