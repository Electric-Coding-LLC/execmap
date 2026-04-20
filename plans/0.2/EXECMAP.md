# Execution Map

## Goal

Ship `execmap` `0.2` as a step-progression release that lets users advance an
active execution map without hand-editing markdown.

## Guardrails

- Keep the release centered on the existing planning model rather than turning
  `execmap` into a general project-management tool.
- Focus `0.2` on the smallest coherent write path after `init`, `next`, and
  `check`: marking the current step done.
- Keep `PLAN.md` as an index and `EXECMAP.md` as the source of truth for step
  status.
- Do not mutate `PLAN.md` or add broader plan-editing commands in this release.
- Add the first mutating command only where the repo can document and verify a
  clear, shipped user path.
- Preserve the compact markdown contract; avoid generating noisy state or
  introducing a second place to track completion.
- Preserve user-authored markdown structure by rewriting only the targeted
  checkbox line rather than re-rendering full files.
- Defer plan switching, reopen flows, step insertion, and renumbering until the
  first mutating command proves the model.

## Execution Map

- [x] [Define the `0.2` step-progression scope](./01-define-0-2-step-progression-scope.md)
- [x] [Design the `done` command](./02-design-done-command.md)
- [x] Implement `done`
- [x] Document and verify the shipped `0.2` workflow

## Done When

- Users can advance an active execution map through a supported CLI flow
  instead of relying on ad hoc markdown edits for the common happy path.
- The `0.2` CLI surface still reflects the core `execmap` model rather than a
  broader project-tracking system.
- README, skill guidance, and release verification all describe the same
  step-progression workflow.
