import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  analyzeCheckpointLog,
  analyzeCheckpoints,
  appendSessionStatus,
  checkpoint,
  checkpointPath,
  createCheckpointRecord,
  createSessionStatusRecord,
  filterCheckpointRecords,
  parseCheckpointLogJsonl,
  parseCheckpointJsonl,
  reduceSessionStatus,
  validateCheckpointRecord,
  validateSessionStatusRecord,
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
  agent: "maintainer",
  session_title: "Checkpoint pilot",
});

const legacyRecord = () => {
  const record = validRecord();
  delete record.agent;
  delete record.session_title;
  return record;
};
const validStatusRecord = (status = "open", overrides = {}) => ({
  timestamp: FIXED_TIME,
  session_id: "ses_123",
  event: "session_status",
  status,
  ...overrides,
});

const fixtures = JSON.parse(
  await readFile(new URL("../fixtures/checkpoint-cases.json", import.meta.url), "utf8"),
);

test("creates exactly the current raw schema with nullable metadata defaults", () => {
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
    "agent",
    "session_title",
  ]);
  assert.equal(record.timestamp, FIXED_TIME);
  assert.equal(record.step_failed, false);
  assert.equal(record.context_used, null);
  assert.equal(record.agent, null);
  assert.equal(record.session_title, null);
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
    { key: "agent", value: 3 },
    { key: "agent", value: "" },
    { key: "session_title", value: false },
    { key: "session_title", value: "   " },
  ];
  for (const { key, value } of invalidCases) {
    assert.throws(() => validateCheckpointRecord({ ...validRecord(), [key]: value }));
  }
  assert.doesNotThrow(() =>
    validateCheckpointRecord({ ...validRecord(), timestamp: "2024-02-29T00:00:00Z" }),
  );
  assert.doesNotThrow(() => validateCheckpointRecord({ ...validRecord(), context_used: null }));
  assert.doesNotThrow(() => validateCheckpointRecord(legacyRecord()));
  const partial = legacyRecord();
  partial.agent = "maintainer";
  assert.throws(() => validateCheckpointRecord(partial), /legacy fields.*current fields/);
});

test("creates and validates only the exact session status schema", () => {
  const record = createSessionStatusRecord({ sessionId: "ses_123", status: "open", clock });
  assert.deepEqual(record, validStatusRecord());
  assert.deepEqual(Object.keys(record), ["timestamp", "session_id", "event", "status"]);
  assert.equal(validateSessionStatusRecord(record), record);
  assert.doesNotThrow(() => validateSessionStatusRecord(validStatusRecord("closed")));
  assert.throws(() => validateCheckpointRecord(record), /checkpoint record.*exactly|exactly.*legacy fields/);
  assert.throws(() => validateSessionStatusRecord(validRecord()), /exactly/);

  for (const invalid of [
    null,
    [],
    { ...validStatusRecord(), extra: true },
    { timestamp: FIXED_TIME, session_id: "ses_123", event: "session_status" },
    validStatusRecord("OPEN"),
    validStatusRecord("running"),
    validStatusRecord("open", { event: "other" }),
    validStatusRecord("open", { timestamp: "2026-07-26" }),
    validStatusRecord("open", { session_id: "" }),
  ]) {
    assert.throws(() => validateSessionStatusRecord(invalid));
  }
  assert.throws(() => createSessionStatusRecord({ sessionId: "ses_123", status: "OPEN", clock }));
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
    agent: "maintainer",
    sessionTitle: "Parent checkpoint session",
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
    agent: "implementer",
    sessionTitle: "Subagent checkpoint session",
    clock,
  });
  const complete = await readFile(expectedFile, "utf8");
  assert.equal(complete.slice(0, firstBytes.length), firstBytes);
  const records = parseCheckpointJsonl(complete);
  assert.equal(records.length, 2);
  assert.equal(records[1].step_failed, true);
  assert.equal(records[1].context_used, 0.72);
  assert.equal(records[1].agent, "implementer");
  assert.equal(records[1].session_title, "Subagent checkpoint session");
  assert.deepEqual(Object.keys(records[1]), Object.keys(validRecord()));
});

