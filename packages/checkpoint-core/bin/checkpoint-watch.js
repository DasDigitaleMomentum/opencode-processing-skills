#!/usr/bin/env node

import { readdirSync, watch as watchDirectory } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { analyzeCheckpointLog } from "../src/index.js";

export const DEFAULT_REFRESH_MS = 1000;
export const DEFAULT_STALE_MS = 120000;
export const OLD_ROW_MS = 10_800_000;

const HELP = `Usage: checkpoint-watch [--once] [--refresh-ms <milliseconds>] [--stale-ms <milliseconds>]

Watch direct .agent-checkpoints/*.jsonl files below the current workspace.
OPEN/CLOSED/UNKNOWN comes only from explicit session_status events; age never changes state.
Age is informational and does not prove process liveness.

Options:
  --once          Print one deterministic, non-ANSI dashboard and exit
  --refresh-ms    Live redraw interval (default: ${DEFAULT_REFRESH_MS})
  --stale-ms      Compatibility-only validated no-op (default: ${DEFAULT_STALE_MS})
  --help          Show this help

Environment:
  CHECKPOINT_WATCH_REFRESH_MS
  CHECKPOINT_WATCH_STALE_MS (compatibility-only validated no-op)
`;

/**
 * Dependency-injection surface for tests and the CLI entry point. Every field
 * is optional and defaults to a Node global. The explicit record shape also
 * keeps scriptc's exact-struct checks happy when this file is compiled to a
 * native binary.
 * @typedef {object} WatchIO
 * @property {(dir: string, options?: object) => Promise<Array<{ isFile: () => boolean, name: string }>>} [readdir]
 * @property {(file: string, encoding: string) => Promise<string>} [readFile]
 * @property {() => number} [now]
 * @property {number} [columns]
 * @property {(text: string) => void} [stdout]
 * @property {(text: string) => void} [stderr]
 * @property {string} [cwd]
 * @property {{ CHECKPOINT_WATCH_REFRESH_MS?: string, CHECKPOINT_WATCH_STALE_MS?: string }} [env]
 * @property {{ isTTY?: boolean, isRaw?: boolean, readableFlowing?: boolean | null, setRawMode?: (enabled: boolean) => void, resume?: () => void, pause?: () => void, on?: (event: string, listener: (chunk: unknown) => void) => void, off?: (event: string, listener: (chunk: unknown) => void) => void }} [stdin]
 * @property {(callback: () => void, delay: number) => object} [setInterval]
 * @property {(handle: object) => void} [clearInterval]
 * @property {(dir: string, callback: () => void) => { close: () => void }} [watch]
 * @property {(handlers: { refresh: () => Promise<void>, close: () => Promise<void> }) => Promise<void>} [waitForExit]
 * @property {(signal: string, listener: () => void) => void} [onSignal]
 * @property {(signal: string, listener: () => void) => void} [offSignal]
 */

/**
 * @typedef {object} DashboardAnalysis
 * @property {number | null} chainPercent
 * @property {number | null} workPercent
 * @property {number | null} threeWordPercent
 * @property {number} checkedRecords
 */

/**
 * @typedef {object} NativeLegacyCheckpoint
 * @property {string} timestamp
 * @property {string} session_id
 * @property {string} done
 * @property {string} next
 * @property {boolean} step_failed
 * @property {number | null} context_used
 */

/**
 * @typedef {object} NativeCurrentCheckpoint
 * @property {string} timestamp
 * @property {string} session_id
 * @property {string} done
 * @property {string} next
 * @property {boolean} step_failed
 * @property {number | null} context_used
 * @property {string | null} agent
 * @property {string | null} session_title
 */

/**
 * @typedef {object} NativeStatusEvent
 * @property {string} timestamp
 * @property {string} session_id
 * @property {string} event
 * @property {string} status
 */

/**
 * @typedef {object} NativeLogRecord
 * @property {string} timestamp
 * @property {string} session_id
 * @property {"checkpoint" | "status"} kind
 * @property {string} done
 * @property {string} next
 * @property {boolean} step_failed
 * @property {number | null} context_used
 * @property {string | null} agent
 * @property {string | null} session_title
 * @property {"" | "open" | "closed"} status
 */

/**
 * @typedef {object} DashboardLog
 * @property {NativeLogRecord} latestEvent
 * @property {NativeLogRecord | null} latestCheckpoint
 * @property {"OPEN" | "CLOSED" | "UNKNOWN"} state
 * @property {DashboardAnalysis} analysis
 */

