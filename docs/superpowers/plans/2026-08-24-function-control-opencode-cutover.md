# Function Control OpenCode Cutover Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Flip OpenCode from canonical `auth.json` OAuth authority to Curated Market Function Control (`HHPE_AUTH_BACKEND=curated-market`) for the two canonical identities (`openai`, `cursor`) without downtime surprises, credential crossover, or auth.json write-back.

**Architecture:** One OpenCode process consumes one Function Control authority (Keychain-backed vault under `HHPE_HRG_HOME`). Canonical `~/.local/share/opencode/auth.json` is import source only — not the live refresh store. Cursor Run continuation affinity stays on the OpenCode/provider side; Function Control owns required account binding only.

**Tech Stack:** OpenCode curated-market AuthBackend, Curated Market Function Control (M1–M2D), macOS Keychain vault provider, `cursor-opencode-provider@0.6.3`, existing import CLI/scripts.

**Origin:** Gate A PASS — `docs/superpowers/plans/2026-08-23-function-control-milestone-2d-four-account-acceptance.md` (CM plan tip includes this file; OpenCode L-A7 tip `8a207e3`).

## Global Constraints

- Gate A only: two physical OAuth identities (`openai:personal`, `cursor:personal`). Gate B multi-profile is out of scope.
- Do not invent a second credential path; use existing `importAuthJsonAccount` / import CLI.
- Do not set `HHPE_FUNCTION_VAULT_KEY` or force file-degraded vault on this host — Keychain is required.
- Do not swap `auth.json`, use XDG/HOME isolation tricks, or start per-account OpenCode processes.
- Do not merge/push/PR or start Hermes/M3 as part of cutover.
- Never log access tokens, refresh tokens, or vault keys.
- Do not run the live FC failover probe that marks `openai:personal` exhausted immediately before or during cutover.
- Manifest work stubs (`openai:work`, `cursor:work`) without vault secrets must remain unused; unpinned routing must land on credentialed personal slots.

---

## Preconditions (already proven)

| Proof | Status |
| --- | --- |
| Keychain vault + import from canonical auth.json | PASS |
| Direct resolve openai + cursor | PASS |
| Concurrent one-process isolation | PASS |
| Singleton FC (M2B + M2C) | PASS |
| Cursor Run → required continuation binding (L-A4) | PASS |
| Same-account resume (L-A5) | PASS |
| Unavailable → CONTINUATION_BLOCKED (L-A6) | PASS |
| Restart resolve; auth.json untouched (L-A8) | PASS |
| `opencode serve` HTTP E2E (L-A7) | **PASS** (2026-08-24; harness `m2d-live-serve-smoke.mjs`) |
| T3 consumer (L-A9) | NOT RUN — optional Task 6 |

---

## Task 1 preflight result (2026-08-24)

| Step | Result |
| --- | --- |
| Personal health reset | PASS (`openai:personal` / `cursor:personal` healthy) |
| L-A1–L-A3 (FC live) | PASS |
| L-A4–L-A6 (Cursor continuation) | PASS |
| L-A7 serve HTTP OpenAI + Cursor | **PASS** |
| auth.json unmutated during L-A7 | PASS |
| Cutover GO/NO-GO | **GO** — proceed to Task 2 freeze, then import/flip |

**Harness notes:** CLI `opencode serve` on this tip still defects (`InstanceRef` / `Config.getGlobal` with `instance: false`). L-A7 uses `Server.listen` (same HTTP server as serve after opts). Cursor catalog requires `cursor-opencode-provider` plugin; empty host config is insufficient — smoke injects harness-local `OPENCODE_CONFIG`.

**Serve fixes landed with L-A7 harness (OpenCode):** curated-market skips uncredentialed third-party auth loaders; Poe loader guards undefined `getAuth()`; stub provider info when models.dev lacks cursor.

---

## File / surface map

| Path | Role in cutover |
| --- | --- |
| `docs/superpowers/plans/2026-08-23-function-control-milestone-2d-four-account-acceptance.md` | Gate A evidence / authority for readiness |
| `lib/function-control/import-cli.mjs` / `import-auth.mjs` | Import canonical auth.json → vault |
| `scripts/m2d-live-function-control.mjs` | Preflight resolve matrix (avoid failover pollution) |
| `packages/opencode/scripts/m2d-live-one-server.mjs` | Concurrent isolation smoke |
| `packages/opencode/scripts/m2d-live-cursor-continuation.mjs` | Cursor continuation regression |
| `packages/opencode/src/auth/backend-layer.ts` | Selects curated-market vs local |
| `packages/opencode/src/auth/backend.ts` | Bridge + singleton FC runtime |
| `packages/opencode/src/auth/continuation.ts` | Cursor Run affinity hook |
| `~/.local/share/hhpe-function-runtime` | Durable FC state/vault (runtime home) |
| `~/.local/share/opencode/auth.json` | Import source only after cutover |

---

