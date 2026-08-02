import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { EventEmitter } from "node:events";
import { mkdtemp, mkdir, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  formatDashboard,
  loadSessionRows,
  main,
  OLD_ROW_MS,
  parseArgs,
  runLiveDashboard,
} from "../bin/checkpoint-watch.js";

function record(session, timestamp, overrides = {}) {
  return {
    timestamp,
    session_id: session,
    done: "Previous work completed",
    next: "Continue planned work",
    step_failed: false,
    context_used: null,
    ...overrides,
  };
}

function status(session, timestamp, value) {
  return {
    timestamp,
    session_id: session,
    event: "session_status",
    status: value,
  };
}

async function writeLog(root, name, records) {
  await writeFile(path.join(root, ".agent-checkpoints", name), `${records.map(JSON.stringify).join("\n")}\n`);
}

test("rows sort by latest event and separate explicit state, age, metrics, status, and context", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "checkpoint-watch-rows-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, ".agent-checkpoints"));
  await writeLog(root, "older.jsonl", [
    record("older", "2026-07-26T10:00:00.000Z", { next: "Run focused tests" }),
    record("older", "2026-07-26T10:00:10.000Z", {
      done: "broken chain here", next: "Correct failed work", step_failed: true, context_used: 0.5,
      agent: "implementer", session_title: "Checkpoint TUI refinement",
    }),
    status("older", "2026-07-26T10:00:11.000Z", "closed"),
  ]);
  await writeLog(root, "newer.jsonl", [
    record("newer", "2026-07-26T10:00:29.000Z"),
    status("newer", "2026-07-26T10:00:29.500Z", "open"),
  ]);

  const rows = await loadSessionRows(root, { now: Date.parse("2026-07-26T10:00:30.000Z"), staleMs: 10000 });
  assert.deepEqual(rows.map((row) => row.session), ["newer", "older"]);
  assert.deepEqual(rows.map((row) => row.state), ["OPEN", "CLOSED"]);
  assert.deepEqual(rows.map((row) => row.ageMs), [500, 19000]);
  assert.equal(rows[0].context, "unknown");
  assert.equal(rows[1].context, "50%");
  assert.equal(rows[1].checkpointCount, 2);
  assert.equal(rows[1].metrics, "0/50/100%");
  assert.equal(rows[0].checkpointCount, 1);
  assert.equal(rows[0].metrics, "n/a/100/100%");
  assert.equal(rows[1].agent, "implementer");
  assert.equal(rows[1].title, "Checkpoint TUI refinement");
  assert.equal(rows[0].agent, "-");
  assert.equal(rows[0].title, "-");
});

test("age and stale thresholds never infer or change lifecycle state", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "checkpoint-watch-state-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, ".agent-checkpoints"));
  await writeLog(root, "old-open.jsonl", [
    status("old-open", "2026-07-26T09:00:00.000Z", "open"),
  ]);
  await writeLog(root, "fresh-closed.jsonl", [
    status("fresh-closed", "2026-07-26T10:00:29.999Z", "closed"),
  ]);
  await writeLog(root, "legacy.jsonl", [record("legacy", "2026-07-26T10:00:29.999Z")]);

  const now = Date.parse("2026-07-26T10:00:30.000Z");
  const shortReference = await loadSessionRows(root, { now, staleMs: 1 });
  const longReference = await loadSessionRows(root, { now, staleMs: 10000000 });
  const states = (rows) => Object.fromEntries(rows.map((row) => [row.session, row.state]));
  assert.deepEqual(states(shortReference), {
    "fresh-closed": "CLOSED",
    legacy: "UNKNOWN",
    "old-open": "OPEN",
  });
  assert.deepEqual(states(longReference), states(shortReference));
  assert.deepEqual(longReference, shortReference);
});

