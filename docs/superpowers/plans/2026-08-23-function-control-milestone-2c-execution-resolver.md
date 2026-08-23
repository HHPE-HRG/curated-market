# Milestone 2C — Read-only Execution Resolver

## Provenance

| Field | Value |
| --- | --- |
| CM M2B base | `164b542b354130fa6ddc04dfde4ea0e72bb89203` |
| OpenCode M2B base | `726e4a807a5b1fc1a33c039370b1b175486aad65` (**not modified**) |
| CM branch | `feat/execution-resolver-m2c` |
| CM worktree | `.worktrees/feat-execution-resolver-m2c` |

## Behavior projection

**Sources:** `capabilities.yaml`, `packages.lock.yaml`, optional `final-stack.yaml` slices.

**API:** `createBehaviorControl` / `resolveBehaviorProjection` in `lib/behavior-projection.mjs`.

**Bounded output:** requested `capability_ids` only → skills/plugins with package/commit/path; optional `startup_layers` + policy slice (`lifecycle_owner`, specialist flags); `behavior_bundle_id` digest; `requires_function` need declaration (not account grant).

**Excluded:** full capabilities catalog, full final-stack fixtures, credentials, account bank.

## Function projection

Reuses M1/M2B `FunctionControl.resolve()` → binding + lease + access credential (refresh stripped).

## ExecutionContext

```
identity
behavior_projection
function_projection?     # when requires_function
capability_projection    # thin view of skills/plugins + bundle id
policy_projection?
observability_context
runtime?                 # in-memory access_credential seam
```

`serializeExecutionContext()` redacts bearer tokens.

## Dependency direction

```
behavior-projection ──┐
                      ▼
               execution-resolve
                      ▲
function-control ─────┘
```

Structural tests enforce no reverse imports.

## Failure / cleanup

- Behavior failure → no context
- Function failure → no context
- Composition failure after Function success → `release({ lease_id })`
- `CONTINUATION_BLOCKED` propagated unchanged

## Pin / Function requirement authority

- `behavior.pin_account_id` — ignored
- `execution_request.pin_account_id` — may request pin (Function still authorizes)
- `behavior.requires_function` — declares need
- `execution_request.function_requirement` — higher-authority need declaration (not bare top-level)

## Review fixes

- Removed undocumented top-level `function_requirement`
- Schema tightened (`additionalProperties: false`; access_credential field allowlist)
- Strip `refresh_token` / `refreshToken` aliases as well

## OpenCode

M2B direct `CuratedMarketAuthBackend` → Function Control path **preserved unmodified**. No OpenCode M2C consumer required for acceptance.

## Deferred to M2D

- Automatic Cursor Run → required continuation binding hookup
- Four-account concurrent OpenCode campaign
- Real quota failover campaign
- Hermes

## ADR-027

Unchanged — Execution Resolver remains the read-only join described there.
