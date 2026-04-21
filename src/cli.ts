#!/usr/bin/env bun

import { mkdir, readdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  DEFAULT_STEPS,
  MAP_SECTIONS,
  type StepItem,
  createPlanEntry,
  exists,
  findExecmap,
  findPlan,
  readRoadmapStatus,
  parseExecutionItems,
  parseSections,
  readPlanStatus,
  readPlan,
  readText,
  renderExecmap,
  renderPlan,
  renderStep,
  requireSections,
  resolvePlanPath,
  sectionStartLine,
  setStepItemChecked,
  setStepDocTitle,
  setStepItemLink,
  setStepItemLabel,
  slugifyInitiative,
  slugifyStep,
  validateExecmapAuthoring,
  validateStepDoc,
} from "./core";

function parseInitArgs(args: string[]): { initiative: string; root: string; steps: string[]; force: boolean } {
  let root = "plans";
  let force = false;
  const steps: string[] = [];
  const positionals: string[] = [];

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--root") {
      index += 1;
      root = args[index] ?? root;
      continue;
    }
    if (arg === "--step") {
      index += 1;
      const step = args[index];
      if (step) {
        steps.push(step);
      }
      continue;
    }
    if (arg === "--force") {
      force = true;
      continue;
    }
    positionals.push(arg);
  }

  const initiative = positionals[0];
  if (!initiative) {
    throw new Error("usage: execmap init <initiative> [--root <dir>] [--step <label>] [--force]");
  }

  return { initiative, root, steps, force };
}

function parsePlanTargetArgs(
  args: string[],
  usage: string,
): { positionals: string[]; plan: string } {
  let plan = ".";
  const positionals: string[] = [];

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--plan") {
      index += 1;
      const planTarget = args[index];
      if (!planTarget) {
        throw new Error(usage);
      }
      plan = planTarget;
      continue;
    }
    positionals.push(arg);
  }

  return { positionals, plan };
}

function selectStepItem(items: StepItem[], selector: string): StepItem | null {
  if (/^\d+$/.test(selector)) {
    const index = Number.parseInt(selector, 10);
    return items.find((item) => item.position === index) ?? null;
  }

  const matches = items.filter((item) => item.label === selector);
  if (matches.length > 1) {
    throw new Error(`multiple execution-map items match: ${selector}`);
  }
  return matches[0] ?? null;
}

async function commandInit(args: string[]): Promise<number> {
  const { initiative, root, steps, force } = parseInitArgs(args);
  const stepNames = steps.length > 0 ? steps : DEFAULT_STEPS;
  const rootPath = path.resolve(root);
  const repoRoot = path.dirname(rootPath);
  const planDir = path.resolve(rootPath, slugifyInitiative(initiative));

  if (await exists(planDir)) {
    const entries = await readdir(planDir);
    if (entries.length > 0 && !force) {
      console.error(
        `error: target directory is not empty: ${planDir} (use --force to overwrite files)`,
      );
      return 1;
    }
  } else {
    await mkdir(planDir, { recursive: true });
  }

  const execmapPath = path.join(planDir, "EXECMAP.md");
  const execmapHref = `./${path.relative(repoRoot, execmapPath).replaceAll(path.sep, "/")}`;
  const planIndexPath = path.join(repoRoot, "PLAN.md");
  const existingCompleted = (await exists(planIndexPath)) ? (await readPlan(planIndexPath)).completed : [];

  await writeFile(execmapPath, renderExecmap(stepNames), "utf8");
  await writeFile(
    planIndexPath,
    renderPlan(
      {
        label: initiative,
        href: execmapHref,
        lineNo: 0,
      },
      existingCompleted,
    ),
    "utf8",
  );

  console.log(path.relative(process.cwd(), execmapPath) || execmapPath);
  return 0;
}

