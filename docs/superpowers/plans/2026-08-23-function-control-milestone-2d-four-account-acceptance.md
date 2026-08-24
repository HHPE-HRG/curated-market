# Milestone 2D — Four-account OpenCode acceptance

## Provenance

| Field | Value |
| --- | --- |
| Curated Market base | `c4dacbaa6775102e2819674438bb1b9bb8ead285` |
| OpenCode base | `726e4a807a5b1fc1a33c039370b1b175486aad65` |
| CM branch / worktree | `feat/function-control-m2d-acceptance` → `.worktrees/feat-function-control-m2d-acceptance` |
| OpenCode branch / worktree | `feat/function-control-m2d-acceptance` → `.worktrees/feat-function-control-m2d-acceptance` |
| CM M2D commit | `e6de66404539f76123b74f72a0c7b031513ca6dd` (prior); continuation pending new commit |
| OpenCode M2D commit | `091d5d3d90b0cd8b5062fe752458bb5e8ef40b71` (prior); continuation pending new commit |

## Important review findings (closed)

| Finding | Resolution |
| --- | --- |
| ExecutionContext second FunctionControl | `createCuratedMarketAuthBackendBridge` owns singleton `canonicalCuratedMarketRuntime`; M2C `resolveExecutionContext` reuses it via `ensureCanonicalCuratedMarketRuntime()` |
| Cursor continuation soft-skip | `installCursorContinuationAffinity()` fails closed with `CURSOR_CONTINUATION_HOOK_UNAVAILABLE`; AuthBackend layer no longer swallows errors; `cursor-opencode-provider@0.6.3` added as dependency |
| Cursor no-spill error breadth | `classifyCursorResponse` maps JSON/plain `resource_exhausted` bodies to transient `RATE_LIMITED`; M2D no-spill test tightened to explicit wait codes |

## Live environment

| Item | Value |
| --- | --- |
| Key provider | macOS Keychain (`hhpe-curated-market-function-control`) — **not** file-degraded, **not** `HHPE_FUNCTION_VAULT_KEY` |
| Runtime home | `$HOME/.local/share/hhpe-function-runtime` (separate from manifest checkout) |
| Manifest root | M2D CM worktree via `HHPE_CURATED_MARKET_ROOT` |
| Import | `importAuthJsonAccount` from `~/.local/share/opencode/auth.json` → personal slots only |
| Work slots | Require `OPENAI_WORK_AUTH_JSON` / `CURSOR_WORK_AUTH_JSON` — **not present on host** |

## Live matrix (2026-08-24)

| Proof | Result |
| --- | --- |
| openai:personal direct | PASS |
| openai:work direct | BLOCKED — no separate work OAuth source |
| cursor:personal direct | PASS |
| cursor:work direct | BLOCKED — no separate work OAuth source |
| Four concurrent sessions, one OpenCode process | **PARTIAL** — 2/4 (personal only); distinct token fingerprints; work `CREDENTIAL_NOT_REGISTERED` |
| OpenAI real durable-quota signal observed | NOT OBSERVED |
| OpenAI new-work secondary failover | BLOCKED — `openai:work` not imported |
| Cursor real transient/no-spill | NOT OBSERVED (classifier hermetic PASS) |
| Cursor real continuation same-account resume | NOT RUN — requires live Cursor Run |
| Cursor unavailable continuation → CONTINUATION_BLOCKED | NOT RUN |
| M2C ExecutionContext → real OpenCode execution | PASS — `exec_*` + `bb_*` + `openai:personal` |

**External blocker for M2D PASS:** host exposes only **two** physical OAuth identities (one OpenAI, one Cursor). Governing four-account one-server proof requires four distinct work/personal credential sources.

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
