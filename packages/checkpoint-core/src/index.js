import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

const LEGACY_RECORD_FIELDS = [
  "timestamp",
  "session_id",
  "done",
  "next",
  "step_failed",
  "context_used",
];
const METADATA_FIELDS = ["agent", "session_title"];
const RECORD_FIELDS = [...LEGACY_RECORD_FIELDS, ...METADATA_FIELDS];
const SESSION_STATUS_FIELDS = ["timestamp", "session_id", "event", "status"];
const SESSION_STATUS_VALUES = new Set(["open", "closed"]);

const UTC_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

function isValidUtcTimestamp(value) {
  if (typeof value !== "string" || !UTC_TIMESTAMP.test(value)) {
    return false;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const expected = value.includes(".") ? value : value.replace("Z", ".000Z");
  return date.toISOString() === expected;
}

function requireSessionId(sessionId) {
  if (typeof sessionId !== "string" || sessionId.length === 0) {
    throw new TypeError("sessionId must be a non-empty string");
  }
}

function encodeSessionId(sessionId) {
  requireSessionId(sessionId);
  try {
    return encodeURIComponent(sessionId);
  } catch (error) {
    throw new TypeError(`sessionId must be valid Unicode: ${error.message}`);
  }
}

function timestampFromClock(clock) {
  if (typeof clock !== "function") {
    throw new TypeError("clock must be a function");
  }

  const value = clock();
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new TypeError("clock must return a valid date value");
  }
  return date.toISOString();
}

export function validateCheckpointRecord(record) {
  if (record === null || typeof record !== "object" || Array.isArray(record)) {
    throw new TypeError("checkpoint record must be an object");
  }

  const keys = Object.keys(record).sort();
  const expectedKeys = [...RECORD_FIELDS].sort();
  const legacyKeys = [...LEGACY_RECORD_FIELDS].sort();
  const hasCurrentSchema =
    keys.length === expectedKeys.length &&
    keys.every((key, index) => key === expectedKeys[index]);
  const hasLegacySchema =
    keys.length === legacyKeys.length &&
    keys.every((key, index) => key === legacyKeys[index]);
  if (
    !hasCurrentSchema &&
    !hasLegacySchema
  ) {
    throw new TypeError(
      `checkpoint record must contain exactly the legacy fields (${LEGACY_RECORD_FIELDS.join(", ")}) or current fields (${RECORD_FIELDS.join(", ")})`,
    );
  }

  if (!isValidUtcTimestamp(record.timestamp)) {
    throw new TypeError("timestamp must be a valid ISO UTC timestamp");
  }
  if (typeof record.session_id !== "string" || record.session_id.length === 0) {
    throw new TypeError("session_id must be a non-empty string");
  }
  if (typeof record.done !== "string" || typeof record.next !== "string") {
    throw new TypeError("done and next must be strings");
  }
  if (typeof record.step_failed !== "boolean") {
    throw new TypeError("step_failed must be a boolean");
  }
  if (
    record.context_used !== null &&
    (typeof record.context_used !== "number" ||
      !Number.isFinite(record.context_used) ||
      record.context_used < 0 ||
      record.context_used > 1)
  ) {
    throw new TypeError("context_used must be null or a finite number from 0 through 1");
  }
  if (hasCurrentSchema) {
    for (const field of METADATA_FIELDS) {
      if (
        record[field] !== null &&
        (typeof record[field] !== "string" || record[field].trim().length === 0)
      ) {
        throw new TypeError(`${field} must be null or a non-empty string`);
      }
    }
  }

  return record;
}

export function validateSessionStatusRecord(record) {
  if (record === null || typeof record !== "object" || Array.isArray(record)) {
    throw new TypeError("session status record must be an object");
  }

  const keys = Object.keys(record).sort();
  const expectedKeys = [...SESSION_STATUS_FIELDS].sort();
  if (
    keys.length !== expectedKeys.length ||
    !keys.every((key, index) => key === expectedKeys[index])
  ) {
    throw new TypeError(
      `session status record must contain exactly the fields (${SESSION_STATUS_FIELDS.join(", ")})`,
    );
  }
  if (!isValidUtcTimestamp(record.timestamp)) {
    throw new TypeError("timestamp must be a valid ISO UTC timestamp");
  }
  if (typeof record.session_id !== "string" || record.session_id.length === 0) {
    throw new TypeError("session_id must be a non-empty string");
  }
  if (record.event !== "session_status") {
    throw new TypeError('event must be exactly "session_status"');
  }
  if (!SESSION_STATUS_VALUES.has(record.status)) {
    throw new TypeError('status must be exactly "open" or "closed"');
  }

  return record;
}

