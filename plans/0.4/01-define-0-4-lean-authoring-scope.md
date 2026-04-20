# Define the `0.4` Lean-Authoring Scope

[Back to Execution Map](./EXECMAP.md)

## Goal

Define the smallest coherent release that fixes the mismatch between the
documented optional step-doc model and the current scaffolded authoring path.

## Tasks

- Confirm the specific contradiction between the docs/spec and `init`.
- Name the smallest authoring change that should ship in `0.4`.
- Record the non-goals that keep the release out of generic plan-editing
  territory.

Selected `0.4` scope:

- Change `init` so the default scaffold creates `PLAN.md` and `EXECMAP.md`
  without linked step docs.
- Keep ordered default steps in the generated `EXECMAP.md`, but render them as
  plain checkbox items instead of links.
- Add one bounded helper that creates a step doc for an existing execution-map
  item and links that item to the new file.
- Update docs, examples, templates, and tests to describe step docs as opt-in.

Explicit non-goals for `0.4`:

- inserting new execution-map items
- deleting or renumbering steps
- reopening completed steps
- generic `PLAN.md` or `EXECMAP.md` editing helpers
- bulk step-doc generation after scaffold time

## Constraints

- Keep the release small enough to implement, document, and verify in one
  bounded slice.
- Preserve hand-authored markdown outside the targeted execution-map line when
  linking a step doc.
- Do not require step docs for `next`, `done`, or `check` to work on a newly
  initialized plan.

## Exit Criteria

- The `0.4` release surface clearly names the default scaffold change and the
  one opt-in helper.
- The non-goals are explicit enough to prevent broader authoring-tool drift.
- The command-design step can proceed without reopening the release theme.
