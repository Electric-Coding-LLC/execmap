# Publish and Close the `0.1` Release

[Back to Execution Map](./EXECMAP.md)

## Goal

Ship `0.1` from a clean release candidate and leave the repo in an honest
post-release state.

## Tasks

- Prepare the release PR with the package, docs, verification, and release-note
  changes from the earlier steps.
- Merge through the normal protected-branch path with green `CI / verify` and
  any required conversation resolution.
- Publish the release through the chosen channel and verify the published
  artifact or release entry is live.
- Update any repo state that should immediately reflect the shipped release.
  Examples: version metadata, changelog, follow-up notes, next-plan seed.

## Constraints

- Do not publish from an unreviewed or failing release candidate.
- Keep the release closeout factual; only claim the artifact or instructions are
  live after verifying them.
- Leave follow-up work for a later map rather than mixing new scope into the
  release closeout.

## Exit Criteria

- `0.1` is published through the intended channel from a green, merged change.
- The repo records enough release context that future work can start from
  `main` without reconstructing what shipped.
