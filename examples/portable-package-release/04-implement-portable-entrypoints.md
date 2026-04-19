# Implement Portable Entrypoints

[Back to Execution Map](./EXECMAP.md)

## Goal

Change the shipped entrypoints so installed users can launch packaged tooling
through the intended runtime without depending on development-only assumptions.

## Tasks

- Update shipped entrypoints to use the intended installed runtime.
- Ensure the binaries launch packaged artifacts rather than source files.
- Remove development-only runtime dependencies from the installed code path.

## Constraints

- Preserve the existing user-facing commands.
- Keep the implementation narrow and packaging-focused.

## Exit Criteria

- The packaged binaries launch through the intended runtime.
- Installed execution no longer depends on development-only runtime features.
- Existing tool behavior remains aligned with the current product contract.
