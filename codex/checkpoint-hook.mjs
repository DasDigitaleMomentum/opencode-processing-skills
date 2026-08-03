#!/usr/bin/env node
// Codex lifecycle hook bridge for the agent-checkpoint adapter.
//
// Reads one Codex hook JSON object from stdin and writes one hook output JSON
// object to stdout (or nothing, for events/tools the adapter does not handle).
// Output shapes are pinned to the verified Codex Desktop runtime's serde wires
// (camelCase, deny_unknown_fields) — emit exactly the keys below, no more.
//
//   SessionStart -> {"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"..."}}
//   PreToolUse   -> {"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"allow","updatedInput":{...}}}
//
// The verified engine rejects permissionDecision "allow" unless updatedInput
// is present, and rejects updatedInput without "allow" — always emit the pair.

import { readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { appendSessionStatus } from "./checkpoint-core.mjs";

const CHECKPOINT_TOOL_NAME = "mcp__agent_checkpoint__checkpoint";
const INSTRUCTION_FILE = "checkpoint-instruction.md";

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function validTokenCount(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

function latestPriorInputTokens(transcriptPath) {
  const filePath = nonEmptyString(transcriptPath);
  if (filePath === null) return null;

  let lines;
  try {
    lines = readFileSync(filePath, "utf8").split(/\r?\n/);
  } catch {
    return null;
  }

  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = lines[index];
    if (line.length === 0) continue;

    let event;
    try {
      event = JSON.parse(line);
    } catch {
      continue;
    }
    if (event?.type !== "event_msg" || event.payload?.type !== "token_count") {
      continue;
    }

    const usage = event.payload.info?.last_token_usage;
    const inputTokens = usage?.input_tokens;
    const cachedInputTokens = usage?.cached_input_tokens;
    if (
      !validTokenCount(inputTokens) ||
      !validTokenCount(cachedInputTokens) ||
      cachedInputTokens > inputTokens
    ) {
      return null;
    }
    return inputTokens;
  }
  return null;
}

function readInstruction() {
  const instructionPath = path.join(import.meta.dirname, INSTRUCTION_FILE);
  return readFileSync(instructionPath, "utf8").trim();
}

// SessionStart records an observed open, injects the heartbeat instruction as
// additionalContext, and tells the agent which session ID owns its log.
export async function handleSessionStart(input) {
  const sessionId = nonEmptyString(input?.session_id);
  const workspaceRoot = nonEmptyString(input?.cwd);
  if (sessionId === null) {
    throw new TypeError("SessionStart requires a non-empty session_id");
  }
  if (workspaceRoot === null) {
    throw new TypeError("SessionStart requires a non-empty cwd");
  }
  await appendSessionStatus({ workspaceRoot, sessionId, status: "open" });
  const lines = [readInstruction()];
  lines.push("", `Session checkpoint ID: ${sessionId}`);
  return {
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext: lines.join("\n"),
    },
  };
}

// PreToolUse on the checkpoint MCP tool injects host-owned identity and
// workspace values the stdio MCP protocol does not carry. Caller-supplied
// internal fields are always replaced with the current session's values.
// Non-checkpoint tools return null (no output, exit 0, empty stdout).
export function handleCheckpointPreToolUse(input) {
  if (input?.tool_name !== CHECKPOINT_TOOL_NAME) {
    return null;
  }
  const toolInput =
    input.tool_input !== null && typeof input.tool_input === "object" && !Array.isArray(input.tool_input)
      ? input.tool_input
      : {};
  return {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "allow",
      updatedInput: {
        ...toolInput,
        // input.cwd is a required string on the verified Desktop wire; the
        // process.cwd() fallback only guards against older/custom emitters.
        _workspace_root: nonEmptyString(input.cwd) ?? process.cwd(),
        _checkpoint_session_id: input.session_id ?? null,
        _checkpoint_input_tokens: latestPriorInputTokens(input.transcript_path),
      },
    },
  };
}

export async function handleHookInput(input) {
  switch (input?.hook_event_name) {
    case "SessionStart":
      return await handleSessionStart(input);
    case "PreToolUse":
      return handleCheckpointPreToolUse(input);
    default:
      return null;
  }
}

function main() {
  let raw = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => {
    raw += chunk;
  });
  process.stdin.on("end", async () => {
    let input;
    try {
      input = JSON.parse(raw);
    } catch (error) {
      process.stderr.write(`agent-checkpoint hook: invalid JSON input: ${error.message}\n`);
      process.exit(1);
    }
    try {
      const output = await handleHookInput(input);
      if (output !== null) {
        process.stdout.write(`${JSON.stringify(output)}\n`);
      }
    } catch (error) {
      process.stderr.write(`agent-checkpoint hook: ${error.message}\n`);
      process.exit(1);
    }
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
