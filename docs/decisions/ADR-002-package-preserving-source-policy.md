# ADR-002: package preserving source policy

## Status
Accepted

## Context
Loose copied skills have lost package coupling and provenance.

## Source package
HHPE registry architecture

## Decision
Store complete clean Git checkouts in commit-addressed directories and never edit them.

## Alternatives considered
Flattening and reconstructed packages were rejected.

## Preserved functionality
Hooks, commands, agents, scripts, references, policies, manifests, and licenses stay present.

## Excluded functionality
Unpinned, destructive, duplicated, or unproven activation is excluded.

## Host-specific differences
None.

## Validation method
Check commit, Git tree, clean status, license, and source paths.

## Consequences
Uses more disk space and makes updates staged.

## Rollback method
Activate the prior locked revision.