async function commandStepdoc(args: string[]): Promise<number> {
  const usage = "usage: execmap stepdoc <target> <step>";
  const [target, selector] = args;
  if (!target || !selector) {
    throw new Error(usage);
  }

  const execmapPath = await findExecmap(target);
  const text = await readText(execmapPath);
  const { order, sections } = parseSections(text);
  const errors = requireSections(execmapPath, order, sections, MAP_SECTIONS);
  if (errors.length > 0) {
    console.error(`error: ${errors[0]}`);
    return 1;
  }

  const executionLines = sections.get("Execution Map") ?? [];
  const items = parseExecutionItems(executionLines, sectionStartLine(text, "Execution Map"));
  if (items.length === 0) {
    console.error(`error: ${execmapPath}: execution map must contain at least one checkbox item`);
    return 1;
  }

  let item: StepItem | null;
  try {
    item = selectStepItem(items, selector);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`error: ${message}`);
    return 1;
  }
  if (!item) {
    console.error(`error: ${execmapPath}: step not found: ${selector}`);
    return 1;
  }
  if (item.href) {
    console.error(`error: ${execmapPath}:${item.lineNo}: step already links to a step doc`);
    return 1;
  }

  const stepFileName = `${String(item.position).padStart(2, "0")}-${slugifyStep(item.label)}.md`;
  const stepPath = path.join(path.dirname(execmapPath), stepFileName);
  if (await exists(stepPath)) {
    console.error(`error: destination step doc already exists: ${stepPath}`);
    return 1;
  }

  const stepHref = `./${stepFileName}`;
  const nextExecmap = setStepItemLink(text, item, stepHref);
  await writeFile(stepPath, renderStep(item.label), "utf8");
  await writeFile(execmapPath, nextExecmap, "utf8");
  console.log(`Step doc: ${path.relative(process.cwd(), stepPath) || stepPath}`);
  return 0;
}

async function commandRename(args: string[]): Promise<number> {
  const usage = "usage: execmap rename <target> <step> <new-label>";
  const [target, selector, ...labelParts] = args;
  const nextLabel = labelParts.join(" ").trim();
  if (!target || !selector || !nextLabel) {
    throw new Error(usage);
  }

  const execmapPath = await findExecmap(target);
  const text = await readText(execmapPath);
  const { order, sections } = parseSections(text);
  const errors = requireSections(execmapPath, order, sections, MAP_SECTIONS);
  if (errors.length > 0) {
    console.error(`error: ${errors[0]}`);
    return 1;
  }

  const executionLines = sections.get("Execution Map") ?? [];
  const items = parseExecutionItems(executionLines, sectionStartLine(text, "Execution Map"));
  if (items.length === 0) {
    console.error(`error: ${execmapPath}: execution map must contain at least one checkbox item`);
    return 1;
  }

  let item: StepItem | null;
  try {
    item = selectStepItem(items, selector);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`error: ${message}`);
    return 1;
  }
  if (!item) {
    console.error(`error: ${execmapPath}: step not found: ${selector}`);
    return 1;
  }

  let nextHref = item.href;
  if (item.href) {
    const currentStepPath = path.resolve(path.dirname(execmapPath), item.href);
    const nextFileName = `${String(item.position).padStart(2, "0")}-${slugifyStep(nextLabel)}.md`;
    const nextStepPath = path.join(path.dirname(execmapPath), nextFileName);
    const stepText = await readText(currentStepPath);
    await writeFile(currentStepPath, setStepDocTitle(stepText, nextLabel), "utf8");

    if (currentStepPath !== nextStepPath) {
      if (await exists(nextStepPath)) {
        console.error(`error: destination step doc already exists: ${nextStepPath}`);
        return 1;
      }
      await rename(currentStepPath, nextStepPath);
    }
    nextHref = `./${nextFileName}`;
  }

  await writeFile(execmapPath, setStepItemLabel(text, item, nextLabel, nextHref), "utf8");
  console.log(`Renamed: ${item.label} -> ${nextLabel}`);
  return 0;
}

async function commandDone(targetArg?: string): Promise<number> {
  const execmapPath = await findExecmap(targetArg ?? ".");
  const text = await readText(execmapPath);
  const { order, sections } = parseSections(text);
  const errors = requireSections(execmapPath, order, sections, MAP_SECTIONS);
  if (errors.length > 0) {
    console.error(`error: ${errors[0]}`);
    return 1;
  }

  const executionLines = sections.get("Execution Map") ?? [];
  const items = parseExecutionItems(executionLines, sectionStartLine(text, "Execution Map"));
  if (items.length === 0) {
    console.error(`error: ${execmapPath}: execution map must contain at least one checkbox item`);
    return 1;
  }

  const nextItem = items.find((item) => !item.checked);
  if (!nextItem) {
    console.error(`error: ${execmapPath}: no open steps remain`);
    return 1;
  }

  await writeFile(execmapPath, setStepItemChecked(text, nextItem, true), "utf8");
  console.log(`Done: ${nextItem.label}`);
  return 0;
}

