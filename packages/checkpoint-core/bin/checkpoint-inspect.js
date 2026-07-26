#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { analyzeCheckpoints, parseCheckpointJsonl } from "../src/index.js";

export function formatContext(contextUsed) {
  return contextUsed === null ? "unknown" : `${Number((contextUsed * 100).toFixed(2))}%`;
}

export function formatPercent(percent) {
  return percent === null ? "n/a" : `${Number(percent.toFixed(2))}%`;
}

export function formatMetric({ success, count, percent }) {
  return `${success}/${count} (${formatPercent(percent)})`;
}

export function formatCheckpointSummary(selectedPath, records, analysis) {
  const latest = records.at(-1);
  return [
    `File: ${selectedPath}`,
    `Session: ${latest.session_id}`,
    `Agent: ${latest.agent ?? "-"}`,
    `Name/title: ${latest.session_title ?? "-"}`,
    `Latest timestamp: ${latest.timestamp}`,
    `Last attempted: ${latest.done}`,
    `Next announced: ${latest.next}`,
    `Work status: ${latest.step_failed ? "FAILED" : "COMPLETED"}`,
    `Context used: ${formatContext(latest.context_used)}`,
    `Chain: ${formatMetric(analysis.chain)}`,
    `Work: ${formatMetric(analysis.work)}`,
    `Three-word compliance: ${formatMetric(analysis.threeWord)}`,
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
    const records = parseCheckpointJsonl(jsonl);
    const analysis = analyzeCheckpoints(records);
    writeOut(`${formatCheckpointSummary(selectedPath, records, analysis)}\n`);
    return 0;
  } catch (error) {
    writeError(`checkpoint-inspect: ${error.message}\n`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.exitCode = await main(process.argv.slice(2));
}
