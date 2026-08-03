#!/usr/bin/env node
import { chmod, lstat, readFile, rename, rm, writeFile } from "node:fs/promises";
import { realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SERVER_KEY = "agent-checkpoint";

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validateDesired(desired) {
  if (
    !isObject(desired) ||
    Object.keys(desired).sort().join("\0") !== "args\0command" ||
    typeof desired.command !== "string" ||
    !path.isAbsolute(desired.command) ||
    !Array.isArray(desired.args) ||
    desired.args.length !== 1 ||
    typeof desired.args[0] !== "string" ||
    !path.isAbsolute(desired.args[0])
  ) {
    throw new TypeError("desired registration must contain absolute command and server paths");
  }
}

function registrationsEqual(current, desired) {
  return (
    isObject(current) &&
    Object.keys(current).sort().join("\0") === "args\0command" &&
    current.command === desired.command &&
    Array.isArray(current.args) &&
    current.args.length === 1 &&
    current.args[0] === desired.args[0]
  );
}

export function planDesktopConfig(current, desired) {
  validateDesired(desired);
  const source = current === undefined ? {} : current;
  if (!isObject(source)) {
    throw new TypeError("Claude Desktop config root must be an object");
  }
  if (Object.hasOwn(source, "mcpServers") && !isObject(source.mcpServers)) {
    throw new TypeError("Claude Desktop config mcpServers must be an object");
  }

  const mcpServers = source.mcpServers ?? {};
  if (Object.hasOwn(mcpServers, SERVER_KEY)) {
    if (!registrationsEqual(mcpServers[SERVER_KEY], desired)) {
      throw new Error(
        "conflicting mcpServers.agent-checkpoint registration requires manual resolution",
      );
    }
    return { status: "unchanged", config: source };
  }

  return {
    status: "changed",
    config: {
      ...source,
      mcpServers: {
        ...mcpServers,
        [SERVER_KEY]: {
          command: desired.command,
          args: [...desired.args],
        },
      },
    },
  };
}

async function loadConfig(configPath) {
  let metadata;
  try {
    metadata = await lstat(configPath);
  } catch (error) {
    if (error?.code === "ENOENT") return { current: undefined, metadata: null };
    throw error;
  }
  if (metadata.isSymbolicLink()) {
    throw new Error(`refusing symlinked Claude Desktop config: ${configPath}`);
  }
  const bytes = await readFile(configPath, "utf8");
  let current;
  try {
    current = JSON.parse(bytes);
  } catch (error) {
    throw new Error(`malformed Claude Desktop config JSON: ${error.message}`);
  }
  return { current, metadata };
}

async function writeAtomically(configPath, config, desired, existingMetadata) {
  const directory = path.dirname(configPath);
  const basename = path.basename(configPath);
  const temporaryPath = path.join(
    directory,
    `.${basename}.agent-checkpoint.tmp-${process.pid}-${Date.now()}`,
  );
  let cleanupPath = null;
  try {
    const bytes = `${JSON.stringify(config, null, 2)}\n`;
    await writeFile(temporaryPath, bytes, { flag: "wx", mode: 0o600 });
    cleanupPath = temporaryPath;
    if (existingMetadata !== null) {
      await chmod(temporaryPath, existingMetadata.mode & 0o777);
    }
    const staged = JSON.parse(await readFile(temporaryPath, "utf8"));
    if (planDesktopConfig(staged, desired).status !== "unchanged") {
      throw new Error("staged Claude Desktop config failed registration validation");
    }
    await rename(temporaryPath, configPath);
    cleanupPath = null;
  } finally {
    if (cleanupPath !== null) {
      await rm(cleanupPath, { force: true });
    }
  }
}

async function main(argv) {
  if (argv.length !== 4 || !["--check", "--write"].includes(argv[0])) {
    throw new Error(
      "usage: configure-desktop.mjs --check|--write <config-path> <node-bin> <server-path>",
    );
  }
  const [mode, configPath, nodeBin, serverPath] = argv;
  if (!path.isAbsolute(configPath)) {
    throw new Error("config-path must be absolute");
  }
  const desired = { command: nodeBin, args: [serverPath] };
  const { current, metadata } = await loadConfig(configPath);
  const planned = planDesktopConfig(current, desired);

  if (mode === "--write" && planned.status === "changed") {
    await writeAtomically(configPath, planned.config, desired, metadata);
  }
  process.stdout.write(`${planned.status}\n`);
}

let isMain = false;
if (process.argv[1] !== undefined) {
  try {
    isMain = realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    isMain = false;
  }
}
if (isMain) {
  main(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`configure-desktop: ${error.message}\n`);
    process.exitCode = 1;
  });
}
