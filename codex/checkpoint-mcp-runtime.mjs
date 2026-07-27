const CODEX_TELEMETRY = Object.freeze({
  contextUsed: null,
  remainingKTokens: null,
  source: "unavailable",
});

const CHECKPOINT_TOOL_NAME = "checkpoint";
const CHECKPOINT_PATH_TOOL_NAME = "checkpoint_path";
const DEFAULT_PROTOCOL_VERSION = "2024-11-05";

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function checkpointToolSchema() {
  return {
    name: CHECKPOINT_TOOL_NAME,
    description:
      "Append a progress checkpoint. Use exactly three words for done and next, reuse the previous next verbatim as the following done, and set step_failed when announcing a correction step.",
    inputSchema: {
      type: "object",
      properties: {
        done: { type: "string" },
        next: { type: "string" },
        step_failed: { type: "boolean", default: false },
        _workspace_root: {
          type: "string",
          description: "hook injected; callers omit",
        },
        _checkpoint_session_id: {
          type: "string",
          description: "hook injected; callers omit",
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
      "Return the workspace-relative checkpoint JSONL path for a Codex session ID.",
    inputSchema: {
      type: "object",
      properties: {
        session_id: { type: "string" },
      },
      required: ["session_id"],
    },
  };
}

function formatCheckpointResult({ contextUsed, remainingKTokens }) {
  const context = contextUsed === null ? "unknown" : `~${Math.round(contextUsed * 100)}%`;
  const remaining = remainingKTokens === null ? "unknown" : `~${remainingKTokens}k`;
  return `Checkpoint saved.\nContext (harness telemetry): ${context}\nRemaining K-tokens (context-window headroom): ${remaining}`;
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

export function createMcpRuntime({
  checkpointCore,
  serverName = "agent-checkpoint",
  serverVersion = "1.0.0",
  telemetry = CODEX_TELEMETRY,
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
    const workspaceRoot = nonEmptyString(args._workspace_root);
    const sessionId = nonEmptyString(args._checkpoint_session_id);
    if (workspaceRoot === null || sessionId === null) {
      return toolTextResult(
        "checkpoint requires hook-injected _workspace_root and _checkpoint_session_id; run inside a Codex session with the agent-checkpoint profile hooks enabled.",
        { isError: true },
      );
    }
    if (typeof args.done !== "string" || typeof args.next !== "string") {
      return toolTextResult("checkpoint requires string arguments done and next.", {
        isError: true,
      });
    }
    const feedback = await checkpointCore.checkpoint({
      workspaceRoot,
      sessionId,
      done: args.done,
      next: args.next,
      stepFailed: args.step_failed === true,
      contextUsed: telemetry.contextUsed,
      agent: null,
      sessionTitle: null,
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
    serverInfo: { name: serverName, version: serverVersion },
    telemetry,
  };
}

export { CODEX_TELEMETRY, formatCheckpointResult };
