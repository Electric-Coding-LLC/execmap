# Define the runtime contract

[Back to Execution Map](./EXECMAP.md)

## Goal

Make the contributor runtime and installed-user runtime explicit so the
initiative has a clear portability target.

## Tasks

- Describe the contributor runtime that remains acceptable for local
  development.
- Define the default runtime expected for installed users.
- Make the intended shipped package shape explicit.

## Constraints

- Do not broaden the product scope while defining the runtime split.
- Do not require a full architecture rewrite if packaging can solve the problem.

## Exit Criteria

- The contributor runtime and installed-user runtime are clearly separated.
- The expected package shape is explicit enough to guide implementation.
