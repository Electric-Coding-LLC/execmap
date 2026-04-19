#!/usr/bin/env bun

import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const MAP_SECTIONS = ["Goal", "Guardrails", "Execution Map", "Done When"] as const;
const STEP_SECTIONS = ["Goal", "Tasks", "Constraints", "Exit Criteria"] as const;
const PLAN_SECTIONS = ["Active Plan", "Completed Plans"] as const;
const DEFAULT_STEPS = [
  "Define scope",
  "Define key contracts or boundaries",
  "Implement the core change",
  "Verify behavior",
  "Finalize rollout",
];

const HEADING_RE = /^## (?<title>.+)$/;
const CHECKBOX_RE = /^- \[(?<mark>[ xX])\] (?<body>.+)$/;
const LIST_ITEM_RE = /^- (?<body>.+)$/;
const LINK_RE = /^\[(?<label>[^\]]+)\]\((?<href>[^)]+)\)$/;

type SectionMap = Map<string, string[]>;

type StepItem = {
  checked: boolean;
  label: string;
  href: string | null;
  lineNo: number;
};

type PlanEntry = {
  label: string;
  href: string;
  lineNo: number;
};

function slugifyStep(value: string): string {
  const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return slug || "step";
}

function slugifyInitiative(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^[.-]+|[.-]+$/g, "");
  return slug || "initiative";
}

function parseSections(text: string): { order: string[]; sections: SectionMap } {
  const order: string[] = [];
  const sections: SectionMap = new Map();
  let current: string | null = null;

  for (const line of text.split(/\r?\n/)) {
    const match = line.match(HEADING_RE);
    if (match?.groups?.title) {
      current = match.groups.title;
      order.push(current);
      if (!sections.has(current)) {
        sections.set(current, []);
      }
      continue;
    }
    if (current) {
      sections.get(current)?.push(line);
    }
  }

  return { order, sections };
}

function requireSections(
  filePath: string,
  order: string[],
  sections: SectionMap,
  required: readonly string[],
): string[] {
  const errors: string[] = [];
  for (const section of required) {
    if (!sections.has(section)) {
      errors.push(`${filePath}: missing required section '${section}'`);
    }
  }

  const seenIndexes = required
    .filter((section) => order.includes(section))
    .map((section) => order.indexOf(section));

  if (seenIndexes.length === required.length) {
    const sorted = [...seenIndexes].sort((left, right) => left - right);
    if (seenIndexes.some((index, offset) => index !== sorted[offset])) {
      errors.push(`${filePath}: required sections are out of order`);
    }
  }

  return errors;
}

function parseExecutionItems(lines: string[], startLine: number): StepItem[] {
  const items: StepItem[] = [];
  for (const [offset, line] of lines.entries()) {
    const match = line.match(CHECKBOX_RE);
    if (!match?.groups?.body || !match.groups.mark) {
      continue;
    }

    const body = match.groups.body.trim();
    const linkMatch = body.match(LINK_RE);
    items.push({
      checked: match.groups.mark.toLowerCase() === "x",
      label: linkMatch?.groups?.label ?? body,
      href: linkMatch?.groups?.href ?? null,
      lineNo: startLine + offset,
    });
  }

  return items;
}

function sectionStartLine(text: string, sectionName: string): number {
  const lines = text.split(/\r?\n/);
  const index = lines.findIndex((line) => line === `## ${sectionName}`);
  return index === -1 ? 1 : index + 2;
}

async function exists(target: string): Promise<boolean> {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
}

async function readText(filePath: string): Promise<string> {
  try {
    return await readFile(filePath, "utf8");
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`missing file: ${filePath}`);
    }
    throw error;
  }
}

function parsePlanEntries(lines: string[], startLine: number): PlanEntry[] {
  const entries: PlanEntry[] = [];
  for (const [offset, line] of lines.entries()) {
    const match = line.match(LIST_ITEM_RE);
    if (!match?.groups?.body) {
      continue;
    }
    const body = match.groups.body.trim();
    const linkMatch = body.match(LINK_RE);
    if (!linkMatch?.groups?.label || !linkMatch.groups.href) {
      continue;
    }
    entries.push({
      label: linkMatch.groups.label,
      href: linkMatch.groups.href,
      lineNo: startLine + offset,
    });
  }
  return entries;
}

function renderPlan(active: PlanEntry, completed: PlanEntry[]): string {
  const completedLines =
    completed.length > 0
      ? completed.map((entry) => `- [${entry.label}](${entry.href})`)
      : ["- None"];

  return [
    "# Plan Index",
    "",
    "This file points to the active initiative map for the repo. Status and",
    "checkbox state live in the linked `EXECMAP.md`, not here.",
    "",
    "## Active Plan",
    "",
    `- [${active.label}](${active.href})`,
    "",
    "## Completed Plans",
    "",
    ...completedLines,
    "",
  ].join("\n");
}