test("appends checkpoint and status records in either order without rewriting prior bytes", async (context) => {
  const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), "checkpoint-status-append-"));
  context.after(() => rm(workspaceRoot, { recursive: true, force: true }));

  await checkpoint({
    workspaceRoot,
    sessionId: "checkpoint-first",
    done: "Initial work completed",
    next: "Append status event",
    clock,
  });
  const checkpointFirstPath = path.join(workspaceRoot, checkpointPath("checkpoint-first"));
  const checkpointPrefix = await readFile(checkpointFirstPath, "utf8");
  const appended = await appendSessionStatus({
    workspaceRoot,
    sessionId: "checkpoint-first",
    status: "closed",
    clock,
  });
  const checkpointThenStatus = await readFile(checkpointFirstPath, "utf8");
  assert.equal(checkpointThenStatus.slice(0, checkpointPrefix.length), checkpointPrefix);
  assert.deepEqual(appended, validStatusRecord("closed", { session_id: "checkpoint-first" }));
  assert.deepEqual(
    parseCheckpointLogJsonl(checkpointThenStatus).map((record) => record.status ?? "checkpoint"),
    ["open", "checkpoint", "closed"],
  );

  const statusFirstSession = "../status-first";
  await appendSessionStatus({
    workspaceRoot,
    sessionId: statusFirstSession,
    status: "open",
    clock,
  });
  const statusFirstPath = path.join(workspaceRoot, checkpointPath(statusFirstSession));
  assert.equal(path.dirname(statusFirstPath), path.join(workspaceRoot, ".agent-checkpoints"));
  const statusPrefix = await readFile(statusFirstPath, "utf8");
  await checkpoint({
    workspaceRoot,
    sessionId: statusFirstSession,
    done: "Status event appended",
    next: "Verify mixed parser",
    clock,
  });
  const statusThenCheckpoint = await readFile(statusFirstPath, "utf8");
  assert.equal(statusThenCheckpoint.slice(0, statusPrefix.length), statusPrefix);
  assert.deepEqual(
    parseCheckpointLogJsonl(statusThenCheckpoint).map((record) => record.event ?? "checkpoint"),
    ["session_status", "session_status", "checkpoint"],
  );
});

test("checkpoint lazily opens, optionally closes, and reopens in physical order", async (context) => {
  const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), "checkpoint-declared-close-"));
  context.after(() => rm(workspaceRoot, { recursive: true, force: true }));
  const sessionId = "declared/session";
  let clockCalls = 0;
  const closeClock = () => {
    clockCalls += 1;
    return new Date(FIXED_TIME);
  };

  await checkpoint({
    workspaceRoot,
    sessionId,
    done: "Final work attempted",
    next: "Return compact digest",
    stepFailed: true,
    closeSession: true,
    clock: closeClock,
  });
  const filePath = path.join(workspaceRoot, checkpointPath(sessionId));
  const closedBytes = await readFile(filePath, "utf8");
  const closedRecords = parseCheckpointLogJsonl(closedBytes);
  assert.equal(clockCalls, 1);
  assert.deepEqual(
    closedRecords.map((record) => record.status ?? "checkpoint"),
    ["open", "checkpoint", "closed"],
  );
  assert.deepEqual(closedRecords.map((record) => record.timestamp), [FIXED_TIME, FIXED_TIME, FIXED_TIME]);
  assert.deepEqual(Object.keys(closedRecords[0]), ["timestamp", "session_id", "event", "status"]);
  assert.deepEqual(Object.keys(closedRecords[1]), Object.keys(validRecord()));
  assert.equal(closedRecords[1].step_failed, true);
  assert.equal(analyzeCheckpointLog(closedBytes).state, "CLOSED");
  assert.equal(parseCheckpointJsonl(closedBytes).length, 1);

  await checkpoint({
    workspaceRoot,
    sessionId,
    done: "Return compact digest",
    next: "Continue resumed session",
    closeSession: false,
    clock: () => new Date("2026-07-26T14:31:00.000Z"),
  });
  const reopenedBytes = await readFile(filePath, "utf8");
  assert.equal(reopenedBytes.slice(0, closedBytes.length), closedBytes);
  assert.deepEqual(
    parseCheckpointLogJsonl(reopenedBytes).map((record) => record.status ?? "checkpoint"),
    ["open", "checkpoint", "closed", "open", "checkpoint"],
  );
  const reopened = analyzeCheckpointLog(reopenedBytes);
  assert.equal(reopened.state, "OPEN");
  assert.equal(reopened.analysis.checkedRecords, 2);
  assert.equal(reopened.analysis.work.success, 1);
});

