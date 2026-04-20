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
const CHECKBOX_RE = /^- \[(?<mark>[ xX])\] (?<body>.+)$/;
const LIST_ITEM_RE = /^- (?<body>.+)$/;
const LINK_RE = /^\[(?<label>[^\]]+)\]\((?<href>[^)]+)\)$/;

export type SectionMap = Map<string, string[]>;

export type StepItem = {
  checked: boolean;
  label: string;
  href: string | null;
  lineNo: number;
};

export type PlanEntry = {
  label: string;
  href: string;
  lineNo: number;
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

export function renderPlan(active: PlanEntry, completed: PlanEntry[]): string {
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

export async function readPlan(planPath: string): Promise<{ active: PlanEntry; completed: PlanEntry[] }> {
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

export async function resolveExecmapFromPlan(planPath: string): Promise<string> {
  const { active } = await readPlan(planPath);
  const execmapPath = path.resolve(path.dirname(planPath), active.href);
  if (!(await exists(execmapPath))) {
    throw new Error(`${planPath}:${active.lineNo}: active plan target does not exist: ${active.href}`);
  }
  return execmapPath;
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