### Task 1: Pre-cutover smoke (recommended L-A7 + health reset)

**Goal:** Confirm serve-path readiness and clean account health before flipping the default.

**Files:**
- Modify: none required (ops)
- Add: `packages/opencode/scripts/m2d-live-serve-smoke.mjs`

- [x] **Step 1: Reset personal account health**

```bash
export HHPE_HRG_HOME="$HOME/.local/share/hhpe-function-runtime"
export HHPE_CURATED_MARKET_ROOT="<M2D CM worktree or promoted tip>"
unset HHPE_FUNCTION_VAULT_KEY
# Patch openai:personal + cursor:personal → healthy / available (no secrets printed)
```

- [x] **Step 2: Re-run Gate A live smokes**

```bash
export HHPE_AUTH_BACKEND=curated-market
node "$HHPE_CURATED_MARKET_ROOT/scripts/m2d-live-function-control.mjs"
# Expect: personal resolves PASS; ignore work BLOCKED rows
bun run packages/opencode/scripts/m2d-live-one-server.mjs
bun run packages/opencode/scripts/m2d-live-cursor-continuation.mjs
```

- [x] **Step 3: Run L-A7 — one HTTP server, OpenAI + Cursor chat via HTTP/API**

Pass criteria: both providers authenticate via FC; `auth.json` mtime unchanged; distinct sessions; no second FC process. **PASS** 2026-08-24.

- [x] **Step 4: Commit any new serve-smoke harness (if created)** — message: `[Feature] (Add) M2D L-A7 serve smoke for cutover`

**Test scenarios:**
1. Personal OpenAI resolve succeeds under Keychain mode
2. Personal Cursor resolve succeeds
3. Concurrent ALS isolation still holds
4. Cursor continuation L-A4–L-A6 still PASS
5. Serve path: both providers work without auth.json mutation

---

### Task 2: Freeze cutover artifact versions

**Goal:** Pin the exact CM + OpenCode revisions used for the flip.

- [ ] **Step 1: Record SHAs** in this plan’s provenance table (or cutover runbook appendix)

Current Gate A tips (freeze for Task 2 / flip):

| Repo | Branch | Tip |
| --- | --- | --- |
| curated-market | `feat/function-control-m2d-acceptance` | `09ccf633f21b5b0b12d6f6457965dc0e749ffa24` (L-A7 GO docs; optional follow-up may only fill this cell) |
| opencode | `feat/function-control-m2d-acceptance` | `8a207e3e68ed386cfb51419774853a9f9a17ff11` |

Former tips (`db2cc0b` / `dc9c290`) are superseded for freeze.

- [ ] **Step 2: Decide promotion path** — run from worktree tips for this host cutover, or merge to local main **without** remote push if that is the house rule for this machine. Do not treat GitHub Actions as a gate.

- [ ] **Step 3: Confirm `cursor-opencode-provider@0.6.3` is installed** in the OpenCode package used to serve

**Test scenarios:**
1. `git rev-parse HEAD` matches recorded tips (or intentionally newer recorded tips)
2. Package resolves `cursor-opencode-provider/package.json`

---

### Task 3: Vault import / re-import (idempotent)

**Goal:** Ensure Function Control vault holds current canonical oauth material for both personal slots.

- [ ] **Step 1: Set runtime env (no vault key env)**

```bash
export HHPE_HRG_HOME="$HOME/.local/share/hhpe-function-runtime"
export HHPE_CURATED_MARKET_ROOT="<CM tip>"
unset HHPE_FUNCTION_VAULT_KEY
```

- [ ] **Step 2: Import**

```bash
node lib/function-control/import-cli.mjs --from "$HOME/.local/share/opencode/auth.json" --account openai:personal
node lib/function-control/import-cli.mjs --from "$HOME/.local/share/opencode/auth.json" --account cursor:personal
```

- [ ] **Step 3: Verify Keychain mode + resolves** (sanitized output only)

Expect: `key_provider=keychain`; accounts `openai:personal`, `cursor:personal` resolve.

**Test scenarios:**
1. Import is idempotent (re-run safe)
2. Uncredentialed work slots are not selected when personal is healthy
3. No secrets in stdout/logs

---

### Task 4: Flip OpenCode to curated-market

**Goal:** Make Function Control the live auth authority for day-to-day OpenCode.

- [ ] **Step 1: Persist launch env** for the OpenCode process (shell profile, launchd plist, or OpenCode config `auth_backend.type=curated-market` + `curated_market_root`)

Required:

```bash
export HHPE_AUTH_BACKEND=curated-market
export HHPE_CURATED_MARKET_ROOT="<CM tip>"
export HHPE_HRG_HOME="$HOME/.local/share/hhpe-function-runtime"
unset HHPE_FUNCTION_VAULT_KEY
# Optional: HHPE_EXECUTION_CONTEXT=1 only if M2C path is intentionally enabled
```

- [ ] **Step 2: Stop any OpenCode process still on local auth backend**

