#!/usr/bin/env node
import readline from "node:readline";

import * as checkpointCore from "./checkpoint-core.mjs";
import { createMcpRuntime } from "./checkpoint-mcp-runtime.mjs";

const runtime = createMcpRuntime({ checkpointCore });
const input = readline.createInterface({ input: process.stdin, terminal: false });

let queue = Promise.resolve();

input.on("line", (line) => {
  queue = queue.then(async () => {
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

    const response = await runtime.handleMessage(message);
    if (response !== null && response !== undefined) {
      process.stdout.write(`${JSON.stringify(response)}\n`);
    }
  }).catch((error) => {
    process.stderr.write(`agent-checkpoint MCP error: ${error.message}\n`);
  });
});

input.on("close", () => {
  queue.catch((error) => {
    process.stderr.write(`agent-checkpoint MCP shutdown error: ${error.message}\n`);
    process.exitCode = 1;
  });
});
