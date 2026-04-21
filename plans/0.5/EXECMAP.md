# Execution Map

## Goal

Ship `0.5` as a plan-visibility release that gives users one supported
read-only CLI path to understand current repo planning state without manually
opening `PLAN.md` and `EXECMAP.md`.

## Guardrails

- Keep the release centered on read-only visibility into the current plan
  state, not generic plan editing.
- Preserve `PLAN.md` as the repo index and `EXECMAP.md` as the source of truth
  for detailed execution status.
- Make the no-active-plan and all-steps-complete states explicit and
  understandable from command output alone.
- Do not add roadmap mutation, step editing, renumbering, or plan-switching
  behavior in this release.
- Keep the command surface small enough that README, skill guidance, tests, and
  shipped behavior can all describe the same contract.

## Execution Map

- [x] Define the `0.5` plan-visibility command contract.
- [x] Implement the read-only plan-visibility CLI flow.
- [x] Add repo-root and explicit-target coverage for active, no-active, and fully-complete states.
- [x] Update README, skill, and examples for the shipped `0.5` workflow.
- [x] Verify the release slice and leave the repo ready for the next roadmap promotion.

## Done When

- Users have one documented CLI command that reports the current plan state
  without requiring manual inspection of repo docs.
- The command clearly handles repos with an active plan, repos with no active
  plan, and execution maps with no remaining open steps.
- README, skill guidance, tests, and shipped CLI behavior all describe the
  same plan-visibility contract.
