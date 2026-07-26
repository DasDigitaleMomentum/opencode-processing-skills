import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  analyzeCheckpoints,
  checkpoint,
  checkpointPath,
  createCheckpointRecord,
  parseCheckpointJsonl,
  validateCheckpointRecord,
} from "../src/index.js";

const FIXED_TIME = "2026-07-26T14:30:00.000Z";
const clock = () => new Date(FIXED_TIME);
const validRecord = () => ({
  timestamp: FIXED_TIME,
  session_id: "ses_123",
  done: "API calls checked",
  next: "Logging schema build",
  step_failed: false,
  context_used: 0.5,
});

const fixtures = JSON.parse(
  await readFile(new URL("../fixtures/checkpoint-cases.json", import.meta.url), "utf8"),
);

test("creates exactly the authorized raw schema with defaults", () => {
  const record = createCheckpointRecord({
    sessionId: "ses_123",
    done: "not three",
    next: "one",
    clock,
  });

  assert.deepEqual(Object.keys(record), [
    "timestamp",
    "session_id",
    "done",
    "next",
    "step_failed",
    "context_used",
  ]);
  assert.equal(record.timestamp, FIXED_TIME);
  assert.equal(record.step_failed, false);
  assert.equal(record.context_used, null);
});

test("rejects missing, extra, and invalid record fields", () => {
  const missing = validRecord();
  delete missing.next;
  assert.throws(() => validateCheckpointRecord(missing), /exactly/);
  assert.throws(() => validateCheckpointRecord({ ...validRecord(), path: "elsewhere" }), /exactly/);

  const invalidCases = [
    { key: "timestamp", value: "2026-07-26" },
    { key: "timestamp", value: "2026-02-30T00:00:00Z" },
    { key: "timestamp", value: "2025-02-29T00:00:00.000Z" },
    { key: "session_id", value: "" },
    { key: "done", value: 3 },
    { key: "next", value: null },
    { key: "step_failed", value: 0 },
    { key: "context_used", value: -0.1 },
    { key: "context_used", value: 1.1 },
    { key: "context_used", value: Number.NaN },
    { key: "context_used", value: Number.POSITIVE_INFINITY },
  ];
  for (const { key, value } of invalidCases) {
    assert.throws(() => validateCheckpointRecord({ ...validRecord(), [key]: value }));
  }
  assert.doesNotThrow(() =>
    validateCheckpointRecord({ ...validRecord(), timestamp: "2024-02-29T00:00:00Z" }),
  );
  assert.doesNotThrow(() => validateCheckpointRecord({ ...validRecord(), context_used: null }));
});

test("maps all shared session identifiers to stable relative paths", () => {
  for (const fixture of fixtures.pathCases) {
    assert.equal(checkpointPath(fixture.sessionId), fixture.path);
  }
  assert.throws(() => checkpointPath(""), /non-empty/);
  assert.throws(() => checkpointPath("\ud800"), /valid Unicode/);
});

test("appends independently parseable records without rewriting prior bytes", async (context) => {
  const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), "checkpoint-core-"));
  context.after(() => rm(workspaceRoot, { recursive: true, force: true }));
  const sessionId = "../outside";
  const relativePath = checkpointPath(sessionId);
  const expectedFile = path.resolve(workspaceRoot, ...relativePath.split("/"));

  const firstFeedback = await checkpoint({
    workspaceRoot,
    sessionId,
    done: "API calls checked",
    next: "Logging schema build",
    contextUsed: null,
    remainingKTokens: 56,
    clock,
  });
  const firstBytes = await readFile(expectedFile, "utf8");
  assert.deepEqual(firstFeedback, { contextUsed: null, remainingKTokens: 56 });
  assert.equal(path.dirname(expectedFile), path.join(workspaceRoot, ".agent-checkpoints"));

  await checkpoint({
    workspaceRoot,
    sessionId,
    done: "Logging schema build",
    next: "Run focused tests",
    stepFailed: true,
    contextUsed: 0.72,
    clock,
  });
  const complete = await readFile(expectedFile, "utf8");
  assert.equal(complete.slice(0, firstBytes.length), firstBytes);
  const records = parseCheckpointJsonl(complete);
  assert.equal(records.length, 2);
  assert.equal(records[1].step_failed, true);
  assert.equal(records[1].context_used, 0.72);
  assert.deepEqual(Object.keys(records[1]), Object.keys(validRecord()));
});

test("strictly parses JSONL and rejects empty, blank, malformed, or invalid records", () => {
  const line = JSON.stringify(validRecord());
  assert.deepEqual(parseCheckpointJsonl(`${line}\n`), [validRecord()]);
  assert.throws(() => parseCheckpointJsonl(""), /at least one/);
  assert.throws(() => parseCheckpointJsonl(`${line}\n\n${line}`), /blank lines/);
  assert.throws(() => parseCheckpointJsonl("{broken}\n"), /line 1/);
  assert.throws(() => parseCheckpointJsonl(`${JSON.stringify({ ...validRecord(), extra: true })}\n`), /exactly/);
});

test("matches every shared analysis fixture without mutating its records", () => {
  for (const fixture of fixtures.analysisCases) {
    const before = structuredClone(fixture.records);
    const result = analyzeCheckpoints(fixture.records);
    assert.equal(result.chainPercent, fixture.expected.chainPercent, fixture.name);
    assert.equal(result.threeWordPercent, fixture.expected.threeWordPercent, fixture.name);
    assert.deepEqual(fixture.records, before, fixture.name);
    assert.deepEqual(result.records, fixture.records, fixture.name);
    assert.notEqual(result.records[0], fixture.records[0], fixture.name);
  }
});

test("chain and word calculations are independent of step_failed", () => {
  const records = fixtures.analysisCases[1].records;
  const failed = analyzeCheckpoints(records);
  const successful = analyzeCheckpoints(records.map((record) => ({ ...record, step_failed: false })));
  assert.equal(failed.chainPercent, successful.chainPercent);
  assert.equal(failed.threeWordPercent, successful.threeWordPercent);
  assert.equal(failed.records[1].step_failed, true);
});

test("analysis accepts raw JSONL and rejects absent session records", () => {
  const records = fixtures.analysisCases[0].records;
  const result = analyzeCheckpoints(`${JSON.stringify(records[0])}\n`);
  assert.equal(result.chainPercent, null);
  assert.equal(result.threeWordPercent, 100);
  assert.throws(() => analyzeCheckpoints([]), /at least one/);
});
