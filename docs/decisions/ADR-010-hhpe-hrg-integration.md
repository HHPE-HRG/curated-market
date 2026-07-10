# ADR-010: hhpe hrg integration

## Status
Accepted with unresolved runtime binding

## Context
XLOTYL has a strong policy catalog but reconstructs thin wrappers; canon conflicts on Workroom versus Stoneforge.

## Source package
HHPE registry architecture

## Decision
Project the canonical catalog into XLOTYL/Core Dev Services and keep execution binding configurable.

## Alternatives considered
Promoting reconstructed wrappers or guessing substrate ownership was rejected.

## Preserved functionality
Namespaced IDs, provenance, OpenHands control-plane boundary, and governed capability selection remain.

## Excluded functionality
Unpinned, destructive, duplicated, or unproven activation is excluded.

## Host-specific differences
Containers use read-only sources; remote workers use verified bundles.

## Validation method
Projection, task-card, read-only mount, relative bundle, and OpenHands fixture tests.

## Consequences
Runtime binding remains a documented limitation pending owner decision.

## Rollback method
Disable the projection without altering packages or host plugins.
