# ADR-019: Context7 documentation grounding

Status: Accepted

## Source

npm package `ctx7` (Context7 CLI). Prefer CLI-plus-skill over always-loaded MCP.

## Revision

Pinned runtime `ctx7@0.5.4`. HHPE wrapper `hhpe-hrg/context7-guidance`.

## Purpose

Ground implementation against current official library, framework, SDK, API, and build-tool documentation when interfaces are version-sensitive.

## Responsibility boundary

CE owns the lifecycle. Context7 is a task-triggered documentation specialist. Inactive for entirely internal, version-insensitive work. Does not fetch documentation during session startup.

## Activation policy

Eligible when work depends on current external docs, version-specific APIs, framework behavior, SDK configuration, dependency migrations, or uncertain signatures. Policy: before implementing against a version-sensitive external interface, verify the current official interface using Context7.

## Host exposure

Runtime on host PATH; HHPE guidance skill exposed to Codex, Claude, Cursor, Antigravity, OpenCode, and HHPE registry references. Upstream identity preserved as Context7/`ctx7`.

## Dependencies

`ctx7@0.5.4`; network access; optional authentication for the documentation service.

## Validation

`ctx7 --version`; bounded library resolution (`ctx7 library ...`); capability-check `context7`. Auth/network failures classify as `PASS_WITH_DOCUMENTED_HOST_LIMITATION`.

## Rollback

Remove runtime and wrapper exposure. No package source tree is altered.

## Known limitations

External authentication or network outages limit live lookups without invalidating registry integrity.
