# Milestone 2D — Four-account OpenCode acceptance

## Provenance

| Field | Value |
| --- | --- |
| Curated Market base | `c4dacbaa6775102e2819674438bb1b9bb8ead285` |
| OpenCode base | `726e4a807a5b1fc1a33c039370b1b175486aad65` |
| CM branch / worktree | `feat/function-control-m2d-acceptance` → `.worktrees/feat-function-control-m2d-acceptance` |
| OpenCode branch / worktree | `feat/function-control-m2d-acceptance` → `.worktrees/feat-function-control-m2d-acceptance` |

## Objective

Prove one OpenCode server + one Curated Market Function Control authority can run concurrent work across:

- `openai:personal` / `openai:work`
- `cursor:personal` / `cursor:work`

without credential, refresh, binding, continuation, or client-cache crossover. Close automatic Cursor Run → required Function binding. Exercise M2C ExecutionContext on a real OpenCode path. No Hermes.

## Automatic Cursor continuation hookup

| Step | Owner |
| --- | --- |
| Cursor `sessionManager.registerSession(session)` | cursor-opencode-provider@0.6.3 — Run id = `session.sessionId` (UUID); OpenCode session = `session.openCodeSessionId` |
| `installCursorSessionManagerAffinity` / `tryInstallCursorContinuationAffinity` | OpenCode (`auth/continuation.ts`) wraps register/close |
| Binding key | `opencode:<openCodeSessionId>:cursor:<runSessionId>` — opaque, account-agnostic |
| Affinity | Function Control `scope=continuation`, `affinity=required` via `notifyProviderContinuation` |
| Resume | Same Run id → same binding key → same physical account |
| Unavailable bound account | `CONTINUATION_BLOCKED` (no silent migrate to secondary) |
| Close | Best-effort `backend.release({ binding_key })` — does not delete provider Run state |

Installed from curated-market Cursor plugin bootstrap and AuthBackend layer when mode is curated-market.

Process-local `activeByOpenCodeSession` keeps required affinity for subsequent `LLM.stream` / `resolveProviderAccessToken` calls while the Run is open. Blocked continuations fail closed on the stream path.

## ExecutionContext consumption seam

Opt-in: `HHPE_EXECUTION_CONTEXT=1` under curated-market.

```
LLM.stream → resolveExecutionContext() → pin/lease/execution_id/behavior_bundle_id on ALS
         → Provider.getLanguage → resolveProviderAccessToken (M2B still works without flag)
```

Direct M2B `OpenCode → Function Control` remains default and independently tested.

## Concurrency architecture

- One process, `BindingContextStore` (ALS) per session
- Language/model cache keyed by `provider/model/account_id` (M2B)
- Hermetic four-way barrier test forces overlapping resolves
- Pins for isolation proofs; unpinned routing for durable OpenAI failover

## Test matrix

**Curated Market** (`tests/function-control-m2d-acceptance.test.mjs`)

- Four concurrent pinned resolves
- Independent refresh singleflight
- OpenAI `QUOTA_EXHAUSTED` → secondary for new work
- Required continuation → `CONTINUATION_BLOCKED`
- Cursor `RATE_LIMITED` no-spill
- ExecutionContext correlation (openai vs cursor bundle digests)

**OpenCode** (`test/auth/m2d-acceptance.test.ts` + inherited M2B)

- Continuation key / notify / CONTINUATION_BLOCKED
- sessionManager affinity install
- Four overlapping ALS credential isolation
- ExecutionContext composition + direct Function path
- LocalAuthBackend / retry / codex regressions

## Live-account campaign

Separate from hermetic PASS. Report PASS / BLOCKED / NOT OBSERVED / NOT RUN. Never fake live with mocks. No secrets in logs.

## Failover / no-spill

| Signal | Normalized | New work | Required continuation |
| --- | --- | --- | --- |
| OpenAI `usage_limit_reached` | `QUOTA_EXHAUSTED` | secondary allowed | `CONTINUATION_BLOCKED` if bound |
| Cursor HTTP 429 / gRPC `resource_exhausted` | `RATE_LIMITED` | retry/cooldown; no secondary spill | n/a (no durable quota heuristic) |

## Known limitations

- Live four-account one-server campaign depends on real OAuth availability/quota
- Cursor provider does not export `sessionManager` on public package exports; hookup uses `createRequire` → `dist/session.js` (best-effort)
- OpenCode auth-only bun runs may hit inherited preload `afterAll` AppRuntime dispose timeout (named tests still pass)
- Validate semantic 548 errors + 9 full-suite baseline failures unchanged unless independently fixed

## M3 boundary

Hermes AuthBackend / behavior adapter / execution consumer — **not started**.

## Non-goals

- OpenCode account pool / priority tables
- auth.json / XDG per-session isolation for registry-mode acceptance
- Cursor N×429 → quota heuristics
- Full OTEL authority
