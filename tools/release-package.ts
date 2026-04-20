#!/usr/bin/env bun

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const REPO_ROOT = process.cwd();
const PACKAGE_JSON_PATH = path.join(REPO_ROOT, "package.json");
const CHANGELOG_PATH = path.join(REPO_ROOT, "CHANGELOG.md");
const REGISTRY_URL = "https://registry.npmjs.org";

type Options = {
  bump: string;
  noPush: boolean;
  pushTag: boolean;
};

type CiRunStatus = {
  status: string;
  conclusion: string;
  htmlUrl: string;
};

type PackageJson = {
  name: string;
  version: string;
};

function fail(message: string): never {
  console.error(`error: ${message}`);
  process.exit(1);
}

function usage(exitCode = 1): never {
  console.error(`Usage: bun run release -- <patch|minor|major|x.y.z> [--no-push] [--push-tag]

Bumps package.json, updates CHANGELOG.md from shipped commits, runs the local
release gate, creates a release commit and matching tag, pushes the release
commit by default, waits for CI on the default branch, and then pushes the tag
unless --no-push or --push-tag is provided.`);
  process.exit(exitCode);
}

function run(command: string, args: string[], cwd = REPO_ROOT): void {
  const proc = Bun.spawnSync({
    cmd: [command, ...args],
    cwd,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
    env: process.env,
  });

  if (proc.exitCode !== 0) {
    process.exit(proc.exitCode ?? 1);
  }
}

function runQuiet(command: string, args: string[], cwd = REPO_ROOT): number {
  const proc = Bun.spawnSync({
    cmd: [command, ...args],
    cwd,
    stdin: "ignore",
    stdout: "ignore",
    stderr: "ignore",
    env: process.env,
  });

  return proc.exitCode ?? 1;
}

function readStdout(command: string, args: string[], cwd = REPO_ROOT): string {
  const proc = Bun.spawnSync({
    cmd: [command, ...args],
    cwd,
    stdin: "ignore",
    stdout: "pipe",
    stderr: "pipe",
    env: process.env,
  });

  if (proc.exitCode !== 0) {
    const stderr = proc.stderr.toString().trim();
    fail(
      stderr.length > 0
        ? `${command} ${args.join(" ")} failed: ${stderr}`
        : `${command} ${args.join(" ")} failed`,
    );
  }

  return proc.stdout.toString().trim();
}

function tryReadStdout(command: string, args: string[], cwd = REPO_ROOT): string | null {
  const proc = Bun.spawnSync({
    cmd: [command, ...args],
    cwd,
    stdin: "ignore",
    stdout: "pipe",
    stderr: "pipe",
    env: process.env,
  });

  if (proc.exitCode !== 0) {
    return null;
  }

  return proc.stdout.toString().trim();
}

function parseArgs(argv: string[]): Options {
  if (argv.length === 0) {
    usage();
  }

  let bump = "";
  let noPush = false;
  let pushTag = false;

  for (const arg of argv) {
    if (arg === "--no-push") {
      noPush = true;
      continue;
    }

    if (arg === "--push-tag") {
      pushTag = true;
      continue;
    }

    if (arg === "-h" || arg === "--help") {
      usage(0);
    }

    if (bump.length > 0) {
      fail(`unexpected extra argument "${arg}"`);
    }

    bump = arg;
  }

  if (!/^(patch|minor|major|\d+\.\d+\.\d+)$/.test(bump)) {
    fail(`invalid bump "${bump}"`);
  }

  if (noPush && pushTag) {
    fail("--no-push cannot be combined with --push-tag");
  }

  return { bump, noPush, pushTag };
}

function readPackageJson(): PackageJson {
  return JSON.parse(readFileSync(PACKAGE_JSON_PATH, "utf8")) as PackageJson;
}

function ensureCleanGit(): void {
  if (runQuiet("git", ["diff", "--quiet", "--ignore-submodules", "HEAD"]) !== 0) {
    fail("git worktree has uncommitted changes");
  }

  if (runQuiet("git", ["diff", "--quiet", "--cached", "--ignore-submodules"]) !== 0) {
    fail("git index has staged changes");
  }
}

