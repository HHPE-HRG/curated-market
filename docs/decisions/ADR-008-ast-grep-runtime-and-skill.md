# ADR-008: ast grep runtime and skill

## Status
Accepted

## Context
The runtime exists once through NVM but the old skill lacks full safety guidance.

## Source package
HHPE registry architecture

## Decision
Register npm `@ast-grep/cli@0.43.0` runtime separately from an HHPE guidance skill.

## Alternatives considered
A second binary and unpinned direct download were rejected.

## Preserved functionality
Both structural search/rewrite behavior and portable operator policy are represented.

## Excluded functionality
Unpinned, destructive, duplicated, or unproven activation is excluded.

## Host-specific differences
The existing user-local PATH exposes exact links to the pinned NVM binaries; no shell initialization file was changed.

## Validation method
Version, structural search, preview, exact rewrite diff, and parser/test fixture.

## Consequences
Runtime availability depends on Node environment.

## Rollback method
Remove wrapper link; leave preexisting npm runtime.
