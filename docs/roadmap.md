# execmap Roadmap

This roadmap is the durable version-level control document for the repo. It
does not replace `PLAN.md`, and it does not pre-create active `EXECMAP.md`
files for work that has not started yet.

When a roadmap item becomes real work, it should move into `plans/<version>/`
with its own `EXECMAP.md`, and `PLAN.md` should point to that active plan.

## How It Fits

This roadmap is part of the `execmap` workflow and carries minimal
version-level lifecycle state. It is not the place for detailed execution
status.

- `PLAN.md` answers what is active now.
- `EXECMAP.md` answers what to execute now.
- this roadmap answers version order, version scope, and version lifecycle.

That means:

- roadmap items do not belong in `PLAN.md`
- roadmap items do not get checkbox execution state
- roadmap items should not have pre-created `plans/<version>/EXECMAP.md` files
- a roadmap item becomes real only when it is promoted into a versioned
  initiative folder

## Status Model

Each near-term version should carry one `Status:` line directly under the
version heading.

Supported values:

- `planned`: not promoted yet
- `active`: promoted and currently being executed
- `completed`: merged and complete as an internal roadmap version
- `blocked`: intentionally paused on a real blocker

Rules:

- The roadmap stays ordered. The next version is the first one that is not
  `completed`.
- Only one version may be `active` at a time.
- Add an `Execmap:` line only after promotion into `plans/<version>/EXECMAP.md`.
- Keep step-level status in the promoted `EXECMAP.md`, not here.
- Public package release and publication stay separate from roadmap completion.

## Current State

`execmap` has completed five focused roadmap versions:

- `0.1`: public package, install contract, release/docs baseline
- `0.2`: `done` command for step progression
- `0.3`: `PLAN.md` lifecycle commands with `activate` and `close`
- `0.4`: lean authoring with opt-in `stepdoc`
- `0.5`: read-only plan visibility through `execmap status`

Those versions established the core model:

- `PLAN.md` is the repo index
- `EXECMAP.md` is the source of truth
- step docs are optional support docs, not required scaffolding

## Near-Term Roadmap

### `0.5`: Plan Visibility
Status: completed
Execmap: `plans/0.5/EXECMAP.md`

Goal: make it easier to understand repo state without manually opening
`PLAN.md` and `EXECMAP.md`.

Likely scope:

- add one bounded read-only command that summarizes the current plan state
- show whether the repo has an active plan, which map is active, and what the
  next unchecked step is
- make the no-active-plan and all-steps-complete states explicit in one place
- document the command in the README, skill, and examples

Keep out of scope:

- dashboard-style reporting
- multi-plan prioritization
- issue tracker or git integration

### `0.6`: Roadmap Integration
Status: completed
Execmap: `plans/0.6/EXECMAP.md`

Goal: integrate a repo roadmap into the `execmap` workflow without turning the
roadmap into active execution state.

Likely scope:

- define the supported role of a roadmap inside an `execmap` repo
- document where the roadmap lives and how it relates to `PLAN.md`
- define the promotion path from roadmap item to `plans/<version>/EXECMAP.md`
- add at most one read-only helper that can surface roadmap context alongside
  the active plan without merging the two
- keep the README, spec, and examples aligned on the same promotion model

Keep out of scope:

- treating roadmap items as active plans
- giving roadmap items checkbox execution state
- auto-generating future initiative folders from roadmap entries
- supporting multiple simultaneous active initiatives

### `0.7`: Stronger Authoring Checks
Status: completed
Execmap: `plans/0.7/EXECMAP.md`

Goal: catch more real authoring mistakes before execution starts.

Likely scope:

- extend `check` to detect template residue and placeholder text that was never
  replaced
- validate linked step docs more tightly against their execution-map items
- warn on obvious numbering or file-shape drift inside an initiative folder
- keep validation output actionable and file-local

Keep out of scope:

- generic markdown linting
- editorial style enforcement
- cross-repo planning policies

### `0.8`: Small Editing Helpers
Status: completed
Execmap: `plans/0.8/EXECMAP.md`

Goal: add one more bounded authoring helper only if it clearly reduces
hand-editing without turning `execmap` into a generic markdown editor.

Candidate directions:

- a helper to scaffold or rewrite one targeted execution-map item safely
- a helper to create a new initiative from a slightly more explicit template
- a helper to inspect or validate a step doc against the linked map item before
  execution begins

Bar for inclusion:

- preserves `EXECMAP.md` as the source of truth
- mutates only a narrowly targeted part of the plan
- stays understandable from the CLI help alone

## Later

Longer-term work should stay conservative. The product gets weaker if it turns
into a project-management layer instead of a compact planning system.

Good later directions:

- more example initiatives from real repo usage
- stronger docs around when to use `execmap` and when not to
- stability hardening for packaged CLI use and release verification

Avoid by default:

- step insertion and renumbering workflows
- reopening and state-history features
- generic markdown editing commands
- boards, timelines, or status databases

## Selection Rule

Only one roadmap item should become an active initiative at a time. When that
happens:

1. create `plans/<version>/EXECMAP.md`
2. change that version to `Status: active`
3. add `Execmap: plans/<version>/EXECMAP.md`
4. point `PLAN.md` at that initiative
5. keep concrete step status in the promoted `EXECMAP.md`
6. change the roadmap entry to `Status: completed` only after the work is merged
7. remove ambiguity from this roadmap if priorities changed
