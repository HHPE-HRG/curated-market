# ADR-001: registry root

## Status
Accepted

## Context
No authoritative prior global HHPE root was found.

## Source package
HHPE registry architecture

## Decision
Use `${HHPE_HRG_HOME:-$HOME/.local/share/hhpe-hrg}` as the standalone user-scoped root.

## Alternatives considered
A project-local registry would couple global state to one checkout.

## Preserved functionality
All registry source and generated state are isolated from host roots.

## Excluded functionality
Unpinned, destructive, duplicated, or unproven activation is excluded.

## Host-specific differences
Hosts receive narrow registrations only.

## Validation method
Validate path resolution and rollback from another working directory.

## Consequences
User-scoped storage is portable but must be mounted or bundled for remote workers.

## Rollback method
Remove PATH entry and invoke ownership-scoped rollback.
