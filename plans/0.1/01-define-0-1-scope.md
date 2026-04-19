# Define the `0.1` Release Scope

[Back to Execution Map](./EXECMAP.md)

## Goal

Decide what `0.1` is actually promising so the release work stays bounded and
the rest of the plan can optimize for that promise.

## Tasks

- Define the user-facing scope for `0.1`, centered on the existing `init`,
  `next`, and `check` commands plus the tracked `execmap` skill.
- Confirm the intended release channel or channels for `0.1`.
  Examples: npm package, GitHub release artifact, repo-consumed skill/docs.
- Write the non-goals for `0.1` so later work does not quietly turn this into a
  larger CLI or planning-system expansion.
- Decide what documentation must exist at release time: install, quick start,
  example flow, and release notes.

## Constraints

- Keep `0.1` focused on shipping the current bootstrap product, not inventing a
  broader roadmap.
- Do not assume a public distribution channel until the install/runtime step
  proves it is supportable.
- Scope decisions must be concrete enough that package, docs, and verification
  can be derived from them without guesswork.

## Exit Criteria

- A short `0.1` scope statement exists and clearly names the supported release
  channel, supported commands, and explicit non-goals.
- The rest of the release plan can proceed without ambiguity about what is in
  or out for `0.1`.
