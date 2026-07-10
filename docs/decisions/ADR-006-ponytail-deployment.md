# ADR-006: ponytail deployment

## Status
Accepted

## Context
Modes, hooks, commands, MCP, and persistent flags are not skill-only behavior.

## Source package
ponytail

## Decision
Keep the pinned package and its native lifecycle adapter; do not combine always-on rule and lifecycle injection.

## Alternatives considered
Loose skill copies and duplicate injection were rejected.

## Preserved functionality
Full/lite/ultra/review/off modes, commands, hooks, MCP, and state conventions remain.

## Excluded functionality
Unpinned, destructive, duplicated, or unproven activation is excluded.

## Host-specific differences
Claude uses plugin state; other adapters require live parity.

## Validation method
Mode, switching, lifecycle count, subagent propagation, and duplicate tests.

## Consequences
Existing authoritative mode is retained, not reset.

## Rollback method
Remove HHPE links; leave preexisting plugin and flags.
