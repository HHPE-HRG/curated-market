# ADR-020: Trail of Bits specialist skills

Status: Accepted

## Source

Upstream repository: `https://github.com/trailofbits/skills`; pinned commit `cfe5d7b1619e47fb5b38b7e2561dad7e5f1e89af`; package tree `5cc023e22a3daabb40a91d7f933062a73442c19d`; license CC BY-SA 4.0.

## Decision

Retain the complete upstream package and register creator-defined specialist skills without HHPE renaming: dimensional-analysis, property-based-testing, differential-review, supply-chain-risk-auditor, rust-review, c-review, sharp-edges, and the static-analysis child skills codeql, semgrep, and sarif-parsing. Register their native plugin directories separately where package-level commands, agents, and hooks are required.

## Ownership and activation

CE remains lifecycle owner. These specialists activate only when the task semantics match their narrow purpose. They do not run at startup or replace CE review, integration, or delivery.

## Validation and rollback

Validate each frontmatter identity, plugin manifest, package-relative agent/script dependencies, and disposable representative fixtures. Rollback removes only exposures and runtime registrations; the pinned upstream package remains intact.

## Limitation

Some specialist plugins rely on host-native agent/plugin mechanisms and language-specific tools. A host without that mechanism receives a registry reference rather than a reconstructed copy.
