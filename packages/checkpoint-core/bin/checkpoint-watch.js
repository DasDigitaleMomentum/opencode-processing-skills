#!/usr/bin/env node

import { watch as watchDirectory } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { analyzeCheckpointLog } from "../src/index.js";

export const DEFAULT_REFRESH_MS = 1000;
export const DEFAULT_STALE_MS = 120000;

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
 * @property {(callback: () => void, delay: number) => object} [setInterval]
 * @property {(handle: object) => void} [clearInterval]
 * @property {(dir: string, callback: () => void) => { close: () => void }} [watch]
 * @property {(handlers: { refresh: () => Promise<void>, close: () => Promise<void> }) => Promise<void>} [waitForExit]
 */

function positiveInteger(value, label) {
  if (!/^\d+$/.test(String(value)) || Number(value) <= 0 || !Number.isSafeInteger(Number(value))) {
    throw new TypeError(`${label} must be a positive integer`);
  }
  return Number(value);
}

/**
 * @param {string[]} args
 * @param {{ CHECKPOINT_WATCH_REFRESH_MS?: string, CHECKPOINT_WATCH_STALE_MS?: string }} [env]
 */
export function parseArgs(args, env = process.env) {
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
      const key = argument === "--refresh-ms" ? "refreshMs" : "staleMs";
      options[key] = positiveInteger(value, argument);
      index += 1;
    } else {
      throw new TypeError(`unknown option: ${argument}`);
    }
  }
  return options;
}

/**
 * @param {string} workspaceRoot
 * @param {WatchIO} [io]
 */
