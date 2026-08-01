function unknownTelemetry() {
  return {
    contextUsed: null,
    remainingKTokens: null,
  };
}

function validTokenCount(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
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

export function createOpenCodeContextTelemetry(client) {
  return async function getOpenCodeContextTelemetry(context) {
    try {
      if (
        client === null ||
        typeof client !== "object" ||
        typeof client.session?.messages !== "function" ||
        typeof client.provider?.list !== "function" ||
        typeof context?.sessionID !== "string" ||
        context.sessionID.length === 0
      ) {
        return unknownTelemetry();
      }

      const query =
        typeof context.directory === "string" && context.directory.length > 0
          ? { directory: context.directory }
          : undefined;
      const [messageResponse, providerResponse] = await Promise.all([
        client.session.messages({ path: { id: context.sessionID }, ...(query ? { query } : {}) }),
        client.provider.list(query ? { query } : undefined),
      ]);
      if (messageResponse?.error || providerResponse?.error) return unknownTelemetry();

      const messages = messageResponse?.data;
      const providers = providerResponse?.data?.all;
      if (!Array.isArray(messages) || !Array.isArray(providers)) return unknownTelemetry();

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

      const tokenCounts = [
        message.tokens?.input,
        message.tokens?.output,
        message.tokens?.reasoning,
        message.tokens?.cache?.read,
        message.tokens?.cache?.write,
      ];
      if (!tokenCounts.every(validTokenCount)) return unknownTelemetry();

      const provider = providers.find((item) => item?.id === message.providerID);
      const limit = provider?.models?.[message.modelID]?.limit?.context;
      const total = tokenCounts.reduce((sum, value) => sum + value, 0);
      if (
        typeof limit !== "number" ||
        !Number.isFinite(limit) ||
        limit <= 0 ||
        !Number.isFinite(total)
      ) {
        return unknownTelemetry();
      }

      return {
        contextUsed: Math.min(Math.max(total / limit, 0), 1),
        remainingKTokens: Math.max(limit - total, 0) / 1000,
      };
    } catch {
      return unknownTelemetry();
    }
  };
}

function formatCheckpointResult({ contextUsed, remainingKTokens }) {
  const context = contextUsed === null ? "unknown" : `~${Math.round(contextUsed * 100)}%`;
  const remaining = remainingKTokens === null ? "unknown" : `~${remainingKTokens}k`;
  return `Checkpoint saved.\nContext (previous completed step, TUI-equivalent): ${context}\nRemaining K-tokens (context-window headroom): ${remaining}`;
}

export function createOpenCodeCheckpointPlugin({
  tool,
  checkpointCore,
  getContextTelemetry = unknownTelemetry,
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
  if (typeof getContextTelemetry !== "function") {
    throw new TypeError("getContextTelemetry must be a function");
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
          workspaceRoot: pluginContext.worktree,
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
              getContextTelemetry(context),
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
              (telemetry.remainingKTokens !== null &&
                (typeof telemetry.remainingKTokens !== "number" ||
                  !Number.isFinite(telemetry.remainingKTokens) ||
                  telemetry.remainingKTokens < 0))
            ) {
              telemetry = unknownTelemetry();
            }
            const feedback = await checkpointCore.checkpoint({
              workspaceRoot: context.worktree ?? pluginContext.worktree,
              sessionId: context.sessionID,
              done: args.done,
              next: args.next,
              stepFailed: args.step_failed ?? false,
              closeSession: args.close_session,
              contextUsed: telemetry.contextUsed,
              agent: nonEmptyString(context.agent),
              sessionTitle,
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
