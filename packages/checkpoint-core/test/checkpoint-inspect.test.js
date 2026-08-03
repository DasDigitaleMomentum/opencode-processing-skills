import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  formatCheckpointSummary,
  formatInput,
  formatMetric,
  formatPercent,
  main,
} from "../bin/checkpoint-inspect.js";
import { analyzeCheckpointLog, analyzeCheckpoints, parseCheckpointJsonl } from "../src/index.js";

const PILOT_FIXTURES = new URL("../fixtures/pilot/", import.meta.url);

async function inspect(selectedPath, cwd) {
  let stdout = "";
  let stderr = "";
  const status = await main([selectedPath], {
    cwd,
    stdout: (text) => {
      stdout += text;
    },
    stderr: (text) => {
      stderr += text;
    },
  });
  return { status, stdout, stderr };
}

async function loadFixture(name) {
  const bytes = await readFile(new URL(name, PILOT_FIXTURES), "utf8");
  const records = parseCheckpointJsonl(bytes);
  return { bytes, records, analysis: analyzeCheckpoints(records) };
}

test("pilot scenarios isolate work status, chain drift, and word drift", async () => {
  const expected = {
    "successful.jsonl": { chain: 100, words: 100, status: "COMPLETED" },
    "failed-and-fixing.jsonl": { chain: 100, words: 100, status: "FAILED" },
    "broken-chain.jsonl": { chain: 50, words: 100, status: "COMPLETED" },
    "word-drift.jsonl": { chain: 100, words: 100 * (5 / 6), status: "COMPLETED" },
    "controlled-handoff.jsonl": { chain: 100, words: 100, status: "COMPLETED" },
  };

  for (const [name, result] of Object.entries(expected)) {
    const fixture = await loadFixture(name);
    assert.equal(fixture.analysis.chainPercent, result.chain, name);
    assert.equal(fixture.analysis.threeWordPercent, result.words, name);
    const summary = formatCheckpointSummary(`fixtures/pilot/${name}`, fixture.records, fixture.analysis);
    assert.match(summary, new RegExp(`Work status: ${result.status}`), name);
    assert.match(summary, new RegExp(`Chain: ${fixture.analysis.chain.success}/${fixture.analysis.chain.count} \\(${formatPercent(result.chain)}\\)`), name);
    assert.match(summary, new RegExp(`Work: ${fixture.analysis.work.success}/${fixture.analysis.work.count} \\(${formatPercent(fixture.analysis.work.percent)}\\)`), name);
    assert.match(summary, new RegExp(`Three-word compliance: ${fixture.analysis.threeWord.success}/${fixture.analysis.threeWord.count} \\(${formatPercent(result.words)}\\)`), name);
  }
});

test("inspection prints deterministic selected-session summaries without changing bytes", async () => {
  const root = path.resolve(import.meta.dirname, "..");
  for (const name of [
    "successful.jsonl",
    "failed-and-fixing.jsonl",
    "broken-chain.jsonl",
    "word-drift.jsonl",
    "controlled-handoff.jsonl",
  ]) {
    const selectedPath = `fixtures/pilot/${name}`;
    const before = await readFile(path.join(root, selectedPath));
    const result = await inspect(selectedPath, root);
    const after = await readFile(path.join(root, selectedPath));
    assert.equal(result.status, 0, name);
    assert.equal(result.stderr, "", name);
    assert.match(result.stdout, new RegExp(`File: fixtures/pilot/${name}`), name);
    assert.match(result.stdout, /Last attempted: /, name);
    assert.match(result.stdout, /Next announced: /, name);
    assert.match(result.stdout, /Agent: -/, name);
    assert.match(result.stdout, /Name\/title: -/, name);
    assert.deepEqual(after, before, name);
  }

  const handoff = await inspect("fixtures/pilot/controlled-handoff.jsonl", root);
  assert.match(handoff.stdout, /Input used: 92%/);
  assert.match(handoff.stdout, /Next announced: Prepare compact handoff/);
});

