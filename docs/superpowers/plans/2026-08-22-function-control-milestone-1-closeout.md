## Closeout verification (2026-08-23)

### Git provenance (authoritative)

| Field | Value |
| --- | --- |
| Repository | `/Users/maxholden/src/curated-market` |
| M1 branch | `feat/function-control-m1` |
| M1 worktree | `.worktrees/feat-function-control-m1` |
| Baseline HEAD | `d28ead32ef2ab2413360f9be5007a6269c1fb879` |
| M1 checkpoint | `42a6d6a6bd0bae3ab03429f5505d702a34d517fd` |
| M2A base | `42a6d6a6bd0bae3ab03429f5505d702a34d517fd` |

Do **not** start M2A from dirty `main`. Use this branch/worktree (or branch from the M1 checkpoint hash).

### Status record

**M1 CHECKPOINT: PASS — regression-safe**

| Gate | Result |
| --- | --- |
| Function tests (`npm run test:function`) | **24/24 PASS** |
| Full suite (`npm test`) | **38/47 PASS**; **9 failures baseline-equivalent** |
| Registry validation (`npm run validate`) | See below — **do not treat exit code as success** |

### Registry validation (wording correction)

`npm run validate` is **not** semantically green on this host.

| Aspect | Result |
| --- | --- |
| Process exit code | `0` |
| JSON `status` | `failed` |
| Error count | **548** missing-package (and related) errors |
| Baseline `d28ead3` | **Identical** process exit / semantic failure / error class |

**Pre-existing validation debt. Not introduced by M1. Do not fix in M1.**

Future agents must **not** inherit “`npm run validate` passes” from exit code alone. Authoritative signal is the JSON `status` field (and error list), compared to baseline when classifying regressions.

Track repair of this debt separately unless a later milestone intentionally changes validation semantics.

### Milestone 1 file scope

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
- `tests/registry.test.mjs` (wrapper-core inventory allows `function-control/` so Behavior `bin/` scan does not reject Function CLIs)

### Full-suite baseline comparison

On clean trees with `unset HHPE_HRG_HOME`:

| Tree | Tests | Pass | Fail |
| --- | --- | --- | --- |
| Baseline `d28ead3` | 23 | 14 | **9** |
| M1 checkpoint | 47 | 38 | **9** |

Failure **names** match baseline exactly (0 new regressions). The nine failures are host/catalog/rollback debt, not Function Control defects.

### Runtime path / secret containment

- Runtime defaults to `~/.local/share/hhpe-hrg` (not the Git checkout).
- Manifest reads fall back to checkout when `HHPE_HRG_HOME` lacks manifests.
- `.gitignore` protects `/function-control/` at repo root only.
- No real secrets or runtime vault/state tracked; fixtures use synthetic `rt_*_mock` values.

### Critical invariants (verified)

Pin authorization; RATE_LIMITED no-spill; durable QUOTA/AUTH failover for new work; required affinity blocked; per-account refresh singleflight; account-scoped vault updates; Linux fail-closed key provider; binding ≠ lease ≠ access credential; Function ↔ Behavior import isolation.

### Known limitations (deferred)

- No Cursor provider family, OpenCode auth backend, execution resolver, or Hermes.
- Nine baseline-equivalent full-suite failures on this host.
- Registry validate semantic failure (548 errors) — baseline debt; separately tracked.

### Milestone 2A entry

Narrow scope only:

**2A:** `registry/providers/cursor/` — outcomes, classification, refresh/usage signals, continuation policy.

**Not in 2A:** OpenCode `CuratedMarketAuthBackend`, Cursor plugin wiring, execution-resolve, four-account concurrency, Hermes, loopback, OTLP.