async function readPlan(planPath: string): Promise<{ active: PlanEntry; completed: PlanEntry[] }> {
  const text = await readText(planPath);
  const { order, sections } = parseSections(text);
  const errors = requireSections(planPath, order, sections, PLAN_SECTIONS);
  if (errors.length > 0) {
    throw new Error(errors[0] ?? `invalid plan index: ${planPath}`);
  }

  const activeEntries = parsePlanEntries(
    sections.get("Active Plan") ?? [],
    sectionStartLine(text, "Active Plan"),
  );
  if (activeEntries.length === 0) {
    throw new Error(`${planPath}: active plan must link to an EXECMAP.md`);
  }

  const completed = parsePlanEntries(
    sections.get("Completed Plans") ?? [],
    sectionStartLine(text, "Completed Plans"),
  );

  return { active: activeEntries[0]!, completed };
}

async function resolveExecmapFromPlan(planPath: string): Promise<string> {
  const { active } = await readPlan(planPath);
  const execmapPath = path.resolve(path.dirname(planPath), active.href);
  if (!(await exists(execmapPath))) {
    throw new Error(`${planPath}:${active.lineNo}: active plan target does not exist: ${active.href}`);
  }
  return execmapPath;
}

async function findExecmap(target: string): Promise<string> {
  const targetPath = path.resolve(target);
  const targetStats = await stat(targetPath).catch(() => null);
  if (targetStats?.isDirectory()) {
    const execmapPath = path.join(targetPath, "EXECMAP.md");
    if (await exists(execmapPath)) {
      return execmapPath;
    }

    const planPath = path.join(targetPath, "PLAN.md");
    if (await exists(planPath)) {
      return resolveExecmapFromPlan(planPath);
    }

    return execmapPath;
  }

  if (path.basename(targetPath) === "PLAN.md") {
    return resolveExecmapFromPlan(targetPath);
  }

  return targetPath;
}

function renderExecmap(stepNames: string[]): string {
  const lines = [
    "# Execution Map",
    "",
    "## Goal",
    "",
    "Describe the initiative in one sentence.",
    "",
    "## Guardrails",
    "",
    "- Keep:",
    "- Do not:",
    "- Avoid:",
    "",
    "## Execution Map",
    "",
    "<!-- Replace these example steps with the real path for your initiative. -->",
  ];

  for (const [index, stepName] of stepNames.entries()) {
    const fileName = `./${String(index + 1).padStart(2, "0")}-${slugifyStep(stepName)}.md`;
    lines.push(`- [ ] [${stepName}](${fileName})`);
  }

  lines.push(
    "",
    "## Done When",
    "",
    "- Observable outcome:",
    "- Observable outcome:",
    "- Observable outcome:",
    "",
  );

  return lines.join("\n");
}

function renderStep(stepName: string): string {
  return [
    `# ${stepName}`,
    "",
    "[Back to Execution Map](./EXECMAP.md)",
    "",
    "## Goal",
    "",
    "Describe what this step needs to accomplish.",
    "",
    "## Tasks",
    "",
    "- Concrete task",
    "- Concrete task",
    "- Concrete task",
    "",
    "## Constraints",
    "",
    "- Important boundary",
    "- Important boundary",
    "",
    "## Exit Criteria",
    "",
    "- Observable completion condition",
    "- Observable completion condition",
    "",
    "<!-- Track completion in EXECMAP.md, not in this file. -->",
    "",
  ].join("\n");
}

async function validateStepDoc(filePath: string): Promise<{ errors: string[]; warnings: string[] }> {
  const text = await readText(filePath);
  const { order, sections } = parseSections(text);
  const errors = requireSections(filePath, order, sections, STEP_SECTIONS);
  const warnings: string[] = [];
  if (!text.includes("[Back to Execution Map](./EXECMAP.md)")) {
    warnings.push(`${filePath}: missing backlink to EXECMAP.md`);
  }
  return { errors, warnings };
}

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
  await Promise.all(
    stepNames.map((stepName, index) => {
      const stepPath = path.join(
        planDir,
        `${String(index + 1).padStart(2, "0")}-${slugifyStep(stepName)}.md`,
      );
      return writeFile(stepPath, renderStep(stepName), "utf8");
    }),
  );
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

async function commandCheck(targetArg?: string): Promise<number> {
  const execmapPath = await findExecmap(targetArg ?? ".");
  const text = await readText(execmapPath);
  const { order, sections } = parseSections(text);
  const errors = requireSections(execmapPath, order, sections, MAP_SECTIONS);
  const warnings: string[] = [];

  const executionLines = sections.get("Execution Map") ?? [];
  const items = parseExecutionItems(executionLines, sectionStartLine(text, "Execution Map"));
  if (items.length === 0) {
    errors.push(`${execmapPath}: execution map must contain at least one checkbox item`);
  }

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
    const result = await validateStepDoc(target);
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
  console.error("usage: execmap <init|next|check> [args]");
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
