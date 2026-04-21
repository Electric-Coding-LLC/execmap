---
name: execmap
description: Plan non-trivial bounded work with one EXECMAP.md, optional step docs, and ordered execution from the next unchecked item. Use when a feature, refactor, migration, versioned roadmap slice, or cleanup pass should be mapped before implementation starts.
---

# Execmap

## Goal

Map bounded work before implementation so Codex can execute from a clear,
ordered plan without drifting.

## Use When

- The user explicitly asks for `execmap` or an execution map.
- The task is a non-trivial feature, refactor, migration, versioned roadmap
  slice, or cleanup
  pass.
- The work is large enough that sequencing and scope control matter.

Do not use `execmap` for trivial one-step edits.

## Core Model

- The repo root has one `PLAN.md` that indexes the repo's current planning state.
- Each initiative has one top-level `EXECMAP.md`.
- `PLAN.md` is an index only. `EXECMAP.md` is the source of truth for sequence
  and status.
- `PLAN.md` can point to one active `plans/<initiative>/EXECMAP.md` or state
  `None` when there is no active initiative.
- A repo may also keep a roadmap for version order and minimal version
  lifecycle state.
- Step docs are optional and exist only for steps that need more definition.
- The next unchecked item in `Execution Map` is the default next action.

Required `EXECMAP.md` sections:

- `Goal`
- `Guardrails`
- `Execution Map`
- `Done When`

Required step-doc sections:

- `Goal`
- `Tasks`
- `Constraints`
- `Exit Criteria`

## Workflow

1. Decide whether the work is bounded and non-trivial.
- If no, do not create an execution map.

2. Choose the initiative folder.
- Default to `plans/<initiative-slug>/`.
- Keep the initiative self-contained in that directory.

3. Maintain the repo entrypoint.
- Create or update a root `PLAN.md`.
- Point it at the active `plans/<initiative>/EXECMAP.md`, or set `Active Plan`
  to `None` when the repo has no active initiative.
- Keep `PLAN.md` as an index only. Do not duplicate checkbox state there.

4. Use a roadmap only at version level when needed.
- If the repo has a roadmap, keep it separate from `PLAN.md`.
- A roadmap may carry minimal version-level state such as `planned`, `active`,
  `completed`, or `blocked`.
- Do not put step-level checkbox state in the roadmap.
- When a roadmap version becomes active work, promote it into
  `plans/<version>/EXECMAP.md` and point `PLAN.md` at that initiative.
- Treat roadmap completion as internal delivery completion. Public release or
  publish steps stay separate unless the user explicitly asks for them.

5. Create the top-level map before implementation.
- Write the goal in one sentence.
- Write guardrails that prevent scope drift.
- Write the full ordered path from start to finish as a checkbox list.
- Write outcome-focused `Done When` conditions.

6. Create step docs only where needed.
- Use numbered filenames that match execution order.
- Link any step doc from the execution map item it supports.
- Add a backlink from each step doc to `EXECMAP.md`.

7. Execute from the map.
- Treat the first unchecked item as the current step.
- Use `execmap status ...` when you need one read-only view of the current plan
  state from repo root or an explicit target.
- Use `execmap roadmap ...` when the repo has a roadmap and you need the
  current version context alongside the active plan without merging their
  status.
- Use `execmap done ...` when the current step is actually complete, if that
  helper is available in the repo or installed package.
- Use `execmap activate ...` or `execmap close` when the repo's active plan
  changes.
- Update `EXECMAP.md` before changing sequence or scope.
- Mark a step complete only after its exit criteria are actually true.

8. Keep status in one place.
- Do not duplicate completion state in step docs.
- Do not duplicate completion state in `PLAN.md`.
- Keep detailed execution status in `EXECMAP.md`, not in the roadmap.

## Preferred Tooling

If an `execmap` helper is available in the current environment, use it for
scaffolding and validation.

Common paths:

- `execmap init ...`, `execmap next ...`, `execmap status ...`,
  `execmap roadmap ...`, `execmap done ...`, `execmap rename ...`,
  `execmap activate ...`, `execmap close`, `execmap check ...` if installed as
  a command or Bun package
- `bun run src/cli.ts ...` in a repo that vendors the Bun helper

Use the helper when it reduces manual work. Do not block on it.

## Fallback Mode

If no helper is available, create or update the markdown files directly.

Minimum manual scaffold:

- `PLAN.md`
- `plans/<initiative>/EXECMAP.md`
- optional roadmap such as `docs/roadmap.md`
- optional numbered step docs such as `01-define-scope.md`

The workflow still applies even with no CLI.

## Output Behavior

When introducing `execmap` into a repo or task:

- Create the map instead of only describing it abstractly.
- Create or update `PLAN.md` so the repo state is discoverable from the repo
  root.
- If the repo uses a roadmap, keep its version-level state aligned with the
  promoted initiative and the current `PLAN.md` entry.
- If the user asked for execution, start from the first unchecked item after
  the map is in place.
- If the map already exists, update it before implementing work that changes the
  path.
- Before calling a plan structurally sound, validate section shape and linked
  step docs with the helper if available, otherwise verify manually.

## Guardrails

- Do not create execution maps for trivial edits.
- Do not start implementation before the top-level path is mapped when the work
  is clearly non-trivial.
- Do not leave the repo's planning state ambiguous from the repo root.
- Do not let step docs become a second source of truth.
- Do not let a roadmap become a second execution map.
- Do not mark steps complete based on intent; use observable exit criteria.
- Keep plans compact and practical.
