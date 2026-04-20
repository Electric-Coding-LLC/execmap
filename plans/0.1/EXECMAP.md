# Execution Map

## Goal

Ship `execmap` `0.1` as a public, documented release with a clear install path
and verification that matches the shipped artifact.

## Guardrails

- Keep the release centered on the existing `init`, `next`, and `check`
  workflow rather than expanding the product surface.
- Do not mark any release step complete until the observable release artifact,
  docs, and verification all agree on the same user path.
- Preserve the tracked `skills/execmap/` content as part of the shipped story;
  do not let the package and skill instructions drift apart.
- Treat install/runtime behavior as a release contract, not an implementation
  detail. If `0.1` depends on Bun, state that explicitly; if it should not,
  change the packaging before release.
- Keep the initiative focused on making the existing repo publishable and
  supportable. Defer post-`0.1` feature ideas to a later map.

## Execution Map

- [x] [Define the `0.1` release scope](./01-define-0-1-scope.md)
- [x] [Lock the install and runtime contract](./02-lock-install-runtime-contract.md)
- [x] [Prepare the public package and docs](./03-prepare-public-package-and-docs.md)
- [x] [Verify the shipped install path](./04-verify-shipped-install-path.md)
- [x] [Publish and close the `0.1` release](./05-publish-and-close-release.md)

## Done When

- `execmap` has one explicit `0.1` distribution story and the package metadata,
  README, skill, and release notes all describe the same install path.
- The released artifact is verified through the path real users will take,
  rather than only through repo-local development commands.
- `0.1` is published from a reviewed, green PR and the repo contains the
  release notes and follow-up state needed to continue from `main`.