function normalizeCheckpointRecord(record) {
  validateCheckpointRecord(record);
  return {
    ...record,
    agent: record.agent ?? null,
    session_title: record.session_title ?? null,
  };
}

export function createCheckpointRecord({
  sessionId,
  done,
  next,
  stepFailed = false,
  contextUsed = null,
  agent = null,
  sessionTitle = null,
  clock = () => new Date(),
}) {
  const record = {
    timestamp: timestampFromClock(clock),
    session_id: sessionId,
    done,
    next,
    step_failed: stepFailed,
    context_used: contextUsed,
    agent,
    session_title: sessionTitle,
  };
  validateCheckpointRecord(record);
  return record;
}

export function createSessionStatusRecord({
  sessionId,
  status,
  clock = () => new Date(),
}) {
  const record = {
    timestamp: timestampFromClock(clock),
    session_id: sessionId,
    event: "session_status",
    status,
  };
  validateSessionStatusRecord(record);
  return record;
}

export function checkpointPath(sessionId) {
  return `.agent-checkpoints/${encodeSessionId(sessionId)}.jsonl`;
}

function resolveCheckpointFile(workspaceRoot, sessionId) {
  if (typeof workspaceRoot !== "string" || workspaceRoot.length === 0) {
    throw new TypeError("workspaceRoot must be a non-empty string");
  }

  const root = path.resolve(workspaceRoot);
  const checkpointRoot = path.resolve(root, ".agent-checkpoints");
  const relativePath = checkpointPath(sessionId);
  const filePath = path.resolve(root, ...relativePath.split("/"));
  const containment = path.relative(checkpointRoot, filePath);

  if (
    containment === ".." ||
    containment.startsWith(`..${path.sep}`) ||
    path.isAbsolute(containment)
  ) {
    throw new Error("checkpoint path escaped the workspace checkpoint directory");
  }

  return { checkpointRoot, filePath, relativePath };
}

async function appendRecord(workspaceRoot, sessionId, record) {
  const { checkpointRoot, filePath } = resolveCheckpointFile(workspaceRoot, sessionId);
  await mkdir(checkpointRoot, { recursive: true });
  await appendFile(filePath, `${JSON.stringify(record)}\n`, "utf8");
}

export async function checkpoint({
  sessionId,
  done,
  next,
  stepFailed = false,
  contextUsed = null,
  agent = null,
  sessionTitle = null,
  remainingKTokens,
  clock = () => new Date(),
  workspaceRoot = process.cwd(),
}) {
  const record = createCheckpointRecord({
    sessionId,
    done,
    next,
    stepFailed,
    contextUsed,
    agent,
    sessionTitle,
    clock,
  });
  await appendRecord(workspaceRoot, sessionId, record);

  return {
    contextUsed,
    ...(remainingKTokens === undefined ? {} : { remainingKTokens }),
  };
}

export async function appendSessionStatus({
  sessionId,
  status,
  clock = () => new Date(),
  workspaceRoot = process.cwd(),
}) {
  const record = createSessionStatusRecord({ sessionId, status, clock });
  await appendRecord(workspaceRoot, sessionId, record);
  return record;
}

function normalizeLogRecord(record) {
  if (
    record !== null &&
    typeof record === "object" &&
    !Array.isArray(record) &&
    Object.hasOwn(record, "event")
  ) {
    validateSessionStatusRecord(record);
    return { ...record };
  }
  return normalizeCheckpointRecord(record);
}

export function parseCheckpointLogJsonl(jsonl) {
  if (typeof jsonl !== "string") {
    throw new TypeError("checkpoint JSONL must be a string");
  }

  const lines = jsonl.split(/\r?\n/);
  while (lines.at(-1) === "") {
    lines.pop();
  }
  if (lines.length === 0) {
    throw new TypeError("checkpoint JSONL must contain at least one record");
  }
  if (lines.some((line) => line.length === 0)) {
    throw new TypeError("checkpoint JSONL must not contain blank lines");
  }

  return lines.map((line, index) => {
    let record;
    try {
      record = JSON.parse(line);
    } catch (error) {
      throw new SyntaxError(`invalid checkpoint JSON on line ${index + 1}: ${error.message}`);
    }
    return normalizeLogRecord(record);
  });
}