test("old rows hide at the exact three-hour boundary without changing lifecycle", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "checkpoint-watch-old-boundary-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, ".agent-checkpoints"));
  const now = Date.parse("2026-07-26T12:00:00.000Z");
  const freshTimestamp = new Date(now - OLD_ROW_MS + 1).toISOString();
  const oldTimestamp = new Date(now - OLD_ROW_MS).toISOString();
  await writeLog(root, "fresh.jsonl", [record("fresh", freshTimestamp, {
    agent: "maintainer-direct", session_title: "fresh boundary marker",
  })]);
  await writeLog(root, "old-open.jsonl", [
    record("old-open", oldTimestamp, {
      agent: "implementer", session_title: "old open marker",
    }),
    status("old-open", oldTimestamp, "open"),
  ]);
  await writeLog(root, "old-closed.jsonl", [
    record("old-closed", oldTimestamp, {
      agent: "delegate", session_title: "old closed marker",
    }),
    status("old-closed", oldTimestamp, "closed"),
  ]);
  await writeFile(path.join(root, ".agent-checkpoints", "broken.jsonl"), "{broken\n");

  const rows = await loadSessionRows(root, { now });
  assert.deepEqual(
    Object.fromEntries(rows.filter((row) => row.state !== "ERROR").map((row) => [row.session, row.state])),
    { fresh: "UNKNOWN", "old-open": "OPEN", "old-closed": "CLOSED" },
  );
  assert.equal(rows.find((row) => row.session === "fresh").ageMs, OLD_ROW_MS - 1);
  assert.equal(rows.find((row) => row.session === "old-open").ageMs, OLD_ROW_MS);

  const hidden = formatDashboard(rows, { columns: 180 });
  assert.match(hidden, /fresh boundary marker/);
  assert.doesNotMatch(hidden, /old open marker|old closed marker/);
  assert.match(hidden, /ERROR/);

  const shown = formatDashboard(rows, { columns: 180, showOldRows: true });
  assert.match(shown, /fresh boundary marker[\s\S]*\n\n[\s\S]*old open marker/);
  assert.match(shown, /old open marker[\s\S]*\n\n[\s\S]*old closed marker/);
  assert.match(shown, /old closed marker[\s\S]*\n\n[\s\S]*ERROR/);
});

test("old-row filtering keeps the discovered header when every valid row is hidden", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "checkpoint-watch-old-empty-view-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, ".agent-checkpoints"));
  const now = Date.parse("2026-07-26T12:00:00.000Z");
  await writeLog(root, "old.jsonl", [record(
    "old",
    new Date(now - OLD_ROW_MS).toISOString(),
    { agent: "implementer", session_title: "hidden old marker" },
  )]);
  const rows = await loadSessionRows(root, { now });
  const output = formatDashboard(rows, { columns: 120 });
  assert.match(output, /Checkpoint sessions/);
  assert.doesNotMatch(output, /hidden old marker|No direct \.agent-checkpoints/);
});

test("status-only, duplicate, and reopened rows use neutral checkpoint details", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "checkpoint-watch-status-only-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, ".agent-checkpoints"));
  await writeLog(root, "status-only.jsonl", [status("status-only", "2026-07-26T10:00:00.000Z", "open")]);
  await writeLog(root, "duplicate.jsonl", [
    status("duplicate", "2026-07-26T10:00:01.000Z", "open"),
    status("duplicate", "2026-07-26T10:00:02.000Z", "open"),
  ]);
  await writeLog(root, "reopened.jsonl", [
    status("reopened", "2026-07-26T10:00:05.000Z", "closed"),
    status("reopened", "2026-07-26T10:00:03.000Z", "open"),
  ]);

  const rows = await loadSessionRows(root, { now: Date.parse("2026-07-26T10:00:10.000Z") });
  assert.deepEqual(Object.fromEntries(rows.map((row) => [row.session, row.state])), {
    reopened: "OPEN",
    duplicate: "OPEN",
    "status-only": "OPEN",
  });
  for (const row of rows) {
    assert.equal(row.checkpointCount, 0);
    assert.equal(row.metrics, "n/a/n/a/n/a");
    assert.equal(row.context, "unknown");
    assert.equal(row.agent, "-");
    assert.equal(row.title, "-");
    assert.equal(row.done, "-");
    assert.equal(row.next, "-");
  }
});

test("malformed files become concise error rows and only direct regular JSONL files are read", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "checkpoint-watch-filter-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const checkpointRoot = path.join(root, ".agent-checkpoints");
  await mkdir(path.join(checkpointRoot, "cache"), { recursive: true });
  await writeLog(root, "good.jsonl", [record("good", "2026-07-26T10:00:00.000Z")]);
  await writeFile(path.join(checkpointRoot, "bad.jsonl"), "{changing\n");
  await writeFile(path.join(checkpointRoot, "ignored.txt"), "not jsonl");
  await writeFile(path.join(checkpointRoot, "cache", "nested.jsonl"), "{also ignored}");

  const rows = await loadSessionRows(root, { now: Date.parse("2026-07-26T10:00:01.000Z") });
  assert.deepEqual(rows.map((row) => row.session), ["good", "bad"]);
  assert.equal(rows[1].state, "ERROR");
  assert.match(rows[1].next, /line 1/);
});

