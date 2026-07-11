# ADR-012: Superpowers reduced exposure

Status: Accepted

## Context

The HHPE runtime previously carried a hard-coded Superpowers projection alongside Compound Engineering. That allowed lifecycle overlap and made `/using-superpowers` appear to be a routing dependency.

## Decision

Compound Engineering owns the lifecycle. Superpowers remains pinned and package-preserved, but lifecycle/routing skills are inactive in ordinary host and worker catalogs. Only `receiving-code-review`, `systematic-debugging`, `test-driven-development`, `verification-before-completion`, and `writing-skills` remain eligible as supporting techniques.

## Preserved functionality

The complete upstream Superpowers package, supporting files, plugin manifests, and source identity remain available for controlled re-evaluation. Retained skills use their upstream names and resolve relative files from the immutable package root.

## Host-specific differences

Hosts may use different invocation transports. Native discovery is preferred; a host-specific adapter may expose a namespaced transport without changing the canonical registry identity.

## Validation and rollback

Validation checks inactive lifecycle IDs, bootstrap state, source revision, and relative source paths. Rollback restores the prior exposure manifest and does not delete the pinned package.