async function commandActivate(args: string[]): Promise<number> {
  const usage = "usage: execmap activate <target> [--plan <dir|PLAN.md>]";
  const { positionals, plan } = parsePlanTargetArgs(args, usage);
  const target = positionals[0];
  if (!target) {
    throw new Error(usage);
  }

  const planPath = await resolvePlanPath(plan);
  const execmapPath = await findExecmap(target);
  if (!(await exists(execmapPath))) {
    console.error(`error: missing file: ${execmapPath}`);
    return 1;
  }

  const planState = (await exists(planPath))
    ? await readPlan(planPath)
    : { active: null, completed: [] };
  const nextActive = createPlanEntry(execmapPath, planPath);
  const existingEntry = [planState.active, ...planState.completed].find(
    (entry) => entry?.href === nextActive.href,
  );
  const active = existingEntry ? { ...nextActive, label: existingEntry.label } : nextActive;
  const nextCompleted = planState.completed.filter((entry) => entry.href !== active.href);
  await writeFile(planPath, renderPlan(active, nextCompleted), "utf8");
  console.log(`Active: ${active.label}`);
  return 0;
}

async function commandNext(targetArg?: string): Promise<number> {
  const execmapPath = await findExecmap(targetArg ?? ".");
  const text = await readText(execmapPath);
  const { sections } = parseSections(text);
  const executionLines = sections.get("Execution Map") ?? [];
  const items = parseExecutionItems(executionLines, sectionStartLine(text, "Execution Map"));

  for (const item of items) {
    if (item.checked) {
      continue;
    }
    if (item.href) {
      console.log(`${item.label} -> ${path.resolve(path.dirname(execmapPath), item.href)}`);
    } else {
      console.log(item.label);
    }
    return 0;
  }

  console.log("All steps are complete.");
  return 0;
}

async function commandStatus(targetArg?: string): Promise<number> {
  const target = targetArg ?? ".";
  try {
    const status = await readPlanStatus(target);
    if (!status.activeLabel) {
      console.log("Active Plan: None");
      return 0;
    }

    const displayExecmapPath =
      status.execmapPath
        ? (path.relative(process.cwd(), status.execmapPath) || status.execmapPath)
        : null;

    console.log(`Active Plan: ${status.activeLabel}`);
    if (displayExecmapPath) {
      console.log(`Execmap: ${displayExecmapPath}`);
    }
    console.log(`Next Step: ${status.nextStepLabel ?? "None"}`);
    if (status.complete) {
      console.log("State: complete");
    }
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`error: ${message}`);
    return 1;
  }
}

async function commandRoadmap(targetArg?: string): Promise<number> {
  const target = targetArg ?? ".";
  try {
    const status = await readRoadmapStatus(target);
    const displayRoadmapPath = path.relative(process.cwd(), status.roadmapPath) || status.roadmapPath;
    console.log(`Roadmap: ${displayRoadmapPath}`);

    if (!status.currentVersion) {
      console.log("Current Version: None");
      console.log("State: complete");
    } else {
      console.log(`Current Version: ${status.currentVersion.label}`);
      console.log(`Version Title: ${status.currentVersion.title}`);
      console.log(`Version Status: ${status.currentVersion.status}`);
      if (status.currentVersion.goal) {
        console.log(`Goal: ${status.currentVersion.goal}`);
      }
      if (status.currentVersion.execmapHref) {
        const execmapPath = path.resolve(
          path.dirname(status.roadmapPath),
          "..",
          status.currentVersion.execmapHref,
        );
        console.log(`Execmap: ${path.relative(process.cwd(), execmapPath) || execmapPath}`);
      }
    }

    console.log(`Active Plan: ${status.activePlanLabel ?? "None"}`);
    if (status.activeExecmapPath) {
      console.log(`Active Execmap: ${path.relative(process.cwd(), status.activeExecmapPath) || status.activeExecmapPath}`);
    }
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`error: ${message}`);
    return 1;
  }
}

