# ADR-003: capability exposure model

## Status
Accepted

## Context
Skills, plugins, hooks, commands, agents, MCP, tools, and state have distinct lifecycles.

## Source package
HHPE registry architecture

## Decision
Register namespaced capabilities separately from package storage and expose original directories through individual links or native plugins.

## Alternatives considered
Whole host-directory symlinks and SKILL-only copies were rejected.

## Preserved functionality
Package-relative supporting files resolve.

## Excluded functionality
Unpinned, destructive, duplicated, or unproven activation is excluded.

## Host-specific differences
Flat host aliases use package-prefixed names.

## Validation method
Validate IDs, dependencies, links, duplicates, and supporting files.

## Consequences
Adapters remain host-specific.

## Rollback method
Remove only recorded links and restore recorded config backups.