/**
 * @typedef {object} DashboardRow
 * @property {string} session
 * @property {number | null} activityMs
 * @property {number | null} ageMs
 * @property {string} state
 * @property {number | string} checkpointCount
 * @property {string} metrics
 * @property {string} context
 * @property {string} agent
 * @property {string} title
 * @property {string} done
 * @property {string} next
 * @property {null} error
 */

function positiveInteger(value, label) {
  if (typeof value === "number") {
    if (value <= 0 || !Number.isSafeInteger(value)) {
      throw new TypeError(`${label} must be a positive integer`);
    }
    return value;
  }
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`${label} must be a positive integer`);
  }
  let parsed = 0;
  for (let index = 0; index < value.length; index += 1) {
    const digit = value.charCodeAt(index) - 48;
    if (digit < 0 || digit > 9) {
      throw new TypeError(`${label} must be a positive integer`);
    }
    parsed = (parsed * 10) + digit;
    if (!Number.isSafeInteger(parsed)) {
      throw new TypeError(`${label} must be a positive integer`);
    }
  }
  if (parsed <= 0) throw new TypeError(`${label} must be a positive integer`);
  return parsed;
}

function watchEnvironment() {
  return {
    CHECKPOINT_WATCH_REFRESH_MS: process.env.CHECKPOINT_WATCH_REFRESH_MS,
    CHECKPOINT_WATCH_STALE_MS: process.env.CHECKPOINT_WATCH_STALE_MS,
  };
}

/**
 * @param {string[]} args
 * @param {{ CHECKPOINT_WATCH_REFRESH_MS?: string, CHECKPOINT_WATCH_STALE_MS?: string }} [env]
 */
export function parseArgs(args, env = watchEnvironment()) {
  if (!Array.isArray(args)) throw new TypeError("arguments must be an array");
  const options = {
    once: false,
    help: false,
    refreshMs: positiveInteger(env.CHECKPOINT_WATCH_REFRESH_MS ?? DEFAULT_REFRESH_MS, "refresh interval"),
    staleMs: positiveInteger(env.CHECKPOINT_WATCH_STALE_MS ?? DEFAULT_STALE_MS, "stale threshold"),
  };

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--once") options.once = true;
    else if (argument === "--help" || argument === "-h") options.help = true;
    else if (argument === "--refresh-ms" || argument === "--stale-ms") {
      const value = args[index + 1];
      if (value === undefined) throw new TypeError(`${argument} requires a value`);
      if (argument === "--refresh-ms") options.refreshMs = positiveInteger(value, argument);
      else options.staleMs = positiveInteger(value, argument);
      index += 1;
    } else {
      throw new TypeError(`unknown option: ${argument}`);
    }
  }
  return options;
}

/**
 * @param {string} workspaceRoot
 * @param {WatchIO} io
 */
export async function listSessionFiles(workspaceRoot, io) {
  const effectiveIO = io ?? {};
  const loadDirectory = effectiveIO.readdir ?? readdir;
  const checkpointRoot = path.join(workspaceRoot, ".agent-checkpoints");
  try {
    const entries = await loadDirectory(checkpointRoot, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".jsonl"))
      .map((entry) => ({ name: entry.name, filePath: path.join(checkpointRoot, entry.name) }))
      .sort((left, right) => left.name.localeCompare(right.name));
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
}

/**
 * @param {string} workspaceRoot
 * @returns {Array<{ name: string, filePath: string }>}
 */
function listSessionFilesNative(workspaceRoot) {
  const checkpointRoot = path.join(workspaceRoot, ".agent-checkpoints");
  try {
    const entries = readdirSync(checkpointRoot, { withFileTypes: true });
    /** @type {Array<{ name: string, filePath: string }>} */
    const files = [];
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith(".jsonl")) {
        files.push({ name: entry.name, filePath: path.join(checkpointRoot, entry.name) });
      }
    }
    files.sort((left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0);
    return files;
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
}

/** @param {DashboardAnalysis} analysis */
function compactMetrics(analysis) {
  const values = [analysis.chainPercent, analysis.workPercent, analysis.threeWordPercent];
  const compact = values.map((value) => value === null ? "n/a" : String(Number(value.toFixed(1))));
  return values.every((value) => value === null) ? compact.join("/") : `${compact.join("/")}%`;
}

/** @param {number | null} value */
function contextPercent(value) {
  return value === null ? "unknown" : `${Number((value * 100).toFixed(1))}%`;
}

