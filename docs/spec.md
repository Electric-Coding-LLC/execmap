# execmap Spec

## Purpose

`execmap` is a lightweight planning system for bounded work that should be
fully mapped before implementation starts.

The goal is not to track everything. The goal is to create enough structure for
independent execution.

## Main Artifacts

Every initiative uses:

- one top-level `EXECMAP.md`
- zero or more step docs

The top-level map is the control document. Step docs exist only to support
execution of specific steps.

## `EXECMAP.md`

The top-level map should always contain these sections:

## Goal

Describe the initiative in one sentence.

The goal should be concrete enough to guide decisions without needing the
reader to infer the point of the work.

## Guardrails

List the boundaries that must remain true while the work is executed.

Guardrails usually include:

- scope limits
- non-goals
- compatibility constraints
- sequencing constraints
- quality constraints

The point is to prevent drift.

## Execution Map

This is the full ordered path from start to finish.

Use a checkbox list:

- `[ ]` for open work
- `[x]` for completed work

The execution map should be:

- complete enough to cover the full initiative
- ordered so the next unchecked item is actionable
- specific enough that an agent can move without guessing the sequence
- maintained so status lives here, not duplicated in step docs

Items that need more detail should link to step docs.

Mark a checkbox complete only when the corresponding step exit criteria are
actually satisfied.

## Done When

List the observable conditions that mark the initiative complete.

These should be outcome-focused, not activity-focused.

Good:

- packaged users can run the CLI without the old runtime dependency
- docs and shipped behavior match

Weak:

- implementation is finished
- tests were written

## Step Docs

Step docs are small working specs for individual items in the execution map.

They should contain:

## Goal

What this step is trying to accomplish.

## Tasks

The concrete actions or decisions inside the step.

## Constraints

What the step must not violate.

## Exit Criteria

The observable conditions that make the step complete.

Step docs should not carry their own completion status. Completion is tracked in
`EXECMAP.md`.

## Authoring Conventions

- Keep each initiative in its own directory.
- Name step docs with numeric prefixes that mirror execution order.
- If a step doc exists, link to it from the execution map.
- Keep step-doc titles aligned with the execution-map item they support.
- Add a backlink from each step doc to `EXECMAP.md`.

## Operating Rules

- Write the full execution map before implementation starts.
- Treat `EXECMAP.md` as the source of truth.
- Use step docs only when a step needs real definition.
- Check off a step only after its exit criteria are true.
- Update the map before changing direction.
- Keep docs compact and practical.
- Prefer one initiative map over scattered planning notes.

## Scope Of The System

`execmap` is intentionally small.

It does not try to replace:

- issue tracking
- git history
- release notes
- project management systems

It exists to answer one question clearly:

What is the full path for this bounded piece of work, and what is the next step
to execute?
