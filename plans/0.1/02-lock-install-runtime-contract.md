# Lock the Install and Runtime Contract

[Back to Execution Map](./EXECMAP.md)

## Goal

Choose and document the exact runtime story for installed `execmap` users so
the public release does not ship an ambiguous or misleading package.

## Tasks

- Decide whether `0.1` intentionally requires Bun for installed use or whether
  the package should run without a Bun development environment.
- Audit the current package entrypoint, shebang, and published-file story
  against that decision.
- List the required package metadata changes for the chosen release path.
  Examples: `private`, `files`, `bin`, engine declarations, release scripts.
- Update the release docs plan so the install instructions and runtime contract
  use the same language everywhere.

## Constraints

- The contract must match what a fresh user can actually install and run.
- Do not rely on repo-local execution details as a substitute for an installed
  package contract.
- If the package remains Bun-dependent in `0.1`, that dependency must be clear
  and intentional in both docs and metadata.

## Exit Criteria

- There is one explicit decision for the installed runtime contract.
- The required code, packaging, and docs changes to support that contract are
  identified and bounded for the remaining release steps.
