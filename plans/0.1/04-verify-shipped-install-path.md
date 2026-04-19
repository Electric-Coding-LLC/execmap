# Verify the Shipped Install Path

[Back to Execution Map](./EXECMAP.md)

## Goal

Prove that the release artifact works the way the `0.1` docs claim a fresh user
will use it.

## Tasks

- Add or update verification so it exercises the packaged or distributed form
  of `execmap`, not just the repo checkout.
- Keep the existing repo gates green: `bun run typecheck`, `bun test`, and the
  example validation path.
- Run the release-specific smoke flow from a clean location and capture the
  exact commands that should be reusable in CI or release prep.
- Close any gaps where CI currently passes but the shipped install path is still
  unproven.

## Constraints

- The release verification must cover the actual install/runtime contract chosen
  in step 2.
- Avoid one-off manual checks that cannot be repeated during future releases.
- Do not treat green development tests as sufficient if they do not exercise
  the shipped artifact.

## Exit Criteria

- A reproducible release smoke path exists and passes against the `0.1`
  artifact.
- The repo's normal verification and the release-specific verification agree on
  what is being shipped.
