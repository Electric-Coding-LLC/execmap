# Execution Map

## Goal

Ship `execmap` `0.4` as a lean-authoring release that makes step docs opt-in
instead of scaffolding them for every new initiative by default.

## Guardrails

- Keep the release centered on authoring ergonomics, not generic markdown
  editing.
- Preserve `PLAN.md` as an index and `EXECMAP.md` as the source of truth for
  step status.
- Make the default `init` output match the documented model that step docs are
  optional and only exist when a step needs more definition.
- Add at most one bounded helper for creating and linking a step doc after
  scaffold time.
- Do not add step insertion, step deletion, renumbering, reopen flows, or
  broader `EXECMAP.md` editing helpers in this release.

## Execution Map

- [x] [Define the `0.4` lean-authoring scope](./01-define-0-4-lean-authoring-scope.md)
- [x] [Design the opt-in step-doc helper](./02-design-step-doc-helper.md)
- [x] Implement the lean-authoring CLI and template changes
- [x] Document and verify the shipped `0.4` workflow

## Done When

- `execmap init` creates a usable initiative scaffold without forcing linked
  step docs into the default path.
- Users have one supported CLI path to create and link a step doc only when a
  specific execution-map item needs more definition.
- README, spec, templates, tests, and shipped CLI behavior all describe the
  same lean-authoring model.
