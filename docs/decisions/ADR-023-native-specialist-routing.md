# ADR-023: Native specialist routing

Status: Accepted

## Source

HHPE-authored policy in `registry/manifests/final-stack.yaml` (`specialist_routing`, `automatic_selection_policy`).

## Revision

Policy revision tracked by registry Git.

## Purpose

Expose specialists for native discovery without routine slash commands or competing lifecycle bundles.

## Responsibility boundary

CE owns lifecycle. Specialists attach only after lifecycle ownership is resolved. Supporting Superpowers skills may change method or evidence but cannot replace CE artifacts. No HHPE dialect renames upstream skills.

## Activation policy

Task-triggered; narrowest applicable specialist; no routine slash invocation; Superpowers bootstrap remains disabled.

## Host exposure

Same upstream names across Claude, Codex, Cursor, Antigravity, OpenCode, and HHPE; invocation transport varies by host.

## Dependencies

Registered specialist capabilities; CE package; retained Superpowers supporting skills.

## Validation

Static identity, exposure manifests, capability-check `routing`, and natural-language fixtures.

## Rollback

Remove specialist routing entries/exposures while retaining the core package stack.

## Known limitations

Host discovery ranking is not fully simulated offline; fixtures validate policy projection.
