# ADR-019: Context7 documentation grounding

Status: Accepted

## Source

Runtime source: npm package `ctx7` version 0.5.4. The registry records the exact installed runtime and the HHPE wrapper `hhpe-hrg/context7-guidance`.

## Decision

Use Context7 CLI-plus-skill behavior, not an always-loaded MCP schema. Resolve only the current library documentation needed for version-sensitive external interfaces. Do not fetch documentation at every session start.

## Ownership and activation

CE owns the lifecycle. Context7 is a task-triggered documentation specialist for libraries, frameworks, SDKs, APIs, and build tools whose current interface matters.

## Validation and rollback

Validate `ctx7 --version`, a bounded library resolution/documentation lookup when credentials and network are available, and inactive behavior for internal work. Rollback removes the runtime and wrapper exposure; it does not alter package sources.

## Limitation

The CLI may require authentication or network access. Missing external access is reported as an integration limitation rather than treated as a registry failure.
