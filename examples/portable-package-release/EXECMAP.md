# Execution Map

## Goal

Ship a portability update so installed users can run packaged tooling without
depending on the development runtime.

## Guardrails

- Keep the existing product behavior unchanged.
- Do not expand the product surface during this initiative.
- Keep the work centered on packaging and install reliability.

## Execution Map

- [x] [Define scope](./01-define-scope.md)
- [x] [Define the runtime contract](./02-define-runtime-contract.md)
- [x] [Define the install contract](./03-define-install-contract.md)
- [x] [Implement portable entrypoints](./04-implement-portable-entrypoints.md)
- [x] [Verify packaged install behavior](./05-verify-packaged-install.md)
- [x] [Finalize the release](./06-finalize-release.md)

## Done When

- Installed users can launch the packaged tool through the shipped binaries.
- The installed runtime no longer depends on development-only runtime features.
- Docs, packaging, and verification all describe the same install path.
