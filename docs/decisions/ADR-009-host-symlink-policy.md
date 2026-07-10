# ADR-009: host symlink policy

## Status
Accepted

## Context
Replacing native roots risks settings, auth, MCP, and user content.

## Source package
HHPE registry architecture

## Decision
Create only individual namespaced links after collision and symlink-following probes.

## Alternatives considered
Whole-directory symlinks and overwrite-on-collision were rejected.

## Preserved functionality
User configuration and unrelated skills/plugins remain untouched.

## Excluded functionality
Unpinned, destructive, duplicated, or unproven activation is excluded.

## Host-specific differences
Unsupported hosts retain native plugins pending proof.

## Validation method
Supporting-file, collision, restart, and ownership rollback tests.

## Consequences
More links are managed individually.

## Rollback method
Unlink only migration-owned links.
