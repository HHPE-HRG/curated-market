# HHPE OpenCode curated-market default

**Status:** Approved direction (Approach A) — 2026-09-06  
**Repos:** HHPE-HRG/opencode (fork) + curated-market `feat/opencode_only`  
**Sibling living specs:** [agent-agnostic main](./2026-08-31-agent-agnostic-main-design.md) · [OpenCode-only](./2026-08-20-opencode-only-design.md)

## Purpose

The HHPE OpenCode fork is **not** vanilla OpenCode with an optional switch. Its product purpose is curated-market (and later HHPE systems) experience and behavior.

Upstream `anomalyco/opencode` remains an escape hatch only if a stock binary is installed under another name. The installed HHPE `opencode` must default to curated-market.

## Decisions (locked)

| Decision | Choice |
| --- | --- |
| Approach | **A — fork-native defaults** (install shim is packaging only, not source of truth) |
| Auth default | `auth_backend.type = curated-market` unless explicitly `local` |
| Personalization | Full curated profile from OpenCode-only tree when the cwd project lacks specialization files |
| Market authority | curated-market `feat/opencode_only` (do not re-bleed onto agent-agnostic `main`) |
| Escape | `HHPE_AUTH_BACKEND=local` (tests / break-glass only) |

## Invariants

1. Default AuthBackend mode is curated-market.
2. Curated mode requires a resolvable curated-market root that owns specialization (fail closed if missing).
3. `HHPE_HRG_HOME` is the Function Control **runtime** home — never treat it as the curated-market git root.
4. Root discovery order:
   1. Config `auth_backend.curated_market_root`
   2. `HHPE_CURATED_MARKET_ROOT`
   3. Well-known paths that contain `registry/manifests/specialization.yaml` (e.g. configured install path, `~/src/curated-market` when specialized)
5. Explicit `HHPE_AUTH_BACKEND=local` or config `auth_backend.type=local` disables curated mode.
6. Personalization: if project cwd has no `opencode.json` / `.opencode` specialization, load provider/agent policy from the discovered curated-market root (OpenCode-only tree). Project-local specialization still wins when present.

## Non-goals

- Merging OpenCode specialization back onto agent-agnostic `main`
- Replacing stock upstream OpenCode for users who intentionally install it separately
- Inventing a second personalization authority inside the fork

## Phased delivery

### Phase 1 (this plan) — auth default + root discovery

- `resolveCuratedMarketRoot()`
- Default curated AuthBackend in `backend-layer` / `isCuratedMarketAuthMode`
- Fail closed without root
- Tests for default / local escape / discovery / fail-closed
- Docs index pointer

### Phase 2 (follow-on) — personalization fallback

- When project lacks OpenCode specialization files, merge config from `$CM_ROOT/opencode.json` and `$CM_ROOT/.opencode`
- Keep project files authoritative when present

## Proof

- Unit tests in HHPE-HRG/opencode `packages/opencode/test/auth/`
- Existing M2D curated-market suites still pass with root set
- Local escape: `HHPE_AUTH_BACKEND=local` keeps prior local AuthBackend behavior
