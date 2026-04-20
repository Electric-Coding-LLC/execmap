# Release Runbook

This guide covers how `execmap` releases are prepared and published.

It is not the source of truth for release scope. Use the docs this way:

- `plans/*/EXECMAP.md`: active execution and completion state
- `CHANGELOG.md`: shipped package history
- `docs/release.md`: publication runbook

Keep those responsibilities separate so the plan does not become a release
manual, and the changelog does not become a step tracker.

## Normal PRs

Normal PRs do not need release metadata files.

## Release Flow

When you want to cut a release, run:

```sh
bun run release -- <patch|minor|major|x.y.z>
```

That command:

- bumps `package.json`
- updates `CHANGELOG.md` from shipped commits since the last published version
- runs `bun run check`
- runs `bun run pack:dry-run`
- creates the release commit
- creates the matching tag
- pushes the release commit by default
- waits for CI on `main`
- pushes the tag so the publish workflow can run

Use `--no-push` to prepare the release commit and tag locally only. Use
`--push-tag` to skip waiting for CI locally and push the tag immediately.

## Publish Workflow

The publish workflow lives at `.github/workflows/release.yml` and runs when a
tag like `v0.2.0` is pushed.

It:

- validates that the tag matches `package.json`
- verifies successful CI for the tagged commit on `main`
- reruns `bun run check`
- publishes to npm if the version is not already published
- creates a GitHub release using the matching `CHANGELOG.md` entry

## Local Checks

Before cutting a release, run the normal local gate if you have not just run
the release helper:

```sh
bun install
bun run check
```

## Verify Publication

After the release workflow runs, confirm the published version:

```sh
npm view @electric_coding/execmap version
```

Confirm the GitHub release exists:

```sh
gh release view v<version>
```

## If Publish Fails

The most likely remaining blockers are workflow, npm-side configuration, or a
stale changelog base tag.

If the workflow fails during publish:

- confirm trusted publishing is configured for this repository on npm
- confirm the package name is still intended to be `@electric_coding/execmap`
- confirm the pushed tag matches `package.json`
- confirm the tagged commit succeeded in `CI / verify` on `main`
- rerun the workflow after the underlying fix
