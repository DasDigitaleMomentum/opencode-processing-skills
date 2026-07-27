import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  formatCheckpointSummary,
  formatContext,
  formatMetric,
  formatPercent,
  main,
} from "../bin/checkpoint-inspect.js";
import { analyzeCheckpoints, parseCheckpointJsonl } from "../src/index.js";

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
  assert.match(handoff.stdout, /Context used: 92%/);
  assert.match(handoff.stdout, /Next announced: Prepare compact handoff/);
});

test("first record and null context use explicit n/a and unknown displays", async () => {
  const { records, analysis } = await loadFixture("successful.jsonl");
  const firstAnalysis = analyzeCheckpoints([records[0]]);
  const summary = formatCheckpointSummary("selected.jsonl", [records[0]], firstAnalysis);
  assert.match(summary, /Chain: 0\/0 \(n\/a\)/);
  assert.match(summary, /Work: 1\/1 \(100%\)/);
  assert.match(summary, /Three-word compliance: 2\/2 \(100%\)/);
  assert.match(summary, /Agent: -/);
  assert.match(summary, /Name\/title: -/);
  assert.match(summary, /Context used: unknown/);
  assert.equal(formatContext(0), "0%");
  assert.equal(formatContext(1), "100%");
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
