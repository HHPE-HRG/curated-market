# ADR-021: Playwright UI acceptance

Status: Accepted

## Source

- Framework authority: `https://github.com/microsoft/playwright`
- **MCP package vended by curated-market:** `https://github.com/microsoft/playwright-mcp`
- CLI application runtime: npm `@playwright/cli`

Marketplace / MCP identity: `io.github.microsoft/playwright-mcp` (upstream `server.json`).

Catalog entry: `registry/manifests/vendors.yaml` → `vendor_id: microsoft`.

## Revision

Pinned MCP commit `55679f5f3d4b4f3e2534ec0ce2fc5683ba2eaf3f`; package tree `d870c677c26220caf7cab9ec02ee0c9786d614d2`; CLI runtime `@playwright/cli@0.1.17`; MCP npm `@playwright/mcp@0.0.78`; license Apache-2.0.

The full `microsoft/playwright` monorepo is **not** pinned (size/application mismatch). MCP-compatible vending uses `playwright-mcp`.

## Purpose

Provide browser acceptance capability for web UIs, dashboards, control planes, docs apps, auth flows, and webviews after unit/integration evidence.

## Initiation vs application

`playwright-mcp` is an **MCP repository**. HHPE initiates it as `mcp_repository` with `enabled_components: ["mcpServer"]` only.

HHPE **application** for browser acceptance prefers task-triggered **CLI + guidance skill** (`playwright-cli` + `hhpe-hrg/playwright-guidance`). Official CLI skill bundles via `playwright-cli install --skills` remain host-generated and are not duplicated into the immutable registry Git tree. MCP capability `playwright-mcp/playwright-mcp` is available for explicit MCP host binding.

## Responsibility boundary

CE owns the lifecycle. Playwright owns browser interaction and UI evidence only. Verification sequence: implementation → unit → integration → browser acceptance with trace/screenshot evidence → CE review → CE completion.

## Activation policy

Task-triggered for browser-facing work. Inactive for non-UI work. No automatic browser launch at session-start.

## Host exposure

Central CLI on PATH; HHPE guidance skill exposed to hosts; MCP registry reference for `playwright-mcp/playwright-mcp`.

## Dependencies

`@playwright/cli@0.1.17`; browser runtimes/daemon when executing acceptance fixtures; optional `@playwright/mcp` for MCP hosts.

## Validation

Pinned MCP source integrity; CLI version and `--skills` interface; vendors-catalog presence for `microsoft`/`playwright-mcp`; temporary workspace skill install; browser launch when browsers present. Missing browsers → `PASS_WITH_DOCUMENTED_HOST_LIMITATION`.

## Rollback

Remove runtime, MCP registry reference, and wrapper exposure without changing upstream package sources.

## Known limitations

Browser binaries and daemon availability are host-dependent.