test("first record and null input use explicit n/a and unknown displays", async () => {
  const { records, analysis } = await loadFixture("successful.jsonl");
  const firstAnalysis = analyzeCheckpoints([records[0]]);
  const summary = formatCheckpointSummary("selected.jsonl", [records[0]], firstAnalysis);
  assert.match(summary, /Chain: 0\/0 \(n\/a\)/);
  assert.match(summary, /Work: 1\/1 \(100%\)/);
  assert.match(summary, /Three-word compliance: 2\/2 \(100%\)/);
  assert.match(summary, /Agent: -/);
  assert.match(summary, /Name\/title: -/);
  assert.match(summary, /Input used: unknown/);
  assert.equal(formatInput(0), "0%");
  assert.equal(formatInput(1), "100%");
  assert.equal(formatPercent(null), "n/a");
  assert.equal(formatMetric({ success: 0, count: 0, percent: null }), "0/0 (n/a)");
});

test("inspection displays latest metadata and count-based metrics", async () => {
  const { records } = await loadFixture("successful.jsonl");
  const enriched = records.map((record, index) => ({
    ...record,
    agent: index === records.length - 1 ? "implementer" : null,
    session_title: index === records.length - 1 ? "Checkpoint TUI refinement" : null,
  }));
  const analysis = analyzeCheckpoints(enriched);
  const summary = formatCheckpointSummary("selected.jsonl", enriched, analysis);
  assert.match(summary, /Agent: implementer/);
  assert.match(summary, /Name\/title: Checkpoint TUI refinement/);
  assert.match(summary, /Chain: \d+\/\d+ \([^\n]+%\)/);
  assert.match(summary, /Work: \d+\/\d+ \([^\n]+%\)/);
  assert.match(summary, /Three-word compliance: \d+\/\d+ \([^\n]+%\)/);
});

test("inspection separates mixed-log lifecycle, event, status, and checkpoint data", async () => {
  const root = path.resolve(import.meta.dirname, "..");
  const result = await inspect("fixtures/status/mixed.jsonl", root);
  assert.equal(result.status, 0);
  assert.equal(result.stderr, "");
  assert.match(result.stdout, /Session: mixed/);
  assert.match(result.stdout, /Session state: CLOSED/);
  assert.match(result.stdout, /Latest event timestamp: 2026-07-26T10:00:03\.000Z/);
  assert.match(result.stdout, /Latest status timestamp: 2026-07-26T10:00:03\.000Z/);
  assert.match(result.stdout, /Latest raw status: closed/);
  assert.match(result.stdout, /Latest checkpoint timestamp: 2026-07-26T10:00:02\.000Z/);
  assert.match(result.stdout, /Agent: implementer/);
  assert.match(result.stdout, /Chain: 1\/1 \(100%\)/);
  assert.match(result.stdout, /Work: 2\/2 \(100%\)/);
  assert.match(result.stdout, /Three-word compliance: 4\/4 \(100%\)/);
});

test("inspection renders status-only, duplicate, and reopened logs deterministically", async () => {
  const root = path.resolve(import.meta.dirname, "..");
  const statusOnly = await inspect("fixtures/status/status-only.jsonl", root);
  assert.equal(statusOnly.status, 0);
  assert.match(statusOnly.stdout, /Session state: OPEN/);
  assert.match(statusOnly.stdout, /Latest raw status: open/);
  assert.match(statusOnly.stdout, /Agent: -/);
  assert.match(statusOnly.stdout, /Latest checkpoint timestamp: -/);
  assert.match(statusOnly.stdout, /Last attempted: -/);
  assert.match(statusOnly.stdout, /Next announced: -/);
  assert.match(statusOnly.stdout, /Work status: -/);
  assert.match(statusOnly.stdout, /Input used: unknown/);
  assert.match(statusOnly.stdout, /Chain: 0\/0 \(n\/a\)/);
  assert.match(statusOnly.stdout, /Work: 0\/0 \(n\/a\)/);
  assert.match(statusOnly.stdout, /Three-word compliance: 0\/0 \(n\/a\)/);

  const duplicate = analyzeCheckpointLog(await readFile(
    new URL("../fixtures/status/duplicate-status.jsonl", import.meta.url),
    "utf8",
  ));
  assert.match(formatCheckpointSummary("duplicate.jsonl", duplicate), /Session state: OPEN/);
  const reopened = await inspect("fixtures/status/reopened-physical-order.jsonl", root);
  assert.equal(reopened.status, 0);
  assert.match(reopened.stdout, /Session state: OPEN/);
  assert.match(reopened.stdout, /Latest event timestamp: 2026-07-26T10:00:01\.000Z/);
});

