# execmap

A lightweight planning system for mapping scoped work from start to finish.

`execmap` is a Bun-first CLI and skill bundle for planning bounded work before
implementation starts.

## What It Is

`execmap` is a simple way to plan bounded work before implementation starts.

It is built around three ideas:

- the repo root has a small `PLAN.md` index that points to the active
  initiative or records that none is active
- every meaningful initiative gets one top-level execution map
- each meaningful step can have a small step doc when it needs more thought

The system is meant to help an agent work independently without turning project
planning into overhead.

## Core Model

The repo root has one entrypoint document:

- `PLAN.md`

That file points to the active initiative map, or records `- None` when no
initiative is active. It is an index, not the place where step status is
tracked.

Each initiative then has one control document:

- `EXECMAP.md`

That file defines:

- the goal
- the guardrails
- the ordered execution path
- the definition of done

The execution path is a checkbox list. The next unchecked item is the default
next step once the active initiative is selected from `PLAN.md`.

If a step needs real thought, risk management, or constraints, it gets its own
small step doc.

## Why Use It

`execmap` is designed for situations where implementation goes better after the
full path is mapped first.

It is useful for:

- releases
- features
- refactors
- migrations
- cleanup passes

## The Rules

- Map the full initiative before implementation starts.
- Use one ordered top-level map per initiative.
- Use checkboxes only for status.
- Keep the top-level map as the source of truth.
- Create step docs only for meaningful steps.
- Mark a step complete only after its exit criteria are true.
- If the work changes, update the map first.

## Standard Shape

An `EXECMAP.md` file uses four sections:

- `Goal`
- `Guardrails`
- `Execution Map`
- `Done When`

A step doc uses four sections:

- `Goal`
- `Tasks`
- `Constraints`
- `Exit Criteria`

## Suggested Layout

```text
PLAN.md
plans/
  <initiative-name>/
    EXECMAP.md
    01-... (optional step doc)
    02-... (optional step doc)
    03-... (optional step doc)
```

This repo provides templates and examples, but each project keeps its own local
execution maps.

## Authoring Conventions

- Keep a root `PLAN.md` that points to the active `EXECMAP.md`, or set
  `Active Plan` to `- None` when the repo has no active initiative.
- Keep initiative folders self-contained.
- Name step docs with a numeric prefix so the files match execution order.
- If a step doc exists, link to it from the execution map.
- Keep step status only in `EXECMAP.md`, not duplicated in step docs.
- Keep `PLAN.md` as an index only; do not duplicate checkbox state there.

## Roadmap

If a repo wants a roadmap, keep it separate from the active `execmap` step
state, but it may still carry minimal release-level lifecycle state.

- Use a roadmap for release order, release scope, and minimal release status.
- Do not put roadmap entries in `PLAN.md`.
- Do not pre-create `plans/<version>/EXECMAP.md` files only to represent future
  ideas.
- If the roadmap carries status, keep it release-level only, such as
  `planned`, `active`, `shipped`, or `blocked`.
- Keep detailed execution progress in the promoted `EXECMAP.md`, not in the
  roadmap.
- When a roadmap item becomes real work, promote it into `plans/<version>/`
  and point `PLAN.md` at that initiative.

## In This Repo

- [CHANGELOG.md](./CHANGELOG.md): shipped package history
- [docs/roadmap.md](./docs/roadmap.md): release order, lifecycle, and non-goals
- [docs/spec.md](./docs/spec.md): canonical system definition
- [docs/release.md](./docs/release.md): generic publication runbook
- [templates/PLAN.md](./templates/PLAN.md): root plan index template
- [templates/EXECMAP.md](./templates/EXECMAP.md): top-level map template
- [templates/STEP.md](./templates/STEP.md): step-doc template
- [examples/portable-package-release/EXECMAP.md](./examples/portable-package-release/EXECMAP.md): example initiative
- [skills/execmap/SKILL.md](./skills/execmap/SKILL.md): tracked Codex skill
- `src/cli.ts`: minimal Bun CLI for scaffolding, progression, and validation

## Install

`execmap` is published as a Bun-first package. Use Bun `1.3+`.

```bash
bunx @electric_coding/execmap init "portable package release"
```

For a persistent install:

```bash
bun install -g @electric_coding/execmap
execmap init "portable package release"
```

## Quick Start

1. Keep a root [`PLAN.md`](./PLAN.md) that points to the active initiative.
2. Run `execmap init "<initiative>"` to scaffold `plans/<initiative>/`.
3. Fill in `EXECMAP.md` before implementation starts.
4. Add step docs only for steps that need more definition with `execmap stepdoc <target> <step>`.
5. Use `execmap status` to inspect the current plan state, `execmap next` to
   identify the current step, and `execmap done` when that step is actually
   complete.
6. Use `execmap activate` or `execmap close` when the repo's active plan
   changes.

## CLI

This repo ships a small CLI so the format is usable without manual
copy-pasting. In a checkout, use `bun run src/cli.ts ...`. From an installed
package, use `execmap ...`.

```bash
bun install
bun run check
bun run src/cli.ts init "portable package release"
bun run src/cli.ts status
bun run src/cli.ts stepdoc plans/portable-package-release 2
bun run src/cli.ts next plans/portable-package-release
bun run src/cli.ts done plans/portable-package-release
bun run src/cli.ts activate plans/portable-package-release
bun run src/cli.ts close
bun run src/cli.ts check examples/portable-package-release
```

Commands:

- `init`: scaffold a new initiative folder with an `EXECMAP.md` and default plain-text steps
- `next`: print the next unchecked step from an execution map
- `status`: print the current active plan or explicit target plus the next actionable step
- `done`: mark the first unchecked step complete in an execution map
- `stepdoc`: create and link a step doc for one existing execution-map item
- `activate`: point `PLAN.md` at an existing execution map
- `close`: clear the active plan and archive it under completed plans
- `check`: validate required sections, step links, and step docs
- `typecheck`: validate the Bun TypeScript CLI and tests with `tsc --noEmit`

## Releases

Normal PRs do not need release metadata.

When you want to cut a release, run:

```bash
bun run release -- <patch|minor|major|x.y.z>
```

That command:

- bumps the package version
- updates `CHANGELOG.md`
- runs the release gate
- commits and tags the release
- pushes the tag for publication

The GitHub Actions release workflow then publishes the tagged version and uses
the matching `CHANGELOG.md` entry for the GitHub release notes.

Use [CHANGELOG.md](./CHANGELOG.md) for shipped history and
[docs/release.md](./docs/release.md) for the maintainer runbook.