test("checkpoint rejects invalid closeSession values before any append", async (context) => {
  const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), "checkpoint-close-invalid-"));
  context.after(() => rm(workspaceRoot, { recursive: true, force: true }));
  for (const [index, closeSession] of [null, "true", 1, [], {}].entries()) {
    const sessionId = `invalid-${index}`;
    await assert.rejects(
      checkpoint({
        workspaceRoot,
        sessionId,
        done: "Reject invalid closure",
        next: "Preserve empty log",
        closeSession,
        clock,
      }),
      /closeSession must be a boolean/,
    );
    await assert.rejects(readFile(path.join(workspaceRoot, checkpointPath(sessionId)), "utf8"), /ENOENT/);
  }
  await assert.doesNotReject(checkpoint({
    workspaceRoot,
    sessionId: "undefined-default",
    done: "Use default closure",
    next: "Remain session open",
    closeSession: undefined,
    clock,
  }));
});

test("strictly parses JSONL and rejects empty, blank, malformed, or invalid records", () => {
  const line = JSON.stringify(validRecord());
  assert.deepEqual(parseCheckpointJsonl(`${line}\n`), [validRecord()]);
  assert.throws(() => parseCheckpointJsonl(""), /at least one/);
  assert.throws(() => parseCheckpointJsonl(`${line}\n\n${line}`), /blank lines/);
  assert.throws(() => parseCheckpointJsonl("{broken}\n"), /line 1/);
  assert.throws(() => parseCheckpointJsonl(`${JSON.stringify({ ...validRecord(), extra: true })}\n`), /exactly/);
});

test("parses legacy and mixed JSONL with null metadata without rewriting source bytes", () => {
  const legacy = legacyRecord();
  const current = { ...validRecord(), agent: "retriever", session_title: "Evidence lookup" };
  const jsonl = `${JSON.stringify(legacy)}\n${JSON.stringify(current)}\n`;
  const records = parseCheckpointJsonl(jsonl);
  assert.equal(records[0].agent, null);
  assert.equal(records[0].session_title, null);
  assert.equal(records[1].agent, "retriever");
  assert.equal(records[1].session_title, "Evidence lookup");
  assert.equal(jsonl.split("\n")[0], JSON.stringify(legacy));
});

test("strict mixed parsing preserves physical order and checkpoint-only compatibility", async () => {
  const jsonl = await readFile(new URL("../fixtures/status/mixed.jsonl", import.meta.url), "utf8");
  const mixed = parseCheckpointLogJsonl(jsonl);
  assert.deepEqual(mixed.map((record) => record.event ?? "checkpoint"), [
    "checkpoint", "session_status", "checkpoint", "session_status",
  ]);
  assert.equal(mixed[0].agent, null);
  assert.equal(mixed[0].session_title, null);

  const before = structuredClone(mixed);
  const filtered = filterCheckpointRecords(mixed);
  assert.equal(filtered.length, 2);
  assert.deepEqual(parseCheckpointJsonl(jsonl), filtered);
  assert.deepEqual(mixed, before);
  assert.notEqual(filtered[0], mixed[0]);
  assert.deepEqual(parseCheckpointJsonl(await readFile(
    new URL("../fixtures/status/status-only.jsonl", import.meta.url),
    "utf8",
  )), []);

  const malformed = await readFile(
    new URL("../fixtures/status/malformed-status.jsonl", import.meta.url),
    "utf8",
  );
  assert.throws(() => parseCheckpointLogJsonl(malformed), /exactly/);
  assert.throws(() => parseCheckpointLogJsonl(`${JSON.stringify(validStatusRecord("open", { event: "other" }))}\n`), /event/);
  assert.throws(() => parseCheckpointLogJsonl(`${JSON.stringify({ ...validStatusRecord(), status: undefined })}\n`), /exactly/);
});

test("matches every shared analysis fixture without mutating its records", () => {
  for (const fixture of fixtures.analysisCases) {
    const before = structuredClone(fixture.records);
    const result = analyzeCheckpoints(fixture.records);
    assert.equal(result.chainPercent, fixture.expected.chainPercent, fixture.name);
    assert.equal(result.threeWordPercent, fixture.expected.threeWordPercent, fixture.name);
    assert.equal(result.chain.success, result.matchingTransitions, fixture.name);
    assert.equal(result.chain.count, result.checkedTransitions, fixture.name);
    assert.equal(result.work.success, result.successfulRecords, fixture.name);
    assert.equal(result.work.count, result.checkedRecords, fixture.name);
    assert.equal(result.threeWord.success, result.compliantLabels, fixture.name);
    assert.equal(result.threeWord.count, result.checkedLabels, fixture.name);
    assert.deepEqual(fixture.records, before, fixture.name);
    assert.deepEqual(
      result.records,
      fixture.records.map((record) => ({ ...record, agent: null, session_title: null })),
      fixture.name,
    );
    assert.notEqual(result.records[0], fixture.records[0], fixture.name);
  }
});

