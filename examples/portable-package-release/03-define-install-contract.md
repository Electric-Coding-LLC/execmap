# Define the install contract

[Back to Execution Map](./EXECMAP.md)

## Goal

Make the packaged install path explicit so implementation and verification work
against one clear user-facing contract.

## Tasks

- Define what installed users should receive in the published package.
- Define how the shipped binaries are expected to launch.
- Define which install path the docs and checks should treat as primary.

## Constraints

- Keep the install story simple and default-oriented.
- Do not require installed users to understand repo internals.

## Exit Criteria

- The shipped package shape is explicit.
- The expected launch path is explicit.
- Documentation and verification can reference one primary install contract.