test("unreadable files become ERROR rows without hiding valid sessions", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "checkpoint-watch-unreadable-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const checkpointRoot = path.join(root, ".agent-checkpoints");
  await mkdir(checkpointRoot);
  await writeLog(root, "good.jsonl", [status("good", "2026-07-26T10:00:00.000Z", "open")]);
  await writeFile(path.join(checkpointRoot, "unreadable.jsonl"), "sentinel");
  const rows = await loadSessionRows(root, { now: Date.parse("2026-07-26T10:00:01.000Z") }, {
    readFile: async (filePath, encoding) => {
      if (filePath.endsWith("unreadable.jsonl")) {
        const error = new Error("permission denied");
        error.code = "EACCES";
        throw error;
      }
      return readFile(filePath, encoding);
    },
  });
  assert.deepEqual(rows.map((row) => row.session), ["good", "unreadable"]);
  assert.equal(rows[0].state, "OPEN");
  assert.equal(rows[1].state, "ERROR");
  assert.match(rows[1].next, /permission denied/);
});

test("dashboard truncates deterministically within terminal width", () => {
  const row = {
    session: "session-name-that-is-much-too-long", ageMs: 2000, state: "UNKNOWN",
    checkpointCount: 1, metrics: "n/a/100/100%", context: "unknown",
    agent: "implementer", title: "A human-readable session title",
    done: "A deliberately oversized completed work description",
    next: "A deliberately oversized next work description",
  };
  const first = formatDashboard([row], { columns: 140, staleMs: 1000 });
  const second = formatDashboard([row], { columns: 140, staleMs: 1000 });
  assert.equal(first, second);
  assert.ok(first.split("\n").every((line) => line.length <= 140));
  assert.match(first, /…/);
  assert.match(first, /AGENT.*NAME.*AGE.*STATE.*CP.*C\/W\/3 %.*CONTEXT.*DONE.*CURRENT/);
  assert.match(first, /n\/a\/100\/100%/);
  assert.doesNotMatch(first, /session-name-that-is-much-too-long|SESSION|NAME\/TITLE|CHAIN|3-WORD|NEXT/);
});

test("dashboard preserves complete agent identity at 120 columns and truncates name first", () => {
  const row = {
    session: "session-with-long-id", agent: "maintainer-direct",
    title: "A descriptive human readable checkpoint session title",
    ageMs: 2000, state: "UNKNOWN", checkpointCount: 2, metrics: "100/100/100%",
    context: "50%",
    done: "A deliberately oversized completed work description",
    next: "A deliberately oversized next work description",
  };
  const narrowBoundary = formatDashboard([row], { columns: 64, staleMs: 1000 });
  const genuinelyNarrow = formatDashboard([row], { columns: 63, staleMs: 1000 });
  const ordinary = formatDashboard([row], { columns: 120, staleMs: 1000 });
  const medium = formatDashboard([row], { columns: 140, staleMs: 1000 });
  const wide = formatDashboard([row], { columns: 240, staleMs: 1000 });
  assert.ok(narrowBoundary.split("\n").every((line) => line.length <= 64));
  assert.ok(genuinelyNarrow.split("\n").every((line) => line.length <= 63));
  assert.ok(ordinary.split("\n").every((line) => line.length <= 120));
  assert.ok(medium.split("\n").every((line) => line.length <= 140));
  assert.ok(wide.split("\n").every((line) => line.length <= 240));
  assert.match(ordinary, /maintainer-direct/);
  assert.match(ordinary, /A descriptive human [^\n]*…/);
  assert.doesNotMatch(ordinary, /A descriptive human readable checkpoint session title/);
  assert.match(narrowBoundary, /maintainer-direct/);
  assert.match(genuinelyNarrow, /maintainer-[^\s]*…/);
  assert.doesNotMatch(genuinelyNarrow, /maintainer-direct/);
  assert.match(genuinelyNarrow, /NAME/);
  assert.match(medium, /…/);
  assert.match(wide, /A descriptive human readable checkpoint session title/);
  assert.match(wide, /A deliberately oversized completed work description/);
  assert.match(wide, /A deliberately oversized next work description/);
  assert.ok(wide.split("\n")[3].length > medium.split("\n")[3].length);
});

