# Execution Map

## Goal

Ship `execmap` `0.3` as a plan-lifecycle release that supports repos with no
active initiative and provides a supported CLI path to activate or close the
current plan without hand-editing `PLAN.md`.

## Guardrails

- Keep the release centered on `PLAN.md` lifecycle management rather than
  broader markdown editing or project-management features.
- Support `Active Plan: None` as a first-class repo state across the CLI,
  docs, tests, and tracked skill.
- Add only the smallest coherent plan-lifecycle command surface needed after
  `init`, `next`, `done`, and `check`.
- Preserve `PLAN.md` as an index and `EXECMAP.md` as the source of truth for
  step status.
- Do not add reopening, renumbering, step insertion, or generic list-editing
  helpers in this release.
- Keep success and failure output explicit so users can tell whether they are
  missing an active plan or targeting the wrong repo state.

## Execution Map

- [x] [Define the `0.3` plan-lifecycle scope](./01-define-0-3-plan-lifecycle-scope.md)
- [x] [Design `PLAN.md` lifecycle behavior and commands](./02-design-plan-lifecycle-commands.md)
- [x] Implement `PLAN.md` lifecycle support
- [x] Document and verify the shipped `0.3` workflow

## Done When

- Repos with `Active Plan: None` are supported by the documented `execmap`
  contract and no longer break core CLI flows.
- Users can activate an existing initiative or close the current active plan
  through supported CLI commands instead of hand-editing `PLAN.md`.
- README, tracked skill guidance, tests, and shipped CLI behavior all describe
  the same plan-lifecycle model.
