# Release Guide

This guide covers the `v0.1` release flow for `execmap`.

## Release Message

`execmap v0.1 ships a Bun-first CLI and tracked skill bundle for bounded
execution maps, with repo-root PLAN indexing and packaged-install verification.`

## Scope Guardrails

- Ship the existing `init`, `next`, and `check` CLI surface.
- Keep `PLAN.md` as an index and `EXECMAP.md` as the source of truth.
- Keep the installed runtime Bun-first for `0.1`.
- Keep the release centered on publication and verification, not new product
  expansion.

## Prerequisites

- Bun `>=1.3.11`
- Push access to `origin`
- A clean git worktree
- npm trusted publishing configured for the
  `@electric_coding/execmap` package from `Electric-Coding-LLC/execmap`, or an
  equivalent npm publish path that the `release.yml` workflow can use

## Preflight

Run the full local gate before creating release artifacts:

```sh
bun install
bun run check
bun run pack:dry-run
```

## Release Workflow

`execmap` uses GitHub Actions for package publication.

The release workflow lives at `.github/workflows/release.yml` and runs when a
tag like `v0.1.0` is pushed.

Use the bundled helper to bump the version, run the release gate, create the
release commit, and create the matching local `v<version>` tag:

```sh
bun run release -- patch
```

For the first automated follow-up after `0.1.0`, use:

```sh
bun run release -- patch
```

The helper:

- requires a clean git worktree
- runs `bun run check`
- runs `bun run pack:dry-run`
- commits the version bump as `@electric_coding/execmap@<version>`
- creates the matching local `v<version>` tag
- pushes the release commit by default
- waits for successful `CI` on `main`
- pushes the tag after CI succeeds

Use `--no-push` to create only the local release commit and tag. Use
`--push-tag` to push the tag immediately instead of waiting for CI locally.

If you are not using the helper, make sure all of these are true before pushing
the tag:

- make sure `package.json` is already at the intended release version
- make sure the matching commit is on `main`
- wait for `CI / verify` to succeed on that `main` commit

The equivalent manual sequence is:

```sh
git switch main
git pull --ff-only
git tag v0.1.0
git push origin v0.1.0
```

The workflow then:

- verifies the tag matches `package.json` version
- verifies successful `CI` for the tagged `main` commit
- runs `bun run check`
- skips publish if the version is already on npm
- otherwise runs `npm publish --provenance --access public`
- creates the GitHub release notes for the tag

## Verify Publication

Confirm the published version:

```sh
npm view @electric_coding/execmap version
```

Confirm the GitHub release exists:

```sh
gh release view v0.1.0
```

## If Publish Fails

The most likely remaining blocker for `0.1` is npm-side configuration.

If the workflow fails at `npm publish`:

- confirm trusted publishing is configured for this repository on npm
- confirm the package name is still intended to be `@electric_coding/execmap`
- rerun the workflow after the npm-side fix, or push the tag again if needed
