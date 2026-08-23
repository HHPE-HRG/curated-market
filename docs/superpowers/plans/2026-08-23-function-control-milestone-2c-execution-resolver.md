# Milestone 2C — Read-only Execution Resolver

## Provenance

| Field | Value |
| --- | --- |
| CM M2B base | `164b542b354130fa6ddc04dfde4ea0e72bb89203` |
| OpenCode M2B base | `726e4a807a5b1fc1a33c039370b1b175486aad65` (**not modified**) |
| CM branch | `feat/execution-resolver-m2c` |
| CM worktree | `.worktrees/feat-execution-resolver-m2c` |
| M2C code checkpoint | `a6731553c3a763211dfb8e565959cf2670d64028` |

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

`identity.session_id` / `identity.continuation_id` are **opaque correlation references** supplied by the framework. They do **not** imply that the Execution Resolver or Function Control owns Cursor Run objects, checkpoints, pending tools, streams, or provider continuation internals.

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
- `CONTINUATION_BLOCKED` propagated unchanged (affinity/binding decision only)

## Pin / Function requirement authority

- `behavior.pin_account_id` — ignored
- `execution_request.pin_account_id` — may request pin (Function still authorizes)
- `behavior.requires_function` — declares need
- `execution_request.function_requirement` — higher-authority need declaration (not bare top-level)

## Review fixes

- Removed undocumented top-level `function_requirement`
- Schema tightened (`additionalProperties: false`; access_credential field allowlist)
- Strip `refresh_token` / `refreshToken` aliases as well

## Authority audit (canonical for M2D)

| Concern | Owner |
| --- | --- |
| Account routing | Function Control |
| Account binding | Function Control |
| Authorization lease | Function Control |
| Credential refresh | Function Control |
| Provider outcome classification | `registry/providers/*` |
| Behavior catalog / bundle | Behavior Control |
| Execution composition | Execution Resolver (read-only join; no durable state) |
| Continuation affinity / required account binding | Function Control |
| Actual continuation / Run / checkpoint / stream / pending-tool state | OpenCode + provider/plugin runtime |

### Continuation affinity vs continuation runtime

```
OpenCode / Cursor runtime
        │  produces continuation id / Run id / checkpoints
        ▼
Function Control binding projection
        └── continuation X
            affinity = required
            account_id = cursor:personal
```

**Function Control owns** which account a continuation is bound to, binding lifecycle, and `CONTINUATION_BLOCKED` when that required account cannot proceed.

**Function Control does not own** the Cursor Run, conversation checkpoints, pending tool queue, stream handles, or provider continuation objects.

**Execution Resolver owns neither** — it may only forward an opaque `continuation_id` into a Function Control resolve request.

Governing distinction: Function Control owns which account a continuation is bound to; the framework/provider runtime owns the continuation itself.

## OpenCode

M2B direct `CuratedMarketAuthBackend` → Function Control path **preserved unmodified**. No OpenCode M2C consumer required for acceptance.

## Deferred to M2D

M2D implements the missing **runtime hookup**, not Function Control ownership of Runs:

```
actual Cursor external Run created/resumed
        ↓
OpenCode/plugin determines continuation identity
        ↓
OpenCode calls Function Control
        ↓
required continuation binding established/resolved
        ↓
same account used for continuation
```

If the required account becomes unavailable:

```
Function Control → CONTINUATION_BLOCKED
OpenCode decides how to surface/restart the runtime continuation
```

Function Control does **not** migrate or reconstruct the Cursor Run.

Also deferred: four-account concurrent OpenCode campaign; real quota failover campaign; Hermes.

## ADR-027

Architecture unchanged. Binding-affinity section clarified: Function Control binds continuations to accounts; frameworks/providers own continuation runtime state.
