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
- npm trusted publishing configured for `Electric-Coding-LLC/execmap`, or an
  equivalent npm publish path that the `release.yml` workflow can use

## Preflight

Run the full local gate before creating release artifacts:

```sh
bun install
bun run check
```

## Release Workflow

`execmap` uses GitHub Actions for package publication.

The release workflow lives at `.github/workflows/release.yml` and runs when a
tag like `v0.1.0` is pushed.

Before pushing the tag:

- make sure `package.json` is already at the intended release version
- make sure the matching commit is on `main`
- wait for `CI / verify` to succeed on that `main` commit

For the current `0.1.0` release, the sequence is:

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
npm view execmap version
```

Confirm the GitHub release exists:

```sh
gh release view v0.1.0
```

## If Publish Fails

The most likely remaining blocker for `0.1` is npm-side configuration.

If the workflow fails at `npm publish`:

- confirm trusted publishing is configured for this repository on npm
- confirm the package name is still intended to be `execmap`
- rerun the workflow after the npm-side fix, or push the tag again if needed
