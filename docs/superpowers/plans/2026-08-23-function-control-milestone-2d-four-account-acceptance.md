# Milestone 2D — Function Control OpenCode acceptance

## Provenance

| Field | Value |
| --- | --- |
| Curated Market base | `c4dacbaa6775102e2819674438bb1b9bb8ead285` |
| OpenCode base | `726e4a807a5b1fc1a33c039370b1b175486aad65` |
| CM branch / worktree | `feat/function-control-m2d-acceptance` → `.worktrees/feat-function-control-m2d-acceptance` |
| OpenCode branch / worktree | `feat/function-control-m2d-acceptance` → `.worktrees/feat-function-control-m2d-acceptance` |
| CM M2D commit | `22ddaa8f8d45fd23e5630eb7b15c8b9aedc0e883` (gate split closeout) |
| OpenCode M2D commit | `6b3ebb07d9f836772a14bd4b86ec2ac62cfe0d00` |

## Two acceptance gates

M2D originally conflated **cutover** (replace canonical OpenCode/T3 OAuth with Function Control) with **multi-profile routing** (personal/work slots per provider family). These are separate gates with different evidence requirements.

| Gate | Intent | Physical OAuth required | Milestone status |
| --- | --- | --- | --- |
| **A — Cutover** | One OpenCode server + one Function Control authority serves the **canonical** `auth.json` slots (`openai`, `cursor`) without local refresh writes, credential crossover, or a second FC instance | **2** (one OpenAI, one Cursor) | **PASS** (L-A7 recommended) |
| **B — Multi-profile routing** | Ordered failover and four-way concurrent isolation across **distinct** personal/work physical identities per provider family | **4** (separate work OAuth sources) | **DEFERRED** — follow-on feature; hermetic coverage only |

Gate A is the **cutover authorization gate**. Gate B must not block Gate A.

### Logical account mapping (Gate A)

Canonical OpenCode `auth.json` has provider keys `openai` and `cursor`. Import maps them to manifest logical slots:

| Canonical slot | Imported logical account | Notes |
| --- | --- | --- |
| `auth.json["openai"]` | `openai:personal` | Same physical identity as `~/.codex/auth.json` |
| `auth.json["cursor"]` | `cursor:personal` | Same physical identity as Cursor Keychain / CLI auth |

Manifest stubs `openai:work` / `cursor:work` exist for routing fixtures and Gate B. They are **not** cutover requirements. Unpinned routing selects credentialed personal slots first; work slots without vault secrets are never selected unless personal is durably unavailable **and** work is credentialed.

## Checkpoint summary

| Checkpoint | Status |
| --- | --- |
| **M2D Gate A — Cutover** | **PASS** |
| **M2D Gate B — Multi-profile (4-account)** | **DEFERRED** |
| **M2D overall** | **CHECKPOINT: PASS** (Gate A governing cutover closed; Gate B deferred; L-A7 recommended) |

Gate A residual: L-A7 (`opencode serve` HTTP E2E) recommended before production traffic. T3 consumer path not demonstrated in this campaign.

## Cutover readiness assessment (2026-08-24)

Fresh verification after gate-split closeout; Cursor continuation campaign re-run same day:

| Layer | Result |
| --- | --- |
| CM `npm run test:function` | **60/60 PASS** |
| CM `npm run validate` | exit **1**, semantic **failed**, **548** errors (baseline) |
| CM `npm test` | **94 pass / 8 fail** (baseline-equivalent host debt) |
| OpenCode auth + M2D suites | **109/109 PASS** |
| Live L-A1 import (Keychain, canonical auth.json) | **PASS** |
| Live L-A2 direct resolve (openai + cursor) | **PASS** |
| Live L-A3 concurrent one-process isolation | **PASS** (openai:personal + cursor:personal; distinct fingerprints) |
| Live L-A4 Cursor Run → required FC continuation binding | **PASS** |
| Live L-A5 same-account resume | **PASS** |
| Live L-A6 unavailable bound account → `CONTINUATION_BLOCKED` | **PASS** (no spill) |
| Live L-A8 restart resolve + auth.json unchanged | **PASS** |
| Live L-A7 `opencode serve` HTTP E2E | **NOT RUN** |
| Live L-A9 T3 consumer | **NOT RUN** |

**Verdict: READY for OpenCode cutover** (`HHPE_AUTH_BACKEND=curated-market`) for the canonical two-account Gate A path (OpenAI + Cursor), with residual recommendation to run L-A7 before production traffic.

Previously Cursor was held only because L-A4–L-A6 had not been executed. They are now executed and **PASS**. The earlier “not run” rationale is obsolete.

**Recommended before production flip:** L-A7 (`opencode serve` concurrent HTTP chat).

