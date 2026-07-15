# ADR-007: caveman deployment

## Status
Accepted

## Context
Communication compression must preserve verbatim technical values.

## Source package
caveman

## Decision
Keep the pinned package, native mode/hooks/status behavior, and generated state outside source.

## Alternatives considered
Running moving-branch installers and copying generated dist as source were rejected.

## Preserved functionality
Full/lite, commands, hooks, status, cavecrew agents, stats, and optional MCP remain registered.

## Excluded functionality
Unpinned, destructive, duplicated, or unproven activation is excluded.

## Host-specific differences
MCP shrink remains opt-in due subprocess risk.

## Validation method
Verbatim technical fixture, mode, hook, command, status, and duplicate tests.

## Consequences
Telemetry/state privacy needs operator policy.

## Rollback method
Remove HHPE links and retain the existing plugin/state.

## Nested MCP

`caveman/caveman-shrink` is registered as an opt-in `mcp-server` capability (subprocess risk). Parent initiation remains `skill_repository` with `mcpServer` added to `enabled_components`.
