## Closeout verification (2026-08-23)

### Repository state

| Field | Value |
| --- | --- |
| Repository | `/Users/maxholden/src/curated-market` |
| Branch | `main` |
| Baseline / start HEAD | `d28ead32ef2ab2413360f9be5007a6269c1fb879` |
| Feature HEAD (committed) | `d28ead32ef2ab2413360f9be5007a6269c1fb879` (M1 on working tree, uncommitted) |
| origin/main | `4eb722fc72320e6f510312c558dafd47ac603a7e` |

Milestone 1 Function Control is **uncommitted** on the working tree. Closeout evidence applies to that tree.

**Unrelated working-tree changes (not M1):** `.opencode/**`, `AGENTS.md`, `opencode.json`, several `registry/manifests/*` (capabilities, dependencies, exposures, hosts, migration-state, packages.lock, specialization, tools), `reports/capability-checks/*`, `docs/host-adapters.md`, `scripts/ensure-t3-opencode-bindings.mjs`.

### Milestone 1 file scope (expected)

- `lib/function-control/**`
- `registry/schemas/function-account.schema.json`, `function-consumer.schema.json`, `execution-context.schema.json` (partial)
- `registry/manifests/function-accounts.yaml`, `function-consumers.yaml`
- `registry/providers/openai/**`
- `bin/hhpe-function-resolve`, `hhpe-function-import-auth`, `hhpe-function-status`
- `tests/function-control-*.test.mjs`, `tests/fixtures/function-control/**`
- `package.json` (`test:function`)
- `.gitignore` (`/function-control/` runtime root only)
- `docs/decisions/ADR-027-function-control-plane.md`
- `docs/superpowers/plans/2026-08-22-function-control-milestone-1.md`
- `docs/architecture.md` (ADR-027 link)

### Test gates

| Command | Environment | Result |
| --- | --- | --- |
| `npm run test:function` | `unset HHPE_HRG_HOME` | **24 pass, 0 fail** |
| `npm run validate` | `unset HHPE_HRG_HOME` | **pass** |
| `npm test` (feature tree) | `unset HHPE_HRG_HOME` | **47 tests, 38 pass, 9 fail** |
| `npm test` (baseline worktree `d28ead3`) | `unset HHPE_HRG_HOME` | **23 tests, 14 pass, 9 fail** |

**Note:** If `HHPE_HRG_HOME` points at a temp dir without `registry/manifests/`, `npm run validate` fails (ENOENT). Canonical repo gates use unset `HHPE_HRG_HOME` (catalog from checkout; Function Control runtime defaults to `~/.local/share/hhpe-hrg`).

**Regression analysis:** Feature adds 24 function-control tests (all pass). Failure count unchanged at **9** — same tests on baseline and feature:

1. `registry.test.mjs` — expanded packages / specialist identities
2. `registry.test.mjs` — HHPE wrapper routing boundaries
3. `registry.test.mjs` — session-start fixture
4. `registry.test.mjs` — registry integrity
5. `registry.test.mjs` — headless static integrity
6. `registry.test.mjs` — executable wrappers
7. `registry.test.mjs` — Codex adapter overlay match
8. `rollback.test.mjs` — controlled apply/rollback
9. `rollback.test.mjs` — retarget refusal

Classified **pre-existing baseline failures** on this host. **No new regressions from M1.**

### Closeout fixes applied

- `lib/function-control/paths.mjs`: split `resolveManifestRoot` vs `resolveRuntimeHome`; manifest reads fall back to checkout when temp `HHPE_HRG_HOME` has no manifests.
- `lib/function-control/account-store.mjs`, `consumer-registry.mjs`: manifest path via `resolveManifestRoot(env)`.
- `lib/function-control/resolve.mjs`: `createConsumerRegistry(env)`.
- `tests/function-control-resolve.test.mjs`: unauthorized pin uses unregistered consumer (not `opencode`, which has no account allowlist).

### Runtime path correction

