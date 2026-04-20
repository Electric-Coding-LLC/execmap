# Define the `0.3` Plan-Lifecycle Scope

[Back to Execution Map](./EXECMAP.md)

## Goal

Define the smallest coherent post-`0.2` release that closes the active-plan
lifecycle gap without turning `execmap` into a general plan editor.

## Tasks

- Confirm the specific contradiction to fix between the documented `PLAN.md`
  contract and the current CLI behavior.
- Name the lifecycle commands that belong in `0.3`.
- Record the non-goals that stay out of scope for this release.

Selected `0.3` scope:

- Support `Active Plan: None` as a valid `PLAN.md` state.
- Add `execmap activate <target>` to point the repo index at an existing
  initiative.
- Add `execmap close` to clear the active plan and archive it under completed
  plans.
- Make `init`, `next`, `done`, and `check` behave coherently around the new
  lifecycle state.

Explicit non-goals for `0.3`:

- reopening closed plans
- inserting, deleting, or renumbering steps
- generic `PLAN.md` or `EXECMAP.md` editing helpers
- multiple active plans
- automatic release publication

## Constraints

- Keep `0.3` small enough to implement, document, and verify in one bounded
  release slice.
- Preserve the repo-root `PLAN.md` index model instead of introducing a second
  state store.
- Do not auto-complete or archive plans during activation unless the user runs
  the explicit lifecycle command.

## Exit Criteria

- The release scope clearly names the `0.3` lifecycle surface.
- The non-goals are explicit enough to prevent generic plan-editing drift.
- The command-design step can proceed with bounded behavior and tests.
