// Claude Code MCP runtime for the agent-checkpoint plugin.
//
// Exposes exactly two tools (checkpoint, checkpoint_path) backed by the
// installed shared checkpoint-core. Session identity is hook-injected (MCP
// carries none); the workspace root comes from the CLAUDE_PROJECT_DIR
// environment variable, never from caller input. Telemetry is read from the
// atomic statusline sidecar; missing/null/mismatched data degrades to
// explicit unknowns. Internal IDs, sidecar fields, and used/remaining tokens are
// never persisted to the raw JSONL log. Pinned to claude 2.1.170.

import { realpathSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

const CHECKPOINT_TOOL_NAME = "checkpoint";
const CHECKPOINT_PATH_TOOL_NAME = "checkpoint_path";
const DEFAULT_PROTOCOL_VERSION = "2024-11-05";

const UNKNOWN_TELEMETRY = Object.freeze({
  contextUsed: null,
  usedKTokens: null,
  remainingKTokens: null,
  sessionTitle: null,
});

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

// Mirror of checkpoint-core encodeSessionId (encodeURIComponent) so the
// sidecar file name matches the statusline wrapper without importing it.
function encodeSessionId(sessionId) {
  return encodeURIComponent(sessionId);
}

function canonicalPath(value) {
  try {
    return realpathSync(value);
  } catch {
    return path.resolve(value);
  }
}

function checkpointToolSchema() {
  return {
    name: CHECKPOINT_TOOL_NAME,
    description:
      "Append a progress checkpoint. Use exactly three words for done and next, reuse the previous next verbatim as the following done, set step_failed for correction, and set close_session only on a subagent's final checkpoint or intentional whole-session end.",
    inputSchema: {
      type: "object",
      properties: {
        done: { type: "string" },
        next: { type: "string" },
        step_failed: { type: "boolean", default: false },
        close_session: { type: "boolean", default: false },
        _checkpoint_session_id: {
          type: "string",
          description: "hook injected; callers omit",
        },
        _telemetry_session_id: {
          type: "string",
          description: "hook injected; callers omit",
        },
        _agent_type: {
          type: "string",
          description: "hook injected on subagent calls; callers omit",
        },
      },
      required: ["done", "next"],
    },
  };
}

function checkpointPathToolSchema() {
  return {
    name: CHECKPOINT_PATH_TOOL_NAME,
    description:
      "Return the workspace-relative checkpoint JSONL path for a Claude Code session ID.",
    inputSchema: {
      type: "object",
      properties: {
        session_id: { type: "string" },
      },
      required: ["session_id"],
    },
  };
}

function formatCheckpointResult({ contextUsed, usedKTokens, remainingKTokens }) {
  const context = contextUsed === null ? "unknown" : `~${Math.round(contextUsed * 100)}%`;
  const used = usedKTokens === null ? "unknown" : `~${usedKTokens}k`;
  const remaining = remainingKTokens === null ? "unknown" : `~${remainingKTokens}k`;
  return `Checkpoint saved.\nContext (latest-response harness telemetry): ${context}\nUsed K-tokens (latest-response input-only harness telemetry): ${used}\nRemaining K-tokens (context-window headroom from latest-response input-only telemetry): ${remaining}`;
}

function toolTextResult(text, { isError = false } = {}) {
  return {
    content: [{ type: "text", text }],
    ...(isError ? { isError: true } : {}),
  };
}

function jsonRpcError(id, code, message) {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message } };
}

function jsonRpcResult(id, result) {
  return { jsonrpc: "2.0", id, result };
}

// Reads the latest statusline snapshot for the given native session ID.
// Returns { contextUsed, usedKTokens, remainingKTokens, sessionTitle }; every field is
// null when the snapshot is absent, unreadable, invalid, or belongs to a
// different session or project. context_used maps used_percentage/100;
// used K-tokens map total_input_tokens/1000; remaining K-tokens approximate max(0, context_window_size -
// total_input_tokens)/1000 (latest-response, input-only semantics).
async function readTelemetry(workspaceRoot, telemetrySessionId) {
  const root = nonEmptyString(workspaceRoot);
  const sessionId = nonEmptyString(telemetrySessionId);
  if (root === null || sessionId === null) {
    return { ...UNKNOWN_TELEMETRY };
  }
  let snapshot;
  try {
    const sidecarPath = path.join(
      root,
      ".agent-checkpoints",
      ".runtime",
      "claude",
      `${encodeSessionId(sessionId)}.json`,
    );
    snapshot = JSON.parse(await readFile(sidecarPath, "utf8"));
  } catch {
    return { ...UNKNOWN_TELEMETRY };
  }
  if (
    snapshot === null ||
    typeof snapshot !== "object" ||
    Array.isArray(snapshot) ||
    snapshot.session_id !== sessionId ||
    nonEmptyString(snapshot.project_dir) === null ||
    canonicalPath(snapshot.project_dir) !== canonicalPath(root)
  ) {
    return { ...UNKNOWN_TELEMETRY };
  }
  const usedPercentage = snapshot.used_percentage;
  const contextWindowSize = snapshot.context_window_size;
  const totalInputTokens = snapshot.total_input_tokens;
  const validTotalInputTokens =
    typeof totalInputTokens === "number" &&
    Number.isFinite(totalInputTokens) &&
    totalInputTokens >= 0;
  const contextUsed =
    typeof usedPercentage === "number" &&
    Number.isFinite(usedPercentage) &&
    usedPercentage >= 0 &&
    usedPercentage <= 100
      ? usedPercentage / 100
      : null;
  const usedKTokens = validTotalInputTokens ? totalInputTokens / 1000 : null;
  const remainingKTokens =
    typeof contextWindowSize === "number" &&
    Number.isFinite(contextWindowSize) &&
    contextWindowSize > 0 &&
    validTotalInputTokens
      ? Math.round(Math.max(0, contextWindowSize - totalInputTokens) / 1000)
      : null;
  return {
    contextUsed,
    usedKTokens,
    remainingKTokens,
    sessionTitle: nonEmptyString(snapshot.session_name),
  };
}

