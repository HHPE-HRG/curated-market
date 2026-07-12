# ADR-017: Beads task-state role

Status: Accepted

## Context

HHPE HRG, XLOTYL, Workroom, and Stoneforge already own durable task claims, dependencies, readiness, blocking, parent-child relationships, worker dispatch, and completion transitions. Introducing a second live task authority would create competing claims and ambiguous recovery state.

## Decision

Beads is not installed and is inactive. HHPE remains the authoritative task graph. The `hhpe-hrg/session-start` capability reports HHPE task state and does not run Beads startup commands. Beads may be evaluated later as an import/export or local visualization tool only after an explicit ownership decision.

## Ownership and activation

Compound Engineering owns durable requirements and implementation artifacts. HHPE owns worker dispatch and task-state projection. Beads owns nothing in the current stack and is never initialized automatically.

## Validation and rollback

Validation checks that no Beads executable or startup exposure is required and that session-start remains read-only. Rollback is removal of any future optional Beads package and its manifest entries; no task data is migrated by this decision.

## Consequences

There is one authoritative live task state. A Beads-specific fixture is intentionally not run because the runtime is absent and inactive.