test("once mode is deterministic and emits no terminal control sequences", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "checkpoint-watch-once-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, ".agent-checkpoints"));
  await writeLog(root, "once.jsonl", [record("once", "2026-07-26T10:00:00.000Z")]);
  let stdout = "";
  const status = await main(["--once", "--stale-ms", "2000"], {
    cwd: root, columns: 100, now: () => Date.parse("2026-07-26T10:00:01.000Z"),
    env: {}, stdout: (text) => { stdout += text; },
  });
  assert.equal(status, 0);
  assert.match(stdout, /1s.*UNKNOWN.*1.*n\/a\/100\/100%/);
  assert.doesNotMatch(stdout, /\bonce\b/);
  assert.doesNotMatch(stdout, /\x1b/);
});

test("options support environment defaults, CLI overrides, help, and concise validation", async () => {
  assert.deepEqual(parseArgs([], {
    CHECKPOINT_WATCH_REFRESH_MS: "50", CHECKPOINT_WATCH_STALE_MS: "75",
  }), { once: false, help: false, refreshMs: 50, staleMs: 75 });
  assert.equal(parseArgs(["--refresh-ms", "10"], { CHECKPOINT_WATCH_REFRESH_MS: "50" }).refreshMs, 10);
  assert.throws(() => parseArgs(["--stale-ms", "0"], {}), /positive integer/);
  let stdout = "";
  assert.equal(await main(["--help"], { env: {}, stdout: (text) => { stdout += text; } }), 0);
  assert.match(stdout, /does not prove process liveness/);
  assert.match(stdout, /explicit session_status events/);
  assert.match(stdout, /Compatibility-only validated no-op/);
  assert.match(stdout, /CHECKPOINT_WATCH_STALE_MS/);
});

test("dashboard groups lifecycle rows, hides IDs, and clears closed current work", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "checkpoint-watch-groups-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, ".agent-checkpoints"));
  await writeLog(root, "open-old.jsonl", [
    record("secret-open-old", "2026-07-26T10:00:01.000Z", { next: "Continue open work" }),
    status("secret-open-old", "2026-07-26T10:00:02.000Z", "open"),
  ]);
  await writeLog(root, "unknown-new.jsonl", [
    record("secret-unknown-new", "2026-07-26T10:00:03.000Z", { next: "Continue unknown work" }),
  ]);
  await writeLog(root, "closed-new.jsonl", [
    record("secret-closed-new", "2026-07-26T10:00:04.000Z", { next: "Must stay hidden" }),
    status("secret-closed-new", "2026-07-26T10:00:05.000Z", "closed"),
  ]);
  await writeFile(path.join(root, ".agent-checkpoints", "broken-id.jsonl"), "{broken\n");

  const rows = await loadSessionRows(root, { now: Date.parse("2026-07-26T10:00:06.000Z") });
  assert.deepEqual(rows.map((row) => row.state), ["UNKNOWN", "OPEN", "CLOSED", "ERROR"]);
  const output = formatDashboard(rows, { columns: 180 });
  assert.doesNotMatch(output, /secret-|broken-id|Must stay hidden/);
  assert.match(output, /UNKNOWN[\s\S]*OPEN[\s\S]*\n\n[\s\S]*CLOSED[\s\S]*—[\s\S]*\n\n[\s\S]*ERROR/);
  assert.match(output, /Continue unknown work/);
  assert.match(output, /Continue open work/);
  assert.match(output, /read failed/);
});

test("stale compatibility inputs cannot change dashboard bytes", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "checkpoint-watch-stale-noop-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, ".agent-checkpoints"));
  await writeLog(root, "stable.jsonl", [record("hidden-stable-id", "2026-07-26T10:00:00.000Z")]);
  const run = async (staleMs) => {
    let stdout = "";
    const code = await main(["--once", "--stale-ms", String(staleMs)], {
      cwd: root,
      columns: 120,
      now: () => Date.parse("2026-07-26T10:00:01.000Z"),
      env: {},
      stdout: (text) => { stdout += text; },
    });
    assert.equal(code, 0);
    return stdout;
  };
  assert.equal(await run(1), await run(999999));
});