function timestampDigits(value, start, length) {
  let parsed = 0;
  for (let index = start; index < start + length; index += 1) {
    parsed = (parsed * 10) + (value.charCodeAt(index) - 48);
  }
  return parsed;
}

function leapYear(year) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function isoTimestampMs(value) {
  const year = timestampDigits(value, 0, 4);
  const month = timestampDigits(value, 5, 2);
  const day = timestampDigits(value, 8, 2);
  const hour = timestampDigits(value, 11, 2);
  const minute = timestampDigits(value, 14, 2);
  const second = timestampDigits(value, 17, 2);
  const millisecond = value.length === 24 ? timestampDigits(value, 20, 3) : 0;
  let days = 0;
  if (year >= 1970) {
    for (let current = 1970; current < year; current += 1) days += leapYear(current) ? 366 : 365;
  } else {
    for (let current = year; current < 1970; current += 1) days -= leapYear(current) ? 366 : 365;
  }
  const monthDays = [31, leapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  for (let current = 1; current < month; current += 1) days += monthDays[current - 1];
  days += day - 1;
  return (((((days * 24) + hour) * 60) + minute) * 60 + second) * 1000 + millisecond;
}

function validIsoTimestamp(value) {
  if (typeof value !== "string" || (value.length !== 20 && value.length !== 24)) return false;
  if (
    value.charAt(4) !== "-" || value.charAt(7) !== "-" || value.charAt(10) !== "T"
    || value.charAt(13) !== ":" || value.charAt(16) !== ":" || value.charAt(value.length - 1) !== "Z"
    || (value.length === 24 && value.charAt(19) !== ".")
  ) return false;
  for (let index = 0; index < value.length; index += 1) {
    if ([4, 7, 10, 13, 16, 19, value.length - 1].includes(index)) continue;
    const digit = value.charCodeAt(index) - 48;
    if (digit < 0 || digit > 9) return false;
  }
  const year = timestampDigits(value, 0, 4);
  const month = timestampDigits(value, 5, 2);
  const day = timestampDigits(value, 8, 2);
  const hour = timestampDigits(value, 11, 2);
  const minute = timestampDigits(value, 14, 2);
  const second = timestampDigits(value, 17, 2);
  if (month < 1 || month > 12 || hour > 23 || minute > 59 || second > 59) return false;
  const monthDays = [31, leapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day >= 1 && day <= monthDays[month - 1];
}

/** @param {string} label */
function exactlyThreeWords(label) {
  const trimmed = label.trim();
  return trimmed.length > 0 && trimmed.split(/\s+/u).length === 3;
}

/** @param {{ timestamp: string, session_id: string }} record */
function validateNativeIdentity(record) {
  if (!validIsoTimestamp(record.timestamp)) throw new TypeError("timestamp must be a valid ISO UTC timestamp");
  if (typeof record.session_id !== "string" || record.session_id.length === 0) {
    throw new TypeError("session_id must be a non-empty string");
  }
}

/** @param {NativeLegacyCheckpoint} record */
function validateNativeCheckpoint(record) {
  validateNativeIdentity(record);
  if (typeof record.done !== "string" || typeof record.next !== "string") {
    throw new TypeError("done and next must be strings");
  }
  if (typeof record.step_failed !== "boolean") throw new TypeError("step_failed must be a boolean");
  if (
    record.context_used !== null
    && (typeof record.context_used !== "number" || record.context_used < 0 || record.context_used > 1)
  ) throw new TypeError("context_used must be null or a number from 0 through 1");
}

/** @param {NativeLegacyCheckpoint} record @returns {NativeLogRecord} */
function normalizeNativeLegacy(record) {
  if (Object.keys(record).length !== 6) throw new TypeError("invalid legacy checkpoint fields");
  validateNativeCheckpoint(record);
  return {
    timestamp: record.timestamp,
    session_id: record.session_id,
    kind: "checkpoint",
    done: record.done,
    next: record.next,
    step_failed: record.step_failed,
    context_used: record.context_used,
    agent: null,
    session_title: null,
    status: "",
  };
}

/** @param {NativeCurrentCheckpoint} record @returns {NativeLogRecord} */
function normalizeNativeCurrent(record) {
  if (Object.keys(record).length !== 8) throw new TypeError("invalid current checkpoint fields");
  validateNativeCheckpoint(record);
  if (
    record.agent !== null && (typeof record.agent !== "string" || record.agent.trim().length === 0)
  ) throw new TypeError("agent must be null or a non-empty string");
  if (
    record.session_title !== null
    && (typeof record.session_title !== "string" || record.session_title.trim().length === 0)
  ) throw new TypeError("session_title must be null or a non-empty string");
  return {
    timestamp: record.timestamp,
    session_id: record.session_id,
    kind: "checkpoint",
    done: record.done,
    next: record.next,
    step_failed: record.step_failed,
    context_used: record.context_used,
    agent: record.agent,
    session_title: record.session_title,
    status: "",
  };
}

/** @param {NativeStatusEvent} record @returns {NativeLogRecord} */
function normalizeNativeStatus(record) {
  if (Object.keys(record).length !== 4) throw new TypeError("invalid session status fields");
  validateNativeIdentity(record);
  if (record.event !== "session_status" || (record.status !== "open" && record.status !== "closed")) {
    throw new TypeError("invalid session status record");
  }
  return {
    timestamp: record.timestamp,
    session_id: record.session_id,
    kind: "status",
    done: "",
    next: "",
    step_failed: false,
    context_used: null,
    agent: null,
    session_title: null,
    status: record.status,
  };
}

/** @param {string} line @returns {NativeLogRecord} */
function parseNativeLogLine(line) {
  if (/"event"\s*:/.test(line)) {
    return normalizeNativeStatus(/** @type {NativeStatusEvent} */ (JSON.parse(line)));
  }
  if (/"agent"\s*:|"session_title"\s*:/.test(line)) {
    return normalizeNativeCurrent(/** @type {NativeCurrentCheckpoint} */ (JSON.parse(line)));
  }
  return normalizeNativeLegacy(/** @type {NativeLegacyCheckpoint} */ (JSON.parse(line)));
}

/**
 * @param {string} jsonl
 * @returns {DashboardLog}
 */
function analyzeCheckpointLogNative(jsonl) {
  const lines = jsonl.split(/\r?\n/);
  while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  if (lines.length === 0) throw new TypeError("checkpoint JSONL must contain at least one record");
  /** @type {NativeLogRecord[]} */
  const records = [];
  /** @type {NativeLogRecord[]} */
  const checkpoints = [];
  /** @type {"OPEN" | "CLOSED" | "UNKNOWN"} */
  let state = "UNKNOWN";
  let matchingTransitions = 0;
  let successfulRecords = 0;
  let compliantLabels = 0;
  for (const line of lines) {
    if (line.length === 0) throw new TypeError("checkpoint JSONL must not contain blank lines");
    const record = parseNativeLogLine(line);
    records.push(record);
    if (record.kind === "status") {
      state = record.status === "open" ? "OPEN" : "CLOSED";
    } else {
      if (checkpoints.length > 0 && checkpoints[checkpoints.length - 1].next === record.done) {
        matchingTransitions += 1;
      }
      if (record.step_failed === false) successfulRecords += 1;
      if (exactlyThreeWords(record.done)) compliantLabels += 1;
      if (exactlyThreeWords(record.next)) compliantLabels += 1;
      checkpoints.push(record);
    }
  }
  const checkedRecords = checkpoints.length;
  const checkedTransitions = checkedRecords > 0 ? checkedRecords - 1 : 0;
  const checkedLabels = checkedRecords * 2;
  return {
    latestEvent: records[records.length - 1],
    latestCheckpoint: checkedRecords === 0 ? null : checkpoints[checkedRecords - 1],
    state,
    analysis: {
      checkedRecords,
      chainPercent: checkedTransitions === 0 ? null : (matchingTransitions / checkedTransitions) * 100,
      workPercent: checkedRecords === 0 ? null : (successfulRecords / checkedRecords) * 100,
      threeWordPercent: checkedLabels === 0 ? null : (compliantLabels / checkedLabels) * 100,
    },
  };
}

/**
 * @param {DashboardLog} log
 * @param {number} now
 * @returns {DashboardRow}
 */
function validSessionRow(log, now) {
  const latestEvent = log.latestEvent;
  const latestCheckpoint = log.latestCheckpoint;
  const activityMs = isoTimestampMs(latestEvent.timestamp);
  const elapsed = now - activityMs;
  const ageMs = elapsed > 0 ? elapsed : 0;
  return {
    session: latestEvent.session_id,
    activityMs,
    ageMs,
    state: log.state,
    checkpointCount: log.analysis.checkedRecords,
    metrics: compactMetrics(log.analysis),
    context: contextPercent(latestCheckpoint?.context_used ?? null),
    agent: latestCheckpoint?.agent ?? "-",
    title: latestCheckpoint?.session_title ?? "-",
    done: latestCheckpoint?.done ?? "-",
    next: latestCheckpoint?.next ?? "-",
    error: null,
  };
}

function compactErrorMessage(value) {
  const text = String(value);
  let compact = "";
  let pendingSpace = false;
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    const whitespace = code === 9 || code === 10 || code === 11 || code === 12 || code === 13 || code === 32;
    if (whitespace) {
      pendingSpace = compact.length > 0;
    } else {
      if (pendingSpace) compact += " ";
      compact += text.charAt(index);
      pendingSpace = false;
    }
  }
  return compact;
}

/**
 * @param {string} name
 * @param {Error} error
 * @returns {DashboardRow}
 */
function errorSessionRow(name, error) {
  return {
    session: name.slice(0, -".jsonl".length),
    activityMs: null,
    ageMs: null,
    state: "ERROR",
    checkpointCount: "-",
    metrics: "-",
    context: "-",
    agent: "-",
    title: "-",
    done: "read failed",
    next: compactErrorMessage(error?.message ?? error),
    error: null,
  };
}

/** @param {DashboardRow[]} rows */
function sortSessionRows(rows) {
  return rows.sort((left, right) => {
    const rank = (row) => row.state === "CLOSED" ? 1 : row.state === "ERROR" ? 2 : 0;
    const rankDifference = rank(left) - rank(right);
    if (rankDifference !== 0) return rankDifference;
    if (left.activityMs !== null && right.activityMs !== null) {
      return right.activityMs - left.activityMs
        || (left.session < right.session ? -1 : left.session > right.session ? 1 : 0);
    }
    if (left.activityMs !== null) return -1;
    if (right.activityMs !== null) return 1;
    return left.session < right.session ? -1 : left.session > right.session ? 1 : 0;
  });
}

/**
 * @param {string} workspaceRoot
 * @param {{ now?: number }} options
 * @param {WatchIO} io
 */
export async function loadSessionRows(workspaceRoot, options, io) {
  const effectiveOptions = options ?? {};
  const effectiveIO = io ?? {};
  const now = effectiveOptions.now ?? Date.now();
  const loadFile = effectiveIO.readFile ?? readFile;
  const files = await listSessionFiles(workspaceRoot, effectiveIO);
  const rows = await Promise.all(files.map(async ({ name, filePath }) => {
    try {
      const log = analyzeCheckpointLog(await loadFile(filePath, "utf8"));
      return validSessionRow(log, now);
    } catch (error) {
      return errorSessionRow(name, error);
    }
  }));
  return sortSessionRows(rows);
}

async function loadSessionRowsNative(workspaceRoot, now) {
  const files = listSessionFilesNative(workspaceRoot);
  const rows = [];
  for (const { name, filePath } of files) {
    try {
      const log = analyzeCheckpointLogNative(await readFile(filePath, "utf8"));
      rows.push(validSessionRow(log, now));
    } catch (error) {
      rows.push(errorSessionRow(name, error));
    }
  }
  return sortSessionRows(rows);
}

export function formatAge(ageMs) {
  if (ageMs === null) return "-";
  if (ageMs < 1000) return "<1s";
  if (ageMs < 60000) return `${Math.floor(ageMs / 1000)}s`;
  if (ageMs < 3600000) return `${Math.floor(ageMs / 60000)}m`;
  if (ageMs < 86400000) return `${Math.floor(ageMs / 3600000)}h`;
  return `${Math.floor(ageMs / 86400000)}d`;
}

function truncate(value, width) {
  const text = String(value);
  if (text.length <= width) return text;
  if (width <= 1) return text.slice(0, width);
  return `${text.slice(0, width - 1)}…`;
}

function flexibleWidths(available) {
  if (available < 3) return [1, 1, 1];
  if (available < 6) return [available - 2, 1, 1];
  const extra = available - 6;
  const base = Math.floor(extra / 3);
  const remainder = extra % 3;
  return [
    4 + base + (remainder > 0 ? 1 : 0),
    1 + base + (remainder > 1 ? 1 : 0),
    1 + base,
  ];
}

/** @param {DashboardRow} row @param {string} key */
function dashboardRowValue(row, key) {
  if (key === "agent") return row.agent;
  if (key === "title") return row.title;
  if (key === "checkpointCount") return row.checkpointCount;
  if (key === "metrics") return row.metrics;
  if (key === "context") return row.context;
  if (key === "done") return row.done;
  if (key === "current") return row.state === "CLOSED" ? "—" : row.next;
  return "";
}

/** @param {DashboardRow[]} rows @param {number} columns @param {boolean} showOldRows */
function formatDashboardView(rows, columns, showOldRows) {
  const contentWidth = (header, key) => {
    let width = header.length;
    for (const row of rows) {
      const candidate = String(dashboardRowValue(row, key)).length;
      if (candidate > width) width = candidate;
    }
    return width;
  };
  /** @type {[string, number, string][]} */
  const fixed = [
    ["AGE", 5, "age"],
    ["STATE", 7, "state"],
    ["CP", contentWidth("CP", "checkpointCount"), "checkpointCount"],
    ["C/W/3 %", contentWidth("C/W/3 %", "metrics"), "metrics"],
    ["CONTEXT", 7, "context"],
  ];
  const separatorWidth = 8;
  let fixedWidth = 0;
  for (const spec of fixed) fixedWidth += spec[1];
  const desiredAgentWidth = contentWidth("AGENT", "agent");
  const available = columns - fixedWidth - separatorWidth;
  let agentWidth = desiredAgentWidth;
  let flexibleAvailable = available - agentWidth;
  if (flexibleAvailable < 6) {
    agentWidth = available - 6;
    if (agentWidth < 1) agentWidth = 1;
    flexibleAvailable = available - agentWidth;
  }
  const [nameWidth, doneWidth, currentWidth] = flexibleWidths(flexibleAvailable);
  const specs = [
    ["AGENT", agentWidth, "agent"], ["NAME", nameWidth, "title"], fixed[0], fixed[1],
    fixed[2], fixed[3], fixed[4], ["DONE", doneWidth, "done"],
    ["CURRENT", currentWidth, "current"],
  ];
  const line = (values) => {
    let rendered = "";
    for (let index = 0; index < values.length; index += 1) {
      if (index > 0) rendered += " ";
      rendered += truncate(values[index], specs[index][1]).padEnd(specs[index][1]);
    }
    return truncate(rendered, columns);
  };
  const headers = [];
  for (const spec of specs) headers.push(spec[0]);
  const output = [
    truncate("Checkpoint sessions — lifecycle from explicit status; age is informational", columns),
    line(headers),
    truncate("-".repeat(columns), columns),
  ];
  if (rows.length === 0) output.push(truncate("No direct .agent-checkpoints/*.jsonl sessions found.", columns));
  const currentUnclosed = [];
  const oldUnclosed = [];
  const closed = [];
  const errors = [];
  for (const row of rows) {
    if (row.state === "ERROR") errors.push(row);
    else {
      const old = row.ageMs !== null && row.ageMs >= OLD_ROW_MS;
      if (!showOldRows && old) continue;
      if (row.state === "CLOSED") closed.push(row);
      else if (old) oldUnclosed.push(row);
      else currentUnclosed.push(row);
    }
  }
  const groups = showOldRows
    ? [currentUnclosed, oldUnclosed, closed, errors]
    : [currentUnclosed, closed, errors];
  let renderedGroup = false;
  for (const group of groups) {
    if (group.length === 0) continue;
    if (renderedGroup) output.push("");
    for (const row of group) {
      output.push(line([
        row.agent, row.title, formatAge(row.ageMs), row.state, row.checkpointCount,
        row.metrics, row.context, row.done, row.state === "CLOSED" ? "—" : row.next,
      ]));
    }
    renderedGroup = true;
  }
  return output.join("\n");
}

/**
 * @param {DashboardRow[]} rows
 * @param {{ columns?: number, showOldRows?: boolean, staleMs?: number }} [options]
 */
export function formatDashboard(rows, options = {}) {
  const columns = Number.isSafeInteger(options.columns) && options.columns > 0 ? options.columns : 120;
  return formatDashboardView(rows, columns, options.showOldRows === true);
}

/**
 * @param {string} workspaceRoot
 * @param {{ staleMs?: number }} options
 * @param {WatchIO} io
 * @param {boolean} ansi
 * @param {boolean} showOldRows
 */
async function render(workspaceRoot, options, io, ansi, showOldRows) {
  const rows = await loadSessionRows(workspaceRoot, { now: io.now?.() ?? Date.now() }, io);
  const dashboard = formatDashboard(rows, {
    columns: io.columns ?? process.stdout.columns ?? 120,
    showOldRows,
  });
  (io.stdout ?? ((text) => { process.stdout.write(text); }))(`${ansi ? "\x1b[H\x1b[2J" : ""}${dashboard}\n`);
}

/**
 * @param {string} workspaceRoot
 * @param {{ refreshMs: number, staleMs: number }} options
 * @param {WatchIO} [io]
 */
export async function runLiveDashboard(workspaceRoot, options, io = {}) {
  const writeOut = io.stdout ?? ((text) => { process.stdout.write(text); });
  const setTimer = io.setInterval ?? setInterval;
  const clearTimer = io.clearInterval ?? clearInterval;
  const watch = io.watch ?? watchDirectory;
  const input = io.stdin ?? process.stdin;
  const onSignal = io.onSignal ?? ((signal, listener) => { process.on(signal, listener); });
  const offSignal = io.offSignal ?? ((signal, listener) => { process.off(signal, listener); });
  let watcher = null;
  let timer = null;
  let showOldRows = false;
  let finished = false;
  let finishError = null;
  let resolveExit;
  const exitRequested = new Promise((resolve) => { resolveExit = resolve; });
  let rendering = Promise.resolve();
  const refresh = () => {
    rendering = rendering.then(() => render(workspaceRoot, options, io, true, showOldRows));
    rendering.catch((error) => { finish(error); });
    return rendering;
  };
  const finish = (error = null) => {
    if (error !== null && finishError === null) finishError = error;
    if (finished) return;
    finished = true;
    resolveExit();
  };
  const signalFinish = () => { finish(); };
  let sigintInstalled = false;
  let sigtermInstalled = false;
  let inputListener = null;
  let rawChanged = false;
  let flowChanged = false;
  let priorRaw = false;
  let runFailure = null;

  try {
    sigintInstalled = true;
    onSignal("SIGINT", signalFinish);
    sigtermInstalled = true;
    onSignal("SIGTERM", signalFinish);
    if (
      input?.isTTY === true
      && typeof input.setRawMode === "function"
      && typeof input.on === "function"
      && typeof input.off === "function"
    ) {
      priorRaw = input.isRaw === true;
      if (!priorRaw) {
        rawChanged = true;
        input.setRawMode(true);
      }
      if (input.readableFlowing !== true && typeof input.resume === "function") {
        flowChanged = true;
        input.resume();
      }
      inputListener = (chunk) => {
        const text = String(chunk);
        for (let index = 0; index < text.length; index += 1) {
          const key = text.charAt(index);
          if (key === "v") {
            showOldRows = !showOldRows;
            refresh();
          } else if (key === "\u0003") {
            finish();
          }
        }
      };
      input.on("data", inputListener);
    }
    writeOut("\x1b[?25l");
    await refresh();
    timer = setTimer(refresh, options.refreshMs);
    try {
      watcher = watch(path.join(workspaceRoot, ".agent-checkpoints"), refresh);
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
    if (io.waitForExit) {
      await io.waitForExit({ refresh, close: async () => { finish(); } });
    } else {
      await exitRequested;
    }
    if (finishError !== null) throw finishError;
  } catch (error) {
    runFailure = error;
  } finally {
    let cleanupFailure = null;
    if (inputListener !== null) {
      try {
        input.off("data", inputListener);
      } catch (error) {
        cleanupFailure = error;
      }
    }
    if (rawChanged) {
      try {
        input.setRawMode(priorRaw);
      } catch (error) {
        if (cleanupFailure === null) cleanupFailure = error;
      }
    }
    if (flowChanged && typeof input.pause === "function") {
      try {
        input.pause();
      } catch (error) {
        if (cleanupFailure === null) cleanupFailure = error;
      }
    }
    if (sigintInstalled) {
      try {
        offSignal("SIGINT", signalFinish);
      } catch (error) {
        if (cleanupFailure === null) cleanupFailure = error;
      }
    }
    if (sigtermInstalled) {
      try {
        offSignal("SIGTERM", signalFinish);
      } catch (error) {
        if (cleanupFailure === null) cleanupFailure = error;
      }
    }
    if (timer !== null) {
      try {
        clearTimer(timer);
      } catch (error) {
        if (cleanupFailure === null) cleanupFailure = error;
      }
    }
    if (watcher !== null) {
      try {
        watcher.close();
      } catch (error) {
        if (cleanupFailure === null) cleanupFailure = error;
      }
    }
    try {
      await rendering;
    } catch (error) {
      if (cleanupFailure === null) cleanupFailure = error;
    }
    try {
      writeOut("\x1b[?25h");
    } catch (error) {
      if (cleanupFailure === null) cleanupFailure = error;
    }
    if (runFailure === null) runFailure = cleanupFailure;
  }
  if (runFailure !== null) throw runFailure;
}

async function renderNative(workspaceRoot, ansi, showOldRows) {
  const rows = await loadSessionRowsNative(workspaceRoot, Date.now());
  let columns = 120;
  const stdoutColumns = process.stdout.columns;
  if (stdoutColumns !== undefined) columns = stdoutColumns;
  const dashboard = formatDashboardView(rows, columns, showOldRows);
  process.stdout.write(`${ansi ? "\x1b[H\x1b[2J" : ""}${dashboard}\n`);
}

async function runLiveDashboardNative(workspaceRoot, options) {
  /** @type {import("node:fs").FSWatcher | null} */
  let watcher = null;
  let timer = null;
  let showOldRows = false;
  let finished = false;
  let resolveExit;
  const exitRequested = new Promise((resolve) => { resolveExit = resolve; });
  let rendering = Promise.resolve();
  let liveFailure = null;
  const finish = () => {
    if (finished) return;
    finished = true;
    resolveExit();
  };
  const fail = (error) => {
    if (liveFailure === null) liveFailure = error;
    finish();
  };
  const refresh = () => {
    rendering = rendering.then(() => renderNative(workspaceRoot, true, showOldRows));
    rendering.catch((error) => { fail(error); });
    return rendering;
  };
  const signalFinish = () => { finish(); };
  /** @param {Uint8Array} chunk */
  const inputData = (chunk) => {
    for (let index = 0; index < chunk.length; index += 1) {
      const key = chunk[index];
      if (key === 118) {
        showOldRows = !showOldRows;
        refresh();
      } else if (key === 3) {
        finish();
      }
    }
  };
  const interactive = process.stdin.isTTY;

  process.on("SIGINT", signalFinish);
  process.on("SIGTERM", signalFinish);
  try {
    if (interactive) {
      process.stdin.setRawMode(true);
      process.stdin.on("data", inputData);
    }
    process.stdout.write("\x1b[?25l");
    await refresh();
    timer = setInterval(refresh, options.refreshMs);
    try {
      watcher = watchDirectory(path.join(workspaceRoot, ".agent-checkpoints"), () => { refresh(); });
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
    await exitRequested;
    if (liveFailure !== null) throw liveFailure;
  } finally {
    if (interactive) {
      process.stdin.setRawMode(false);
      process.stdin.destroy();
    }
    process.off("SIGINT", signalFinish);
    process.off("SIGTERM", signalFinish);
    if (timer !== null) clearInterval(timer);
    if (watcher !== null) watcher.close();
    let renderingFailed = false;
    try {
      await rendering;
    } catch {
      renderingFailed = true;
    }
    process.stdout.write("\x1b[?25h");
    if (renderingFailed && liveFailure !== null) throw liveFailure;
  }
}

async function mainNative(args) {
  try {
    const options = parseArgs(args, watchEnvironment());
    if (options.help) {
      process.stdout.write(HELP);
      return 0;
    }
    const workspaceRoot = process.cwd();
    if (options.once) await renderNative(workspaceRoot, false, false);
    else await runLiveDashboardNative(workspaceRoot, options);
    return 0;
  } catch (error) {
    process.stderr.write(`checkpoint-watch: ${error.message}\n`);
    return 1;
  }
}

/**
 * @param {string[]} args
 * @param {WatchIO} [io]
 */
export async function main(args, io = {}) {
  const writeOut = io.stdout ?? ((text) => { process.stdout.write(text); });
  const writeError = io.stderr ?? ((text) => { process.stderr.write(text); });
  try {
    const options = parseArgs(args, io.env ?? watchEnvironment());
    if (options.help) {
      writeOut(HELP);
      return 0;
    }
    const workspaceRoot = io.cwd ?? process.cwd();
    if (options.once) await render(workspaceRoot, options, io, false, false);
    else await runLiveDashboard(workspaceRoot, options, io);
    return 0;
  } catch (error) {
    writeError(`checkpoint-watch: ${error.message}\n`);
    return 1;
  }
}

// scriptc compiles this JS to a native binary: import.meta is unavailable
// there and argv[1] is the compiled binary path (basename without ".js").
// The name-based check keeps direct invocation working under both Node and
// scriptc while staying inert when this file is imported as a module.
const executableName = path.basename(process.argv[1] ?? "");
const isMain = executableName === "checkpoint-watch" || executableName === "checkpoint-watch.js";
if (isMain) {
  const code = executableName === "checkpoint-watch"
    ? await mainNative(process.argv.slice(2))
    : await main(process.argv.slice(2));
  if (code !== 0) process.exit(code);
}
