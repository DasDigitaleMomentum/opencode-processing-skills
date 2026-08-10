import assert from "node:assert/strict";
import {
  access,
  chmod,
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
  createOpenCodeInputTelemetry,
  createOpenCodeSessionTitle,
} from "../checkpoint-runtime.mjs";

const REPOSITORY_ROOT = path.resolve(import.meta.dirname, "../..");
const INSTRUCTION_MARKER = "<!-- opencode-checkpoint-instruction -->";
const INSTRUCTION_END_MARKER = "<!-- /opencode-checkpoint-instruction -->";
const PREVIOUS_SOFT_CONTEXT_INSTRUCTION = `<!-- opencode-checkpoint-instruction -->

## Checkpoint Heartbeat

This instruction applies to parents and subagents. Segment work into meaningful, role-appropriate bounded units and call \`checkpoint\` after each completed or failed unit, not after every tiny action. Follow any more specific role cadence. Write \`done\` and \`next\` as exactly three words, and reuse the previous \`next\` text verbatim as the following \`done\`.

Where possible, include \`checkpoint\` in the same parallel tool-call block as the next independent tool calls. Do not create an additional model round trip solely for checkpointing.

When an attempted subtask fails, still checkpoint with that announced subtask as \`done\`, set \`step_failed=true\`, and make \`next\` the corrective step. This records work progress and is not itself a Canary failure.

Checkpoint feedback may describe the previous completed step or latest harness snapshot and therefore lag the active turn. Treat unknown telemetry as unknown. Before deliberately starting another context-heavy unit, consider the latest feedback, remaining work, and available headroom.

Approximately 75% context use and approximately 220k used tokens are soft planning signals only, never stop conditions. Continuing toward approximately 300k used tokens is acceptable when the remaining work is bounded. Do not deliberately open another context-heavy branch without first assessing the remaining work and headroom. If continued work is no longer controlled, complete the current bounded unit, write a final checkpoint, and return a compact handoff stating progress and the next announced step.

Checkpointing records progress but does not prove work quality.

Every successful checkpoint lazily confirms the persisted session as open. \`close_session\` defaults to \`false\`. A subagent sets \`close_session=true\` only on its final checkpoint immediately before returning a digest, summary, or handoff. A Maintainer or parent leaves it false unless intentionally ending the whole persisted session.

Closure is independent of \`step_failed\` and does not prove work succeeded. An interrupted session or missing final call remains open; any later checkpoint confirms it open again.

<!-- /opencode-checkpoint-instruction -->
`;
const PREVIOUS_CURRENT_INSTRUCTION = `<!-- opencode-checkpoint-instruction -->

## Checkpoint Heartbeat

This instruction applies to parents and subagents. Segment work into meaningful subtasks and call \`checkpoint\` after each completed or failed subtask. Write \`done\` and \`next\` as exactly three words, and reuse the previous \`next\` text verbatim as the following \`done\`.

Where possible, include \`checkpoint\` in the same parallel tool-call block as the next independent tool calls. Do not create an additional model round trip solely for checkpointing.

When an attempted subtask fails, still checkpoint with that announced subtask as \`done\`, set \`step_failed=true\`, and make \`next\` the corrective step. This records work progress and is not itself a Canary failure.

Treat unknown context telemetry as unknown; do not infer a stop threshold. If reported context pressure becomes high, complete the current subtask, write a final checkpoint, and return a compact handoff stating progress and the next announced step. Checkpointing records progress but does not prove work quality.

Every successful checkpoint lazily confirms the persisted session as open. \`close_session\` defaults to \`false\`. A subagent sets \`close_session=true\` only on its final checkpoint immediately before returning a digest, summary, or handoff. A Maintainer or parent leaves it false unless intentionally ending the whole persisted session.

Closure is independent of \`step_failed\` and does not prove work succeeded. An interrupted session or missing final call remains open; any later checkpoint confirms it open again.

<!-- /opencode-checkpoint-instruction -->
`;
const LEGACY_INSTRUCTION = `<!-- opencode-checkpoint-instruction -->

## Checkpoint Heartbeat

This instruction applies to parents and subagents. Segment work into meaningful subtasks and call \`checkpoint\` after each completed or failed subtask. Write \`done\` and \`next\` as exactly three words, and reuse the previous \`next\` text verbatim as the following \`done\`.

Where possible, include \`checkpoint\` in the same parallel tool-call block as the next independent tool calls. Do not create an additional model round trip solely for checkpointing.

When an attempted subtask fails, still checkpoint with that announced subtask as \`done\`, set \`step_failed=true\`, and make \`next\` the corrective step. This records work progress and is not itself a Canary failure.

Treat unknown context telemetry as unknown; do not infer a stop threshold. If reported context pressure becomes high, complete the current subtask, write a final checkpoint, and return a compact handoff stating progress and the next announced step. Checkpointing records progress but does not prove work quality.
`;
const INITIAL_LEGACY_INSTRUCTION = `<!-- opencode-checkpoint-instruction -->

## Checkpoint Heartbeat

This instruction applies to parents and subagents. Segment work into meaningful subtasks and call \`checkpoint\` after each completed or failed subtask. Write \`done\` and \`next\` as exactly three words, and reuse the previous \`next\` text verbatim as the following \`done\`.

When an attempted subtask fails, still checkpoint with that announced subtask as \`done\`, set \`step_failed=true\`, and make \`next\` the corrective step. This records work progress and is not itself a Canary failure.

Treat unknown context telemetry as unknown; do not infer a stop threshold. If reported context pressure becomes high, complete the current subtask, write a final checkpoint, and return a compact handoff stating progress and the next announced step. Checkpointing records progress but does not prove work quality.
`;

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

