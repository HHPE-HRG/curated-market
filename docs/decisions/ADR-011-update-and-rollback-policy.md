# ADR-011: update and rollback policy

## Status
Accepted

## Context
Moving branches and broad uninstallers are not reproducible or safe.

## Source package
HHPE registry architecture

## Decision
Stage every update at an exact commit; rollback only manifest-owned objects.

## Alternatives considered
In-place pull and recursive deletion were rejected.

## Preserved functionality
Prior revisions and preexisting installations remain recoverable.

## Excluded functionality
Unpinned, destructive, duplicated, or unproven activation is excluded.

## Host-specific differences
Update checks may require network; activation is separate.

## Validation method
Diff, security, integrity, parity, atomic activation, and controlled rollback tests.

## Consequences
Old revisions and backups consume storage.

## Rollback method
Reactivate prior lock and remove only recorded links.
