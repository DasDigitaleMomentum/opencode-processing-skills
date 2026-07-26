import * as checkpointCore from "../lib/opencode-processing-skills/checkpoint-core.mjs"
import {
  createOpenCodeCheckpointPlugin,
  createOpenCodeContextTelemetry,
  createOpenCodeSessionTitle,
} from "../lib/opencode-processing-skills/checkpoint-runtime.mjs"

function fallbackSchema(definition) {
  const schema = { ...definition }
  Object.defineProperties(schema, {
    optional: {
      value() {
        return this
      },
    },
    default: {
      value(defaultValue) {
        Object.defineProperty(this, "default", {
          value: defaultValue,
          enumerable: true,
        })
        return this
      },
      configurable: true,
    },
  })
  return schema
}

function fallbackTool(definition) {
  return definition
}

fallbackTool.schema = {
  string: () => fallbackSchema({ type: "string" }),
  boolean: () => fallbackSchema({ type: "boolean" }),
}

async function resolveToolHelper() {
  try {
    const plugin = await import("@opencode-ai/plugin")
    if (typeof plugin.tool === "function" && plugin.tool.schema !== undefined) {
      return plugin.tool
    }
  } catch (error) {
    if (error?.code !== "ERR_MODULE_NOT_FOUND" && !String(error).includes("Cannot find package")) {
      throw error
    }
  }
  return fallbackTool
}

export const CheckpointPlugin = async (pluginContext) => {
  const tool = await resolveToolHelper()
  const plugin = createOpenCodeCheckpointPlugin({
    tool,
    checkpointCore,
    getContextTelemetry: createOpenCodeContextTelemetry(pluginContext?.client),
    getSessionTitle: createOpenCodeSessionTitle(pluginContext?.client),
  })
  return plugin(pluginContext)
}
