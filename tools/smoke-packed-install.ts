#!/usr/bin/env bun

import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const ROOT = path.resolve(import.meta.dir, "..");

type CommandResult = {
  stdout: string;
  stderr: string;
};

function getPipe(stream: Bun.Subprocess["stdout"] | Bun.Subprocess["stderr"], label: string) {
  if (stream instanceof ReadableStream) {
    return stream;
  }
  throw new Error(`${label} was not piped`);
}

async function run(command: string[], cwd = ROOT): Promise<CommandResult> {
  const proc = Bun.spawn(command, {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
    env: process.env,
  });

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(getPipe(proc.stdout, "stdout")).text(),
    new Response(getPipe(proc.stderr, "stderr")).text(),
    proc.exited,
  ]);

  if (exitCode !== 0) {
    const rendered = [stdout.trim(), stderr.trim()].filter(Boolean).join("\n");
    throw new Error(
      [`command failed (${exitCode}): ${command.join(" ")}`, rendered].filter(Boolean).join("\n"),
    );
  }

  return { stdout, stderr };
}

async function main(): Promise<void> {
  const packDir = await mkdtemp(path.join(os.tmpdir(), "execmap-pack-"));
  const installDir = await mkdtemp(path.join(os.tmpdir(), "execmap-install-"));

  try {
    const packed = await run(["bun", "pm", "pack", "--quiet", "--destination", packDir]);
    const tarballPath = packed.stdout.trim();
    if (!tarballPath.endsWith(".tgz")) {
      throw new Error(`unexpected tarball path: ${tarballPath}`);
    }

    await writeFile(
      path.join(installDir, "package.json"),
      JSON.stringify({ name: "execmap-smoke", private: true }, null, 2),
      "utf8",
    );

    await run(["bun", "add", tarballPath], installDir);
    await run(["./node_modules/.bin/execmap", "init", "Smoke Plan"], installDir);
    await run(["./node_modules/.bin/execmap", "check", "plans/smoke-plan"], installDir);
    await run(["./node_modules/.bin/execmap", "next", "plans/smoke-plan"], installDir);
  } finally {
    await Promise.all([
      rm(packDir, { recursive: true, force: true }),
      rm(installDir, { recursive: true, force: true }),
    ]);
  }
}

await main();
