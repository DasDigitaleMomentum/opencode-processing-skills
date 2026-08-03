const INPUT_LIMIT_TOKENS = 372_000;

function unknownTelemetry() {
  return {
    contextUsed: null,
    usedKTokens: null,
    remainingKTokens: null,
  };
}

function validTokenCount(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function workspaceRoot(context, pluginContext) {
  const usableWorktree = (value) => {
    const candidate = nonEmptyString(value);
    if (candidate === null) return null;
    const resolved = path.resolve(candidate);
    return resolved === path.parse(resolved).root ? null : candidate;
  };
  const root =
    usableWorktree(context?.worktree) ??
    usableWorktree(pluginContext?.worktree) ??
    nonEmptyString(context?.directory) ??
    nonEmptyString(pluginContext?.directory);
  if (root === null) throw new TypeError("OpenCode workspace directory is unavailable");
  return root;
}

export function createOpenCodeSessionTitle(client) {
  return async function getOpenCodeSessionTitle(context) {
    try {
      if (
        client === null ||
        typeof client !== "object" ||
        typeof client.session?.get !== "function" ||
        typeof context?.sessionID !== "string" ||
        context.sessionID.length === 0 ||
        typeof context.directory !== "string" ||
        context.directory.length === 0
      ) {
        return null;
      }

      const response = await client.session.get({
        path: { id: context.sessionID },
        query: { directory: context.directory },
      });
      if (response?.error) return null;
      return nonEmptyString(response?.data?.title);
    } catch {
      return null;
    }
  };
}

export function createOpenCodeInputTelemetry(client) {
  return async function getOpenCodeInputTelemetry(context) {
    try {
      if (
        client === null ||
        typeof client !== "object" ||
        typeof client.session?.messages !== "function" ||
        typeof context?.sessionID !== "string" ||
        context.sessionID.length === 0
      ) {
        return unknownTelemetry();
      }

      const query =
        typeof context.directory === "string" && context.directory.length > 0
          ? { directory: context.directory }
          : undefined;
      const messageResult = await client.session.messages({
        path: { id: context.sessionID },
        ...(query ? { query } : {}),
      });
      if (messageResult?.error) return unknownTelemetry();

      const messages = messageResult?.data;
      if (!Array.isArray(messages)) return unknownTelemetry();

      let message;
      for (let index = messages.length - 1; index >= 0; index -= 1) {
        const candidate = messages[index]?.info;
        if (
          candidate?.role === "assistant" &&
          validTokenCount(candidate.tokens?.output) &&
          candidate.tokens.output > 0
        ) {
          message = candidate;
          break;
        }
      }
      if (!message) return unknownTelemetry();

      const inputTokens = message.tokens?.input;
      if (!validTokenCount(inputTokens)) return unknownTelemetry();

      return {
        contextUsed: Math.min(inputTokens / INPUT_LIMIT_TOKENS, 1),
        usedKTokens: inputTokens / 1000,
        remainingKTokens: Math.max(INPUT_LIMIT_TOKENS - inputTokens, 0) / 1000,
      };
    } catch {
      return unknownTelemetry();
    }
  };
}

function formatCheckpointResult({ contextUsed, usedKTokens, remainingKTokens }) {
  const input = contextUsed === null ? "unknown" : `~${Math.round(contextUsed * 100)}%`;
  const used = usedKTokens === null ? "unknown" : `~${usedKTokens}k`;
  const remaining = remainingKTokens === null ? "unknown" : `~${remainingKTokens}k`;
  return `Checkpoint saved.\nInput usage (previous completed step, 372k limit): ${input}\nInput K-tokens (previous completed step): ${used}\nRemaining input K-tokens (to 372k limit): ${remaining}`;
}

export function createOpenCodeCheckpointPlugin({
  tool,
  checkpointCore,
  getInputTelemetry = unknownTelemetry,
  getSessionTitle = async () => null,
}) {
  if (typeof tool !== "function" || tool.schema === undefined) {
    throw new TypeError("tool must be the OpenCode tool helper");
  }
  if (
    checkpointCore === null ||
    typeof checkpointCore !== "object" ||
    typeof checkpointCore.checkpoint !== "function" ||
    typeof checkpointCore.checkpointPath !== "function" ||
    typeof checkpointCore.appendSessionStatus !== "function"
  ) {
    throw new TypeError(
      "checkpointCore must provide checkpoint, checkpointPath, and appendSessionStatus",
    );
  }
  if (typeof getInputTelemetry !== "function") {
    throw new TypeError("getInputTelemetry must be a function");
  }
  if (typeof getSessionTitle !== "function") {
    throw new TypeError("getSessionTitle must be a function");
  }

  return async function OpenCodeCheckpointPlugin(pluginContext = {}) {
    return {
      async event({ event } = {}) {
        if (event?.type !== "session.created") return;
        const sessionId = nonEmptyString(event?.properties?.info?.id);
        if (sessionId === null) return;
        await checkpointCore.appendSessionStatus({
          workspaceRoot: workspaceRoot(null, pluginContext),
          sessionId,
          status: "open",
        });
      },
      tool: {
        checkpoint: tool({
          description:
            "Append a progress checkpoint. Use exactly three words for done and next, reuse the previous next verbatim as the following done, set step_failed for correction, and set close_session only on a subagent's final checkpoint or intentional whole-session end.",
          args: {
            done: tool.schema.string(),
            next: tool.schema.string(),
            step_failed: tool.schema.boolean().optional().default(false),
            close_session: tool.schema.boolean().optional().default(false),
          },
          async execute(args, context) {
            if (args.close_session !== undefined && typeof args.close_session !== "boolean") {
              throw new TypeError("close_session must be a boolean");
            }
            const [telemetryResult, titleResult] = await Promise.allSettled([
              getInputTelemetry(context),
              getSessionTitle(context),
            ]);
            let telemetry =
              telemetryResult.status === "fulfilled"
                ? telemetryResult.value
                : unknownTelemetry();
            const sessionTitle =
              titleResult.status === "fulfilled" ? nonEmptyString(titleResult.value) : null;
            if (
              telemetry === null ||
              typeof telemetry !== "object" ||
              (telemetry.contextUsed !== null &&
                (typeof telemetry.contextUsed !== "number" ||
                  !Number.isFinite(telemetry.contextUsed) ||
                  telemetry.contextUsed < 0 ||
                  telemetry.contextUsed > 1)) ||
              (telemetry.usedKTokens !== null &&
                (typeof telemetry.usedKTokens !== "number" ||
                  !Number.isFinite(telemetry.usedKTokens) ||
                  telemetry.usedKTokens < 0)) ||
              (telemetry.remainingKTokens !== null &&
                (typeof telemetry.remainingKTokens !== "number" ||
                  !Number.isFinite(telemetry.remainingKTokens) ||
                  telemetry.remainingKTokens < 0))
            ) {
              telemetry = unknownTelemetry();
            }
            const feedback = await checkpointCore.checkpoint({
              workspaceRoot: workspaceRoot(context, pluginContext),
              sessionId: context.sessionID,
              done: args.done,
              next: args.next,
              stepFailed: args.step_failed ?? false,
              closeSession: args.close_session,
              contextUsed: telemetry.contextUsed,
              agent: nonEmptyString(context.agent),
              sessionTitle,
              usedKTokens: telemetry.usedKTokens,
              remainingKTokens: telemetry.remainingKTokens,
            });
            return formatCheckpointResult(feedback);
          },
        }),
        checkpoint_path: tool({
          description:
            "Return the workspace-relative checkpoint JSONL path for an OpenCode session ID.",
          args: {
            session_id: tool.schema.string(),
          },
          async execute(args) {
            return checkpointCore.checkpointPath(args.session_id);
          },
        }),
      },
    };
  };
}
import path from "node:path";
