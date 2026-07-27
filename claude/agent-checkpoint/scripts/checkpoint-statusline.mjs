#!/usr/bin/env node
// Claude Code statusline wrapper for the agent-checkpoint plugin.
//
// Reads one Claude Code statusline JSON object from stdin, validates the
// native session_id and workspace.project_dir, atomically (tmp + rename)
// replaces the latest telemetry snapshot at
//   <project_dir>/.agent-checkpoints/.runtime/claude/<encoded-session-id>.json
// and prints a compact statusline row. The sidecar is an ephemeral
// latest-value cache: it is never JSONL, recovery data, or a second log, and
// never stores chain/word percentages, checkpoint file names, remaining
// K-tokens, or display output. Pinned to the claude 2.1.170 statusline
// surface (latest-response, input-only used_percentage; null before the
// first response and after compaction).

import { mkdirSync, realpathSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function finiteNumberAtLeast(value, min) {
  return typeof value === "number" && Number.isFinite(value) && value >= min ? value : null;
}

// Mirror of checkpoint-core encodeSessionId (encodeURIComponent); the MCP
// server resolves the same sidecar file name without importing this wrapper.
function encodeSessionId(sessionId) {
  return encodeURIComponent(sessionId);
}

// Keep only the documented, defensible fields. used_percentage is
// latest-response and input-only: null before the first response and after
// compaction, and preserved as null here rather than fabricated.
export function normalizeStatuslineTelemetry(input) {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return null;
  }
  const sessionId = nonEmptyString(input.session_id);
  const workspace =
    input.workspace !== null && typeof input.workspace === "object" && !Array.isArray(input.workspace)
      ? input.workspace
      : null;
  const projectDir = workspace === null ? null : nonEmptyString(workspace.project_dir);
  if (sessionId === null || projectDir === null) {
    return null;
  }
  const usedPercentage = finiteNumberAtLeast(input.used_percentage, 0);
  return {
    session_id: sessionId,
    project_dir: projectDir,
    used_percentage: usedPercentage !== null && usedPercentage <= 100 ? usedPercentage : null,
    context_window_size: finiteNumberAtLeast(input.context_window_size, 1),
    total_input_tokens: finiteNumberAtLeast(input.total_input_tokens, 0),
    session_name: nonEmptyString(input.session_name),
  };
}

export function sidecarPathFor(projectDir, sessionId) {
  return path.join(
    projectDir,
    ".agent-checkpoints",
    ".runtime",
    "claude",
    `${encodeSessionId(sessionId)}.json`,
  );
}

// Atomic latest-value replacement: write a temporary sibling and rename it
// over the previous snapshot, so concurrent readers never see a partial file.
export function writeAtomicSnapshot(snapshot, clock = () => new Date()) {
  const targetPath = sidecarPathFor(snapshot.project_dir, snapshot.session_id);
  mkdirSync(path.dirname(targetPath), { recursive: true });
  const payload = {
    session_id: snapshot.session_id,
    project_dir: snapshot.project_dir,
    updated_at: clock().toISOString(),
    used_percentage: snapshot.used_percentage,
    context_window_size: snapshot.context_window_size,
    total_input_tokens: snapshot.total_input_tokens,
    session_name: snapshot.session_name,
  };
  const temporaryPath = `${targetPath}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`;
  writeFileSync(temporaryPath, `${JSON.stringify(payload)}\n`, "utf8");
  renameSync(temporaryPath, targetPath);
  return targetPath;
}

export function formatStatusline(snapshot) {
  const used = snapshot === null ? null : snapshot.used_percentage;
  return `Checkpoint context: ${used === null ? "unknown" : `${Math.round(used)}%`}`;
}

export function handleStatuslineInput(input, clock) {
  const snapshot = normalizeStatuslineTelemetry(input);
  if (snapshot !== null) {
    writeAtomicSnapshot(snapshot, clock);
  }
  return formatStatusline(snapshot);
}

function main() {
  let raw = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => {
    raw += chunk;
  });
  process.stdin.on("end", () => {
    let row;
    try {
      row = handleStatuslineInput(JSON.parse(raw));
    } catch (error) {
      // The statusline renders on every refresh: degrade to the honest
      // fallback row instead of breaking the host UI. Diagnostics on stderr.
      process.stderr.write(`agent-checkpoint statusline: ${error.message}\n`);
      row = formatStatusline(null);
    }
    process.stdout.write(`${row}\n`);
  });
}

// Resolve symlinks on both sides: installed paths may sit below a symlinked
// directory (e.g. /tmp -> /private/tmp on macOS), while import.meta.url is
// always the fully resolved module URL.
const isMain =
  process.argv[1] &&
  realpathSync(path.resolve(process.argv[1])) === realpathSync(fileURLToPath(import.meta.url));
if (isMain) {
  main();
}