async function commandClose(args: string[]): Promise<number> {
  const usage = "usage: execmap close [--plan <dir|PLAN.md>]";
  const { positionals, plan } = parsePlanTargetArgs(args, usage);
  if (positionals.length > 0) {
    throw new Error(usage);
  }

  const planPath = await resolvePlanPath(plan);
  const { active, completed } = await readPlan(planPath);
  if (!active) {
    console.error(`error: ${planPath}: no active plan to close`);
    return 1;
  }

  const nextCompleted = [active, ...completed.filter((entry) => entry.href !== active.href)];
  await writeFile(planPath, renderPlan(null, nextCompleted), "utf8");
  console.log(`Closed: ${active.label}`);
  return 0;
}

async function commandCheck(targetArg?: string): Promise<number> {
  const target = targetArg ?? ".";
  const planPath = await findPlan(target);
  if (planPath) {
    const { active } = await readPlan(planPath);
    if (!active) {
      console.log(`OK: ${path.relative(process.cwd(), planPath) || planPath} (no active plan)`);
      return 0;
    }
  }

  const execmapPath = await findExecmap(target);
  const text = await readText(execmapPath);
  const { order, sections } = parseSections(text);
  const errors = requireSections(execmapPath, order, sections, MAP_SECTIONS);
  const warnings: string[] = [];

  const executionLines = sections.get("Execution Map") ?? [];
  const items = parseExecutionItems(executionLines, sectionStartLine(text, "Execution Map"));
  if (items.length === 0) {
    errors.push(`${execmapPath}: execution map must contain at least one checkbox item`);
  }
  const authoringValidation = validateExecmapAuthoring(execmapPath, text, items);
  errors.push(...authoringValidation.errors);
  warnings.push(...authoringValidation.warnings);

  const linkedPaths = new Set<string>();
  for (const item of items) {
    if (!item.href) {
      continue;
    }
    const target = path.resolve(path.dirname(execmapPath), item.href);
    linkedPaths.add(target);
    if (!(await exists(target))) {
      errors.push(`${execmapPath}:${item.lineNo}: linked step doc does not exist: ${item.href}`);
      continue;
    }
    const result = await validateStepDoc(target, item);
    errors.push(...result.errors);
    warnings.push(...result.warnings);
  }

  for (const entry of await readdir(path.dirname(execmapPath), { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".md") || entry.name === "EXECMAP.md") {
      continue;
    }
    const stepPath = path.resolve(path.dirname(execmapPath), entry.name);
    if (!linkedPaths.has(stepPath)) {
      warnings.push(`${stepPath}: step doc is not linked from EXECMAP.md`);
    }
    if (!/^\d+-.*\.md$/.test(entry.name)) {
      warnings.push(`${stepPath}: step doc filename should use a numeric prefix and slug shape`);
    }
  }

  if (errors.length > 0) {
    for (const error of errors) {
      console.error(`error: ${error}`);
    }
    for (const warning of warnings) {
      console.error(`warning: ${warning}`);
    }
    return 1;
  }

  console.log(`OK: ${path.relative(process.cwd(), execmapPath) || execmapPath}`);
  for (const warning of warnings) {
    console.log(`warning: ${warning}`);
  }
  return 0;
}

function printUsage(): void {
  console.error("usage: execmap <init|next|status|roadmap|done|stepdoc|rename|activate|close|check> [args]");
}

export async function main(argv = process.argv.slice(2)): Promise<number> {
  const [command, ...rest] = argv;
  if (!command) {
    printUsage();
    return 1;
  }

  if (command === "init") {
    return commandInit(rest);
  }
  if (command === "next") {
    return commandNext(rest[0]);
  }
  if (command === "status") {
    return commandStatus(rest[0]);
  }
  if (command === "roadmap") {
    return commandRoadmap(rest[0]);
  }
  if (command === "done") {
    return commandDone(rest[0]);
  }
  if (command === "stepdoc") {
    return commandStepdoc(rest);
  }
  if (command === "rename") {
    return commandRename(rest);
  }
  if (command === "activate") {
    return commandActivate(rest);
  }
  if (command === "close") {
    return commandClose(rest);
  }
  if (command === "check") {
    return commandCheck(rest[0]);
  }

  printUsage();
  return 1;
}

const isDirectRun = import.meta.path === Bun.main;
if (isDirectRun) {
  main().then(
    (code) => {
      process.exitCode = code;
    },
    (error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`error: ${message}`);
      process.exitCode = 1;
    },
  );
}
