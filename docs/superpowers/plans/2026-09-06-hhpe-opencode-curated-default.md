# HHPE OpenCode curated-market default — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the HHPE OpenCode fork default to curated-market AuthBackend with fail-closed root discovery.

**Architecture:** Add `resolveCuratedMarketRoot()`; flip default mode from `local` to `curated-market` unless explicitly escaped; stop using `HHPE_HRG_HOME` as market root. Personalization fallback is Phase 2.

**Tech Stack:** TypeScript / Effect (existing `packages/opencode` auth + config).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-09-06-hhpe-opencode-curated-default-design.md` (curated-market)
- Do not change agent-agnostic `main` specialization ownership
- `HHPE_AUTH_BACKEND=local` remains the test/break-glass escape
- Local CI only for verification

---

### Task 1: Failing tests for default curated mode + root discovery

**Files:**
- Create/modify: `packages/opencode/test/auth/curated-default.test.ts` (or extend `backend.test.ts`)
- Modify: existing tests that assume local default without env

- [ ] **Step 1: Write failing tests** — unset `HHPE_AUTH_BACKEND` ⇒ curated mode; `local` ⇒ not curated; discovery finds specialization.yaml; missing root fails closed; `HHPE_HRG_HOME` alone is not a market root
- [ ] **Step 2: Run tests — expect fail**

---

### Task 2: Implement resolveCuratedMarketRoot + default mode

**Files:**
- Modify: `packages/opencode/src/auth/backend.ts` (`isCuratedMarketAuthMode`)
- Modify: `packages/opencode/src/auth/backend-layer.ts`
- Create: `packages/opencode/src/auth/curated-market-root.ts` (discovery helper)

- [ ] **Step 1: Implement discovery helper**
- [ ] **Step 2: Default layer mode to curated-market**
- [ ] **Step 3: Make tests pass**
- [ ] **Step 4: Commit**

---

### Task 3: Docs on curated-market OpenCode-only line

**Files:**
- Create: design (done) + this plan
- Modify: `docs/superpowers/specs/README.md` index

- [ ] **Step 1: Index living/supporting specs**
- [ ] **Step 2: Commit + push oo + opencode branches**

---

## Phase 2 (out of this plan)

Personalization fallback from `$CM_ROOT` when project lacks `opencode.json` / `.opencode`.
