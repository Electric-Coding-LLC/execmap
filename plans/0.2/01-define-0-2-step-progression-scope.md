# Define the `0.2` Step-Progression Scope

[Back to Execution Map](./EXECMAP.md)

## Goal

Define the smallest coherent post-`0.1` release to ship after the scaffold and
read-only commands.

## Tasks

- Confirm the smallest write path that complements `init`, `next`, and `check`.
- Name the specific `0.2` command and its intended user path:
  `execmap done [target]`.
- Record what stays out of scope so implementation does not turn into a general
  markdown editor.

Selected `0.2` scope:

- Add `done` as the first mutating CLI command.
- Support the common happy path of advancing the active execution map from the
  repo root or a direct execmap target.
- Keep the release centered on execution-map progression, not full plan editing.

Explicit non-goals for `0.2`:

- `PLAN.md` mutation or active-plan switching
- reopening completed steps
- inserting, deleting, or renumbering steps
- generic markdown editing helpers

## Constraints

- Keep `0.2` small enough to implement, document, and verify in one release
  slice.
- Preserve the `PLAN.md` index model and `EXECMAP.md` status model.
- Do not broaden the scope to generic plan authoring helpers, plan switching,
  or step-list editing unless the selected command requires them.

## Exit Criteria

- The release scope clearly names the intended `0.2` command.
- The non-goals are explicit enough to prevent opportunistic feature creep.
- The next design step can proceed without reopening the release theme.