export async function listSessionFiles(workspaceRoot, io = {}) {
  const loadDirectory = io.readdir ?? readdir;
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

function compactMetrics(analysis) {
  const values = [analysis.chainPercent, analysis.workPercent, analysis.threeWordPercent];
  const compact = values.map((value) => value === null ? "n/a" : String(Number(value.toFixed(1))));
  return values.every((value) => value === null) ? compact.join("/") : `${compact.join("/")}%`;
}

function contextPercent(value) {
  return value === null ? "unknown" : `${Number((value * 100).toFixed(1))}%`;
}

/**
 * @param {string} workspaceRoot
 * @param {{ now?: number }} [options]
 * @param {WatchIO} [io]
 */
export async function loadSessionRows(workspaceRoot, options = {}, io = {}) {
  const now = options.now ?? Date.now();
  const loadFile = io.readFile ?? readFile;
  const files = await listSessionFiles(workspaceRoot, io);
  const rows = await Promise.all(files.map(async ({ name, filePath }) => {
    try {
      const log = analyzeCheckpointLog(await loadFile(filePath, "utf8"));
      const latestEvent = log.latestEvent;
      const latestCheckpoint = log.latestCheckpoint;
      const activityMs = Date.parse(latestEvent.timestamp);
      const ageMs = Math.max(0, now - activityMs);
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
    } catch (error) {
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
        next: String(error?.message ?? error).replace(/\s+/g, " "),
        error,
      };
    }
  }));

  return rows.sort((left, right) => {
    const rank = (row) => row.state === "CLOSED" ? 1 : row.state === "ERROR" ? 2 : 0;
    const rankDifference = rank(left) - rank(right);
    if (rankDifference !== 0) return rankDifference;
    if (left.activityMs !== null && right.activityMs !== null) {
      return right.activityMs - left.activityMs || left.session.localeCompare(right.session);
    }
    if (left.activityMs !== null) return -1;
    if (right.activityMs !== null) return 1;
    return left.session.localeCompare(right.session);
  });
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

function distributedWidths(available) {
  const usable = Math.max(3, available);
  const base = Math.floor(usable / 3);
  const remainder = usable % 3;
  return [
    base + Number(remainder > 0),
    base + Number(remainder > 1),
    base,
  ];
}

export function formatDashboard(rows, options = {}) {
  const columns = Number.isSafeInteger(options.columns) && options.columns > 0 ? options.columns : 120;
  const contentWidth = (header, key) => Math.max(
    header.length,
    ...rows.map((row) => String(row[key] ?? "").length),
  );
  /** @type {[string, number, string][]} */
  const fixed = [
    ["AGENT", 8, "agent"],
    ["AGE", 5, "age"],
    ["STATE", 7, "state"],
    ["CP", contentWidth("CP", "checkpointCount"), "checkpointCount"],
    ["C/W/3 %", contentWidth("C/W/3 %", "metrics"), "metrics"],
    ["CONTEXT", 7, "context"],
  ];
  const separatorWidth = 8;
  const fixedWidth = fixed.reduce((sum, [, width]) => sum + width, 0);
  const [nameWidth, doneWidth, currentWidth] = distributedWidths(
    columns - fixedWidth - separatorWidth,
  );
  const specs = [
    fixed[0], ["NAME", nameWidth, "title"], fixed[1], fixed[2], fixed[3], fixed[4],
    fixed[5], ["DONE", doneWidth, "done"], ["CURRENT", currentWidth, "current"],
  ];
  const line = (values) => truncate(
    values.map((value, index) => truncate(value, specs[index][1]).padEnd(specs[index][1])).join(" "),
    columns,
  );
  const output = [
    truncate("Checkpoint sessions — lifecycle from explicit status; age is informational", columns),
    line(specs.map(([name]) => name)),
    truncate("-".repeat(columns), columns),
  ];
  if (rows.length === 0) output.push(truncate("No direct .agent-checkpoints/*.jsonl sessions found.", columns));
  let previousRank = null;
  for (const row of rows) {
    const rank = row.state === "CLOSED" ? 1 : row.state === "ERROR" ? 2 : 0;
    if (previousRank !== null && rank !== previousRank) output.push("");
    output.push(line([
      row.agent, row.title, formatAge(row.ageMs), row.state, row.checkpointCount,
      row.metrics, row.context, row.done, row.state === "CLOSED" ? "—" : row.next,
    ]));
    previousRank = rank;
  }
  return output.join("\n");
}

/**
 * @param {string} workspaceRoot
 * @param {{ staleMs?: number }} options
 * @param {WatchIO} io
 * @param {boolean} ansi
 */
async function render(workspaceRoot, options, io, ansi) {
  const rows = await loadSessionRows(workspaceRoot, { now: io.now?.() ?? Date.now() }, io);
  const dashboard = formatDashboard(rows, { columns: io.columns ?? process.stdout.columns ?? 120 });
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
  let watcher = null;
  let timer = null;
  let closed = false;
  let rendering = Promise.resolve();
  const refresh = () => {
    rendering = rendering.then(() => render(workspaceRoot, options, io, true));
    return rendering;
  };
  const close = async () => {
    if (closed) return;
    closed = true;
    if (timer !== null) clearTimer(timer);
    watcher?.close();
    await rendering;
    writeOut("\x1b[?25h");
  };

  try {
    writeOut("\x1b[?25l");
    await refresh();
    timer = setTimer(refresh, options.refreshMs);
    try {
      watcher = watch(path.join(workspaceRoot, ".agent-checkpoints"), refresh);
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
    if (io.waitForExit) {
      await io.waitForExit({ refresh, close });
    } else {
      await new Promise(/** @param {(value?: void | PromiseLike<void>) => void} resolve */ (resolve) => {
        const finish = () => {
          process.off("SIGINT", finish);
          process.off("SIGTERM", finish);
          resolve();
        };
        process.once("SIGINT", finish);
        process.once("SIGTERM", finish);
      });
    }
  } finally {
    await close();
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
    const options = parseArgs(args, io.env ?? process.env);
    if (options.help) {
      writeOut(HELP);
      return 0;
    }
    const workspaceRoot = io.cwd ?? process.cwd();
    if (options.once) await render(workspaceRoot, options, io, false);
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
  const code = await main(process.argv.slice(2));
  if (code !== 0) process.exit(code);
}
