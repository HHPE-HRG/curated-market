# Milestone 2A — Cursor provider-family knowledge

## Provenance

| Field | Value |
| --- | --- |
| M2A Git base | `91ed0e6c4cfeebc59961dc563efe63a7407454df` |
| M1 code ancestor | `42a6d6a6bd0bae3ab03429f5505d702a34d517fd` |
| Branch | `feat/function-control-m2a-cursor-provider` |
| Worktree | `.worktrees/feat-function-control-m2a-cursor-provider` |

## Evidence inspected

**Package:** `cursor-opencode-provider@0.6.3`  
**Local path:** `/Users/maxholden/.cache/opencode/packages/cursor-opencode-provider@0.6.3/node_modules/cursor-opencode-provider/`  
**Upstream:** `https://github.com/oakimov/cursor-opencode-provider`  
**Provider id:** `cursor` (`dist/shared.js` → `CURSOR_PROVIDER_ID`)

### Auth / refresh (`dist/auth.js`)

| Item | Verified |
| --- | --- |
| Endpoint | `POST https://api2.cursor.sh/auth/token` |
| Request body | `{ refreshToken }` (camelCase) |
| Success body | `{ accessToken, refreshToken }` — **both required**; refresh rotates |
| Access expiry | JWT `exp` via `decodeJwtExpiryMs` / `isExpiringSoon` |
| Errors | `AuthRefreshError` on non-OK / transport / malformed JSON |
| Injection | OpenCode plugin injects `options.accessToken` into model create path |

Single OpenCode auth slot historically: `auth.json["cursor"]` (plugin path). M2A does not change OpenCode.

### Error taxonomy (`dist/errors.js`)

| Signal | Provider class | M2A normalized |
| --- | --- | --- |
| HTTP 401 / 403 | `CursorAuthError` | `AUTH_FAILED` |
| HTTP 429 | `CursorServerError` transient | `RATE_LIMITED` (**not** `QUOTA_EXHAUSTED`) |
| HTTP 5xx | `CursorServerError` transient | `PROVIDER_UNAVAILABLE` |
| gRPC unauthenticated / permission_denied (16 / 7) | `CursorAuthError` | `AUTH_FAILED` |
| gRPC resource_exhausted (8) | transient server | `RATE_LIMITED` (**not** `QUOTA_EXHAUSTED`) |
| gRPC unavailable / internal (14 / 13) | transient server | `PROVIDER_UNAVAILABLE` |
| `ECONNRESET`, HTTP2 session errors | `CursorTransportError` | `TRANSPORT_FAILURE` |

**Durable Cursor quota exhaustion:** **not found.** No `usage_limit_reached`-equivalent. Ambiguous capacity wording must not invent `QUOTA_EXHAUSTED`. No N×429 heuristic.

### Continuation / account affinity

| Evidence | Implication |
| --- | --- |
| Held-open `AgentService/Run` with `conversationId` + checkpoints (`session.d.ts`) | Account-sensitive continuation |
| Checkpoint / `conversation_state` echoed across turns (`protocol/request.d.ts`) | Not portable across accounts |
| `resolveAgentUrl` memo keyed by SHA-256(token) (`agent-url.js`) | Region/agent host is token/account-specific |

Policy encoded: default affinity `preferred`; active continuation `required`; migration `explicit_restart` only.

## Outcomes contract decision

Shared vocabulary moved to `registry/providers/outcomes.mjs`.  
`registry/providers/openai/outcomes.mjs` re-exports (M1 import paths unchanged).  
Cursor imports the shared module — no Cursor→OpenAI dependency; no duplicated enum.

## Files

**Added**

- `registry/providers/outcomes.mjs`
- `registry/providers/cursor/{refresh,classify-response,usage-signals,continuation-policy,index}.mjs`
- `tests/function-control-cursor-provider.test.mjs`
- this plan

**Modified**

- `registry/providers/openai/outcomes.mjs` → re-export shared

**Not touched:** OpenCode, `.opencode/`, T3, Function Control routing/stores/vault, execution-resolve.

## M2B boundary

M2B consumes this Cursor contract from OpenCode (`CuratedMarketAuthBackend` + real credential injection + outcome reporting). Not started here.

## M2A baseline (pre-change)

| Gate | Result |
| --- | --- |
| `npm run test:function` | 24 pass, 0 fail |
| `npm run validate` | process exit ≠ success semantics; JSON `status=failed`, 548 errors |
| `npm test` | 47 total, 38 pass, 9 fail (baseline-equivalent) |