export function createMcpRuntime({
  checkpointCore,
  serverName = "agent-checkpoint",
  serverVersion = "1.0.0",
} = {}) {
  if (
    checkpointCore === null ||
    typeof checkpointCore !== "object" ||
    typeof checkpointCore.checkpoint !== "function" ||
    typeof checkpointCore.checkpointPath !== "function"
  ) {
    throw new TypeError("checkpointCore must provide checkpoint and checkpointPath");
  }

  const tools = [checkpointToolSchema(), checkpointPathToolSchema()];

  async function listTools() {
    return tools.map((tool) => ({ ...tool, inputSchema: { ...tool.inputSchema } }));
  }

  async function callCheckpoint(args = {}) {
    const sessionId = nonEmptyString(args._checkpoint_session_id);
    const telemetrySessionId = nonEmptyString(args._telemetry_session_id);
    if (sessionId === null || telemetrySessionId === null) {
      return toolTextResult(
        "checkpoint requires hook-injected _checkpoint_session_id and _telemetry_session_id; run inside a Claude Code session with the agent-checkpoint plugin hooks enabled.",
        { isError: true },
      );
    }
    if (typeof args.done !== "string" || typeof args.next !== "string") {
      return toolTextResult("checkpoint requires string arguments done and next.", {
        isError: true,
      });
    }
    if (args.close_session !== undefined && typeof args.close_session !== "boolean") {
      return toolTextResult("checkpoint close_session must be a boolean.", {
        isError: true,
      });
    }
    const workspaceRoot = nonEmptyString(process.env.CLAUDE_PROJECT_DIR);
    if (workspaceRoot === null) {
      return toolTextResult(
        "checkpoint requires the CLAUDE_PROJECT_DIR environment variable; Claude Code sets it for plugin MCP servers.",
        { isError: true },
      );
    }
    const telemetry = await readTelemetry(workspaceRoot, telemetrySessionId);
    const feedback = await checkpointCore.checkpoint({
      workspaceRoot,
      sessionId,
      done: args.done,
      next: args.next,
      stepFailed: args.step_failed === true,
      closeSession: args.close_session,
      contextUsed: telemetry.contextUsed,
      agent: nonEmptyString(args._agent_type),
      sessionTitle: telemetry.sessionTitle,
      usedKTokens: telemetry.usedKTokens,
      remainingKTokens: telemetry.remainingKTokens,
    });
    return toolTextResult(formatCheckpointResult(feedback));
  }

  async function callCheckpointPath(args = {}) {
    const sessionId = nonEmptyString(args.session_id);
    if (sessionId === null) {
      return toolTextResult("checkpoint_path requires a non-empty string session_id.", {
        isError: true,
      });
    }
    return toolTextResult(checkpointCore.checkpointPath(sessionId));
  }

  async function callTool(name, args) {
    if (name === CHECKPOINT_TOOL_NAME) {
      return callCheckpoint(args);
    }
    if (name === CHECKPOINT_PATH_TOOL_NAME) {
      return callCheckpointPath(args);
    }
    return toolTextResult(`unknown tool: ${String(name)}`, { isError: true });
  }

  async function handleMessage(message) {
    if (message === null || typeof message !== "object" || Array.isArray(message)) {
      return jsonRpcError(null, -32600, "invalid request: expected a JSON-RPC object");
    }
    const { id, method, params } = message;
    const isNotification = id === undefined || id === null;

    switch (method) {
      case "initialize": {
        if (isNotification) return null;
        const requested = params?.protocolVersion;
        return jsonRpcResult(id, {
          protocolVersion:
            typeof requested === "string" && requested.length > 0
              ? requested
              : DEFAULT_PROTOCOL_VERSION,
          capabilities: { tools: {} },
          serverInfo: { name: serverName, version: serverVersion },
        });
      }
      case "notifications/initialized":
      case "initialized":
        return null;
      case "ping":
        return isNotification ? null : jsonRpcResult(id, {});
      case "tools/list":
        return isNotification ? null : jsonRpcResult(id, { tools: await listTools() });
      case "tools/call": {
        if (isNotification) return null;
        try {
          const result = await callTool(params?.name, params?.arguments ?? {});
          return jsonRpcResult(id, result);
        } catch (error) {
          return jsonRpcResult(
            id,
            toolTextResult(`checkpoint tool failed: ${error.message}`, { isError: true }),
          );
        }
      }
      default:
        if (isNotification) return null;
        return jsonRpcError(id, -32601, `method not found: ${String(method)}`);
    }
  }

  return {
    listTools,
    callTool,
    handleMessage,
    readTelemetry,
    serverInfo: { name: serverName, version: serverVersion },
  };
}

export { formatCheckpointResult, readTelemetry };
