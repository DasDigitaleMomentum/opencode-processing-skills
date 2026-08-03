import { stat } from "node:fs/promises";
import path from "node:path";

const CHECKPOINT_TOOL_NAME = "checkpoint";
const CHECKPOINT_PATH_TOOL_NAME = "checkpoint_path";
const DEFAULT_PROTOCOL_VERSION = "2024-11-05";
const DESKTOP_TELEMETRY = Object.freeze({
  contextUsed: null,
  usedKTokens: null,
  remainingKTokens: null,
});
const INITIALIZATION_INSTRUCTIONS =
  "Create one unique session ID per Claude Desktop conversation and reuse it for every checkpoint in that conversation. Always provide an existing absolute workspace path; ask the user to select the absolute workspace when it is unknown.";

function nonEmptyString(value, label) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${label} must be a non-empty string`);
  }
  return value;
}

function validateArguments(args, allowed) {
  if (args === null || typeof args !== "object" || Array.isArray(args)) {
    throw new TypeError("tool arguments must be an object");
  }
  for (const key of Object.keys(args)) {
    if (!allowed.has(key)) {
      throw new TypeError(`unknown tool argument: ${key}`);
    }
  }
}

async function validateWorkspaceRoot(value) {
  const workspaceRoot = nonEmptyString(value, "workspace_root");
  if (!path.isAbsolute(workspaceRoot)) {
    throw new TypeError("workspace_root must be an absolute path");
  }
  const workspaceStat = await stat(workspaceRoot);
  if (!workspaceStat.isDirectory()) {
    throw new TypeError("workspace_root must be an existing directory");
  }
  return workspaceRoot;
}

function checkpointToolSchema() {
  return {
    name: CHECKPOINT_TOOL_NAME,
    description:
      "Append a Claude Desktop progress checkpoint to an explicitly selected absolute workspace using the conversation's stable session ID.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        workspace_root: {
          type: "string",
          description: "Existing absolute workspace directory selected for this conversation.",
        },
        session_id: {
          type: "string",
          description: "Unique stable ID created once and reused for this Desktop conversation.",
        },
        done: { type: "string" },
        next: { type: "string" },
        step_failed: { type: "boolean", default: false },
        close_session: { type: "boolean", default: false },
      },
      required: ["workspace_root", "session_id", "done", "next"],
    },
  };
}

function checkpointPathToolSchema() {
  return {
    name: CHECKPOINT_PATH_TOOL_NAME,
    description:
      "Return the workspace-relative encoded checkpoint path for a Desktop conversation without writing.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        workspace_root: {
          type: "string",
          description: "Existing absolute workspace directory selected for this conversation.",
        },
        session_id: {
          type: "string",
          description: "Unique stable ID reused for this Desktop conversation.",
        },
      },
      required: ["workspace_root", "session_id"],
    },
  };
}

function toolTextResult(text, { isError = false, structuredContent } = {}) {
  return {
    content: [{ type: "text", text }],
    ...(structuredContent === undefined ? {} : { structuredContent }),
    ...(isError ? { isError: true } : {}),
  };
}

function jsonRpcError(id, code, message) {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message } };
}

function jsonRpcResult(id, result) {
  return { jsonrpc: "2.0", id, result };
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
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
    return tools.map((tool) => ({
      ...tool,
      inputSchema: {
        ...tool.inputSchema,
        properties: { ...tool.inputSchema.properties },
        required: [...tool.inputSchema.required],
      },
    }));
  }

  async function callCheckpoint(args) {
    validateArguments(
      args,
      new Set([
        "workspace_root",
        "session_id",
        "done",
        "next",
        "step_failed",
        "close_session",
      ]),
    );
    const workspaceRoot = await validateWorkspaceRoot(args.workspace_root);
    const sessionId = nonEmptyString(args.session_id, "session_id");
    const done = nonEmptyString(args.done, "done");
    const next = nonEmptyString(args.next, "next");
    if (args.step_failed !== undefined && typeof args.step_failed !== "boolean") {
      throw new TypeError("step_failed must be a boolean");
    }
    if (args.close_session !== undefined && typeof args.close_session !== "boolean") {
      throw new TypeError("close_session must be a boolean");
    }

    const checkpoint = await checkpointCore.checkpoint({
      workspaceRoot,
      sessionId,
      done,
      next,
      stepFailed: args.step_failed ?? false,
      closeSession: args.close_session ?? false,
      contextUsed: DESKTOP_TELEMETRY.contextUsed,
      agent: null,
      sessionTitle: null,
      usedKTokens: DESKTOP_TELEMETRY.usedKTokens,
      remainingKTokens: DESKTOP_TELEMETRY.remainingKTokens,
    });
    const relativePath = checkpointCore.checkpointPath(sessionId);
    return toolTextResult(
      `Checkpoint saved.\nSession: ${sessionId}\nPath: ${relativePath}\nInput usage: unknown`,
      {
        structuredContent: {
          session_id: sessionId,
          path: relativePath,
          checkpoint,
        },
      },
    );
  }

  async function callCheckpointPath(args) {
    validateArguments(args, new Set(["workspace_root", "session_id"]));
    await validateWorkspaceRoot(args.workspace_root);
    const sessionId = nonEmptyString(args.session_id, "session_id");
    const relativePath = checkpointCore.checkpointPath(sessionId);
    return toolTextResult(relativePath, {
      structuredContent: { session_id: sessionId, path: relativePath },
    });
  }

  async function callTool(name, args) {
    if (name === CHECKPOINT_TOOL_NAME) return callCheckpoint(args);
    if (name === CHECKPOINT_PATH_TOOL_NAME) return callCheckpointPath(args);
    return toolTextResult(`unknown tool: ${String(name)}`, { isError: true });
  }

  async function handleMessage(message) {
    if (message === null || typeof message !== "object" || Array.isArray(message)) {
      return jsonRpcError(null, -32600, "invalid request: expected a JSON-RPC object");
    }
    const { id, method, params } = message;
    const notification = id === undefined || id === null;

    switch (method) {
      case "initialize":
        if (notification) return null;
        return jsonRpcResult(id, {
          protocolVersion:
            typeof params?.protocolVersion === "string" && params.protocolVersion.length > 0
              ? params.protocolVersion
              : DEFAULT_PROTOCOL_VERSION,
          capabilities: { tools: {} },
          serverInfo: { name: serverName, version: serverVersion },
          instructions: INITIALIZATION_INSTRUCTIONS,
        });
      case "notifications/initialized":
      case "initialized":
        return null;
      case "ping":
        return notification ? null : jsonRpcResult(id, {});
      case "tools/list":
        return notification ? null : jsonRpcResult(id, { tools: await listTools() });
      case "tools/call":
        if (notification) return null;
        try {
          return jsonRpcResult(id, await callTool(params?.name, params?.arguments ?? {}));
        } catch (error) {
          return jsonRpcResult(
            id,
            toolTextResult(`checkpoint tool failed: ${errorMessage(error)}`, { isError: true }),
          );
        }
      default:
        return notification
          ? null
          : jsonRpcError(id, -32601, `method not found: ${String(method)}`);
    }
  }

  return {
    listTools,
    callTool,
    handleMessage,
    serverInfo: { name: serverName, version: serverVersion },
  };
}

export { DESKTOP_TELEMETRY, INITIALIZATION_INSTRUCTIONS };