- Default **runtime** home: `~/.local/share/hhpe-hrg` (ADR-001), not the Git checkout.
- Default **manifest** reads: checkout when `HHPE_HRG_HOME` unset or lacks `registry/manifests/function-accounts.yaml`.
- `.gitignore`: `/function-control/` at repo root only (does not hide `lib/function-control/`).
- Isolated smoke: `HHPE_HRG_HOME="$(mktemp -d)"` + `HHPE_FUNCTION_VAULT_KEY`; `node lib/function-control/cli.mjs status` creates vault under temp only; checkout has no `function-control/`.
- Installed `bin/hhpe-function-*` wrappers resolve `cli.mjs` from `${HHPE_HRG_HOME}/lib` (install root); dev smoke uses `node lib/function-control/cli.mjs` or copies `lib` into temp install root per M1 plan.

### Secret containment

- No tracked `function-control/vault/secrets.enc`, `state/*.json`, or real tokens in git index.
- Pattern scan on `lib/`: no real JWTs, Bearer secrets, or production vault keys.
- Mocks: `rt_personal_mock`, `rt_work_mock`, synthetic access tokens in tests only.
- CLI: `resolve` truncates access token; `status` omits vault/secrets; `import-auth` does not log credentials.

### Critical invariant inspection (code + tests)

| Invariant | Evidence |
| --- | --- |
| Pin authorization | `resolve.mjs` calls `consumers.isAuthorized` for pin and post-selection; test `unauthorized pin_account_id` |
| RATE_LIMITED no spill | `ordered-failover.mjs` returns `retry_same_account` on transient cooldown; resolve tests |
| QUOTA_EXHAUSTED / AUTH_FAILED failover | `isDurableUnavailable` skips account for new unpinned work; report tests |
| Required affinity | `evaluateExistingBinding` → `CONTINUATION_BLOCKED`; `rebind` requires `force_restart` |
| Preferred stability | Transient errors retry same account; durable exhaustion sticky on existing binding |
| Per-account singleflight | `refresh-coordinator.mjs` keyed by `accountId`; vault test |
| Vault per-account | `encrypted-vault.mjs` `setSecret` merges one entry; isolation test |
| Linux fail-closed | `key-provider-factory.mjs` + vault test |
| macOS Keychain default | factory selects Keychain when `platform === 'darwin'`; tests use ephemeral key |
| Binding ≠ lease ≠ access | Separate stores; refresh updates vault + account metadata only; lease grant/revoke independent |
| Import boundaries | `registry.mjs` ⊄ function-control; `index.mjs` ⊄ `registry.mjs`; provider modules under `registry/providers/openai/` |
| OpenAI classification | `usage_limit_reached` → `QUOTA_EXHAUSTED`; 429 → `RATE_LIMITED`; 401 → `AUTH_FAILED` |

### Closeout checklist

- [x] `npm run test:function` passes
- [x] `npm run validate` passes (canonical env)
- [x] Full suite: failures baseline-equivalent (9 pre-existing)
- [x] No new regression vs baseline
- [x] Runtime state not recommended in checkout
- [x] No real secrets tracked
- [x] Vault key not adjacent to ciphertext (prod defaults)
- [x] Linux fail-closed
- [x] Pin authorization enforced
- [x] RATE_LIMITED does not spill
- [x] QUOTA_EXHAUSTED/AUTH_FAILED failover for new work
- [x] Required affinity cannot silently migrate
- [x] Per-account singleflight
- [x] Account-scoped vault updates
- [x] Binding / lease / access lifetimes independent
- [x] Function and Behavior planes import-isolated

### Known limitations (deferred)

- No Cursor provider family, OpenCode auth backend, execution resolver, or Hermes.
- `bin/hhpe-function-*` require install layout at `HHPE_HRG_HOME`; dev uses `lib/function-control/cli.mjs` or temp install copy.
- Nine pre-existing registry/rollback tests fail on this host until environment/catalog fixtures are aligned.

### Milestone 1 status

**PASS** (verification complete on working tree; M1 artifacts still uncommitted).

### Milestone 2 entry

**2A:** `registry/providers/cursor/` provider-family module + continuation policy/classification (no OpenCode/Cursor framework wiring yet).
