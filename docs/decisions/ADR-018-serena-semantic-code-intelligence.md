# ADR-018: Serena semantic code intelligence

Status: Accepted

## Source

Externally vended by **Oraios AI** (`oraios`): `https://github.com/oraios/serena`

Marketplace / MCP identity: `io.github.oraios/serena` (from upstream `server.json`).

Catalog entry: `registry/manifests/vendors.yaml` → `vendor_id: oraios`.

## Revision

Pinned commit `6018bf461644dbf405d9ed1d3c3cde2ca07bb8b0`; package tree `baa862570b5fba087f789cbbf657f73dd1680e1c`; runtime `serena-agent` 1.5.3 via `uv`; license MIT.

## Purpose

Provide primary semantic code intelligence: symbol, reference, and implementation lookup; semantic navigation; safe rename/refactor; language-server-backed project understanding; project onboarding and health validation.

## Responsibility boundary

CE owns the lifecycle. Serena is a task-triggered specialist vended as an Oraios MCP server package (not a Claude plugin marketplace). Tool boundary: Serena for symbols/rename; ast-grep for syntax-tree patterns; ripgrep for literal text; compilers/tests for correctness. HHPE wrapper `hhpe-hrg/serena-guidance` routes without renaming Serena.

## Vending policy

Curated-market preserves the complete Oraios checkout and exposes:

- `serena/serena-runtime` — locked `uv`/`serena-agent` executable
- `serena/serena-mcp` — MCP server schema from pinned `server.json`
- `hhpe-hrg/serena-guidance` — HHPE routing skill only

Upstream forbids installing Serena through third-party MCP or plugin marketplaces (outdated launch commands). HHPE therefore vends Serena only through this commit pin + locked runtime, never by re-publishing an alternate marketplace installer.

## Activation policy

Globally available; selected only when semantic intelligence is useful. Session-start checks activation/health when installed and does not begin semantic investigation unnecessarily. Users need not name Serena in ordinary prompts.

## Host exposure

Registry references plus host skill symlinks for `hhpe-hrg/serena-guidance`. Runtime on `PATH` via `~/.local/bin/serena`. MCP launches use the locked `serena-agent` entry from `server.json`.

## Dependencies

`serena-agent` 1.5.3; language tooling for project languages; complementary `hhpe-hrg/ast-grep`.

## Validation

Pinned source integrity, `serena --version`, isolated project configuration fixture, vendors-catalog presence for `oraios`/`serena`, and capability-check `serena`.

## Rollback

Remove runtime tool, MCP registry reference, and wrapper exposures; retain pinned source for reproducibility. Do not edit the upstream checkout.

## Known limitations

Language-server coverage varies by language and installed tooling. Failed activation is reported as a tool limitation.
