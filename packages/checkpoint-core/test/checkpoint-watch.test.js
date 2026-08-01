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
  assert.equal(rows[1].work, "1/2 (50%)");
  assert.equal(rows[1].chain, "0/1 (0%)");
  assert.equal(rows[1].words, "4/4 (100%)");
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
    assert.equal(row.chain, "0/0 (n/a)");
    assert.equal(row.work, "0/0 (n/a)");
    assert.equal(row.words, "0/0 (n/a)");
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
    chain: "100%", words: "100%", work: "COMPLETED", context: "unknown",
    agent: "implementer", title: "A human-readable session title",
    done: "A deliberately oversized completed work description",
    next: "A deliberately oversized next work description",
  };
  row.chain = "1/1 (100%)";
  row.work = "1/1 (100%)";
  row.words = "2/2 (100%)";
  const first = formatDashboard([row], { columns: 140, staleMs: 1000 });
  const second = formatDashboard([row], { columns: 140, staleMs: 1000 });
  assert.equal(first, second);
  assert.ok(first.split("\n").every((line) => line.length <= 140));
  assert.match(first, /…/);
  assert.match(first, /SESSION.*AGENT.*NAME\/TITLE.*AGE.*STATE.*CHAIN.*WORK.*3-WORD.*CONTEXT.*DONE.*NEXT/);
  assert.match(first, /1\/1 \(100%\).*1\/1 \(100%\).*2\/2 \(100%\)/);
});

test("dashboard distributes added terminal width across title, done, and next", () => {
  const row = {
    session: "session-with-long-id", agent: "maintainer-direct",
    title: "A descriptive human readable checkpoint session title",
    ageMs: 2000, state: "UNKNOWN", chain: "1/1 (100%)", work: "2/2 (100%)",
    words: "4/4 (100%)", context: "50%",
    done: "A deliberately oversized completed work description",
    next: "A deliberately oversized next work description",
  };
  const narrow = formatDashboard([row], { columns: 80, staleMs: 1000 });
  const medium = formatDashboard([row], { columns: 140, staleMs: 1000 });
  const wide = formatDashboard([row], { columns: 240, staleMs: 1000 });
  assert.ok(narrow.split("\n").every((line) => line.length <= 80));
  assert.ok(medium.split("\n").every((line) => line.length <= 140));
  assert.ok(wide.split("\n").every((line) => line.length <= 240));
  assert.match(narrow, /…/);
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
  assert.match(stdout, /once.*1s.*UNKNOWN/);
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
  assert.match(stdout, /Informational latest-event age reference/);
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

test("watcher main runs when invoked through a symlinked directory path", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "checkpoint-watch-link-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, ".agent-checkpoints"));
  await writeLog(root, "linked.jsonl", [record("linked", "2026-07-26T10:00:00.000Z")]);

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
  assert.match(viaLink.stdout, /linked/);
});
