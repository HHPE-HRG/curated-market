# ADR-019: Context7 documentation grounding

Status: Accepted

## Source

Externally vended by **Upstash**: `https://github.com/upstash/context7`

Marketplace / MCP identity: `io.github.upstash/context7` (upstream `server.json`).

Catalog entry: `registry/manifests/vendors.yaml` → `vendor_id: upstash`.

## Revision

Pinned commit `eb7ac502f6e83692363375d3088d550afa298a60`; package tree `7cc356b5681cef45ab459f43800ae16468b036bb`; CLI runtime `ctx7@0.5.4`; MCP package `@upstash/context7-mcp`; license MIT.

## Purpose

Ground implementation against current official library, framework, SDK, API, and build-tool documentation when interfaces are version-sensitive.

## Initiation vs application

Upstream is an **MCP repository** (`packages/mcp`, `server.json`). HHPE initiates the source as `mcp_repository` with `enabled_components: ["mcpServer"]` only—never as a skill marketplace.

HHPE **application** prefers task-triggered **CLI + guidance skill** (`ctx7` + `hhpe-hrg/context7-guidance`) over always-loaded MCP. MCP remains registered as `context7/context7-mcp` for hosts that bind MCP servers explicitly.

## Responsibility boundary

CE owns the lifecycle. Context7 is a task-triggered documentation specialist. Inactive for entirely internal, version-insensitive work. Does not fetch documentation during session startup.

## Activation policy

Eligible when work depends on current external docs, version-specific APIs, framework behavior, SDK configuration, dependency migrations, or uncertain signatures. Policy: before implementing against a version-sensitive external interface, verify the current official interface using Context7.

## Host exposure

Runtime on host PATH; HHPE guidance skill exposed to hosts; MCP registry reference for `context7/context7-mcp`. Optional `CONTEXT7_API_KEY` for authenticated docs access.

## Dependencies

`ctx7@0.5.4`; network access; optional authentication for the documentation service.

## Validation

Pinned source integrity; `ctx7 --version`; bounded library resolution; vendors-catalog presence for `upstash`/`context7`; capability-check `context7`. Auth/network failures classify as `PASS_WITH_DOCUMENTED_HOST_LIMITATION`.

## Rollback

Remove runtime, MCP registry reference, and wrapper exposure. Retain pinned source. Do not edit the upstream checkout.

## Known limitations

External authentication or network outages limit live lookups without invalidating registry integrity.