test("chain and word calculations are independent of step_failed", () => {
  const records = fixtures.analysisCases[1].records;
  const failed = analyzeCheckpoints(records);
  const successful = analyzeCheckpoints(records.map((record) => ({ ...record, step_failed: false })));
  assert.equal(failed.chainPercent, successful.chainPercent);
  assert.equal(failed.threeWordPercent, successful.threeWordPercent);
  assert.equal(failed.work.success, successful.work.success - 1);
  assert.equal(failed.work.percent, 50);
  assert.equal(successful.work.percent, 100);
  assert.equal(failed.records[1].step_failed, true);
});

test("analysis accepts raw JSONL and rejects absent session records", () => {
  const records = fixtures.analysisCases[0].records;
  const result = analyzeCheckpoints(`${JSON.stringify(records[0])}\n`);
  assert.equal(result.chainPercent, null);
  assert.deepEqual(result.chain, { success: 0, count: 0, percent: null });
  assert.deepEqual(result.work, { success: 1, count: 1, percent: 100 });
  assert.deepEqual(result.threeWord, { success: 2, count: 2, percent: 100 });
  assert.equal(result.threeWordPercent, 100);
  assert.throws(() => analyzeCheckpoints([]), /at least one/);
});

test("mixed analysis excludes statuses from checkpoint metrics and adjacency", async () => {
  const jsonl = await readFile(new URL("../fixtures/status/mixed.jsonl", import.meta.url), "utf8");
  const result = analyzeCheckpointLog(jsonl);
  assert.equal(result.records.length, 4);
  assert.equal(result.checkpoints.length, 2);
  assert.equal(result.latestEvent.status, "closed");
  assert.equal(result.latestStatusEvent.status, "closed");
  assert.equal(result.latestCheckpoint.done, "Continue planned work");
  assert.equal(result.state, "CLOSED");
  assert.deepEqual(result.analysis.chain, { success: 1, count: 1, percent: 100 });
  assert.deepEqual(result.analysis.work, { success: 2, count: 2, percent: 100 });
  assert.deepEqual(result.analysis.threeWord, { success: 4, count: 4, percent: 100 });
  assert.deepEqual(analyzeCheckpoints(result.records).chain, result.analysis.chain);
});

test("status-only analysis has neutral checkpoint metrics", async () => {
  const jsonl = await readFile(new URL("../fixtures/status/status-only.jsonl", import.meta.url), "utf8");
  const result = analyzeCheckpointLog(jsonl);
  assert.equal(result.state, "OPEN");
  assert.equal(result.latestCheckpoint, null);
  assert.equal(result.latestStatusEvent.status, "open");
  assert.deepEqual(result.analysis.chain, { success: 0, count: 0, percent: null });
  assert.deepEqual(result.analysis.work, { success: 0, count: 0, percent: null });
  assert.deepEqual(result.analysis.threeWord, { success: 0, count: 0, percent: null });
  assert.throws(() => analyzeCheckpoints(result.records), /at least one/);
});

test("lifecycle reduction is idempotent and follows physical rather than timestamp order", async () => {
  for (const fixture of fixtures.statusReductionCases) {
    const records = fixture.statuses.map((status, index) => validStatusRecord(status, {
      timestamp: `2026-07-26T14:30:0${index}.000Z`,
    }));
    assert.equal(reduceSessionStatus(records), fixture.expected, fixture.name);
  }

  const duplicate = await readFile(
    new URL("../fixtures/status/duplicate-status.jsonl", import.meta.url),
    "utf8",
  );
  assert.equal(reduceSessionStatus(duplicate), "OPEN");
  const reopened = await readFile(
    new URL("../fixtures/status/reopened-physical-order.jsonl", import.meta.url),
    "utf8",
  );
  const analysis = analyzeCheckpointLog(reopened);
  assert.equal(analysis.state, "OPEN");
  assert.equal(analysis.latestEvent.timestamp, "2026-07-26T10:00:01.000Z");
});