function runInstallerResult(args, { cwd, configFile, opencodeHome, env = {} }) {
  return spawnSync("bash", [path.join(REPOSITORY_ROOT, "install.sh"), ...args], {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: "/usr/bin:/bin",
      HOME: path.dirname(opencodeHome),
      OPS_CONFIG_FILE: configFile,
      OPS_OPENCODE_HOME: opencodeHome,
      OPS_SYNC_CODEX: "false",
      OPS_SYNC_CLAUDE: "false",
      OPS_SYNC_CURSOR: "false",
      OPS_SYNC_HERMES: "false",
      OPS_ANTIGRAVITY_PATH: path.join(cwd, "absent-antigravity"),
      ...env,
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

async function writeFakeScriptc(root, behavior) {
  const bin = path.join(root, "fake-scriptc-bin");
  const invocationLog = path.join(root, "scriptc-invocations.log");
  await mkdir(bin, { recursive: true });
  const fakePython = path.join(bin, "python3");
  await writeFile(fakePython, `#!/bin/sh
if [ ${JSON.stringify(behavior)} = pty-failure ]; then
  printf '%s\\n' 'native-checkpoint-watch-smoke: fake PTY restoration failure' >&2
  exit 31
fi
exit 0
`);
  await chmod(fakePython, 0o755);
  const script = path.join(bin, "scriptc");
  const nativeBody = `#!/bin/sh
behavior=${JSON.stringify(behavior)}
if [ "\${1:-}" = "--help" ]; then
  [ "$behavior" != "help-failure" ] || exit 11
  printf '%s\\n' 'Usage: checkpoint-watch [--once]'
  exit 0
fi
if [ "\${1:-}" = "--once" ]; then
  [ "$behavior" != "once-failure" ] || exit 12
  printf '%s\\n' 'Checkpoint sessions — fake native once'
  exit 0
fi
[ "$behavior" != "live-start-failure" ] || exit 13
printf '\\033[?25l\\033[H\\033[2JCheckpoint sessions — fake native live\\n'
if [ "$behavior" = "live-exit-failure" ]; then
  trap 'printf "\\033[?25h"; exit 14' TERM INT
elif [ "$behavior" = "cursor-failure" ]; then
  trap 'exit 0' TERM INT
else
  trap 'printf "\\033[?25h"; exit 0' TERM INT
fi
seen=false
while :; do
  if [ "$behavior" != "live-refresh-failure" ] && [ "$seen" = false ] && [ -f .agent-checkpoints/native-installer-smoke.jsonl ]; then
    printf '\\033[H\\033[2JCheckpoint sessions — fake native live\\nnative-refresh\\n'
    seen=true
  fi
  sleep 0.02
done
`;
  const fake = `#!/usr/bin/env bash
set -u
printf '%s\\n' "\${1:-missing}" >> ${JSON.stringify(invocationLog)}
case "\${1:-}" in
  coverage)
    if [ ${JSON.stringify(behavior)} = coverage-failure ]; then exit 21; fi
    if [ ${JSON.stringify(behavior)} = coverage-fence ]; then printf '%s\\n' 'SC2002'; else printf '%s\\n' 'compile statically'; fi
    ;;
  build)
    if [ ${JSON.stringify(behavior)} = build-failure ]; then exit 22; fi
    output=''
    shift
    while [ "$#" -gt 0 ]; do
      if [ "$1" = -o ]; then output="$2"; shift 2; else shift; fi
    done
    [ -n "$output" ] || exit 23
    cat > "$output" <<'NATIVE'
${nativeBody}NATIVE
    if [ ${JSON.stringify(behavior)} != non-executable ]; then chmod 755 "$output"; fi
    ;;
  *) exit 24 ;;
esac
`;
  await writeFile(script, fake);
  await chmod(script, 0o755);
  return { bin, invocationLog };
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
  assert.match(plugin, /createOpenCodeInputTelemetry\(pluginContext\?\.client\)/);
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
    assert.equal(persona.split(INSTRUCTION_END_MARKER).length - 1, 1, name);
    assert.match(persona, /subagent sets `close_session=true` only on its final checkpoint/);
    assert.match(persona, /Maintainer or parent leaves it false/);
    assert.match(persona, /reported \*\*input usage\*\*/);
    assert.match(persona, /Across providers/);
    assert.match(persona, /approximately 205k input tokens are a soft planning signal/);
    assert.doesNotMatch(persona, /approximately 220k input tokens are a soft planning signal/);
    assert.match(persona, /At or above approximately 272k input tokens/);
    assert.match(persona, /372k input rejection boundary is emergency headroom/);
    assert.match(persona, /previous completed step or latest harness snapshot/);
  }

  const executionSkill = await readFile(
    path.join(home, "skills/execute-work-package/SKILL.md"),
    "utf8",
  );
  assert.match(executionSkill, /Execute Work Package/);
  assert.match(executionSkill, /Package Sizing Note/);
  assert.match(executionSkill, /Call `checkpoint_path` with the failed Implementer `task_id`/);
  const browserSkill = await readFile(
    path.join(home, "skills/browser-walkthrough/SKILL.md"),
    "utf8",
  );
  assert.match(browserSkill, /Automated browser acceptance — Implementer-owned/);
  assert.match(browserSkill, /Agent-observed walkthrough — Delegate-owned/);
  assert.match(browserSkill, /User-attended walkthrough — Maintainer-owned/);
  assert.match(browserSkill, /Evidence paths/);
  const implementer = await readFile(path.join(home, "agents/implementer.md"), "utf8");
  assert.match(implementer, /browser-walkthrough: allow/);
}

test("native tools isolate parent and subagent logs with honest unknown telemetry", async (t) => {
  const worktree = await mkdtemp(path.join(os.tmpdir(), "checkpoint-opencode-tools-"));
  t.after(() => rm(worktree, { recursive: true, force: true }));
  const plugin = createOpenCodeCheckpointPlugin({ tool: fakeTool, checkpointCore });
  const hooks = await plugin({ worktree });
  assert.deepEqual(Object.keys(hooks.tool.checkpoint.args), [
    "done", "next", "step_failed", "close_session",
  ]);

  const parentResult = await hooks.tool.checkpoint.execute(
    { done: "Parent task finished", next: "Delegate task started" },
    { sessionID: "parent/session", worktree },
  );
  const subagentResult = await hooks.tool.checkpoint.execute(
    {
      done: "Focused tests attempted",
      next: "Test failure correct",
      step_failed: true,
      close_session: true,
    },
    { sessionID: "subagent-session" },
  );

  assert.equal(
    parentResult,
    "Checkpoint saved.\nInput usage (previous completed step, 372k limit): unknown\nInput K-tokens (previous completed step): unknown\nRemaining input K-tokens (to 372k limit): unknown",
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
  assert.deepEqual(
    checkpointCore.parseCheckpointLogJsonl(subagentRaw).map((record) => record.status ?? "checkpoint"),
    ["open", "checkpoint", "closed"],
  );
  assert.equal(checkpointCore.analyzeCheckpointLog(subagentRaw).state, "CLOSED");
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
  assert.match(parentSummary, /Input used: unknown/);
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
  assert.equal(checkpointCore.analyzeCheckpointLog(correctedBefore.toString("utf8")).state, "OPEN");

  await hooks.tool.checkpoint.execute(
    { done: "not three", next: "still accepted" },
    { sessionID: "parent/session", worktree },
  );
  const parentRaw = await readFile(
    path.join(worktree, ...checkpointCore.checkpointPath("parent/session").split("/")),
    "utf8",
  );
  assert.equal(checkpointCore.parseCheckpointJsonl(parentRaw).length, 2);

  for (const [index, close_session] of [null, "true", 1, [], {}].entries()) {
    const sessionID = `invalid-close-${index}`;
    await assert.rejects(
      hooks.tool.checkpoint.execute(
        { done: "Reject invalid closure", next: "Preserve empty output", close_session },
        { sessionID, worktree },
      ),
      /close_session must be a boolean/,
    );
    await assert.rejects(
      access(path.join(worktree, ...checkpointCore.checkpointPath(sessionID).split("/"))),
      /ENOENT/,
    );
  }
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
  assert.equal(resumedAnalysis.state, "OPEN");
  assert.deepEqual(
    resumedAnalysis.records.map((record) => record.status ?? "checkpoint"),
    ["open", "checkpoint"],
  );
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
  assert.equal(mixed.records.length, 3);
  assert.equal(mixed.checkpoints.length, 1);
  assert.deepEqual(mixed.analysis.work, { success: 1, count: 1, percent: 100 });
  assert.equal(mixed.records.some((record) => record.status === "closed"), false);
});

test("OpenCode directory wins when newer hosts expose root as worktree", async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "checkpoint-opencode-directory-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const plugin = createOpenCodeCheckpointPlugin({ tool: fakeTool, checkpointCore });
  const hooks = await plugin({ directory, worktree: path.parse(directory).root });

  await hooks.event({
    event: {
      type: "session.created",
      properties: { info: { id: "new-host-event" } },
    },
  });
  await hooks.tool.checkpoint.execute(
    { done: "Workspace root resolved", next: "Verify directory output" },
    {
      sessionID: "new-host-tool",
      directory,
      worktree: path.parse(directory).root,
    },
  );

  for (const sessionId of ["new-host-event", "new-host-tool"]) {
    const file = path.join(directory, ...checkpointCore.checkpointPath(sessionId).split("/"));
    assert.equal((await readFile(file, "utf8")).includes(`"session_id":"${sessionId}"`), true);
  }
});

test("telemetry combines uncached and cached input against the 372k limit", async () => {
  const telemetry = createOpenCodeInputTelemetry(
    fakeClient({
      messages: [
        assistant({ id: "older", input: 100000, output: 10, cacheRead: 100000 }),
        assistant({
          id: "completed",
          input: 2300,
          output: 100,
          reasoning: 50,
          cacheRead: 220000,
          cacheWrite: 900,
        }),
        assistant({ id: "active", input: 900, output: 0 }),
      ],
    }),
  );

  assert.deepEqual(await telemetry({ sessionID: "session-a", directory: "/workspace" }), {
    contextUsed: 0.6,
    usedKTokens: 223.2,
    remainingKTokens: 148.8,
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

test("telemetry clamps exhausted input and rejects malformed host data", async () => {
  const exhausted = createOpenCodeInputTelemetry(
    fakeClient({ messages: [assistant({ id: "large", input: 1000, output: 500, cacheRead: 399000 })] }),
  );
  assert.deepEqual(await exhausted({ sessionID: "session-a", directory: "/workspace" }), {
    contextUsed: 1,
    usedKTokens: 400,
    remainingKTokens: 0,
  });

  const partial = createOpenCodeInputTelemetry(
    fakeClient({ messages: [assistant({ id: "invalid", input: 186000, reasoning: Number.NaN })] }),
  );
  assert.deepEqual(await partial({ sessionID: "session-a", directory: "/workspace" }), {
    contextUsed: 0.5,
    usedKTokens: 186,
    remainingKTokens: 186,
  });

  const absent = createOpenCodeInputTelemetry(fakeClient({ messages: undefined }));
  assert.deepEqual(await absent({ sessionID: "session-a", directory: "/workspace" }), {
    contextUsed: null,
    usedKTokens: null,
    remainingKTokens: null,
  });

  const invalidCache = createOpenCodeInputTelemetry(
    fakeClient({ messages: [assistant({ id: "invalid-cache", cacheRead: Number.NaN })] }),
  );
  assert.deepEqual(await invalidCache({ sessionID: "session-a", directory: "/workspace" }), {
    contextUsed: null,
    usedKTokens: null,
    remainingKTokens: null,
  });

  for (const client of [
    fakeClient({ messages: [assistant({ id: "unmatched", providerID: "missing" })] }),
    fakeClient({ messages: [assistant({ id: "invalid-limit" })], contextLimit: 0 }),
    fakeClient({ messages: [assistant({ id: "provider-error" })], providerError: new Error("unavailable") }),
  ]) {
    const telemetry = createOpenCodeInputTelemetry(client);
    assert.deepEqual(await telemetry({ sessionID: "session-a", directory: "/workspace" }), {
      contextUsed: 100 / 372000,
      usedKTokens: 0.1,
      remainingKTokens: 371.9,
    });
  }
});

test("SDK telemetry failures fall back to null without blocking persistence", async (t) => {
  const worktree = await mkdtemp(path.join(os.tmpdir(), "checkpoint-opencode-telemetry-error-"));
  t.after(() => rm(worktree, { recursive: true, force: true }));
  const getInputTelemetry = createOpenCodeInputTelemetry(
    fakeClient({ messages: [], messageError: new Error("SDK unavailable") }),
  );
  const plugin = createOpenCodeCheckpointPlugin({ tool: fakeTool, checkpointCore, getInputTelemetry });
  const hooks = await plugin({ worktree });

  const result = await hooks.tool.checkpoint.execute(
    { done: "Host query attempted", next: "Checkpoint write verified" },
    { sessionID: "session-a", directory: "/workspace", worktree },
  );
  assert.match(result, /Input usage .*: unknown/);
  assert.match(result, /Input K-tokens .*: unknown/);
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
  assert.match(output, /Native watcher unavailable: scriptc was not found/);
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

test("optional native installer keeps the Node fallback and prior binary on every failed gate", async (t) => {
  const scenarios = [
    "coverage-failure",
    "coverage-fence",
    "build-failure",
    "non-executable",
    "help-failure",
    "once-failure",
    "live-start-failure",
    "live-refresh-failure",
    "live-exit-failure",
    "cursor-failure",
    "pty-failure",
  ];
  for (const behavior of scenarios) {
    const root = await mkdtemp(path.join(os.tmpdir(), `checkpoint-opencode-native-${behavior}-`));
    t.after(() => rm(root, { recursive: true, force: true }));
    const home = path.join(root, "opencode-home");
    const configFile = await writeInstallerConfig(root);
    const { bin } = await writeFakeScriptc(root, behavior);
    const nativePath = path.join(root, ".local/bin/checkpoint-watch");
    await mkdir(path.dirname(nativePath), { recursive: true });
    const sentinel = `preserved native ${behavior}\n`;
    await writeFile(nativePath, sentinel);

    const output = runInstaller([], {
      cwd: root,
      configFile,
      opencodeHome: home,
      env: { PATH: `${bin}:/usr/bin:/bin` },
    });
    const watcherPath = path.join(home, "lib/opencode-processing-skills/checkpoint-watch/bin/checkpoint-watch.js");
    assert.match(output, /Native watcher unavailable: .*using installed Node fallback/);
    assert.match(output, new RegExp(`Launch command: node "${watcherPath.replaceAll("\\", "\\\\")}"`));
    assert.doesNotMatch(output, /Node fallback:/);
    assert.equal(await readFile(nativePath, "utf8"), sentinel, behavior);
    await assertInstalledOpenCodePilot(home);
  }
});

test("verified optional native installer atomically selects native and retains the exact Node fallback", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "checkpoint-opencode-native-success-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const home = path.join(root, "opencode-home");
  const configFile = await writeInstallerConfig(root);
  const { bin, invocationLog } = await writeFakeScriptc(root, "success");
  const stageRoot = path.join(root, "native-stages");
  await mkdir(stageRoot);
  const nativePath = path.join(root, ".local/bin/checkpoint-watch");
  await mkdir(path.dirname(nativePath), { recursive: true });
  await writeFile(nativePath, "previous regular native\n");

  const output = runInstaller([], {
    cwd: root,
    configFile,
    opencodeHome: home,
    env: { PATH: `${bin}:/usr/bin:/bin`, TMPDIR: stageRoot },
  });
  const watcherPath = path.join(home, "lib/opencode-processing-skills/checkpoint-watch/bin/checkpoint-watch.js");
  assert.match(output, new RegExp(`Native watcher installed: ${nativePath.replaceAll("\\", "\\\\")}`));
  assert.match(output, new RegExp(`Launch command: "${nativePath.replaceAll("\\", "\\\\")}"`));
  assert.match(output, new RegExp(`Node fallback: node "${watcherPath.replaceAll("\\", "\\\\")}"`));
  assert.doesNotMatch(await readFile(nativePath, "utf8"), /previous regular native/);
  assert.notEqual((await lstat(nativePath)).mode & 0o111, 0);
  const help = spawnSync(nativePath, ["--help"], { encoding: "utf8" });
  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /Usage: checkpoint-watch/);
  assert.equal(await readFile(invocationLog, "utf8"), "coverage\nbuild\n");
  assert.deepEqual(await readdir(stageRoot), []);
  await assertInstalledOpenCodePilot(home);
});

test("optional native installer preserves a user-managed destination symlink without probing scriptc", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "checkpoint-opencode-native-symlink-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const home = path.join(root, "opencode-home");
  const configFile = await writeInstallerConfig(root);
  const { bin, invocationLog } = await writeFakeScriptc(root, "success");
  const protectedTarget = path.join(root, "protected-native");
  await writeFile(protectedTarget, "protected native bytes\n");
  const nativePath = path.join(root, ".local/bin/checkpoint-watch");
  await mkdir(path.dirname(nativePath), { recursive: true });
  await symlink(protectedTarget, nativePath);

  const output = runInstaller([], {
    cwd: root,
    configFile,
    opencodeHome: home,
    env: { PATH: `${bin}:/usr/bin:/bin` },
  });
  assert.match(output, /preserving user-managed symlink/);
  assert.equal((await lstat(nativePath)).isSymbolicLink(), true);
  assert.equal(await readlink(nativePath), protectedTarget);
  assert.equal(await readFile(protectedTarget, "utf8"), "protected native bytes\n");
  await assert.rejects(readFile(invocationLog, "utf8"), /ENOENT/);
});

test("installer migrates only the exact legacy managed fragment and preserves surrounding bytes", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "checkpoint-opencode-managed-migration-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const home = path.join(root, "opencode-home");
  const configFile = await writeInstallerConfig(root);
  runInstaller([], { cwd: root, configFile, opencodeHome: home });

  const current = await readFile(path.join(REPOSITORY_ROOT, "opencode/checkpoint-instruction.md"), "utf8");
  const previousOperational = current.replace("approximately 205k input tokens", "approximately 220k input tokens");
  const legacyPath = path.join(home, "agents/ordinary-legacy.md");
  const initialLegacyPath = path.join(home, "agents/delegate-codex.md");
  const previousSoftContextPath = path.join(home, "agents/previous-soft-context.md");
  const previousOperationalPath = path.join(home, "agents/previous-operational.md");
  const previousCurrentPath = path.join(home, "agents/previous-current.md");
  const retainedVariantPath = path.join(home, "agents/delegate-retained.md");
  const currentPath = path.join(home, "agents/ordinary-current.md");
  const prefix = "front matter and user bytes\n";
  const suffix = "user suffix without terminal newline";
  await writeFile(legacyPath, `${prefix}${LEGACY_INSTRUCTION}${suffix}`);
  await writeFile(initialLegacyPath, `${prefix}${INITIAL_LEGACY_INSTRUCTION}${suffix}`);
  await writeFile(previousSoftContextPath, `${prefix}${PREVIOUS_SOFT_CONTEXT_INSTRUCTION}${suffix}`);
  await writeFile(previousOperationalPath, `${prefix}${previousOperational}${suffix}`);
  await writeFile(previousCurrentPath, `${prefix}${PREVIOUS_CURRENT_INSTRUCTION}${suffix}`);
  await writeFile(retainedVariantPath, `variant prefix\n${LEGACY_INSTRUCTION}variant suffix\n`);
  const exactCurrent = `${prefix}${current}${suffix}`;
  await writeFile(currentPath, exactCurrent);

  const output = runInstaller([], { cwd: root, configFile, opencodeHome: home });
  assert.match(output, /Updated: ordinary-legacy\.md/);
  assert.match(output, /Updated: delegate-codex\.md/);
  assert.match(output, /Updated: previous-soft-context\.md/);
  assert.match(output, /Updated: previous-operational\.md/);
  assert.match(output, /Updated: previous-current\.md/);
  assert.match(output, /Updated: delegate-retained\.md/);
  assert.match(output, /Present: ordinary-current\.md/);
  assert.equal(await readFile(legacyPath, "utf8"), `${prefix}${current}${suffix}`);
  assert.equal(await readFile(initialLegacyPath, "utf8"), `${prefix}${current}${suffix}`);
  assert.equal(await readFile(previousSoftContextPath, "utf8"), `${prefix}${current}${suffix}`);
  assert.equal(await readFile(previousOperationalPath, "utf8"), `${prefix}${current}${suffix}`);
  assert.equal(await readFile(previousCurrentPath, "utf8"), `${prefix}${current}${suffix}`);
  assert.equal(
    await readFile(retainedVariantPath, "utf8"),
    `variant prefix\n${current}variant suffix\n`,
  );
  assert.equal(await readFile(currentPath, "utf8"), exactCurrent);
});

test("installer refuses unknown marked persona content without changing its bytes", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "checkpoint-opencode-managed-refusal-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const home = path.join(root, "opencode-home");
  const configFile = await writeInstallerConfig(root);
  runInstaller([], { cwd: root, configFile, opencodeHome: home });
  const personaPath = path.join(home, "agents/custom-unknown.md");
  const custom = `user prefix\n${INSTRUCTION_MARKER}\ncustom managed words\nuser suffix without newline`;
  await writeFile(personaPath, custom);

  const result = runInstallerResult([], { cwd: root, configFile, opencodeHome: home });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /unknown or customized checkpoint instruction/);
  assert.ok(result.stderr.includes(personaPath), result.stderr);
  assert.match(result.stderr, /Restore the exact managed block or remove its marker/);
  assert.equal(await readFile(personaPath, "utf8"), custom);
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
  const configExample = await readFile(path.join(REPOSITORY_ROOT, "config.yaml.example"), "utf8");
  assert.match(configExample, /Codex Desktop.*`codex -p agent-checkpoint`/s);
  assert.match(configExample, /codex-cli 0\.131\.0 is not supported/s);
  assert.doesNotMatch(configExample, /profile-v2/);
  assert.match(installation, /every adapter now performs lazy open plus optional declared close/);
  assert.match(installation, /`open` → checkpoint → optional declared `closed`/);
  assert.match(installation, /No child-end hook, host-idle heuristic, or parent-child field is added/);
  assert.match(installation, /unknown\/customized marked content stops loudly unchanged/);
  assert.match(installation, /`--stale-ms` and `CHECKPOINT_WATCH_STALE_MS` remain accepted.*no-ops/);
  assert.match(installation, /`AGENT`, `NAME`, `AGE`, `STATE`, `CP`, `C\/W\/3 %`, `INPUT`, `DONE`, and `CURRENT`/);
  assert.match(installation, /fixed presentation cutoff is exactly 10,800,000 ms/);
  assert.match(installation, /Lowercase `v` alone toggles all old rows/);
  assert.match(installation, /atomically renamed to `\$HOME\/\.local\/bin\/checkpoint-watch`/);
  assert.match(installation, /`\.\/install\.sh --project` does not probe scriptc/);
  assert.match(installation, /Node 20 or newer/);
  assert.match(installation, /`codex -p agent-checkpoint` on the verified Codex Desktop/);
  assert.match(installation, /Standalone `codex-cli` 0\.131\.0 is not supported/);
  assert.doesNotMatch(installation, /profile-v2/);
  assertOutputOrder(installation, [
    "Before `./install.sh`, stop every live dashboard",
    "Run the installer.",
    "Run the exact printed `Launch command`",
    "Restart OpenCode.",
    "start/restart the verified Codex Desktop runtime with the printed profile command",
    "start/restart Claude Code",
    "start/restart Hermes",
  ]);

  const heartbeat = await readFile(
    path.join(REPOSITORY_ROOT, "docs/agent-checkpoint-heartbeat.md"),
    "utf8",
  );
  assert.match(heartbeat, /jeder erfolgreiche Checkpoint `open`/);
  assert.match(heartbeat, /`Stop`, Exit und Crash bleiben write-free/);
  assert.match(heartbeat, /`open` → Checkpoint → `closed`/);
  assert.match(heartbeat, /Subagent setzt `close_session=true` ausschließlich auf seinem letzten Checkpoint/);
  assert.match(heartbeat, /Session-ID.*im Dashboard aber nicht gerendert/);
  assert.match(heartbeat, /`10\.800\.000` ms \(drei Stunden\)/);
  assert.match(heartbeat, /kleine `v` alle alten Zeilen/);
  assert.match(heartbeat, /vorherigen Raw-\/Flow-Zustand wieder her/);
  assertOutputOrder(heartbeat, [
    "laufendes Dashboard sowie alle Writer-fähigen OpenCode-, Checkpoint-Profil-Codex-, Claude-Code- und Hermes-Sessions vor der Installation stoppen",
    "Reader und Writer installieren",
    "das kompatible Dashboard mit diesem Befehl starten",
    "erst anschließend die Harnesses neu starten",
  ]);

  const codexReadme = await readFile(path.join(REPOSITORY_ROOT, "codex/README.md"), "utf8");
  assert.match(codexReadme, /no adopted `SessionEnd`/);
  assert.match(codexReadme, /`Stop`[\s\S]*never mapped to\s+`closed`/);
  assertOutputOrder(codexReadme, [
    "Stop every live `checkpoint-watch`",
    "Run `./install.sh`",
    "Start the dashboard with the installer's exact `Launch command`",
    "Restart OpenCode, then start/restart the verified Codex Desktop runtime",
  ]);

  const overview = await readFile(path.join(REPOSITORY_ROOT, "docs/overview.md"), "utf8");
  assert.match(overview, /no required compilation step/i);
  assert.match(overview, /atomically installs `\$HOME\/\.local\/bin\/checkpoint-watch`/);
  const checkpointModule = await readFile(
    path.join(REPOSITORY_ROOT, "docs/modules/checkpoint-core.md"),
    "utf8",
  );
  assert.match(checkpointModule, /`OLD_ROW_MS`/);
  assert.match(checkpointModule, /complete known agent identities/);
  const installationModule = await readFile(
    path.join(REPOSITORY_ROOT, "docs/modules/installation-and-configuration.md"),
    "utf8",
  );
  assert.match(installationModule, /`install_optional_native_checkpoint_watch`/);
  assert.match(installationModule, /Project mode does not inspect this path or probe scriptc/);
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

test("project installer neither probes scriptc nor mutates the global native bin", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "checkpoint-opencode-project-native-isolation-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const project = path.join(root, "project");
  await mkdir(project);
  const configFile = await writeInstallerConfig(root);
  const { bin, invocationLog } = await writeFakeScriptc(root, "success");
  const globalBin = path.join(root, ".local/bin");
  await mkdir(globalBin, { recursive: true });
  await writeFile(path.join(globalBin, "checkpoint-watch"), "global native sentinel\n");
  await writeFile(path.join(globalBin, "unrelated"), "unrelated sentinel\n");
  const beforeEntries = await readdir(globalBin);

  const output = runInstaller(["--project"], {
    cwd: project,
    configFile,
    opencodeHome: path.join(root, "forbidden-global"),
    env: { PATH: `${bin}:/usr/bin:/bin` },
  });
  const canonicalProject = await realpath(project);
  const watcherPath = path.join(
    canonicalProject,
    ".opencode/lib/opencode-processing-skills/checkpoint-watch/bin/checkpoint-watch.js",
  );
  assert.match(output, new RegExp(`Launch command: node "${watcherPath.replaceAll("\\", "\\\\")}"`));
  assert.doesNotMatch(output, /Native watcher (installed|unavailable)|Node fallback:/);
  assert.deepEqual(await readdir(globalBin), beforeEntries);
  assert.equal(await readFile(path.join(globalBin, "checkpoint-watch"), "utf8"), "global native sentinel\n");
  assert.equal(await readFile(path.join(globalBin, "unrelated"), "utf8"), "unrelated sentinel\n");
  await assert.rejects(readFile(invocationLog, "utf8"), /ENOENT/);
});
