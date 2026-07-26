import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

const RECORD_FIELDS = [
  "timestamp",
  "session_id",
  "done",
  "next",
  "step_failed",
  "context_used",
];

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
  if (
    keys.length !== expectedKeys.length ||
    keys.some((key, index) => key !== expectedKeys[index])
  ) {
    throw new TypeError(`checkpoint record must contain exactly: ${RECORD_FIELDS.join(", ")}`);
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

  return record;
}

export function createCheckpointRecord({
  sessionId,
  done,
  next,
  stepFailed = false,
  contextUsed = null,
  clock = () => new Date(),
}) {
  const record = {
    timestamp: timestampFromClock(clock),
    session_id: sessionId,
    done,
    next,
    step_failed: stepFailed,
    context_used: contextUsed,
  };
  validateCheckpointRecord(record);
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

export async function checkpoint({
  sessionId,
  done,
  next,
  stepFailed = false,
  contextUsed = null,
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
    clock,
  });
  const { checkpointRoot, filePath } = resolveCheckpointFile(workspaceRoot, sessionId);

  await mkdir(checkpointRoot, { recursive: true });
  await appendFile(filePath, `${JSON.stringify(record)}\n`, "utf8");

  return {
    contextUsed,
    ...(remainingKTokens === undefined ? {} : { remainingKTokens }),
  };
}

export function parseCheckpointJsonl(jsonl) {
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
    validateCheckpointRecord(record);
    return record;
  });
}

function hasExactlyThreeWords(label) {
  const trimmed = label.trim();
  return trimmed.length > 0 && trimmed.split(/\s+/u).length === 3;
}

export function analyzeCheckpoints(input) {
  const records = typeof input === "string" ? parseCheckpointJsonl(input) : input;
  if (!Array.isArray(records) || records.length === 0) {
    throw new TypeError("analysis requires at least one checkpoint record");
  }
  records.forEach(validateCheckpointRecord);

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

  return {
    records: records.map((record) => ({ ...record })),
    chainPercent:
      records.length === 1 ? null : (matchingTransitions / (records.length - 1)) * 100,
    threeWordPercent: (compliantLabels / (records.length * 2)) * 100,
  };
}
