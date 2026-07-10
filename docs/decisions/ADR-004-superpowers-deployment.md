# ADR-004: superpowers deployment

## Status
Accepted

## Context
Superpowers includes 14 process skills and SessionStart routing.

## Source package
superpowers

## Decision
Retain the native Claude plugin for lifecycle behavior and expose portable skills only where duplication is excluded.

## Alternatives considered
Skill-only deployment would lose startup routing; plugin plus duplicate using-superpowers injection was rejected.

## Preserved functionality
All skills, hook scripts, references, and manifests remain intact.

## Excluded functionality
Unpinned, destructive, duplicated, or unproven activation is excluded.

## Host-specific differences
Codex uses namespaced links; Claude remains native.

## Validation method
Explicit/implicit routing, planning, debugging, TDD, subagent, reference, and duplicate-injection tests.

## Consequences
Native plugin remains necessary.

## Rollback method
Remove HHPE links and continue the existing plugin.
