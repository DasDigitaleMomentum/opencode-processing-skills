import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  formatDashboard,
  loadSessionRows,
  main,
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

async function writeLog(root, name, records) {
  await writeFile(path.join(root, ".agent-checkpoints", name), `${records.map(JSON.stringify).join("\n")}\n`);
}

test("rows sort by latest activity and separate age, state, metrics, status, and context", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "checkpoint-watch-rows-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, ".agent-checkpoints"));
  await writeLog(root, "older.jsonl", [
    record("older", "2026-07-26T10:00:00.000Z", { next: "Run focused tests" }),
    record("older", "2026-07-26T10:00:10.000Z", {
      done: "broken chain here", next: "Correct failed work", step_failed: true, context_used: 0.5,
    }),
  ]);
  await writeLog(root, "newer.jsonl", [record("newer", "2026-07-26T10:00:29.500Z")]);

  const rows = await loadSessionRows(root, { now: Date.parse("2026-07-26T10:00:30.000Z"), staleMs: 10000 });
  assert.deepEqual(rows.map((row) => row.session), ["newer", "older"]);
  assert.deepEqual(rows.map((row) => row.state), ["ACTIVE", "STALE"]);
  assert.equal(rows[0].context, "unknown");
  assert.equal(rows[1].context, "50%");
  assert.equal(rows[1].work, "FAILED");
  assert.equal(rows[1].chain, "0%");
  assert.equal(rows[1].words, "100%");
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

test("dashboard truncates deterministically within terminal width", () => {
  const row = {
    session: "session-name-that-is-much-too-long", ageMs: 2000, state: "ACTIVE",
    chain: "100%", words: "100%", work: "COMPLETED", context: "unknown",
    done: "A deliberately oversized completed work description",
    next: "A deliberately oversized next work description",
  };
  const first = formatDashboard([row], { columns: 80, staleMs: 1000 });
  const second = formatDashboard([row], { columns: 80, staleMs: 1000 });
  assert.equal(first, second);
  assert.ok(first.split("\n").every((line) => line.length <= 80));
  assert.match(first, /…/);
  assert.match(first, /SESSION.*AGE.*STATE.*CHAIN.*3-WORD.*WORK.*CONTEXT.*DONE.*NEXT/);
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
  assert.match(stdout, /once.*1s.*ACTIVE/);
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
  assert.match(stdout, /CHECKPOINT_WATCH_STALE_MS/);
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