- [ ] **Step 3: Start one OpenCode server** (`opencode serve` or existing host entrypoint)

- [ ] **Step 4: Confirm backend selection** — first request logs/diagnostics show curated-market (no token values); Cursor continuation hook installed (fail-closed if missing)

**Test scenarios:**
1. Single OpenCode process
2. Single FC authority (no second vault home)
3. Startup fails closed if Cursor continuation hook cannot load in curated-market mode
4. LocalAuthBackend path is not used for openai/cursor resolves

---

### Task 5: Post-flip verification (acceptance window)

**Goal:** Prove production-shaped traffic matches Gate A.

- [ ] **Step 1: OpenAI chat** (unpinned) → account `openai:personal`

- [ ] **Step 2: Cursor agent turn** (tool-bearing, not lifecycle) → required continuation binding present for Run

- [ ] **Step 3: Cursor follow-up** on same Run → same account

- [ ] **Step 4: Concurrent OpenAI + Cursor** → distinct token fingerprints / leases

- [ ] **Step 5: Confirm `auth.json` mtime unchanged** after refresh-worthy activity

- [ ] **Step 6: Record results** in Gate A closeout or a short cutover log under `docs/superpowers/plans/` (no secrets)

**Test scenarios:**
1. OpenAI success path
2. Cursor Run binding created automatically
3. Cursor resume sticky
4. No auth.json mutation
5. No credential crossover under concurrency

---

### Task 6: T3 / other consumers (optional — only if in cutover scope)

**Goal:** Same vault, no second Function Control authority.

- [ ] **Step 1: Identify T3 consumer wiring** (env / consumer_id / curated-market root)

- [ ] **Step 2: Point T3 at same `HHPE_HRG_HOME` + `HHPE_CURATED_MARKET_ROOT`**

- [ ] **Step 3: One resolve proof** through T3 consumer; confirm shared vault, not a duplicate Keychain item / runtime home

**Test scenarios:**
1. Same account ids resolve
2. No second FC instance / second runtime home
3. Fail closed if consumer not authorized

Defer entirely if T3 is not part of this cutover.

---

### Task 7: Rollback procedure (must be rehearsable)

**Goal:** Instant return to canonical OpenCode oauth if cutover misbehaves.

- [ ] **Step 1: Document rollback**

```bash
unset HHPE_AUTH_BACKEND
# or: export HHPE_AUTH_BACKEND=local
# Keep HHPE_HRG_HOME intact (do not delete vault)
# Restart OpenCode
```

- [ ] **Step 2: Verify local path** resolves openai/cursor from `auth.json` again

- [ ] **Step 3: Do not delete** `~/.local/share/hhpe-function-runtime` during rollback — preserves ability to re-flip

**Test scenarios:**
1. Rollback restores local auth within one process restart
2. Vault remains intact for re-entry
3. auth.json still valid for local mode

---

### Task 8: Operational guardrails after cutover

**Goal:** Prevent self-inflicted outages from known pitfalls.

- [ ] **Step 1: Ban pre-cutover failover probe** that reports `QUOTA_EXHAUSTED` against personal when work is uncredentialed

- [ ] **Step 2: Prefer resetting personal health** if a probe left `quota_state=exhausted`

- [ ] **Step 3: Track Gate B separately** — work profiles, secondary failover, four-way concurrent pins

- [ ] **Step 4: Update M2D closeout** with cutover date + serve-path result when Task 1/5 complete

**Test scenarios:**
1. Healthy personal is default route
2. Exhausted personal without work credentials fails explicitly (no silent fake work)
3. Docs reflect cutover complete vs deferred Gate B

---

## Rollback summary

| Symptom | Action |
| --- | --- |
| Cursor hook unavailable / startup fail-closed | Fix provider install or set `HHPE_AUTH_BACKEND=local` and restart |
| CREDENTIAL_NOT_REGISTERED on personal | Re-import from auth.json; check Keychain |
| CREDENTIAL_NOT_REGISTERED selecting work | Reset personal health; do not fake-import work |
| Token/refresh weirdness | Rollback to local; do not delete vault |
| auth.json mutated unexpectedly | Treat as defect; rollback; capture mtime evidence |

## Explicit non-goals

- Gate B four-account / work-profile routing
- Hermes / M3
- Remote merge/push/PR as cutover authority
- File-degraded vault “to make it work”
- Copying Cursor Run/checkpoint state into Function Control

## Success definition

Cutover is **complete** when:

1. Day-to-day OpenCode runs with `HHPE_AUTH_BACKEND=curated-market`
2. OpenAI + Cursor traffic uses `openai:personal` / `cursor:personal` via Keychain FC
3. Cursor Run establishes required continuation binding automatically
4. `auth.json` is not written by registry-mode refresh
5. Rollback to local remains one env change + restart

Optional: L-A7 serve smoke recorded **PASS** (2026-08-24); T3 on same vault if in scope.