test("live refresh disposes watcher and timer and restores cursor", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "checkpoint-watch-live-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, ".agent-checkpoints"));
  const watcher = new EventEmitter();
  let watcherClosed = false;
  watcher.close = () => { watcherClosed = true; };
  let timerCleared = false;
  let output = "";
  await runLiveDashboard(root, { refreshMs: 10, staleMs: 1000 }, {
    columns: 80,
    now: () => Date.parse("2026-07-26T10:00:00.000Z"),
    stdout: (text) => { output += text; },
    watch: (_directory, callback) => { watcher.on("change", callback); return watcher; },
    setInterval: () => ({ id: 1 }),
    clearInterval: () => { timerCleared = true; },
    waitForExit: async ({ refresh }) => { watcher.emit("change"); await refresh(); },
  });
  assert.equal(watcherClosed, true);
  assert.equal(timerCleared, true);
  assert.ok(output.startsWith("\x1b[?25l"));
  assert.ok(output.endsWith("\x1b[?25h"));
  assert.match(output, /\x1b\[H\x1b\[2J/);
});

test("live lowercase v toggles old rows and restores owned input and signal state", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "checkpoint-watch-live-input-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, ".agent-checkpoints"));
  const now = Date.parse("2026-07-26T12:00:00.000Z");
  await writeLog(root, "old.jsonl", [record(
    "old",
    new Date(now - OLD_ROW_MS).toISOString(),
    { agent: "implementer", session_title: "toggle-old-marker" },
  )]);
  await writeLog(root, "fresh.jsonl", [record(
    "fresh",
    new Date(now - 1000).toISOString(),
    { agent: "maintainer-direct", session_title: "toggle-fresh-marker" },
  )]);

  const input = new EventEmitter();
  input.isTTY = true;
  input.isRaw = false;
  input.readableFlowing = null;
  const inputTransitions = [];
  input.setRawMode = (enabled) => { inputTransitions.push(["raw", enabled]); input.isRaw = enabled; };
  input.resume = () => { inputTransitions.push(["flow", "resume"]); input.readableFlowing = true; };
  input.pause = () => { inputTransitions.push(["flow", "pause"]); input.readableFlowing = false; };
  const signals = new EventEmitter();
  const watcher = { close() {} };
  let output = "";

  await runLiveDashboard(root, { refreshMs: 60_000, staleMs: 1000 }, {
    columns: 120,
    now: () => now,
    stdout: (text) => { output += text; },
    stdin: input,
    onSignal: (signal, listener) => { signals.on(signal, listener); },
    offSignal: (signal, listener) => { signals.off(signal, listener); },
    watch: () => watcher,
    setInterval: () => ({ id: 1 }),
    clearInterval: () => {},
    waitForExit: async ({ refresh }) => {
      input.emit("data", "Vx");
      await refresh();
      input.emit("data", Buffer.from("v"));
      await refresh();
      input.emit("data", "v");
      await refresh();
      input.emit("data", "\u0003");
    },
  });

  assert.match(output, /toggle-fresh-marker/);
  assert.equal(output.split("toggle-old-marker").length - 1, 2);
  assert.deepEqual(inputTransitions, [
    ["raw", true], ["flow", "resume"], ["raw", false], ["flow", "pause"],
  ]);
  assert.equal(input.listenerCount("data"), 0);
  assert.equal(signals.listenerCount("SIGINT"), 0);
  assert.equal(signals.listenerCount("SIGTERM"), 0);
  assert.ok(output.endsWith("\x1b[?25h"));
});

