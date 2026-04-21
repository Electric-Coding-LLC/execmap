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

function renderPlan(activeLine = "- None", completedLines: string[] = ["- None"]) {
  return [
    "# Plan Index",
    "",
    "This file points to the active initiative map for the repo. Status and",
    "checkbox state live in the linked `EXECMAP.md`, not here.",
    "",
    "## Active Plan",
    "",
    activeLine,
    "",
    "## Completed Plans",
    "",
    ...completedLines,
    "",
  ].join("\n");
}

function renderRoadmap(versions: string[]) {
  return [
    "# Example Roadmap",
    "",
    "## Near-Term Roadmap",
    "",
    ...versions,
    "",
  ].join("\n");
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
    expect(await Bun.file(path.join(tmp, "plans/alpha-launch/01-define-scope.md")).exists()).toBe(false);
    expect(await Bun.file(path.join(tmp, "PLAN.md")).text()).toContain("[Alpha Launch](./plans/alpha-launch/EXECMAP.md)");
    expect(await Bun.file(path.join(tmp, "plans/alpha-launch/EXECMAP.md")).text()).toContain("- [ ] Define scope");
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

  test("init reuses an existing no-active PLAN.md", async () => {
    const tmp = await mkdtemp(path.join(os.tmpdir(), "execmap-"));
    TEMP_DIRS.push(tmp);
    await writeFile(path.join(tmp, "PLAN.md"), renderPlan(), "utf8");

    const proc = await runCli(["init", "Alpha Launch"], tmp);
    const result = await collectOutput(proc);

    expect(result.exitCode).toBe(0);
    expect(await Bun.file(path.join(tmp, "PLAN.md")).text()).toContain("[Alpha Launch](./plans/alpha-launch/EXECMAP.md)");
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
    expect(result.stdout.trim()).toBe("Define scope");
  });

  test("status resolves active plan from repo root", async () => {
    const tmp = await mkdtemp(path.join(os.tmpdir(), "execmap-"));
    TEMP_DIRS.push(tmp);

    const initProc = await runCli(["init", "Alpha Launch"], tmp);
    const initResult = await collectOutput(initProc);
    expect(initResult.exitCode).toBe(0);

    const proc = await runCli(["status"], tmp);
    const result = await collectOutput(proc);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Active Plan: Alpha Launch");
    expect(result.stdout).toContain("Execmap: plans/alpha-launch/EXECMAP.md");
    expect(result.stdout).toContain("Next Step: Define scope");
  });

  test("status reports no active plan clearly from repo root", async () => {
    const tmp = await mkdtemp(path.join(os.tmpdir(), "execmap-"));
    TEMP_DIRS.push(tmp);
    await writeFile(path.join(tmp, "PLAN.md"), renderPlan(), "utf8");

    const proc = await runCli(["status"], tmp);
    const result = await collectOutput(proc);

    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe("Active Plan: None");
  });

  test("roadmap reports the first non-completed version alongside the active plan", async () => {
    const tmp = await mkdtemp(path.join(os.tmpdir(), "execmap-"));
    TEMP_DIRS.push(tmp);
    await mkdir(path.join(tmp, "docs"), { recursive: true });
    await mkdir(path.join(tmp, "plans", "0.6"), { recursive: true });
    await writeFile(
      path.join(tmp, "docs", "roadmap.md"),
      renderRoadmap([
        "### `0.5`: Plan Visibility",
        "Status: completed",
        "Execmap: `plans/0.5/EXECMAP.md`",
        "",
        "Goal: Already completed.",
        "",
        "### `0.6`: Roadmap Integration",
        "Status: active",
        "Execmap: `plans/0.6/EXECMAP.md`",
        "",
        "Goal: Integrate roadmap context",
        "without turning it into execution state.",
      ]),
      "utf8",
    );
    await writeFile(
      path.join(tmp, "PLAN.md"),
      renderPlan("- [0.6](./plans/0.6/EXECMAP.md)", ["- [0.5](./plans/0.5/EXECMAP.md)"]),
      "utf8",
    );
    await writeFile(
      path.join(tmp, "plans", "0.6", "EXECMAP.md"),
      [
        "# Execution Map",
        "",
        "## Goal",
        "",
        "Test roadmap helper.",
        "",
        "## Guardrails",
        "",
        "- Keep it read-only.",
        "",
        "## Execution Map",
        "",
        "- [ ] Add roadmap helper",
        "",
        "## Done When",
        "",
        "- Repo can report roadmap context.",
        "",
      ].join("\n"),
      "utf8",
    );

    const proc = await runCli(["roadmap"], tmp);
    const result = await collectOutput(proc);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Roadmap: docs/roadmap.md");
    expect(result.stdout).toContain("Current Version: 0.6");
    expect(result.stdout).toContain("Version Status: active");
    expect(result.stdout).toContain(
      "Goal: Integrate roadmap context without turning it into execution state.",
    );
    expect(result.stdout).toContain("Execmap: plans/0.6/EXECMAP.md");
    expect(result.stdout).toContain("Active Plan: 0.6");
    expect(result.stdout).toContain("Active Execmap: plans/0.6/EXECMAP.md");
  });

  test("roadmap reports completion when all roadmap versions are completed", async () => {
    const tmp = await mkdtemp(path.join(os.tmpdir(), "execmap-"));
    TEMP_DIRS.push(tmp);
    await mkdir(path.join(tmp, "docs"), { recursive: true });
    await writeFile(
      path.join(tmp, "docs", "roadmap.md"),
      renderRoadmap([
        "### `0.5`: Plan Visibility",
        "Status: completed",
        "Execmap: `plans/0.5/EXECMAP.md`",
        "",
        "Goal: Already completed.",
      ]),
      "utf8",
    );
    await writeFile(path.join(tmp, "PLAN.md"), renderPlan(), "utf8");

    const proc = await runCli(["roadmap"], tmp);
    const result = await collectOutput(proc);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Current Version: None");
    expect(result.stdout).toContain("State: complete");
    expect(result.stdout).toContain("Active Plan: None");
  });

  test("status accepts an explicit execmap target", async () => {
    const tmp = await mkdtemp(path.join(os.tmpdir(), "execmap-"));
    TEMP_DIRS.push(tmp);

    const initProc = await runCli(["init", "Alpha Launch"], tmp);
    const initResult = await collectOutput(initProc);
    expect(initResult.exitCode).toBe(0);

    const proc = await runCli(["status", "plans/alpha-launch"], tmp);
    const result = await collectOutput(proc);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Active Plan: alpha-launch");
    expect(result.stdout).toContain("Execmap: plans/alpha-launch/EXECMAP.md");
    expect(result.stdout).toContain("Next Step: Define scope");
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
      "- [x] Define scope",
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
    expect(nextResult.stdout.trim()).toBe("Define key contracts or boundaries");
  });

  test("check fails on an untouched active scaffold from repo root", async () => {
    const tmp = await mkdtemp(path.join(os.tmpdir(), "execmap-"));
    TEMP_DIRS.push(tmp);

    const initProc = await runCli(["init", "Alpha Launch"], tmp);
    const initResult = await collectOutput(initProc);
    expect(initResult.exitCode).toBe(0);

    const proc = await runCli(["check"], tmp);
    const result = await collectOutput(proc);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("placeholder text was not replaced");
  });

  test("stepdoc creates and links a step doc by index", async () => {
    const tmp = await mkdtemp(path.join(os.tmpdir(), "execmap-"));
    TEMP_DIRS.push(tmp);

    const initProc = await runCli(["init", "Alpha Launch"], tmp);
    const initResult = await collectOutput(initProc);
    expect(initResult.exitCode).toBe(0);

    const proc = await runCli(["stepdoc", "plans/alpha-launch", "2"], tmp);
    const result = await collectOutput(proc);

    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe("Step doc: plans/alpha-launch/02-define-key-contracts-or-boundaries.md");
    expect(await Bun.file(path.join(tmp, "plans/alpha-launch/02-define-key-contracts-or-boundaries.md")).exists()).toBe(true);
    expect(await Bun.file(path.join(tmp, "plans/alpha-launch/EXECMAP.md")).text()).toContain(
      "- [ ] [Define key contracts or boundaries](./02-define-key-contracts-or-boundaries.md)",
    );
  });

  test("stepdoc creates and links a step doc by exact label", async () => {
    const tmp = await mkdtemp(path.join(os.tmpdir(), "execmap-"));
    TEMP_DIRS.push(tmp);

    const initProc = await runCli(["init", "Alpha Launch"], tmp);
    const initResult = await collectOutput(initProc);
    expect(initResult.exitCode).toBe(0);

    const proc = await runCli(["stepdoc", "plans/alpha-launch", "Verify behavior"], tmp);
    const result = await collectOutput(proc);

    expect(result.exitCode).toBe(0);
    expect(await Bun.file(path.join(tmp, "plans/alpha-launch/04-verify-behavior.md")).exists()).toBe(true);
    expect(await Bun.file(path.join(tmp, "plans/alpha-launch/EXECMAP.md")).text()).toContain(
      "- [ ] [Verify behavior](./04-verify-behavior.md)",
    );
  });

  test("stepdoc fails when a step already links to a step doc", async () => {
    const tmp = await mkdtemp(path.join(os.tmpdir(), "execmap-"));
    TEMP_DIRS.push(tmp);

    const initProc = await runCli(["init", "Alpha Launch"], tmp);
    const initResult = await collectOutput(initProc);
    expect(initResult.exitCode).toBe(0);

    const firstProc = await runCli(["stepdoc", "plans/alpha-launch", "1"], tmp);
    const firstResult = await collectOutput(firstProc);
    expect(firstResult.exitCode).toBe(0);

    const proc = await runCli(["stepdoc", "plans/alpha-launch", "1"], tmp);
    const result = await collectOutput(proc);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("step already links to a step doc");
  });

  test("next fails clearly when repo root has no active plan", async () => {
    const tmp = await mkdtemp(path.join(os.tmpdir(), "execmap-"));
    TEMP_DIRS.push(tmp);
    await writeFile(path.join(tmp, "PLAN.md"), renderPlan(), "utf8");

    const proc = await runCli(["next"], tmp);
    const result = await collectOutput(proc);

    expect(result.exitCode).toBe(1);
    expect(result.stderr.trim()).toEndWith("/PLAN.md: no active plan");
  });

  test("done fails clearly when repo root has no active plan", async () => {
    const tmp = await mkdtemp(path.join(os.tmpdir(), "execmap-"));
    TEMP_DIRS.push(tmp);
    await writeFile(path.join(tmp, "PLAN.md"), renderPlan(), "utf8");

    const proc = await runCli(["done"], tmp);
    const result = await collectOutput(proc);

    expect(result.exitCode).toBe(1);
    expect(result.stderr.trim()).toEndWith("/PLAN.md: no active plan");
  });

  test("activate sets the active plan from an existing initiative", async () => {
    const tmp = await mkdtemp(path.join(os.tmpdir(), "execmap-"));
    TEMP_DIRS.push(tmp);

    const initProc = await runCli(["init", "Alpha Launch"], tmp);
    const initResult = await collectOutput(initProc);
    expect(initResult.exitCode).toBe(0);

    const closeProc = await runCli(["close"], tmp);
    const closeResult = await collectOutput(closeProc);
    expect(closeResult.exitCode).toBe(0);

    const proc = await runCli(["activate", "plans/alpha-launch"], tmp);
    const result = await collectOutput(proc);

    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe("Active: Alpha Launch");
    expect(await Bun.file(path.join(tmp, "PLAN.md")).text()).toContain("[Alpha Launch](./plans/alpha-launch/EXECMAP.md)");
    expect(await Bun.file(path.join(tmp, "PLAN.md")).text()).not.toContain("## Completed Plans\n\n- [Alpha Launch]");
  });

  test("close clears the active plan and archives it under completed plans", async () => {
    const tmp = await mkdtemp(path.join(os.tmpdir(), "execmap-"));
    TEMP_DIRS.push(tmp);

    const initProc = await runCli(["init", "Alpha Launch"], tmp);
    const initResult = await collectOutput(initProc);
    expect(initResult.exitCode).toBe(0);

    const proc = await runCli(["close"], tmp);
    const result = await collectOutput(proc);

    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe("Closed: Alpha Launch");
    expect(await Bun.file(path.join(tmp, "PLAN.md")).text()).toContain("## Active Plan\n\n- None");
    expect(await Bun.file(path.join(tmp, "PLAN.md")).text()).toContain("[Alpha Launch](./plans/alpha-launch/EXECMAP.md)");
  });

  test("check accepts a repo root with no active plan", async () => {
    const tmp = await mkdtemp(path.join(os.tmpdir(), "execmap-"));
    TEMP_DIRS.push(tmp);
    await writeFile(
      path.join(tmp, "PLAN.md"),
      renderPlan("- None", [
        "- [first](./plans/first/EXECMAP.md)",
        "- [second](./plans/second/EXECMAP.md)",
      ]),
      "utf8",
    );

    const proc = await runCli(["check"], tmp);
    const result = await collectOutput(proc);

    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe("OK: PLAN.md (no active plan)");
  });

  test("next reports completion for finished example", async () => {
    const proc = await runCli(["next", "examples/portable-package-release"]);
    const result = await collectOutput(proc);

    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe("All steps are complete.");
  });

  test("status reports completion for a finished execmap", async () => {
    const proc = await runCli(["status", "examples/portable-package-release"]);
    const result = await collectOutput(proc);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Active Plan: portable-package-release");
    expect(result.stdout).toContain("Execmap: examples/portable-package-release/EXECMAP.md");
    expect(result.stdout).toContain("Next Step: None");
    expect(result.stdout).toContain("State: complete");
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

  test("check fails when execmap still contains template placeholder text", async () => {
    const tmp = await mkdtemp(path.join(os.tmpdir(), "execmap-"));
    TEMP_DIRS.push(tmp);

    const initProc = await runCli(["init", "Placeholder Map"], tmp);
    const initResult = await collectOutput(initProc);
    expect(initResult.exitCode).toBe(0);

    const proc = await runCli(["check", "plans/placeholder-map"], tmp);
    const result = await collectOutput(proc);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("placeholder text was not replaced");
    expect(result.stderr).toContain("Describe the initiative in one sentence.");
  });

  test("check fails when a linked step doc title does not match the execution-map item", async () => {
    const tmp = await mkdtemp(path.join(os.tmpdir(), "execmap-"));
    TEMP_DIRS.push(tmp);

    const initProc = await runCli(["init", "Alpha Launch"], tmp);
    const initResult = await collectOutput(initProc);
    expect(initResult.exitCode).toBe(0);

    const stepdocProc = await runCli(["stepdoc", "plans/alpha-launch", "1"], tmp);
    const stepdocResult = await collectOutput(stepdocProc);
    expect(stepdocResult.exitCode).toBe(0);

    await writeFile(
      path.join(tmp, "plans", "alpha-launch", "01-define-scope.md"),
      [
        "# Different Title",
        "",
        "[Back to Execution Map](./EXECMAP.md)",
        "",
        "## Goal",
        "",
        "Ship the right thing.",
        "",
        "## Tasks",
        "",
        "- Do the work.",
        "",
        "## Constraints",
        "",
        "- Stay aligned.",
        "",
        "## Exit Criteria",
        "",
        "- Title is fixed.",
        "",
      ].join("\n"),
      "utf8",
    );

    await writeFile(
      path.join(tmp, "plans", "alpha-launch", "EXECMAP.md"),
      [
        "# Execution Map",
        "",
        "## Goal",
        "",
        "Ship Alpha Launch.",
        "",
        "## Guardrails",
        "",
        "- Keep scope bounded.",
        "- Do not widen the release.",
        "- Avoid placeholder residue.",
        "",
        "## Execution Map",
        "",
        "- [ ] [Define scope](./01-define-scope.md)",
        "- [ ] Define key contracts or boundaries",
        "",
        "## Done When",
        "",
        "- Alpha Launch scope is defined.",
        "",
      ].join("\n"),
      "utf8",
    );

    const proc = await runCli(["check", "plans/alpha-launch"], tmp);
    const result = await collectOutput(proc);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("step doc title must match execution-map item 'Define scope'");
  });

  test("check warns on step-doc filename drift", async () => {
    const tmp = await mkdtemp(path.join(os.tmpdir(), "execmap-"));
    TEMP_DIRS.push(tmp);

    const planDir = path.join(tmp, "plans", "alpha-launch");
    await mkdir(planDir, { recursive: true });
    await writeFile(
      path.join(planDir, "EXECMAP.md"),
      [
        "# Execution Map",
        "",
        "## Goal",
        "",
        "Ship Alpha Launch.",
        "",
        "## Guardrails",
        "",
        "- Keep scope bounded.",
        "- Do not widen the release.",
        "- Avoid placeholder residue.",
        "",
        "## Execution Map",
        "",
        "- [ ] [Define scope](./notes.md)",
        "",
        "## Done When",
        "",
        "- Alpha Launch scope is defined.",
        "",
      ].join("\n"),
      "utf8",
    );
    await writeFile(
      path.join(planDir, "notes.md"),
      [
        "# Define scope",
        "",
        "[Back to Execution Map](./EXECMAP.md)",
        "",
        "## Goal",
        "",
        "Ship the right thing.",
        "",
        "## Tasks",
        "",
        "- Do the work.",
        "",
        "## Constraints",
        "",
        "- Stay aligned.",
        "",
        "## Exit Criteria",
        "",
        "- Scope is clear.",
        "",
      ].join("\n"),
      "utf8",
    );

    const proc = await runCli(["check", planDir], tmp);
    const result = await collectOutput(proc);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("step doc filename should start with a numeric prefix that matches execution order");
    expect(result.stdout).toContain("step doc filename should use a numeric prefix and slug shape");
  });
});