**Operational note:** With manifest work stubs present but uncredentialed, marking `openai:personal` exhausted routes unpinned new work to `openai:work` → `CREDENTIAL_NOT_REGISTERED`. Gate B follow-on should either credentialed work slots or exclude uncredentialed stubs from routing pool. Live FC failover probe must not leave personal exhausted before cutover.

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
| Import | `importAuthJsonAccount` from `~/.local/share/opencode/auth.json` → `openai:personal`, `cursor:personal` |

## Live matrix — Gate A (cutover, 2026-08-24)

| Proof | Result |
| --- | --- |
| Canonical OpenAI (`openai:personal`) direct resolve | **PASS** |
| Canonical Cursor (`cursor:personal`) direct resolve | **PASS** |
| OpenAI + Cursor concurrent, one OpenCode process | **PASS** — distinct token fingerprints; no crossover |
| Keychain vault + import via existing FC mechanisms | **PASS** |
| Singleton Function Control (M2B + M2C share runtime) | **PASS** (automated + live warmRuntime) |
| M2C ExecutionContext on real OpenCode path | **PASS** — correlated `execution_id` + `behavior_bundle_id` |
| Cursor Run → automatic required continuation binding | **PASS** |
| Same-account continuation resume | **PASS** |
| Unavailable bound account → `CONTINUATION_BLOCKED` | **PASS** |
| Full `opencode serve` HTTP chat E2E | **NOT RUN** |
| T3 consumer curated-market path | **NOT RUN** |
| Curated-market mode: no `auth.json` refresh write-back | **PASS** (hermetic M2B; live import does not mutate canonical store) |

## Live matrix — Gate B (multi-profile, deferred)

| Proof | Result |
| --- | --- |
| `openai:work` direct | **NOT RUN** — no separate work OAuth on host |
| `cursor:work` direct | **NOT RUN** — no separate work OAuth on host |
| Four concurrent pinned sessions (A/B/C/D) | **NOT RUN** — requires Gate B credentials |
| OpenAI real `usage_limit_reached` → secondary unpinned routing | **NOT RUN** |
| OpenAI new-work secondary failover | **NOT RUN** |
| Cursor real 429 / `resource_exhausted` → `RATE_LIMITED` no-spill | **NOT OBSERVED** (classifier hermetic **PASS**) |

Gate B live campaign requires `OPENAI_WORK_AUTH_JSON` / `CURSOR_WORK_AUTH_JSON` pointing at **distinct** physical OAuth sources. Reusing personal tokens as work slots is invalid evidence.

## Remaining cutover proofs

Gate A Cursor continuation blockers are closed. Residual items:

| ID | Proof | Owner | Status |
| --- | --- | --- | --- |
| **A-F1 / L-A4** | Real Cursor Run → `sessionManager.registerSession` → Function Control required continuation binding | OpenCode + cursor-opencode-provider | **PASS** (`m2d-live-cursor-continuation.mjs`) |
| **A-F2 / L-A5** | Same Run id / OpenCode session → resume resolves same `cursor:personal` | OpenCode + FC | **PASS** |
| **A-F3 / L-A6** | Bound account unavailable → `CONTINUATION_BLOCKED` (no silent secondary) | OpenCode + FC | **PASS** |
| **A-F4 / L-A7** | One `opencode serve` process: unpinned OpenAI + Cursor concurrently | OpenCode HTTP | **Recommended** (not a hard Gate A blocker) |
| **A-F5 / L-A9** | T3 consumer through same Function Control vault | T3 integration | **If T3 in cutover scope** |
| **A-F6 / L-A8** | Restart persistence; canonical `auth.json` not written | FC + OpenCode | **PASS** |

Not required for Gate A cutover:

- Second physical OpenAI or Cursor identity (Gate B)
- OpenAI quota → secondary account failover (Gate B)
- Hermes / M3

## Proposed final cutover test plan

### Hermetic (automated — already largely covered)

Run before every cutover promotion. Must hold baseline accounting (validate 548 semantic errors; full suite 9 baseline-equivalent failures).

| Test | Location | Gate |
| --- | --- | --- |
| CuratedMarketAuthBackend resolve/report/release | `tests/function-control-opencode-auth.test.mjs` | A |
| No local `auth.json` refresh in registry mode | same | A |
| ALS session credential isolation (2 concurrent) | `test/auth/m2d-one-server.test.ts` | A |
| Singleton FC: bridge + ExecutionContext same `functionControl` | `test/auth/m2d-acceptance.test.ts` | A |
| Continuation key + notify + `CONTINUATION_BLOCKED` | CM + OC M2D tests | A |
| Fail-closed Cursor hook install | `test/auth/m2d-acceptance.test.ts` | A |
| Cursor classifier transient vs durable | `tests/function-control-cursor-provider.test.mjs` | A |
| M2C ExecutionContext composition + redaction | `tests/execution-resolve.test.mjs` | A |

