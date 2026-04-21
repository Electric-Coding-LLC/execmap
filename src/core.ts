import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

export const MAP_SECTIONS = ["Goal", "Guardrails", "Execution Map", "Done When"] as const;
export const STEP_SECTIONS = ["Goal", "Tasks", "Constraints", "Exit Criteria"] as const;
export const PLAN_SECTIONS = ["Active Plan", "Completed Plans"] as const;
export const DEFAULT_STEPS = [
  "Define scope",
  "Define key contracts or boundaries",
  "Implement the core change",
  "Verify behavior",
  "Finalize rollout",
];

const HEADING_RE = /^## (?<title>.+)$/;
const ROADMAP_VERSION_RE = /^### `(?<label>[^`]+)`: (?<title>.+)$/;
const CHECKBOX_RE = /^- \[(?<mark>[ xX])\] (?<body>.+)$/;
const LIST_ITEM_RE = /^- (?<body>.+)$/;
const LINK_RE = /^\[(?<label>[^\]]+)\]\((?<href>[^)]+)\)$/;
const ROADMAP_STATUS_RE = /^Status: (?<status>planned|active|completed|shipped|blocked)$/;
const ROADMAP_EXECMAP_RE = /^Execmap: `(?<href>[^`]+)`$/;
const ROADMAP_GOAL_RE = /^Goal: (?<goal>.+)$/;

export type SectionMap = Map<string, string[]>;

export type StepItem = {
  checked: boolean;
  label: string;
  href: string | null;
  lineNo: number;
  position: number;
};

export type PlanEntry = {
  label: string;
  href: string;
  lineNo: number;
};

export type PlanState = {
  active: PlanEntry | null;
  completed: PlanEntry[];
};

export type PlanStatus = {
  activeLabel: string | null;
  execmapPath: string | null;
  nextStepLabel: string | null;
  complete: boolean;
};

export type RoadmapVersionStatus = "planned" | "active" | "completed" | "shipped" | "blocked";

export type RoadmapVersion = {
  label: string;
  title: string;
  status: RoadmapVersionStatus | null;
  goal: string | null;
  execmapHref: string | null;
  headingLineNo: number;
};

export type RoadmapStatus = {
  roadmapPath: string;
  currentVersion: RoadmapVersion | null;
  activePlanLabel: string | null;
  activeExecmapPath: string | null;
};

export function slugifyStep(value: string): string {
  const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return slug || "step";
}

export function slugifyInitiative(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^[.-]+|[.-]+$/g, "");
  return slug || "initiative";
}

export function parseSections(text: string): { order: string[]; sections: SectionMap } {
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

export function requireSections(
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

export function parseExecutionItems(lines: string[], startLine: number): StepItem[] {
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
      position: items.length + 1,
    });
  }

  return items;
}

export function sectionStartLine(text: string, sectionName: string): number {
  const lines = text.split(/\r?\n/);
  const index = lines.findIndex((line) => line === `## ${sectionName}`);
  return index === -1 ? 1 : index + 2;
}

export async function exists(target: string): Promise<boolean> {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
}

export async function readText(filePath: string): Promise<string> {
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

function hasNoneListItem(lines: string[]): boolean {
  return lines.some((line) => line.trim() === "- None");
}

function validatePlanSectionState(
  filePath: string,
  sectionName: string,
  lines: string[],
  entries: PlanEntry[],
  options: { allowEmpty: boolean; allowMultipleLinks?: boolean },
): string | null {
  const hasNone = hasNoneListItem(lines);
  if (entries.length > 1 && !options.allowMultipleLinks) {
    return `${filePath}: ${sectionName.toLowerCase()} must contain at most one link entry`;
  }
  if (entries.length > 0 && hasNone) {
    return `${filePath}: ${sectionName.toLowerCase()} cannot contain both a link and - None`;
  }
  if (entries.length === 0 && !hasNone && !options.allowEmpty) {
    return `${filePath}: ${sectionName.toLowerCase()} must contain one link or - None`;
  }
  return null;
}

export function renderPlan(active: PlanEntry | null, completed: PlanEntry[]): string {
  const activeLines = active ? [`- [${active.label}](${active.href})`] : ["- None"];
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
    ...activeLines,
    "",
    "## Completed Plans",
    "",
    ...completedLines,
    "",
  ].join("\n");
}

