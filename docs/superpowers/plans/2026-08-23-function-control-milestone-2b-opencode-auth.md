# Milestone 2B — OpenCode CuratedMarketAuthBackend

## Provenance

| Field | Value |
| --- | --- |
| M2A code checkpoint | `0889b021a2fab46638f3b0fbfe492071af6b5eb9` |
| M2B Git base | `fc93870b0167a5a72a61e62669b603715c9ae51d` (docs tip; ancestry includes `0889b02`) |
| CM branch | `feat/function-control-m2b-opencode-auth` |
| CM worktree | `.worktrees/feat-function-control-m2b-opencode-auth` |
| OpenCode fork | `/Users/maxholden/src/opencode` @ tag `v1.18.21` (`826d9ad`) |
| OpenCode branch | `feat/curated-market-auth-backend` |

## OpenCode inspection (v1.18.21)

| Concern | Location |
| --- | --- |
| Auth store (`auth.json`) | `packages/opencode/src/auth/index.ts` — `Auth.Service` get/set/all/remove |
| OpenAI OAuth refresh | `packages/opencode/src/plugin/openai/codex.ts` — `auth.loader` fetch + `auth.set` |
| Plugin auth → provider options | `packages/opencode/src/provider/provider.ts` plugin auth loader loop |
| Provider SDK / language cache | `resolveSDK` / `getLanguage` — options hashed; languages keyed by provider/model |
| Session identity | `packages/opencode/src/session/llm.ts` — `sessionID` on stream |
| Retry | `packages/opencode/src/session/retry.ts` — `retryable()` |
| Cursor provider | external `cursor-opencode-provider@0.6.3` — `auth.loader` → `options.accessToken`; refresh via `persistAuth` / `auth.set` |

## Architecture realization

```
AuthBackend
├── LocalAuthBackend  → auth.json / Auth.Service
└── CuratedMarketAuthBackend → Function Control resolve/report/release
```

**Selection:** `auth_backend.type` config or `HHPE_AUTH_BACKEND=curated-market|local` plus `HHPE_CURATED_MARKET_ROOT`.

**Binding keys:** `opencode:<session-id>` (session/preferred); `opencode:<session-id>:<continuation-id>` (continuation/required). Account IDs never embedded.

**Refresh ownership:** registry mode re-resolves via Function Control; OpenAI curated loader does not `auth.set`; Cursor curated plugin injects `accessToken` only. Access credential service dispatches OpenAI vs Cursor refresh by `provider_family`.

**Outcome path:** provider HTTP body → CM classifier (openai/cursor) → `functionControl.report(lease, outcome)`.

**Concurrency:** `BindingContextStore` (ALS) + language-model cache keyed by `account_id` under curated-market.

## CM files

**Added**

- `lib/function-control/opencode/{binding-keys,local-auth-backend,curated-market-auth-backend,select-auth-backend,index}.mjs`
- `tests/function-control-opencode-auth.test.mjs`
- this plan

**Modified**

- `lib/function-control/access-credential.mjs` — family-aware refresh
- `lib/function-control/index.mjs` — re-export opencode adapter
- `registry/manifests/function-accounts.yaml` — `cursor:personal`, `cursor:work` (`agent`)
- `tests/fixtures/function-control/two-account-fixture.mjs`

## OpenCode files

**Added**

- `packages/opencode/src/auth/backend.ts`, `backend-layer.ts`
- `packages/opencode/src/plugin/curated-market-cursor.ts`
- `packages/opencode/test/auth/backend.test.ts`, `retry-curated-market.test.ts`

**Modified**

- `plugin/openai/codex.ts` — curated resolve + report; no local refresh write
- `provider/provider.ts` — curated loader without auth.json; account-keyed language cache
- `session/llm.ts` — ALS around model stream middleware
- `session/retry.ts` — suppress same-account retry on `usage_limit_reached` in registry mode
- `plugin/index.ts`, `effect/app-runtime.ts` — register AuthBackend + Cursor override plugin

## Deferred

- M2C Execution Resolver / Behavior join
- M2D four-account orchestration campaign
- Hermes / T3 credential authority
- Cross-account continuation migration
- Cursor N×429 quota heuristics

## Live-provider validation

| Probe | Result |
| --- | --- |
| OpenAI via CuratedMarketAuthBackend → Codex | **BLOCKED** — auth accepted; provider returned `usage_limit_reached` (quota) |
| Cursor via CuratedMarketAuthBackend → Cursor API | **PASS** — authenticated profile probe succeeded |
| Full OpenCode server end-to-end chat | **NOT RUN** — FC consumer path proven; server E2E deferred |

Hermetic temp `HHPE_HRG_HOME` used for import; no secrets printed; user `auth.json` not mutated as canonical registry store.
