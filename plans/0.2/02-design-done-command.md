# Design the `done` Command

[Back to Execution Map](./EXECMAP.md)

## Goal

Define the exact command behavior for `done`.

## Tasks

- Specify how `done` resolves its target execution map.
- Specify how `done` chooses which checkbox line to update and how it rewrites
  that line.
- Define failure cases and output rules so the command stays predictable.

Command contract:

- `execmap done [target]`
- If `target` is omitted, resolve from `.` using the existing `findExecmap`
  behavior.
- Resolve directories, repo roots, and `PLAN.md` through the same path rules as
  `next` and `check`.
- Parse the `Execution Map` section and select the first unchecked item.
- Rewrite only that checkbox line from `- [ ] ...` to `- [x] ...`.
- Preserve the rest of the file exactly as written.
- Print `Done: <label>` on success.

Failure cases:

- If the execution map has no checkbox items, exit non-zero with the same
  structure-oriented error that `check` would surface for the file.
- If all steps are already complete, exit non-zero with a clear message.
- If the target cannot be resolved to an existing execmap, exit non-zero.

## Constraints

- Reuse the current path-resolution model where possible instead of inventing a
  separate target grammar.
- Keep the command safe for hand-authored markdown that follows the existing
  contract.
- Prefer the common happy path of “mark the first unchecked step done” over a
  broader editing interface.

## Exit Criteria

- The target resolution and output contract for `done` is explicit.
- The main edge cases are listed before implementation starts.
- The implementation step can proceed with a bounded test plan.