### Live (manual campaign — close Gate A caveats)

Environment (fixed for all live proofs):

```bash
export HHPE_HRG_HOME="$HOME/.local/share/hhpe-function-runtime"
export HHPE_CURATED_MARKET_ROOT="<M2D CM worktree>"
export HHPE_AUTH_BACKEND=curated-market
unset HHPE_FUNCTION_VAULT_KEY
```

| ID | Procedure | Pass criteria |
| --- | --- | --- |
| **L-A1** | Import canonical `auth.json` → `openai:personal`, `cursor:personal` via `import-cli.mjs` / live script | Both accounts resolve; Keychain mode; no secrets in output |
| **L-A2** | Direct resolve: OpenAI codex + Cursor agent, unpinned | Correct account ids; distinct token fingerprints |
| **L-A3** | Concurrent unpinned: one OpenAI session + one Cursor session, one process | Overlapping resolves; no token crossover; distinct leases |
| **L-A4** | Start real Cursor Run in curated-market OpenCode; observe FC binding | Required continuation binding created; account = `cursor:personal` |
| **L-A5** | Continue same Run (follow-up turn) | Same account; same binding key family |
| **L-A6** | Mark `cursor:personal` unavailable (quota/auth patch); retry continuation | `CONTINUATION_BLOCKED`; no spill to work slot |
| **L-A7** | Single `opencode serve`: HTTP/API chat OpenAI + Cursor concurrently | Both providers authenticate via FC; no `auth.json` mutation |
| **L-A8** | Restart OpenCode process; resolve same sessions | FC state intact; refresh via FC not local auth store |
| **L-A9** | (Optional) T3 request through curated-market consumer | Same vault; no second FC instance |

Report each row **PASS / FAIL / NOT RUN**. Gate A closes when **L-A1–L-A3** pass (done) plus **L-A4–L-A6** pass, and **L-A7** (recommended) passes.

### Gate B live tests (future feature — not cutover blockers)

Track separately when second physical identities are available:

| ID | Procedure |
| --- | --- |
| **L-B1** | Import work OAuth → `openai:work`, `cursor:work` |
| **L-B2** | Four concurrent pinned sessions, one server |
| **L-B3** | Real OpenAI `usage_limit_reached` → unpinned new work selects `openai:work` |
| **L-B4** | Required continuation on personal → `CONTINUATION_BLOCKED` when personal exhausted |

## Objective (revised)

**Gate A:** Prove one OpenCode server + one Curated Market Function Control authority can serve canonical OpenCode OAuth (`openai`, `cursor`) without credential, refresh, binding, continuation, or client-cache crossover. Close automatic Cursor Run → required Function binding on live path.

**Gate B (deferred):** Prove multi-profile ordered failover across four distinct physical identities. Hermetic policy tests exist; live proof is a follow-on feature.

No Hermes. No auth.json swapping. No XDG/HOME isolation tricks.

## Automatic Cursor continuation hookup

| Step | Owner |
| --- | --- |
| Cursor `sessionManager.registerSession(session)` | cursor-opencode-provider@0.6.3 — Run id = `session.sessionId` (UUID); OpenCode session = `session.openCodeSessionId` |
| `installCursorSessionManagerAffinity` / `installCursorContinuationAffinity` | OpenCode (`auth/continuation.ts`) wraps register/close |
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
- Hermetic four-way barrier test (Gate B policy; hermetic only until work credentials exist)
- Pins for isolation proofs; unpinned routing for durable OpenAI failover (Gate B)

## Failover / no-spill

| Signal | Normalized | New work | Required continuation |
| --- | --- | --- | --- |
| OpenAI `usage_limit_reached` | `QUOTA_EXHAUSTED` | secondary allowed (Gate B) | `CONTINUATION_BLOCKED` if bound |
| Cursor HTTP 429 / gRPC `resource_exhausted` | `RATE_LIMITED` | retry/cooldown; no secondary spill | n/a (no durable quota heuristic) |

## Known limitations

- Gate B live campaign depends on distinct work OAuth sources (future feature)
- Cursor provider does not export `sessionManager` on public package exports; hookup uses `createRequire` → `dist/session.js`
- OpenCode auth-only bun runs may hit inherited preload `afterAll` AppRuntime dispose timeout (named tests still pass)
- Validate semantic 548 errors + 9 full-suite baseline failures unchanged unless independently fixed

## M3 boundary

Hermes AuthBackend / behavior adapter / execution consumer — **not started**.

## Non-goals

- Gate B as cutover blocker
- OpenCode account pool / priority tables in framework
- auth.json / XDG per-session isolation for registry-mode acceptance
- Cursor N×429 → quota heuristics
- Full OTEL authority
