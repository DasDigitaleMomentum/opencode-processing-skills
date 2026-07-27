#!/usr/bin/env node
import readline from "node:readline";

import * as checkpointCore from "./checkpoint-core.mjs";
import { createMcpRuntime } from "./checkpoint-mcp-runtime.mjs";

const runtime = createMcpRuntime({ checkpointCore });

const rl = readline.createInterface({ input: process.stdin, terminal: false });

// Serialize message handling and defer exit until pending work settles:
// tool calls perform real filesystem I/O (macrotasks), and stdin can close
// before their promises resolve. A naive rl "close" -> process.exit would
// drop in-flight responses and checkpoint appends.
let queue = Promise.resolve();

rl.on("line", (line) => {
  queue = queue.then(() => {
    if (line.trim().length === 0) return;
    let message;
    try {
      message = JSON.parse(line);
    } catch (error) {
      const response = {
        jsonrpc: "2.0",
        id: null,
        error: { code: -32700, message: `parse error: ${error.message}` },
      };
      process.stdout.write(`${JSON.stringify(response)}\n`);
      return;
    }
    return runtime
      .handleMessage(message)
      .then((response) => {
        if (response !== null && response !== undefined) {
          process.stdout.write(`${JSON.stringify(response)}\n`);
        }
      })
      .catch((error) => {
        process.stderr.write(`agent-checkpoint MCP error: ${error.message}\n`);
      });
  });
});

rl.on("close", () => {
  queue.then(() => {
    process.exit(0);
  });
});
