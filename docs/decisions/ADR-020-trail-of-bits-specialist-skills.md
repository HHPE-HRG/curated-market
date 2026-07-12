# ADR-020: Trail of Bits specialist skills

Status: Accepted

## Source

Upstream repository: `https://github.com/trailofbits/skills`

## Revision

Pinned commit `cfe5d7b1619e47fb5b38b7e2561dad7e5f1e89af`; package tree `5cc023e22a3daabb40a91d7f933062a73442c19d`; license CC BY-SA 4.0.

## Purpose

Expose creator-defined specialist skills for dimensional analysis, property-based testing, differential review, static analysis, supply-chain risk auditing, Rust review, C review, and sharp edges.

## Responsibility boundary

CE remains lifecycle owner. These specialists change method or evidence only. They do not run at startup or replace CE review, integration, delivery, or compounding. Exact upstream names and frontmatter are preserved; no HHPE-prefixed copies.

## Activation policy

Task-triggered after CE lifecycle selection. Narrowest matching specialist or non-overlapping compatible set.

## Host exposure

Package-preserving skill symlinks and registry references across Codex, Cursor, OpenCode, Antigravity, Claude adapters, and HHPE.

## Dependencies

Complete pinned Trail of Bits package; language-specific tools for some specialists (CodeQL, Semgrep, Rust/C toolchains) as optional runtime needs.

## Validation

Frontmatter identity checks, plugin/source presence, capability-check `specialists`, and representative fixtures where tooling exists.

## Rollback

Remove exposures and runtime registrations; keep the pinned upstream package intact.

## Known limitations

Hosts without native plugin mechanisms receive registry references. Some static-analysis workflows need host-installed scanners.