export async function readPlan(planPath: string): Promise<PlanState> {
  const text = await readText(planPath);
  const { order, sections } = parseSections(text);
  const errors = requireSections(planPath, order, sections, PLAN_SECTIONS);
  if (errors.length > 0) {
    throw new Error(errors[0] ?? `invalid plan index: ${planPath}`);
  }

  const activeLines = sections.get("Active Plan") ?? [];
  const activeEntries = parsePlanEntries(
    activeLines,
    sectionStartLine(text, "Active Plan"),
  );
  const activeError = validatePlanSectionState(planPath, "Active Plan", activeLines, activeEntries, {
    allowEmpty: false,
  });
  if (activeError) {
    throw new Error(activeError);
  }

  const completedLines = sections.get("Completed Plans") ?? [];
  const completed = parsePlanEntries(
    completedLines,
    sectionStartLine(text, "Completed Plans"),
  );
  const completedError = validatePlanSectionState(
    planPath,
    "Completed Plans",
    completedLines,
    completed,
    { allowEmpty: true, allowMultipleLinks: true },
  );
  if (completedError) {
    throw new Error(completedError);
  }

  return { active: activeEntries[0] ?? null, completed };
}

export async function resolveExecmapFromPlan(planPath: string): Promise<string> {
  const { active } = await readPlan(planPath);
  if (!active) {
    throw new Error(`${planPath}: no active plan`);
  }
  const execmapPath = path.resolve(path.dirname(planPath), active.href);
  if (!(await exists(execmapPath))) {
    throw new Error(`${planPath}:${active.lineNo}: active plan target does not exist: ${active.href}`);
  }
  return execmapPath;
}

export async function resolvePlanPath(target: string): Promise<string> {
  const targetPath = path.resolve(target);
  const targetStats = await stat(targetPath).catch(() => null);
  if (targetStats?.isDirectory()) {
    return path.join(targetPath, "PLAN.md");
  }
  if (path.basename(targetPath) === "PLAN.md") {
    return targetPath;
  }
  throw new Error(`plan target must be a directory or PLAN.md: ${target}`);
}

export async function findPlan(target: string): Promise<string | null> {
  const targetPath = path.resolve(target);
  const targetStats = await stat(targetPath).catch(() => null);
  if (targetStats?.isDirectory()) {
    const planPath = path.join(targetPath, "PLAN.md");
    return (await exists(planPath)) ? planPath : null;
  }
  return path.basename(targetPath) === "PLAN.md" ? targetPath : null;
}

export async function findRoadmap(target: string): Promise<string | null> {
  const targetPath = path.resolve(target);
  const targetStats = await stat(targetPath).catch(() => null);
  if (targetStats?.isDirectory()) {
    const roadmapPath = path.join(targetPath, "docs", "roadmap.md");
    return (await exists(roadmapPath)) ? roadmapPath : null;
  }
  return path.basename(targetPath).toLowerCase() === "roadmap.md" ? targetPath : null;
}

export function createPlanEntry(execmapPath: string, planPath: string): PlanEntry {
  return {
    label: path.basename(path.dirname(execmapPath)),
    href: `./${path.relative(path.dirname(planPath), execmapPath).replaceAll(path.sep, "/")}`,
    lineNo: 0,
  };
}

