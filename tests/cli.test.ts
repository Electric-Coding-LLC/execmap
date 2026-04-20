import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, test } from "bun:test";

const ROOT = path.resolve(import.meta.dir, "..");
const TEMP_DIRS: string[] = [];

async function runCli(args: string[], cwd = ROOT) {
  return Bun.spawn(["bun", "run", path.join(ROOT, "src/cli.ts"), ...args], {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  });
}

function assertPipe(
  stream: Bun.Subprocess["stdout"] | Bun.Subprocess["stderr"],
  label: string,
): ReadableStream<Uint8Array> {
  if (!(stream instanceof ReadableStream)) {
    throw new Error(`${label} was not piped`);
  }
  return stream;
}

async function collectOutput(proc: Bun.Subprocess) {
  const [stdout, stderr] = await Promise.all([
    new Response(assertPipe(proc.stdout, "stdout")).text(),
    new Response(assertPipe(proc.stderr, "stderr")).text(),
    proc.exited,
  ]);
  return { stdout, stderr, exitCode: await proc.exited };
}

afterEach(async () => {
  await Promise.all(
    TEMP_DIRS.splice(0).map(async (dir) => {
      await Bun.$`rm -rf ${dir}`.quiet();
    }),
  );
});

describe("execmap cli", () => {
  test("init creates initiative scaffold", async () => {
    const tmp = await mkdtemp(path.join(os.tmpdir(), "execmap-"));
    TEMP_DIRS.push(tmp);

    const proc = await runCli(["init", "Alpha Launch"], tmp);
    const result = await collectOutput(proc);

    expect(result.exitCode).toBe(0);
    expect(await Bun.file(path.join(tmp, "PLAN.md")).exists()).toBe(true);
    expect(await Bun.file(path.join(tmp, "plans/alpha-launch/EXECMAP.md")).exists()).toBe(true);
    expect(await Bun.file(path.join(tmp, "plans/alpha-launch/01-define-scope.md")).exists()).toBe(true);
    expect(await Bun.file(path.join(tmp, "PLAN.md")).text()).toContain("[Alpha Launch](./plans/alpha-launch/EXECMAP.md)");
    expect(result.stdout.trim()).toBe("plans/alpha-launch/EXECMAP.md");
  });

  test("init preserves dotted release names for initiative folders", async () => {
    const tmp = await mkdtemp(path.join(os.tmpdir(), "execmap-"));
    TEMP_DIRS.push(tmp);

    const proc = await runCli(["init", "v0.4"], tmp);
    const result = await collectOutput(proc);

    expect(result.exitCode).toBe(0);
    expect(await Bun.file(path.join(tmp, "plans/v0.4/EXECMAP.md")).exists()).toBe(true);
    expect(await Bun.file(path.join(tmp, "PLAN.md")).text()).toContain("[v0.4](./plans/v0.4/EXECMAP.md)");
    expect(result.stdout.trim()).toBe("plans/v0.4/EXECMAP.md");
  });

  test("next resolves active plan from repo root", async () => {
    const tmp = await mkdtemp(path.join(os.tmpdir(), "execmap-"));
    TEMP_DIRS.push(tmp);

    const initProc = await runCli(["init", "Alpha Launch"], tmp);
    const initResult = await collectOutput(initProc);
    expect(initResult.exitCode).toBe(0);

    const proc = await runCli(["next"], tmp);
    const result = await collectOutput(proc);

    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toContain("Define scope -> ");
    expect(result.stdout.trim()).toEndWith("/plans/alpha-launch/01-define-scope.md");
  });

  test("done resolves active plan from repo root", async () => {
    const tmp = await mkdtemp(path.join(os.tmpdir(), "execmap-"));
    TEMP_DIRS.push(tmp);

    const initProc = await runCli(["init", "Alpha Launch"], tmp);
    const initResult = await collectOutput(initProc);
    expect(initResult.exitCode).toBe(0);

    const proc = await runCli(["done"], tmp);
    const result = await collectOutput(proc);

    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe("Done: Define scope");
    expect(await Bun.file(path.join(tmp, "plans/alpha-launch/EXECMAP.md")).text()).toContain(
      "- [x] [Define scope](./01-define-scope.md)",
    );
  });

  test("done advances next", async () => {
    const tmp = await mkdtemp(path.join(os.tmpdir(), "execmap-"));
    TEMP_DIRS.push(tmp);

    const initProc = await runCli(["init", "Alpha Launch"], tmp);
    const initResult = await collectOutput(initProc);
    expect(initResult.exitCode).toBe(0);

    const doneProc = await runCli(["done"], tmp);
    const doneResult = await collectOutput(doneProc);
    expect(doneResult.exitCode).toBe(0);

    const nextProc = await runCli(["next"], tmp);
    const nextResult = await collectOutput(nextProc);
    expect(nextResult.exitCode).toBe(0);
    expect(nextResult.stdout.trim()).toContain("Define key contracts or boundaries -> ");
    expect(nextResult.stdout.trim()).toEndWith(
      "/plans/alpha-launch/02-define-key-contracts-or-boundaries.md",
    );
  });

  test("check resolves active plan from repo root", async () => {
    const tmp = await mkdtemp(path.join(os.tmpdir(), "execmap-"));
    TEMP_DIRS.push(tmp);

    const initProc = await runCli(["init", "Alpha Launch"], tmp);
    const initResult = await collectOutput(initProc);
    expect(initResult.exitCode).toBe(0);

    const proc = await runCli(["check"], tmp);
    const result = await collectOutput(proc);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("OK: plans/alpha-launch/EXECMAP.md");
  });

  test("next reports completion for finished example", async () => {
    const proc = await runCli(["next", "examples/portable-package-release"]);
    const result = await collectOutput(proc);

    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe("All steps are complete.");
  });

  test("done fails when all steps are complete", async () => {
    const proc = await runCli(["done", "examples/portable-package-release"]);
    const result = await collectOutput(proc);

    expect(result.exitCode).toBe(1);
    expect(result.stderr.trim()).toBe(
      `error: ${path.join(ROOT, "examples/portable-package-release/EXECMAP.md")}: no open steps remain`,
    );
  });

  test("check accepts example", async () => {
    const proc = await runCli(["check", "examples/portable-package-release"]);
    const result = await collectOutput(proc);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("OK:");
  });

  test("check fails for missing step doc", async () => {
    const tmp = await mkdtemp(path.join(os.tmpdir(), "execmap-"));
    TEMP_DIRS.push(tmp);

    const planDir = path.join(tmp, "plans", "broken");
    await mkdir(planDir, { recursive: true });
    await writeFile(
      path.join(planDir, "EXECMAP.md"),
      [
        "# Execution Map",
        "",
        "## Goal",
        "",
        "Test",
        "",
        "## Guardrails",
        "",
        "- Stay small.",
        "",
        "## Execution Map",
        "",
        "- [ ] [Missing doc](./01-missing-doc.md)",
        "",
        "## Done When",
        "",
        "- Works.",
        "",
      ].join("\n"),
      "utf8",
    );

    const proc = await runCli(["check", planDir], tmp);
    const result = await collectOutput(proc);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("linked step doc does not exist");
  });
});
