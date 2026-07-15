# ADR-008: ast-grep runtime and skill

## Status
Accepted

## Source

Externally vended by **ast-grep**: `https://github.com/ast-grep/ast-grep`

Catalog entry: `registry/manifests/vendors.yaml` → `vendor_id: ast-grep`.

## Revision

Pinned commit `fc26e866c7bf66f5a84e538525e0357dbb3ed352`; package tree `95d9933f9774f18e023eca6e4d1d3a9697d07085`; runtime npm `@ast-grep/cli@0.43.0`; license MIT.

## Context

The runtime exists once through NVM but operator policy must stay separate from upstream CLI source. Ast-grep is a **CLI repository**, not an MCP product.

## Decision

Pin the complete upstream CLI repository for provenance. Register npm `@ast-grep/cli@0.43.0` as the runtime. Expose portable operator policy via HHPE skill `hhpe-hrg/ast-grep`.

## Initiation vs application

Initiate as `cli_repository` with `enabled_components: []` (no `mcpServer`, no skill marketplace coercion). Application transport is **CLI + HHPE guidance skill** only. Third-party `ast-grep` MCP wrappers are out of HHPE application scope and must not be initiated as the HHPE path.

## Alternatives considered

A second binary, unpinned direct download, and adopting unofficial MCP wrappers were rejected.

## Preserved functionality

Both structural search/rewrite behavior and portable operator policy are represented.

## Excluded functionality

Unpinned, destructive, duplicated, unproven activation, and non-upstream MCP marketplace installs are excluded.

## Host-specific differences

The existing user-local PATH exposes exact links to the pinned NVM binaries; no shell initialization file was changed.

## Validation method

Pinned source integrity; version; structural search; preview; exact rewrite diff; parser/test fixture; vendors-catalog presence for `ast-grep`.

## Consequences

Runtime availability depends on Node environment.

## Rollback method

Remove wrapper link and runtime exposure; leave preexisting npm runtime if unmanaged; retain pinned source.