export async function findExecmap(target: string): Promise<string> {
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

export async function readPlanStatus(target: string): Promise<PlanStatus> {
  const planPath = await findPlan(target);
  let activeLabel: string | null = null;

  if (planPath) {
    const { active } = await readPlan(planPath);
    if (!active) {
      return {
        activeLabel: null,
        execmapPath: null,
        nextStepLabel: null,
        complete: false,
      };
    }
    activeLabel = active.label;
  }

  const execmapPath = await findExecmap(target);
  const text = await readText(execmapPath);
  const { order, sections } = parseSections(text);
  const errors = requireSections(execmapPath, order, sections, MAP_SECTIONS);
  if (errors.length > 0) {
    throw new Error(errors[0] ?? `invalid execution map: ${execmapPath}`);
  }

  const executionLines = sections.get("Execution Map") ?? [];
  const items = parseExecutionItems(executionLines, sectionStartLine(text, "Execution Map"));
  if (items.length === 0) {
    throw new Error(`${execmapPath}: execution map must contain at least one checkbox item`);
  }

  const nextItem = items.find((item) => !item.checked) ?? null;
  return {
    activeLabel: activeLabel ?? path.basename(path.dirname(execmapPath)),
    execmapPath,
    nextStepLabel: nextItem?.label ?? null,
    complete: nextItem === null,
  };
}

export function parseRoadmapVersions(text: string): RoadmapVersion[] {
  const versions: RoadmapVersion[] = [];
  const lines = text.split(/\r?\n/);
  let current: RoadmapVersion | null = null;
  let collectingGoal = false;

  for (const [index, line] of lines.entries()) {
    const versionMatch = line.match(ROADMAP_VERSION_RE);
    if (versionMatch?.groups?.label && versionMatch.groups.title) {
      if (current) {
        versions.push(current);
      }
      current = {
        label: versionMatch.groups.label,
        title: versionMatch.groups.title,
        status: null,
        goal: null,
        execmapHref: null,
        headingLineNo: index + 1,
      };
      collectingGoal = false;
      continue;
    }

    if (!current) {
      continue;
    }

    if (collectingGoal) {
      if (!line.trim()) {
        collectingGoal = false;
        continue;
      }
      current.goal = current.goal ? `${current.goal} ${line.trim()}` : line.trim();
      continue;
    }

    const statusMatch = line.match(ROADMAP_STATUS_RE);
    if (statusMatch?.groups?.status) {
      current.status = statusMatch.groups.status as RoadmapVersionStatus;
      continue;
    }

    const execmapMatch = line.match(ROADMAP_EXECMAP_RE);
    if (execmapMatch?.groups?.href) {
      current.execmapHref = execmapMatch.groups.href;
      continue;
    }

    const goalMatch = line.match(ROADMAP_GOAL_RE);
    if (goalMatch?.groups?.goal) {
      current.goal = goalMatch.groups.goal.trim();
      collectingGoal = true;
    }
  }

  if (current) {
    versions.push(current);
  }

  return versions;
}

export async function readRoadmapStatus(target: string): Promise<RoadmapStatus> {
  const roadmapPath = await findRoadmap(target);
  if (!roadmapPath) {
    throw new Error(`roadmap target must be a directory with docs/roadmap.md or roadmap.md: ${target}`);
  }

  const roadmapText = await readText(roadmapPath);
  const versions = parseRoadmapVersions(roadmapText);
  if (versions.length === 0) {
    throw new Error(`${roadmapPath}: no roadmap versions found`);
  }

  for (const version of versions) {
    if (!version.status) {
      throw new Error(`${roadmapPath}:${version.headingLineNo}: roadmap version is missing Status`);
    }
  }

  const currentVersion =
    versions.find((version) => version.status !== "completed" && version.status !== "shipped") ?? null;
  const repoRoot = path.resolve(path.dirname(roadmapPath), "..");
  const planPath = await findPlan(repoRoot);
  let activePlanLabel: string | null = null;
  let activeExecmapPath: string | null = null;

  if (planPath) {
    const { active } = await readPlan(planPath);
    activePlanLabel = active?.label ?? null;
    activeExecmapPath = active ? path.resolve(path.dirname(planPath), active.href) : null;
  }

  return {
    roadmapPath,
    currentVersion,
    activePlanLabel,
    activeExecmapPath,
  };
}

export function renderExecmap(stepNames: string[]): string {
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
    "<!-- Add a linked step doc only when a step needs more definition. -->",
  ];

  for (const stepName of stepNames) {
    lines.push(`- [ ] ${stepName}`);
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

export function renderStep(stepName: string): string {
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

export async function validateStepDoc(filePath: string): Promise<{ errors: string[]; warnings: string[] }> {
  const text = await readText(filePath);
  const { order, sections } = parseSections(text);
  const errors = requireSections(filePath, order, sections, STEP_SECTIONS);
  const warnings: string[] = [];
  if (!text.includes("[Back to Execution Map](./EXECMAP.md)")) {
    warnings.push(`${filePath}: missing backlink to EXECMAP.md`);
  }
  return { errors, warnings };
}

export function setStepItemChecked(text: string, item: StepItem, checked: boolean): string {
  const newline = text.includes("\r\n") ? "\r\n" : "\n";
  const lines = text.split(/\r?\n/);
  const index = item.lineNo - 1;
  const currentLine = lines[index];
  if (currentLine === undefined) {
    throw new Error(`step line is out of range: ${item.lineNo}`);
  }

  const match = currentLine.match(CHECKBOX_RE);
  if (!match?.groups?.body) {
    throw new Error(`step line is not a checkbox item: ${item.lineNo}`);
  }

  lines[index] = `- [${checked ? "x" : " "}] ${match.groups.body}`;
  return lines.join(newline);
}

export function setStepItemLink(text: string, item: StepItem, href: string): string {
  const newline = text.includes("\r\n") ? "\r\n" : "\n";
  const lines = text.split(/\r?\n/);
  const index = item.lineNo - 1;
  const currentLine = lines[index];
  if (currentLine === undefined) {
    throw new Error(`step line is out of range: ${item.lineNo}`);
  }

  const match = currentLine.match(CHECKBOX_RE);
  if (!match?.groups?.body) {
    throw new Error(`step line is not a checkbox item: ${item.lineNo}`);
  }
  if (item.href) {
    throw new Error(`step line already links to a step doc: ${item.lineNo}`);
  }

  lines[index] = `- [${item.checked ? "x" : " "}] [${item.label}](${href})`;
  return lines.join(newline);
}
