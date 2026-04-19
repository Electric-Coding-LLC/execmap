# execmap

A lightweight planning system for mapping scoped work from start to finish.

`execmap` `0.1` is a Bun-first CLI and skill bundle for planning bounded work
before implementation starts.

## What It Is

`execmap` is a simple way to plan bounded work before implementation starts.

It is built around two ideas:

- every meaningful initiative gets one top-level execution map
- each meaningful step can have a small step doc when it needs more thought

The system is meant to help an agent work independently without turning project
planning into overhead.

## Core Model

Each initiative has one control document:

- `EXECMAP.md`

That file defines:

- the goal
- the guardrails
- the ordered execution path
- the definition of done

The execution path is a checkbox list. The next unchecked item is the default
next step.

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
plans/
  <initiative-name>/
    EXECMAP.md
    01-...
    02-...
    03-...
```

This repo provides templates and examples, but each project keeps its own local
execution maps.

## Authoring Conventions

- Keep initiative folders self-contained.
- Name step docs with a numeric prefix so the files match execution order.
- If a step doc exists, link to it from the execution map.
- Keep step status only in `EXECMAP.md`, not duplicated in step docs.

## In This Repo

- [docs/spec.md](./docs/spec.md): canonical system definition
- [docs/releases/0.1.md](./docs/releases/0.1.md): `0.1` release scope and limits
- [templates/EXECMAP.md](./templates/EXECMAP.md): top-level map template
- [templates/STEP.md](./templates/STEP.md): step-doc template
- [examples/portable-package-release/EXECMAP.md](./examples/portable-package-release/EXECMAP.md): example initiative
- [skills/execmap/SKILL.md](./skills/execmap/SKILL.md): tracked Codex skill
- `src/cli.ts`: minimal Bun CLI for scaffolding and validation

## Install

`execmap` is published as a Bun-first package. Use Bun `1.3+`.

```bash
bunx execmap init "portable package release"
```

For a persistent install:

```bash
bun install -g execmap
execmap init "portable package release"
```

## Quick Start

1. Run `execmap init "<initiative>"` to scaffold `plans/<initiative>/`.
2. Fill in `EXECMAP.md` before implementation starts.
3. Add step docs only for steps that need more definition.
4. Execute from the first unchecked item.

## CLI

This repo ships a small CLI so the format is usable without manual
copy-pasting. In a checkout, use `bun run src/cli.ts ...`. From an installed
package, use `execmap ...`.

```bash
bun install
bun run check
bun run src/cli.ts init "portable package release"
bun run src/cli.ts next plans/portable-package-release
bun run src/cli.ts check examples/portable-package-release
```

Commands:

- `init`: scaffold a new initiative folder with an `EXECMAP.md` and numbered step docs
- `next`: print the next unchecked step from an execution map
- `check`: validate required sections, step links, and step docs
- `typecheck`: validate the Bun TypeScript CLI and tests with `tsc --noEmit`

## Release Notes

The `0.1` release is intentionally small:

- the public CLI surface is `init`, `next`, and `check`
- the tracked `skills/execmap/` bundle stays aligned with the CLI workflow
- packaged-install verification is part of the release contract

See [docs/releases/0.1.md](./docs/releases/0.1.md) for the shipped scope,
verification path, and known limits.