export function filterCheckpointRecords(records) {
  if (!Array.isArray(records)) {
    throw new TypeError("checkpoint records must be an array");
  }

  const checkpoints = [];
  for (const record of records) {
    const normalized = normalizeLogRecord(record);
    if (!Object.hasOwn(normalized, "event")) {
      checkpoints.push(normalized);
    }
  }
  return checkpoints;
}

export function parseCheckpointJsonl(jsonl) {
  return filterCheckpointRecords(parseCheckpointLogJsonl(jsonl));
}

function hasExactlyThreeWords(label) {
  const trimmed = label.trim();
  return trimmed.length > 0 && trimmed.split(/\s+/u).length === 3;
}

export function analyzeCheckpoints(input) {
  const sourceRecords = typeof input === "string" ? parseCheckpointJsonl(input) : input;
  if (!Array.isArray(sourceRecords)) {
    throw new TypeError("analysis requires checkpoint records");
  }
  const records = filterCheckpointRecords(sourceRecords);
  if (records.length === 0) {
    throw new TypeError("analysis requires at least one checkpoint record");
  }

  let matchingTransitions = 0;
  for (let index = 1; index < records.length; index += 1) {
    if (records[index - 1].next === records[index].done) {
      matchingTransitions += 1;
    }
  }

  const compliantLabels = records.reduce(
    (count, record) =>
      count + Number(hasExactlyThreeWords(record.done)) + Number(hasExactlyThreeWords(record.next)),
    0,
  );
  const checkedTransitions = records.length - 1;
  const successfulRecords = records.reduce(
    (count, record) => count + Number(record.step_failed === false),
    0,
  );
  const checkedRecords = records.length;
  const checkedLabels = records.length * 2;
  const chainPercent =
    checkedTransitions === 0 ? null : (matchingTransitions / checkedTransitions) * 100;
  const workPercent = (successfulRecords / checkedRecords) * 100;
  const threeWordPercent = (compliantLabels / checkedLabels) * 100;

  return {
    records: records.map((record) => ({ ...record })),
    matchingTransitions,
    checkedTransitions,
    successfulRecords,
    checkedRecords,
    compliantLabels,
    checkedLabels,
    chainPercent,
    workPercent,
    threeWordPercent,
    chain: { success: matchingTransitions, count: checkedTransitions, percent: chainPercent },
    work: { success: successfulRecords, count: checkedRecords, percent: workPercent },
    threeWord: { success: compliantLabels, count: checkedLabels, percent: threeWordPercent },
  };
}

export function reduceSessionStatus(input) {
  const records = typeof input === "string" ? parseCheckpointLogJsonl(input) : input;
  if (!Array.isArray(records)) {
    throw new TypeError("session status reduction requires records");
  }

  let state = "UNKNOWN";
  for (const sourceRecord of records) {
    const record = normalizeLogRecord(sourceRecord);
    if (Object.hasOwn(record, "event")) {
      state = record.status === "open" ? "OPEN" : "CLOSED";
    }
  }
  return state;
}

function emptyCheckpointAnalysis() {
  return {
    records: [],
    matchingTransitions: 0,
    checkedTransitions: 0,
    successfulRecords: 0,
    checkedRecords: 0,
    compliantLabels: 0,
    checkedLabels: 0,
    chainPercent: null,
    workPercent: null,
    threeWordPercent: null,
    chain: { success: 0, count: 0, percent: null },
    work: { success: 0, count: 0, percent: null },
    threeWord: { success: 0, count: 0, percent: null },
  };
}

export function analyzeCheckpointLog(input) {
  const records = typeof input === "string"
    ? parseCheckpointLogJsonl(input)
    : Array.isArray(input)
      ? input.map(normalizeLogRecord)
      : null;
  if (!records || records.length === 0) {
    throw new TypeError("checkpoint log analysis requires at least one record");
  }

  const checkpoints = filterCheckpointRecords(records);
  const statusEvents = records.filter((record) => Object.hasOwn(record, "event"));
  return {
    records: records.map((record) => ({ ...record })),
    checkpoints,
    latestEvent: { ...records.at(-1) },
    latestStatusEvent: statusEvents.length === 0 ? null : { ...statusEvents.at(-1) },
    latestCheckpoint: checkpoints.length === 0 ? null : { ...checkpoints.at(-1) },
    state: reduceSessionStatus(records),
    analysis: checkpoints.length === 0
      ? emptyCheckpointAnalysis()
      : analyzeCheckpoints(checkpoints),
  };
}
