# Execution Map

## Goal

Add one small editing helper that can rewrite a single execution-map item without turning `execmap` into a generic markdown editor.

## Guardrails

- Keep `EXECMAP.md` as the source of truth for the step label and link.
- Do not add step insertion, renumbering, or broad document editing workflows.
- Avoid mutating more than the targeted execution-map item and its linked step doc.

## Execution Map

- [x] Lock the `0.8` helper contract around one targeted execution-map item edit.
- [x] Add a bounded CLI helper to rewrite a single execution-map item label safely.
- [x] Keep a linked step doc title and filename aligned when that item is renamed.
- [x] Cover the helper with repo-root and linked-step tests plus user-facing docs.
- [x] Verify the helper end to end and close the slice truthfully.

## Done When

- One command can rewrite a targeted execution-map item without hand-editing markdown.
- Linked step-doc title and filename stay aligned when the item label changes.
- The helper stays small, understandable, and covered by the repo gate.
