# Design `PLAN.md` Lifecycle Behavior and Commands

[Back to Execution Map](./EXECMAP.md)

## Goal

Define the exact contract for `PLAN.md` when a repo has no active initiative
and specify the bounded lifecycle command behavior for `activate` and `close`.

## Tasks

- Specify how `PLAN.md` represents the no-active-plan state.
- Define the target resolution, mutation rules, and output contract for
  `activate`.
- Define the mutation rules and output contract for `close`.
- List the failure cases so the implementation stays predictable.

Command contract:

- `PLAN.md` may contain either one active plan link or `- None` under
  `## Active Plan`.
- `execmap activate <target>` resolves `<target>` through the existing execmap
  path rules and rewrites the repo `PLAN.md` so that target becomes active.
- `activate` replaces the active entry only; it does not auto-move the previous
  active entry into completed plans.
- `execmap close` rewrites `PLAN.md` so `Active Plan` becomes `- None` and the
  previously active entry is retained under `Completed Plans` without
  duplication.
- `check` accepts a repo with no active plan and reports success for the plan
  index state.

Failure cases:

- `next` and `done` fail clearly when the repo has no active plan.
- `activate` fails if the target cannot be resolved to an existing
  `EXECMAP.md`.
- `close` fails if there is no active plan to close.
- `PLAN.md` remains invalid if `Active Plan` contains neither a link nor
  `- None`, or contains both.

## Constraints

- Reuse the current path-resolution model where possible instead of inventing a
  separate target grammar.
- Keep command output explicit and small enough for terminal use.
- Preserve completed-plan links exactly as written when they do not need to
  change.

## Exit Criteria

- The `PLAN.md` no-active-plan contract is explicit.
- The lifecycle command behavior and main failure cases are listed before
  implementation starts.
- The implementation step can proceed with a bounded test plan.
