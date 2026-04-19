# Prepare the Public Package and Docs

[Back to Execution Map](./EXECMAP.md)

## Goal

Make the repository's package, docs, and skill content consistent with the
chosen `0.1` release contract.

## Tasks

- Apply the package metadata and file-layout changes needed for the selected
  distribution path.
- Update the README quick start to describe installation, command usage, and
  the example release map in release-ready terms.
- Review `skills/execmap/SKILL.md` and any supporting agent config so the
  tracked skill matches the release positioning and instructions.
- Draft concise `0.1` release notes covering scope, install path, and known
  limits.

## Constraints

- Keep documentation concrete and short; release docs should describe the real
  shipped path, not aspirational future behavior.
- Do not add new product features here unless they are required to make the
  chosen release contract true.
- Package contents and docs must stay aligned; avoid publishing files that the
  public story does not explain.

## Exit Criteria

- The package metadata, README, and tracked skill all match the same `0.1`
  product story.
- The repo contains draft release notes that are sufficient to publish from the
  final step without additional planning work.