test("live signal shutdown and setup failures share complete cleanup", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "checkpoint-watch-live-cleanup-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, ".agent-checkpoints"));

  const signals = new EventEmitter();
  let watcherClosed = false;
  let timerCleared = false;
  let output = "";
  await runLiveDashboard(root, { refreshMs: 60_000, staleMs: 1000 }, {
    stdout: (text) => { output += text; },
    stdin: { isTTY: false },
    onSignal: (signal, listener) => { signals.on(signal, listener); },
    offSignal: (signal, listener) => { signals.off(signal, listener); },
    watch: () => ({ close: () => { watcherClosed = true; } }),
    setInterval: () => {
      queueMicrotask(() => { signals.emit("SIGTERM"); });
      return { id: 1 };
    },
    clearInterval: () => { timerCleared = true; },
  });
  assert.equal(watcherClosed, true);
  assert.equal(timerCleared, true);
  assert.equal(signals.listenerCount("SIGINT"), 0);
  assert.equal(signals.listenerCount("SIGTERM"), 0);
  assert.ok(output.endsWith("\x1b[?25h"));

  const failingSignals = new EventEmitter();
  const failingInput = new EventEmitter();
  failingInput.isTTY = true;
  failingInput.isRaw = false;
  failingInput.readableFlowing = false;
  failingInput.setRawMode = () => { throw new Error("raw setup failed"); };
  let failingOutput = "";
  await assert.rejects(
    runLiveDashboard(root, { refreshMs: 10, staleMs: 1000 }, {
      stdout: (text) => { failingOutput += text; },
      stdin: failingInput,
      onSignal: (signal, listener) => { failingSignals.on(signal, listener); },
      offSignal: (signal, listener) => { failingSignals.off(signal, listener); },
    }),
    /raw setup failed/,
  );
  assert.equal(failingSignals.listenerCount("SIGINT"), 0);
  assert.equal(failingSignals.listenerCount("SIGTERM"), 0);
  assert.equal(failingInput.listenerCount("data"), 0);
  assert.ok(failingOutput.endsWith("\x1b[?25h"));

  const partialSignals = new EventEmitter();
  let partialOutput = "";
  await assert.rejects(
    runLiveDashboard(root, { refreshMs: 10, staleMs: 1000 }, {
      stdout: (text) => { partialOutput += text; },
      stdin: { isTTY: false },
      onSignal: (signal, listener) => {
        if (signal === "SIGTERM") throw new Error("signal setup failed");
        partialSignals.on(signal, listener);
      },
      offSignal: (signal, listener) => { partialSignals.off(signal, listener); },
    }),
    /signal setup failed/,
  );
  assert.equal(partialSignals.listenerCount("SIGINT"), 0);
  assert.ok(partialOutput.endsWith("\x1b[?25h"));

  const preservedInput = new EventEmitter();
  preservedInput.isTTY = true;
  preservedInput.isRaw = true;
  preservedInput.readableFlowing = true;
  let rawCalls = 0;
  let flowCalls = 0;
  preservedInput.setRawMode = () => { rawCalls += 1; };
  preservedInput.resume = () => { flowCalls += 1; };
  preservedInput.pause = () => { flowCalls += 1; };
  const watchFailureSignals = new EventEmitter();
  let watchFailureTimerCleared = false;
  let watchFailureOutput = "";
  await assert.rejects(
    runLiveDashboard(root, { refreshMs: 10, staleMs: 1000 }, {
      stdout: (text) => { watchFailureOutput += text; },
      stdin: preservedInput,
      onSignal: (signal, listener) => { watchFailureSignals.on(signal, listener); },
      offSignal: (signal, listener) => { watchFailureSignals.off(signal, listener); },
      setInterval: () => ({ id: 1 }),
      clearInterval: () => { watchFailureTimerCleared = true; },
      watch: () => { throw new Error("watch setup failed"); },
    }),
    /watch setup failed/,
  );
  assert.equal(rawCalls, 0);
  assert.equal(flowCalls, 0);
  assert.equal(preservedInput.listenerCount("data"), 0);
  assert.equal(watchFailureSignals.listenerCount("SIGINT"), 0);
  assert.equal(watchFailureSignals.listenerCount("SIGTERM"), 0);
  assert.equal(watchFailureTimerCleared, true);
  assert.ok(watchFailureOutput.endsWith("\x1b[?25h"));
});

test("watcher main runs when invoked through a symlinked directory path", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "checkpoint-watch-link-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, ".agent-checkpoints"));
  await writeLog(root, "linked.jsonl", [record("linked", new Date().toISOString())]);

  const binDir = await realpath(path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "bin"));
  const linkParent = await mkdtemp(path.join(os.tmpdir(), "checkpoint-watch-linkdir-"));
  t.after(() => rm(linkParent, { recursive: true, force: true }));
  const link = path.join(linkParent, "linked-bin");
  try {
    await symlink(binDir, link, "junction");
  } catch (error) {
    if (["EPERM", "EACCES", "ENOTSUP"].includes(error?.code)) {
      t.skip("directory symlinks unavailable on this platform");
      return;
    }
    throw error;
  }

  const env = { ...process.env };
  delete env.CHECKPOINT_WATCH_REFRESH_MS;
  delete env.CHECKPOINT_WATCH_STALE_MS;
  const run = (scriptPath) => spawnSync(process.execPath, [scriptPath, "--once"], { cwd: root, encoding: "utf8", env });

  const canonical = run(path.join(binDir, "checkpoint-watch.js"));
  assert.equal(canonical.status, 0, canonical.stderr);
  assert.match(canonical.stdout, /Checkpoint sessions/);

  const viaLink = run(path.join(link, "checkpoint-watch.js"));
  assert.equal(viaLink.status, 0, viaLink.stderr);
  assert.match(viaLink.stdout, /Checkpoint sessions/);
  assert.match(viaLink.stdout, /UNKNOWN.*1.*n\/a\/100\/100%/);
  assert.doesNotMatch(viaLink.stdout, /\blinked\b/);
});
