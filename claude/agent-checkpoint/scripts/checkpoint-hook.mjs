#!/usr/bin/env node
// Claude Code lifecycle hook bridge for the agent-checkpoint plugin.
//
// Reads one Claude Code hook JSON object from stdin and writes one hook
// output JSON object to stdout (or nothing, for events/tools the plugin does
// not handle). Output shapes are pinned to claude 2.1.170:
//
//   SessionStart   -> {"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"..."}}
//   SubagentStart  -> {"hookSpecificOutput":{"hookEventName":"SubagentStart","additionalContext":"..."}}
//   PreToolUse     -> {"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"allow","updatedInput":{...}}}
//
// The pinned build carries session_id/cwd/hook_event_name on every hook
// input plus agent_id (and agent_type) when firing inside a subagent; MCP
// carries no session identity, so this bridge injects it. Parent checkpoints
// log under the native session_id, subagent checkpoints under the composite
// <session_id>--<agent_id>.

import { readFileSync, realpathSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { appendSessionStatus } from "../server/checkpoint-core.mjs";

const CHECKPOINT_TOOL_NAME = "mcp__plugin_agent-checkpoint_checkpoint__checkpoint";
const CHECKPOINT_PATH_TOOL_NAME = "mcp__plugin_agent-checkpoint_checkpoint__checkpoint_path";
const INTERNAL_FIELDS = ["_checkpoint_session_id", "_telemetry_session_id", "_agent_type"];

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

// Mirror of checkpoint-core encodeSessionId (encodeURIComponent) so the hook
// addresses the same telemetry sidecar file without importing the core.
function encodeSessionId(sessionId) {
  return encodeURIComponent(sessionId);
}

function readInstruction() {
  const instructionPath = path.join(import.meta.dirname, "..", "instructions", "checkpoint.md");
  return readFileSync(instructionPath, "utf8").trim();
}

function statusWorkspaceRoot(input) {
  const workspaceRoot = nonEmptyString(process.env.CLAUDE_PROJECT_DIR) ?? nonEmptyString(input?.cwd);
  if (workspaceRoot === null) {
    throw new TypeError("lifecycle status requires CLAUDE_PROJECT_DIR or hook cwd");
  }
  return workspaceRoot;
}

async function appendObservedStatus(input, sessionId, status) {
  if (sessionId === null) {
    throw new TypeError("lifecycle status requires a non-empty session_id");
  }
  await appendSessionStatus({
    sessionId,
    status,
    workspaceRoot: statusWorkspaceRoot(input),
  });
}

// Native session_id for the parent, composite <session_id>--<agent_id> when
// the hook fires inside a subagent. Never invented: null when the pinned
// build supplies no session_id.
function compositeCheckpointId(input) {
  const sessionId = nonEmptyString(input?.session_id);
  if (sessionId === null) {
    return null;
  }
  const agentId = nonEmptyString(input?.agent_id);
  return agentId === null ? sessionId : `${sessionId}--${agentId}`;
}

// SessionStart records the observed parent open, injects the heartbeat
// instruction as additionalContext, and tells the agent which session ID owns
// its log.
export async function handleSessionStart(input) {
  const sessionId = nonEmptyString(input?.session_id);
  await appendObservedStatus(input, sessionId, "open");
  const lines = [readInstruction()];
  if (sessionId !== null) {
    lines.push("", `Session checkpoint ID: ${sessionId}`);
  }
  return {
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext: lines.join("\n"),
    },
  };
}

// SubagentStart records the observed composite subagent open, then delivers
// the same instruction plus the composite checkpoint ID.
export async function handleSubagentStart(input) {
  const sessionId = nonEmptyString(input?.session_id);
  if (sessionId === null) {
    throw new TypeError("SubagentStart lifecycle status requires a non-empty session_id");
  }
  const agentId = nonEmptyString(input?.agent_id);
  if (agentId === null) {
    throw new TypeError("SubagentStart lifecycle status requires a non-empty agent_id");
  }
  const checkpointId = `${sessionId}--${agentId}`;
  await appendObservedStatus(input, checkpointId, "open");
  const lines = [readInstruction()];
  if (checkpointId !== null) {
    lines.push("", `Session checkpoint ID: ${checkpointId}`);
  }
  return {
    hookSpecificOutput: {
      hookEventName: "SubagentStart",
      additionalContext: lines.join("\n"),
    },
  };
}

// PreToolUse on the plugin-scoped checkpoint MCP tools injects host-owned
// identity the stdio MCP protocol does not carry. Caller-supplied internal
// fields never survive: updatedInput is rebuilt from the public arguments
// plus this hook's current identity values, so stale or foreign internal IDs
// are overwritten, never trusted. checkpoint_path takes only the public
// session_id and is allowed unchanged. Non-checkpoint tools return null (no
// output, exit 0, empty stdout).
export function handleCheckpointPreToolUse(input) {
  const toolName = input?.tool_name;
  if (toolName !== CHECKPOINT_TOOL_NAME && toolName !== CHECKPOINT_PATH_TOOL_NAME) {
    return null;
  }
  const toolInput =
    input.tool_input !== null && typeof input.tool_input === "object" && !Array.isArray(input.tool_input)
      ? input.tool_input
      : {};
  if (toolName === CHECKPOINT_PATH_TOOL_NAME) {
    return {
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "allow",
        updatedInput: { ...toolInput },
      },
    };
  }
  const publicInput = { ...toolInput };
  for (const field of INTERNAL_FIELDS) {
    delete publicInput[field];
  }
  const isSubagent = nonEmptyString(input?.agent_id) !== null;
  const agentType = isSubagent ? nonEmptyString(input?.agent_type) : null;
  return {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "allow",
      updatedInput: {
        ...publicInput,
        _checkpoint_session_id: compositeCheckpointId(input),
        _telemetry_session_id: nonEmptyString(input?.session_id),
        ...(agentType !== null ? { _agent_type: agentType } : {}),
      },
    },
  };
}

// SessionEnd records only the native parent's observed graceful close and
// removes only that session's telemetry sidecar. Raw JSONL logs and other
// sessions' sidecars are never touched; removal failure degrades to a stderr
// diagnostic without blocking session teardown.
export async function handleSessionEnd(input) {
  const sessionId = nonEmptyString(input?.session_id);
  if (sessionId === null) {
    throw new TypeError("lifecycle status requires a non-empty session_id");
  }
  const workspaceRoot = statusWorkspaceRoot(input);
  let appendError = null;
  try {
    await appendObservedStatus(input, sessionId, "closed");
  } catch (error) {
    appendError = error;
  }
  const sidecarPath = path.join(
    workspaceRoot,
    ".agent-checkpoints",
    ".runtime",
    "claude",
    `${encodeSessionId(sessionId)}.json`,
  );
  try {
    rmSync(sidecarPath, { force: true });
  } catch (error) {
    process.stderr.write(
      `agent-checkpoint hook: could not remove telemetry sidecar: ${error.message}\n`,
    );
  }
  if (appendError !== null) {
    throw appendError;
  }
  return null;
}

export async function handleHookInput(input) {
  switch (input?.hook_event_name) {
    case "SessionStart":
      return await handleSessionStart(input);
    case "SubagentStart":
      return await handleSubagentStart(input);
    case "PreToolUse":
      return handleCheckpointPreToolUse(input);
    case "SessionEnd":
      return await handleSessionEnd(input);
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
