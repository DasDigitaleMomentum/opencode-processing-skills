#!/usr/bin/env node

import { realpathSync, watch as watchDirectory } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { analyzeCheckpoints, parseCheckpointJsonl } from "../src/index.js";

export const DEFAULT_REFRESH_MS = 1000;
export const DEFAULT_STALE_MS = 120000;

const HELP = `Usage: checkpoint-watch [--once] [--refresh-ms <milliseconds>] [--stale-ms <milliseconds>]

Watch direct .agent-checkpoints/*.jsonl files below the current workspace.
ACTIVE/STALE describes only the age of the latest checkpoint; it does not prove process liveness.

Options:
  --once          Print one deterministic, non-ANSI dashboard and exit
  --refresh-ms    Live redraw interval (default: ${DEFAULT_REFRESH_MS})
  --stale-ms      Latest-checkpoint age at which a session is STALE (default: ${DEFAULT_STALE_MS})
  --help          Show this help

Environment:
  CHECKPOINT_WATCH_REFRESH_MS
  CHECKPOINT_WATCH_STALE_MS
`;

function positiveInteger(value, label) {
  if (!/^\d+$/.test(String(value)) || Number(value) <= 0 || !Number.isSafeInteger(Number(value))) {
    throw new TypeError(`${label} must be a positive integer`);
  }
  return Number(value);
}

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

function percent(value) {
  return value === null ? "n/a" : `${Number(value.toFixed(1))}%`;
}

function metric({ success, count, percent: value }) {
  return `${success}/${count} (${percent(value)})`;
}

function contextPercent(value) {
  return value === null ? "unknown" : `${Number((value * 100).toFixed(1))}%`;
}

export async function loadSessionRows(workspaceRoot, options = {}, io = {}) {
  const now = options.now ?? Date.now();
  const staleMs = options.staleMs ?? DEFAULT_STALE_MS;
  const loadFile = io.readFile ?? readFile;
  const files = await listSessionFiles(workspaceRoot, io);
  const rows = await Promise.all(files.map(async ({ name, filePath }) => {
    try {
      const records = parseCheckpointJsonl(await loadFile(filePath, "utf8"));
      const analysis = analyzeCheckpoints(records);
      const latest = records.at(-1);
      const activityMs = Date.parse(latest.timestamp);
      const ageMs = Math.max(0, now - activityMs);
      return {
        session: latest.session_id,
        activityMs,
        ageMs,
        state: ageMs >= staleMs ? "STALE" : "ACTIVE",
        chain: metric(analysis.chain),
        work: metric(analysis.work),
        words: metric(analysis.threeWord),
        context: contextPercent(latest.context_used),
        agent: latest.agent ?? "-",
        title: latest.session_title ?? "-",
        done: latest.done,
        next: latest.next,
        error: null,
      };
    } catch (error) {
      return {
        session: name.slice(0, -".jsonl".length),
        activityMs: null,
        ageMs: null,
        state: "ERROR",
        chain: "-",
        words: "-",
        work: "ERROR",
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
    if (left.activityMs !== null && right.activityMs !== null) return right.activityMs - left.activityMs || left.session.localeCompare(right.session);
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
  const fixed = [
    ["SESSION", 8, "session"],
    ["AGENT", 8, "agent"],
    ["AGE", 5, "age"],
    ["STATE", 6, "state"],
    ["CHAIN", contentWidth("CHAIN", "chain"), "chain"],
    ["WORK", contentWidth("WORK", "work"), "work"],
    ["3-WORD", contentWidth("3-WORD", "words"), "words"],
    ["CONTEXT", 7, "context"],
  ];
  const separatorWidth = 10;
  const fixedWidth = fixed.reduce((sum, [, width]) => sum + width, 0);
  const [titleWidth, doneWidth, nextWidth] = distributedWidths(
    columns - fixedWidth - separatorWidth,
  );
  const specs = [
    fixed[0], fixed[1], ["NAME/TITLE", titleWidth, "title"], fixed[2], fixed[3],
    fixed[4], fixed[5], fixed[6], fixed[7], ["DONE", doneWidth, "done"],
    ["NEXT", nextWidth, "next"],
  ];
  const line = (values) => truncate(
    values.map((value, index) => truncate(value, specs[index][1]).padEnd(specs[index][1])).join(" "),
    columns,
  );
  const output = [
    truncate(`Checkpoint sessions — stale after ${options.staleMs ?? DEFAULT_STALE_MS}ms (checkpoint age only)`, columns),
    line(specs.map(([name]) => name)),
    truncate("-".repeat(columns), columns),
  ];
  if (rows.length === 0) output.push(truncate("No direct .agent-checkpoints/*.jsonl sessions found.", columns));
  for (const row of rows) {
    output.push(line([
      row.session, row.agent, row.title, formatAge(row.ageMs), row.state, row.chain,
      row.work, row.words, row.context, row.done, row.next,
    ]));
  }
  return output.join("\n");
}

async function render(workspaceRoot, options, io, ansi) {
  const rows = await loadSessionRows(workspaceRoot, { staleMs: options.staleMs, now: io.now?.() ?? Date.now() }, io);
  const dashboard = formatDashboard(rows, { staleMs: options.staleMs, columns: io.columns ?? process.stdout.columns ?? 120 });
  (io.stdout ?? ((text) => process.stdout.write(text)))(`${ansi ? "\x1b[H\x1b[2J" : ""}${dashboard}\n`);
}

export async function runLiveDashboard(workspaceRoot, options, io = {}) {
  const writeOut = io.stdout ?? ((text) => process.stdout.write(text));
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
      await new Promise((resolve) => {
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

export async function main(args, io = {}) {
  const writeOut = io.stdout ?? ((text) => process.stdout.write(text));
  const writeError = io.stderr ?? ((text) => process.stderr.write(text));
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

// Resolve symlinks on both sides: installed paths may sit below a symlinked
// directory (e.g. /var -> /private/var on macOS), while import.meta.url is
// always the fully resolved module URL.
const isMain =
  process.argv[1] &&
  realpathSync(path.resolve(process.argv[1])) === realpathSync(fileURLToPath(import.meta.url));
if (isMain) {
  process.exitCode = await main(process.argv.slice(2));
}
