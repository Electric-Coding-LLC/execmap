# Execution Map

## Goal

Add one bounded read-only roadmap helper and align docs around roadmap promotion.

## Guardrails

- Keep `PLAN.md` as the active-plan index and `EXECMAP.md` as the execution source of truth.
- Do not turn roadmap entries into checkbox-tracked active work.
- Avoid adding roadmap mutation, automatic promotion, or multi-plan orchestration.

## Execution Map

- [x] Lock the `0.6` helper contract and roadmap-promotion rules.
- [x] Add one read-only CLI helper that surfaces roadmap context beside the active plan.
- [x] Cover the helper with repo-root CLI tests.
- [x] Align README, spec, skill, and roadmap docs with the shipped helper.
- [x] Verify the repo and close the release truthfully.

## Done When

- `execmap roadmap` reports the current roadmap release and current active plan without merging their states.
- The docs and skill describe one-release-at-a-time roadmap promotion consistently.
- Repo checks pass and the release can be marked shipped truthfully.
