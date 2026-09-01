# Agent-Agnostic Main / OpenCode-Only Peel — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Peel OpenCode-only specialization off agent-agnostic `main` onto `feat/opencode_only` so default curated-market validation no longer privileges one agent runtime, while preserving OpenCode’s open-source specialization line.

**Architecture:** Shared registry + Function Control core + peer host adapters stay on `main`. Specialization selector, project personalization, OpenCode validate/generate scripts, OpenCode FC consumer adapter, and OpenCode provider pins live only on `feat/opencode_only`. Default `validate()` / static integrity stop calling `validateOpencodeOnly`.

**Tech Stack:** Node.js ES modules, `node:test`, existing `lib/registry.mjs` / `lib/skills-ci.mjs` / `lib/opencode-specialization.mjs`.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-31-agent-agnostic-main-opencode-only-peel-design.md`
- Inventory: `docs/superpowers/plans/2026-08-31-opencode-only-peel-inventory.json` (authoritative file actions)
- Do **not** reset `main` to pre–PR #5 history.
- Do **not** remove Cursor/Codex peer host adapters from main.
- Do **not** move Function Control core or `registry/providers/*` to opencode_only.
- Cursor-as-host ≠ Cursor-as-OpenCode-provider (see design).
- Local CI only (`npm test`, `npm run test:function`, `npm run validate`); do not treat GitHub Actions as authority.
- Prep branch may land groundwork only; **peel execution starts at Task 3**.

## Provenance (fill at peel start)

| Ref | SHA at peel start |
| --- | --- |
| `origin/main` | _TBD_ |
| `origin/feat/opencode_only` | _TBD_ |
| Prep groundwork merge | _TBD_ |

## File / surface map

| Path | After peel |
| --- | --- |
| `lib/registry.mjs` | No `validateOpencodeOnly` in default `validate` |
| `lib/skills-ci.mjs` | No specialization in default static integrity |
| `lib/opencode-specialization.mjs` | Owned/required on `feat/opencode_only` |
| `registry/manifests/specialization.yaml` | Owned on `feat/opencode_only` |
| `AGENTS.md`, `opencode.json`, `.opencode/**` | Owned on `feat/opencode_only` |
| `scripts/sync-opencode.mjs`, `ensure-t3-opencode-bindings.mjs` | Owned on `feat/opencode_only` |
| `lib/function-control/opencode/**` | Owned on `feat/opencode_only` |
| `lib/function-control/*` (core) | Stay on `main` |
| `registry/adapters/{codex,cursor}/**`, `cursor-plugin-routing/**` | Stay on `main` |
| `tests/agent-agnostic-main.characterization.test.mjs` | Prep — documents bleed |
| `tests/agent-agnostic-main.peel-acceptance.test.mjs` | Prep — gated post-peel gate |

---

### Task 0: Groundwork (this prep — do not peel)

**Files:**
- Create: `docs/superpowers/specs/2026-08-31-agent-agnostic-main-opencode-only-peel-design.md`
- Create: `docs/superpowers/plans/2026-08-31-opencode-only-peel-inventory.json`
- Create: `docs/superpowers/plans/2026-08-31-agent-agnostic-main-opencode-only-peel.md` (this file)
- Create: `tests/agent-agnostic-main.characterization.test.mjs`
- Create: `tests/agent-agnostic-main.peel-acceptance.test.mjs`

- [x] **Step 1: Land design + inventory + plan**
- [x] **Step 2: Land characterization tests (pass on unpeeled main)**
- [x] **Step 3: Land peel-acceptance tests (skip unless `HHPE_PEEL_ACCEPTANCE=1`; fail when forced on unpeeled main)**
- [x] **Step 4: Commit prep branch only — no validate()/skills-ci behavior change**

**Test scenarios:**
1. `env -u HHPE_HRG_HOME npm test` includes characterization and passes.
2. Default `npm test` does not fail peel-acceptance (skipped).
3. `HHPE_PEEL_ACCEPTANCE=1 npm test -- tests/agent-agnostic-main.peel-acceptance.test.mjs` fails until peel.

---

### Task 1: Freeze tips and open peel worktree

**Files:**
- Modify: this plan’s provenance table

- [ ] **Step 1: Record `origin/main` and `origin/feat/opencode_only` SHAs**
- [ ] **Step 2: Create worktree `feat/agent-agnostic-main-peel` from `origin/main`**
- [ ] **Step 3: Confirm characterization still green; peel-acceptance still red with env**

**Test scenarios:**
1. Worktree `git status` clean at freeze tip.
2. Characterization PASS; peel-acceptance FAIL with env.

---

### Task 2: Decide `function-consumers.yaml` `opencode` row placement

**Files:**
- Modify: `registry/manifests/function-consumers.yaml` (peel-time)
- Test: `tests/function-control-*.test.mjs`

**Decision rule:** Keep a declared `opencode` consumer id on main **only if** FC core tests require a second consumer fixture without importing OpenCode modules. Otherwise move consumer registration with `lib/function-control/opencode/**`.

- [ ] **Step 1: Grep FC tests for `consumer_id === 'opencode'`**
- [ ] **Step 2: Choose keep-on-main vs move-with-adapter; record choice in plan notes**
- [ ] **Step 3: Add a one-line note under Global Constraints once decided**

---

### Task 3: Decouple default validate / static integrity (main peel)

**Files:**
- Modify: `lib/registry.mjs`
- Modify: `lib/skills-ci.mjs`
- Modify: `tests/registry.test.mjs`
- Modify: `tests/sync.test.mjs`
- Modify: `tests/rollback.test.mjs`
- Test: `tests/agent-agnostic-main.peel-acceptance.test.mjs`

- [ ] **Step 1: Write/adjust failing peel-acceptance cases if needed (already gated)**
- [ ] **Step 2: Remove `validateOpencodeOnly` from `validate()` and `staticIntegrity()`**
- [ ] **Step 3: Stop copying `opencode-specialization.mjs` into hermetic fixtures once unused**
- [ ] **Step 4: Relocate opencode_only static policy test out of default registry suite**
- [ ] **Step 5: `env -u HHPE_HRG_HOME npm test` green; peel-acceptance green with env**

**Test scenarios:**
1. Checkout without requiring specialization still passes `validate()` after peel.
2. `npm run validate:opencode` still exists on oo branch and passes there.

---

### Task 4: Align `feat/opencode_only` with specialization ownership

**Files:**
- Branch: `feat/opencode_only`
- Ensure specialization surfaces remain complete on that branch (merge/rebase from peeled main as needed)

- [ ] **Step 1: Merge or rebase peeled main into `feat/opencode_only` without dropping specialization**
- [ ] **Step 2: On oo tip: `npm run validate:opencode` PASS**
- [ ] **Step 3: On oo tip: specialization tests PASS**
- [ ] **Step 4: Confirm oo tip still has AGENTS.md / opencode.json / .opencode / specialization.yaml**

**Test scenarios:**
1. oo branch fails closed when specialization is intentionally broken.
2. main branch does not fail closed for missing specialization.

---

### Task 5: Docs boundary rewrite

**Files:**
- Modify: `docs/host-adapters.md`
- Modify: any cutover docs that claim main === OpenCode-only sole runtime

- [ ] **Step 1: Rewrite OpenCode-only section to name `feat/opencode_only` as owner**
- [ ] **Step 2: State main is agent-agnostic; specialization is opt-in via oo branch**
- [ ] **Step 3: Link peel design spec**

---

### Task 6: Agent-neutral main AGENTS / personalization stub

**Files:**
- Modify or replace: `AGENTS.md` on main
- Ensure oo branch retains OpenCode-sole AGENTS policy

- [ ] **Step 1: On main, replace OpenCode-sole policy with agent-neutral operator policy (or minimal stub)**
- [ ] **Step 2: On oo, keep OpenCode-sole AGENTS.md**
- [ ] **Step 3: Peel-acceptance asserts main AGENTS does not claim sole OpenCode runtime**

---

### Task 7: Final verification and merge

- [ ] **Step 1: `env -u HHPE_HRG_HOME npm test` on peeled main — PASS**
- [ ] **Step 2: `HHPE_PEEL_ACCEPTANCE=1` suite — PASS**
- [ ] **Step 3: `npm run test:function` — PASS**
- [ ] **Step 4: oo branch `validate:opencode` — PASS**
- [ ] **Step 5: Merge peel PR to main; update `feat/opencode_only`; delete peel worktree**
- [ ] **Step 6: Mark characterization tests obsolete or convert to “historical bleed” archive note**

---

## Rollback

| Symptom | Action |
| --- | --- |
| Main validate too loose / missing required shared checks | Restore non-specialization portions of validate only |
| oo branch lost specialization | Reset oo to pre-peel oo tip + re-merge |
| FC tests break | Do not remove FC core; restore consumer fixture decision from Task 2 |

## Explicit non-goals

- Executing Tasks 1–7 in the prep PR
- GitHub Actions as merge gate
- Collapsing Cursor host realization into opencode_only

## Success definition

- `main`: agent-agnostic default validate; peer hosts equal; FC core shared.
- `feat/opencode_only`: retains OpenCode personalization advantages and open-source seams.
- Peel-acceptance suite is the mechanical proof.
