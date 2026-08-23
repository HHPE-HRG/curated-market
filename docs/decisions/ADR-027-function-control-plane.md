# ADR-027: Function Control Plane

## Status

Accepted

## Context

Agent frameworks (OpenCode, Hermes, others) require multiple OAuth identities per provider family with isolated refresh, routing, and protocol-bound continuations. Framework-local `auth.json` slots are insufficient and unsafe under concurrency. Credential authority must not live in T3, OpenCode, or Hermes.

## Decision

Curated Market owns the **Function Control Plane**: account registry, encrypted credential vault, authorization leases, account bindings, routing policy, and provider-family authentication knowledge. Runtime state lives under `${HHPE_HRG_HOME}/function-control/`, not in Git.

This plane is **co-located in the Curated Market repository** with the Behavior Control Plane (skills, capabilities, `lib/registry.mjs`) but remains a **separate logical authority** with separate storage and import boundaries.

## Relationship to ADR-026

| ADR-026 plane | Function Control Plane |
| --- | --- |
| T3 Control (session/thread orchestration) | **Not** Function Control; T3 remains orchestration consumer |
| Vended/Supply (packages, capabilities) | Behavior plane; unchanged |
| Compatibility/Realization | Behavior plane adapters; unchanged |
| **Credential / identity authority** | **Function Control Plane (this ADR)** |

Co-location in one repository does not merge authorities.

## Three-object credential model

| Object | Role | Lifetime |
| --- | --- | --- |
| AccountBinding | Binds consumer/session/continuation to physical account | Survives access refresh |
| AuthorizationLease | Grants bounded consumer permission | Independent of JWT `exp` |
| AccessCredential | Provider-issued bearer/API token | Provider-controlled `exp` |

Invariants:

- Refresh access credential ≠ change account binding
- Renew authorization lease ≠ reroute account
- Revoke authorization lease ≠ necessarily invalidate provider token cryptography
- Rebind account binding → old authorization revoked; new account projection issued

## Binding affinity

- `scope`: `session` | `continuation`
- `affinity`: `preferred` | `required`
- `required` continuation on exhausted account → `CONTINUATION_BLOCKED`; no silent account swap
- `preferred` session may be explicitly rebound under policy

## Routing policy (Milestone 1)

Durable unavailable (`QUOTA_EXHAUSTED`, `AUTH_FAILED`) → new unpinned work may failover to secondary account.

Transient (`RATE_LIMITED`, `PROVIDER_UNAVAILABLE`, `TRANSPORT_FAILURE`) → retry/wait same account; **no automatic spill** to secondary in Milestone 1.

`pin_account_id` on `resolve()` is an explicit override for isolation tests, debugging, and policy pinning — not the default framework UX.

## Vault key authority

Production default on macOS: Keychain. Linux without supported secure store: **fail closed** until operator sets `HHPE_FUNCTION_VAULT_MODE=file-degraded`.

Master key must not live beside `${HHPE_HRG_HOME}/function-control/vault/secrets.enc` in production default mode.

Tests use `HHPE_FUNCTION_VAULT_KEY` (ephemeral) and never require host Keychain.

## Import boundaries (enforced)

Forbidden:

- `lib/registry.mjs` → `lib/function-control/*`
- `lib/function-control/*` → `lib/registry.mjs`

Provider-family modules under `registry/providers/` contain reusable knowledge only; no vault imports.

Execution resolver (Milestone 2) is a read-only join; not a third authority.

## Non-authority

Function Control does not own: inference proxy, skill catalogs, CE lifecycle policy, T3 session control, behavior bundle resolution.

## Validation

`npm test` including `tests/function-control-*.test.mjs`; existing behavior-plane tests remain green.

## Rollback

Remove `${HHPE_HRG_HOME}/function-control/`; behavior plane unaffected.

## Consequences

- OpenCode/Hermes consume projections via thin adapters (Milestone 2+)
- No secrets in Git manifests beyond account metadata
- Behavior-plane compromise must not import vault code paths