function getCurrentBranchName(): string {
  return readStdout("git", ["branch", "--show-current"]);
}

function getCurrentCommitSha(): string {
  return readStdout("git", ["rev-parse", "HEAD"]);
}

function getDefaultBranchName(): string {
  const remoteHead = readStdout("git", ["symbolic-ref", "--short", "refs/remotes/origin/HEAD"]);
  return remoteHead.replace(/^origin\//, "");
}

function ensureOnDefaultBranch(defaultBranch: string): void {
  const currentBranch = getCurrentBranchName();
  if (currentBranch !== defaultBranch) {
    fail(`release push flow must run from ${defaultBranch}; current branch is ${currentBranch}`);
  }
}

function ensureGithubCliReady(): void {
  readStdout("gh", ["--version"]);
  readStdout("gh", ["auth", "status"]);
}

function getRepoNameWithOwner(): string {
  return readStdout("gh", ["repo", "view", "--json", "nameWithOwner", "-q", ".nameWithOwner"]);
}

function readCiRunStatus(commitSha: string, defaultBranch: string, repoNameWithOwner: string): CiRunStatus {
  const response = JSON.parse(
    readStdout("gh", [
      "api",
      "-X",
      "GET",
      `repos/${repoNameWithOwner}/actions/workflows/ci.yml/runs`,
      "-f",
      `head_sha=${commitSha}`,
      "-f",
      "event=push",
      "-f",
      `branch=${defaultBranch}`,
      "-f",
      "per_page=1",
    ]),
  ) as {
    workflow_runs?: Array<{
      status?: string;
      conclusion?: string;
      html_url?: string;
    }>;
  };

  const run = response.workflow_runs?.[0];
  return {
    status: run?.status ?? "",
    conclusion: run?.conclusion ?? "",
    htmlUrl: run?.html_url ?? "",
  };
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

async function waitForSuccessfulCi(commitSha: string, defaultBranch: string): Promise<void> {
  const timeoutMs = 30 * 60 * 1000;
  const pollIntervalMs = 15 * 1000;
  const startedAt = Date.now();
  const repoNameWithOwner = getRepoNameWithOwner();

  console.log(`> Waiting for CI on ${defaultBranch} for ${commitSha.slice(0, 12)}`);

  while (Date.now() - startedAt < timeoutMs) {
    const run = readCiRunStatus(commitSha, defaultBranch, repoNameWithOwner);

    if (run.status.length === 0) {
      console.log("  No CI run found yet. Retrying in 15s...");
      await sleep(pollIntervalMs);
      continue;
    }

    if (run.status !== "completed") {
      console.log(`  CI status: ${run.status}${run.htmlUrl ? ` (${run.htmlUrl})` : ""}`);
      await sleep(pollIntervalMs);
      continue;
    }

    if (run.conclusion !== "success") {
      fail(
        `CI did not succeed for ${commitSha.slice(0, 12)} on ${defaultBranch}: ${run.conclusion || "unknown"}${run.htmlUrl ? ` (${run.htmlUrl})` : ""}`,
      );
    }

    console.log(`> CI succeeded${run.htmlUrl ? ` (${run.htmlUrl})` : ""}`);
    return;
  }

  fail(`timed out waiting for CI on ${defaultBranch} for ${commitSha.slice(0, 12)}`);
}

function readPublishedVersion(packageName: string): string | null {
  const version = tryReadStdout("npm", ["view", packageName, "version", `--registry=${REGISTRY_URL}`]);
  return version && version.length > 0 ? version : null;
}

function ensureTagExists(tagName: string): void {
  if (runQuiet("git", ["rev-parse", "--verify", tagName]) !== 0) {
    fail(`expected local tag ${tagName} to exist for changelog generation`);
  }
}

function readReleaseSubjects(sinceTag: string | null, packageName: string): string[] {
  const rangeArgs = sinceTag ? [`${sinceTag}..HEAD`] : [];
  const output = readStdout("git", ["log", "--reverse", "--format=%s", ...rangeArgs]);

  return output
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !line.startsWith(`${packageName}@`))
    .filter((line) => !line.startsWith("Version Packages"));
}

function ensureChangelogExists(): string {
  if (!existsSync(CHANGELOG_PATH)) {
    return [
      "# Changelog",
      "",
      "All notable shipped changes to `@electric_coding/execmap` are recorded here.",
      "",
      "This file tracks published package history. Plans under `plans/*` track",
      "execution, not shipped versions.",
      "",
    ].join("\n");
  }

  return readFileSync(CHANGELOG_PATH, "utf8");
}

function insertChangelogEntry(existing: string, entry: string): string {
  const lines = existing.split(/\r?\n/);
  const firstVersionIndex = lines.findIndex((line) => line.startsWith("## "));

  if (firstVersionIndex === -1) {
    const normalized = existing.endsWith("\n") ? existing : `${existing}\n`;
    return `${normalized}\n${entry}`;
  }

  const before = lines.slice(0, firstVersionIndex).join("\n").replace(/\s*$/, "");
  const after = lines.slice(firstVersionIndex).join("\n").replace(/^\s*/, "");
  return `${before}\n\n${entry}\n\n${after}\n`;
}

function updateChangelog(version: string, packageName: string): void {
  const publishedVersion = readPublishedVersion(packageName);
  const sinceTag = publishedVersion ? `v${publishedVersion}` : null;
  if (sinceTag) {
    ensureTagExists(sinceTag);
  }

  const subjects = readReleaseSubjects(sinceTag, packageName);
  const date = new Date().toISOString().slice(0, 10);
  const bullets =
    subjects.length > 0
      ? subjects.map((subject) => `- ${subject}`)
      : ["- Maintenance release without additional user-facing notes."];

  const entry = [`## ${version} - ${date}`, "", "### Changed", "", ...bullets].join("\n");
  const existing = ensureChangelogExists();

  if (existing.includes(`## ${version} - `)) {
    fail(`CHANGELOG.md already contains an entry for ${version}`);
  }

  writeFileSync(CHANGELOG_PATH, insertChangelogEntry(existing, entry), "utf8");
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const shouldWaitForCi = !options.noPush && !options.pushTag;

  ensureCleanGit();

  const defaultBranch = getDefaultBranchName();
  const packageBefore = readPackageJson();

  console.log(`> npm version ${options.bump} --no-git-tag-version`);
  run("npm", ["version", options.bump, "--no-git-tag-version"]);

  const packageJson = readPackageJson();
  const releaseTag = `v${packageJson.version}`;

  console.log("> update CHANGELOG.md");
  updateChangelog(packageJson.version, packageBefore.name);

  console.log("> bun run check");
  run("bun", ["run", "check"]);

  console.log("> bun run pack:dry-run");
  run("bun", ["run", "pack:dry-run"]);

  console.log("> git add package.json CHANGELOG.md");
  run("git", ["add", "package.json", "CHANGELOG.md"]);

  console.log(`> git commit -m ${packageJson.name}@${packageJson.version}`);
  run("git", ["commit", "-m", `${packageJson.name}@${packageJson.version}`]);

  console.log(`> git tag ${releaseTag}`);
  run("git", ["tag", releaseTag]);

  if (options.noPush) {
    console.log("> Skipping git push (--no-push).");
    console.log(
      `  To publish later, run: git push && wait for CI on ${defaultBranch} to succeed, then git push origin ${releaseTag}`,
    );
    return;
  }

  ensureOnDefaultBranch(defaultBranch);

  console.log("> git push");
  run("git", ["push"]);

  const releaseCommitSha = getCurrentCommitSha();

  if (shouldWaitForCi) {
    ensureGithubCliReady();
    await waitForSuccessfulCi(releaseCommitSha, defaultBranch);

    console.log(`> git push origin ${releaseTag}`);
    run("git", ["push", "origin", releaseTag]);
    console.log(`> Release workflow will publish ${packageJson.name}@${packageJson.version} from ${releaseTag}.`);
    return;
  }

  console.log(`> git push origin ${releaseTag}`);
  run("git", ["push", "origin", releaseTag]);
  console.log(
    `> Release workflow will publish ${packageJson.name}@${packageJson.version} if CI has already succeeded on ${defaultBranch} for ${releaseTag}.`,
  );
}

await main();
