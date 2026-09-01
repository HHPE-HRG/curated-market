# Agent-Agnostic Main / OpenCode-Only Peel — Design

Date: 2026-08-31

Status: Hardened product contract for peel preparation. **Does not execute the peel.**

## Purpose

Isolate two living specs that today share one tree tip:

| Branch | Product contract |
| --- | --- |
| `main` | **Agent-agnostic** curated-market. OpenAI, Anthropic, and Cursor *agents* get the same registry contract. No privileged agent runtime. |
| `feat/opencode_only` | **OpenCode specialization**. May exploit OpenCode’s open-source seams (project personalization, plugins, AuthBackend consumer, provider pins). |

## Authority

- Established product intent (2026-08-31 conversation): main must not care which agent is used; opencode_only may specialize.
- Precedence: system/project rules → this contract → existing OpenCode-only design (`docs/superpowers/specs/2026-08-20-opencode-only-design.md`) for *what* OpenCode specialization means once peeled.
- ADR-027 Function Control remains a **shared** credential plane on main; OpenCode AuthBackend wiring is specialization.

## Current defect (migration context)

`origin/main` is a strict descendant of `origin/feat/opencode_only`. Specialization was merged onto main and never removed. Default `validate()` and static integrity **hard-require** OpenCode-only policy (`validateOpencodeOnly`). That privileges one runtime and breaks agent-agnostic main.

Peer host adapters (Codex, Cursor host projection, Claude) are **not** the defect. Mandatory OpenCode personalization is.

## Dual meaning of “Cursor” (must not conflate)

| Sense | Belongs after peel |
| --- | --- |
| Cursor **as host** (skills/plugins/hooks projection, `cursor-plugin-routing`) | `main` — equal peer host |
| Cursor **as OpenCode model provider** (`cursor-opencode-provider` pin in project config / specialization) | `feat/opencode_only` |

## Post-peel invariants

### On `main` (agent-agnostic)

1. Default `npm run validate` / `skills:ci` static integrity **must not** require `specialization.yaml`, `opencode.json`, `.opencode/agents`, or OpenCode-only AGENTS policy.
2. Canonical registry, ToolSpec, multi-host exposures, and peer host adapters remain.
3. Function Control **core** + `registry/providers/*` remain (shared credential / provider-family knowledge).
4. Presence of optional OpenCode files must not be required for a clean validate on a checkout that omits them.
5. All agent runtimes interacting with curated-market through registry APIs see the same portable contract.

### On `feat/opencode_only`

1. Owns specialization selector, project personalization, OpenCode validate/generate/check scripts.
2. Owns OpenCode Function Control consumer adapter (`lib/function-control/opencode/**`) and consumer id `opencode` registration as used by that runtime.
3. Owns `cursor-opencode-provider` **project** pin and T3↔OpenCode transcript binding helper.
4. `validate:opencode` remains the specialization gate (not default `validate` on main).

## Non-goals (this peel)

- Rewriting Function Control core or Cursor host realization first slice.
- Deleting Codex/Cursor/Claude host adapters from main.
- Resetting `main` to pre–PR #5 history (would drop ToolSpec remediations that rode the oo line — forbidden).
- Executing the peel in the prep branch; prep only lands inventory, plan, characterization, and gated acceptance tests.

## Peel strategy (high level)

1. **Characterize** current bleed (tests that pass today).
2. **Encode** post-peel acceptance behind `HHPE_PEEL_ACCEPTANCE=1` (fails until peel).
3. **Execute peel** on a dedicated branch: remove specialization from default validate/static paths; keep specialization artifacts on `feat/opencode_only` (merge/rebase strategy in the plan).
4. Verify main agent-agnostic suite + oo specialization suite separately.
5. Update docs that still say “On `feat/opencode_only`” so main no longer implies specialization is mandatory.

## Success

Peel is ready to execute when:

- Inventory is complete and reviewed.
- Characterization tests pass on prep tip.
- Peel-acceptance suite fails with `HHPE_PEEL_ACCEPTANCE=1` on unpeeled main (proves the gate is real).
- Implementation plan tasks are checkbox-ready for a later session.

Peel is **done** only when acceptance suite passes with the flag on peeled `main` and `feat/opencode_only` still validates OpenCode specialization via `validate:opencode`.