test("checkpoint-only inspection reports UNKNOWN without age inference", async () => {
  const root = path.resolve(import.meta.dirname, "..");
  const result = await inspect("fixtures/pilot/successful.jsonl", root);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Session state: UNKNOWN/);
  assert.match(result.stdout, /Latest status timestamp: -/);
  assert.match(result.stdout, /Latest raw status: -/);
});

test("invalid invocation and unreadable, empty, malformed, or invalid logs fail concisely", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "checkpoint-inspect-errors-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const cases = [
    { name: "empty.jsonl", contents: "", message: /at least one record/ },
    { name: "malformed.jsonl", contents: "{broken}\n", message: /line 1/ },
    { name: "invalid.jsonl", contents: "{}\n", message: /exactly/ },
  ];
  for (const fixture of cases) {
    await writeFile(path.join(root, fixture.name), fixture.contents);
    const result = await inspect(fixture.name, root);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /^checkpoint-inspect: /);
    assert.match(result.stderr, fixture.message);
  }

  const missing = await inspect("missing.jsonl", root);
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /checkpoint-inspect: /);

  let stderr = "";
  const usage = await main([], { stderr: (text) => { stderr += text; } });
  assert.equal(usage, 1);
  assert.match(stderr, /usage: checkpoint-inspect/);

  let unreadableOut = "";
  let unreadableError = "";
  const unreadableStatus = await main(["unreadable.jsonl"], {
    cwd: root,
    readFile: async () => {
      const error = new Error("permission denied");
      error.code = "EACCES";
      throw error;
    },
    stdout: (text) => { unreadableOut += text; },
    stderr: (text) => { unreadableError += text; },
  });
  assert.equal(unreadableStatus, 1);
  assert.equal(unreadableOut, "");
  assert.match(unreadableError, /^checkpoint-inspect: permission denied/);
  assert.doesNotMatch(unreadableError, /Session state: ERROR/);

  const malformedStatus = await inspect(
    path.resolve(import.meta.dirname, "../fixtures/status/malformed-status.jsonl"),
    root,
  );
  assert.equal(malformedStatus.status, 1);
  assert.equal(malformedStatus.stdout, "");
  assert.match(malformedStatus.stderr, /^checkpoint-inspect: /);
  assert.doesNotMatch(malformedStatus.stderr, /Session state: ERROR/);
});

test("inspect main runs when invoked through a symlinked directory path", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "checkpoint-inspect-link-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, ".agent-checkpoints"));
  const record = {
    timestamp: "2026-07-26T10:00:00.000Z",
    session_id: "linked",
    done: "Write linked log",
    next: "Inspect linked log",
    step_failed: false,
    context_used: null,
    agent: null,
    session_title: null,
  };
  await writeFile(
    path.join(root, ".agent-checkpoints", "linked.jsonl"),
    `${JSON.stringify(record)}\n`,
  );

  const binDir = await realpath(path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "bin"));
  const linkParent = await mkdtemp(path.join(os.tmpdir(), "checkpoint-inspect-linkdir-"));
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

  const run = (scriptPath) =>
    spawnSync(process.execPath, [scriptPath, ".agent-checkpoints/linked.jsonl"], {
      cwd: root,
      encoding: "utf8",
    });

  const canonical = run(path.join(binDir, "checkpoint-inspect.js"));
  assert.equal(canonical.status, 0, canonical.stderr);
  assert.match(canonical.stdout, /Session: linked/);

  const viaLink = run(path.join(link, "checkpoint-inspect.js"));
  assert.equal(viaLink.status, 0, viaLink.stderr);
  assert.match(viaLink.stdout, /Session: linked/);
  assert.match(viaLink.stdout, /Work status: COMPLETED/);
});
