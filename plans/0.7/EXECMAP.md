# Execution Map

## Goal

Catch more real authoring mistakes before execution starts without turning `check` into generic linting.

## Guardrails

- Keep validation output actionable and file-local.
- Do not introduce generic markdown linting or editorial style rules.
- Avoid turning warnings about file shape into blockers unless the underlying plan is actually invalid.

## Execution Map

- [x] Lock the `0.7` warning and error contract for stronger authoring checks.
- [x] Extend `check` to fail on obvious template residue in active execmaps and linked step docs.
- [x] Tighten linked step-doc validation against the execution-map item it supports.
- [x] Warn on obvious numbering and step-doc filename drift inside an initiative folder.
- [x] Verify the stronger checks end to end and close the slice truthfully.

## Done When

- `check` catches leftover scaffold text before execution starts.
- Linked step docs are validated more tightly against their execution-map item.
- Filename and file-shape drift warnings are actionable without becoming generic lint.
