# Design the Opt-In Step-Doc Helper

[Back to Execution Map](./EXECMAP.md)

## Goal

Define the smallest supported CLI path for creating a step doc only when an
existing execution-map item needs more definition.

## Tasks

- Choose the command name and target-selection rules.
- Define how the command chooses the step-doc filename.
- Define the mutation rules for creating the new file and linking the targeted
  execution-map item.
- List the failure cases so the implementation stays predictable.

Command contract:

- Add `execmap stepdoc <target> <step>` as the opt-in helper for step-doc
  creation.
- `<target>` resolves through the existing execmap path rules.
- `<step>` selects an existing execution-map item by 1-based index or exact
  current label.
- The command creates the numbered step-doc file beside `EXECMAP.md` using the
  targeted step number and a slugified form of the current label.
- The targeted checkbox item is rewritten from plain text to a markdown link to
  the new step doc while preserving its checked state.
- If the item is already linked, the command fails instead of overwriting the
  existing step doc.

Failure cases:

- `stepdoc` fails if the target cannot be resolved to an existing
  `EXECMAP.md`.
- `stepdoc` fails if the selected step does not exist.
- `stepdoc` fails if the selected step already links to a step doc.
- `stepdoc` fails if the destination step-doc path already exists.

## Constraints

- Reuse the existing execution-map parsing model rather than inventing a second
  step state format.
- Keep the command output explicit and small enough for terminal use.
- Preserve user-authored markdown outside the targeted line.

## Exit Criteria

- The `stepdoc` command contract is specific enough to implement with bounded
  tests.
- The selection rules and main failure cases are listed before coding starts.
- The implementation step can proceed without expanding the release scope.
