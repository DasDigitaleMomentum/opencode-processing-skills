#!/usr/bin/env node

import { realpathSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { analyzeCheckpointLog } from "../src/index.js";

export function formatContext(contextUsed) {
  return contextUsed === null ? "unknown" : `${Number((contextUsed * 100).toFixed(2))}%`;
}

export function formatPercent(percent) {
  return percent === null ? "n/a" : `${Number(percent.toFixed(2))}%`;
}

export function formatMetric({ success, count, percent }) {
  return `${success}/${count} (${formatPercent(percent)})`;
}

export function formatCheckpointSummary(selectedPath, input, legacyAnalysis) {
  const log = Array.isArray(input)
    ? {
        latestEvent: input.at(-1),
        latestStatusEvent: null,
        latestCheckpoint: input.at(-1),
        state: "UNKNOWN",
        analysis: legacyAnalysis,
      }
    : input;
  const latestEvent = log.latestEvent;
  const latestStatus = log.latestStatusEvent;
  const latestCheckpoint = log.latestCheckpoint;
  return [
    `File: ${selectedPath}`,
    `Session: ${latestEvent.session_id}`,
    `Session state: ${log.state}`,
    `Latest event timestamp: ${latestEvent.timestamp}`,
    `Latest status timestamp: ${latestStatus?.timestamp ?? "-"}`,
    `Latest raw status: ${latestStatus?.status ?? "-"}`,
    `Agent: ${latestCheckpoint?.agent ?? "-"}`,
    `Name/title: ${latestCheckpoint?.session_title ?? "-"}`,
    `Latest checkpoint timestamp: ${latestCheckpoint?.timestamp ?? "-"}`,
    `Last attempted: ${latestCheckpoint?.done ?? "-"}`,
    `Next announced: ${latestCheckpoint?.next ?? "-"}`,
    `Work status: ${latestCheckpoint ? (latestCheckpoint.step_failed ? "FAILED" : "COMPLETED") : "-"}`,
    `Context used: ${formatContext(latestCheckpoint?.context_used ?? null)}`,
    `Chain: ${formatMetric(log.analysis.chain)}`,
    `Work: ${formatMetric(log.analysis.work)}`,
    `Three-word compliance: ${formatMetric(log.analysis.threeWord)}`,
  ].join("\n");
}

export async function main(args, io = {}) {
  const cwd = io.cwd ?? process.cwd();
  const loadFile = io.readFile ?? readFile;
  const writeOut = io.stdout ?? ((text) => process.stdout.write(text));
  const writeError = io.stderr ?? ((text) => process.stderr.write(text));

  try {
    if (!Array.isArray(args) || args.length !== 1 || typeof args[0] !== "string" || args[0] === "") {
      throw new TypeError("usage: checkpoint-inspect <checkpoint-path>");
    }

    const selectedPath = args[0];
    const filePath = path.resolve(cwd, selectedPath);
    const jsonl = await loadFile(filePath, "utf8");
    const analysis = analyzeCheckpointLog(jsonl);
    writeOut(`${formatCheckpointSummary(selectedPath, analysis)}\n`);
    return 0;
  } catch (error) {
    writeError(`checkpoint-inspect: ${error.message}\n`);
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
