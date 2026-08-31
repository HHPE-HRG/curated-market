# Project status: HHPE-HRG Cursor plugin stack

Implemented organization-wide Cursor plugin stack in
[`HHPE-HRG/curated-market`](https://github.com/HHPE-HRG/curated-market).
No individual HHPE-HRG project repository owns or configures this stack.

First-slice realization (branch `feat/cursor-realization-boundary`) adds scoped
registry bindings, deterministic filesystem projection, session-bound routing,
hermetic SDK observations, and skill-pool provenance classification. Cloud and
MCP are not in this slice.

## What’s included
- Always-applied rule: `cursor-plugin-routing/rules/plugin-routing.mdc`
  - forces plugin routing before planning/execution
- Routing skill: `cursor-plugin-routing/skills/plugin-routing/SKILL.md`
  - hierarchical (plugin → component) discovery
  - documents selections in `## Plugin and capability use`
  - records routing completion via:
    `scripts/mark-routing-complete.mjs --context <session>`
- Index generation hook (guidance):
  - `cursor-plugin-routing/hooks/session-start.mjs`
  - `sessionStart` with `failClosed` false (fail-open guidance)
  - generates derived index + fingerprint beside the installed plugin stack:
    - `.../hhpe-hrg-plugin-stack/derived/plugin-index.md`
    - `.../hhpe-hrg-plugin-stack/derived/.fingerprint`
- Execution gating hook (must-hold):
  - `cursor-plugin-routing/hooks/route-gate.mjs`
  - `beforeShellExecution` with `failClosed` true
  - blocks state-changing shell commands until the **current session** has a
    matching fingerprint file:
    - `.../hhpe-hrg-plugin-stack/state/routing-complete.<urlencoded-session>.json`
  - Legacy global `routing-complete.json` is never authorization for a gated
    command. Session A does not authorize session B.

## Scoped registry projection
- Capability `hhpe-hrg/cursor-plugin-routing` has two distinct bindings (same
  capability, no fan-out):
  - `user-local` → `~/.cursor/plugins/local/hhpe-hrg-plugin-stack`
  - `project` → `.cursor/plugins/local/hhpe-hrg-plugin-stack`
- Operator sync (throwaway roots recommended for experiments):

```sh
hhpe-registry-sync --host cursor --home <dir> --project-root <dir>
hhpe-registry-sync --apply --host cursor --home <dir> --project-root <dir>
```

- Do not mutate unmanaged ambient `~/.cursor` unless `--home` is intentionally
  that operator home.
- `cloud-project` validates as a declaration and syncs as `SKIP`. Do not document
  or perform Cloud apply in this slice.
- MCP deferred.
- Skill-pool links are classified, not adopted (`lib/cursor-provenance.mjs`).

## Validation
- Repository-wide: `env -u HHPE_HRG_HOME npm test`
- Focused first-slice suites:
  - `tests/cursor-realization.test.mjs`
  - `tests/cursor-routing-gate.test.mjs`
  - `tests/cursor-sdk-acceptance.test.mjs`
  - `tests/sync.test.mjs`
  - `tests/rollback.test.mjs`
  - plus baseline `tests/native-plugin-validation.test.mjs` and
    `tests/tool-contracts.test.mjs`
- Index unit tests: `node --test tests/plugin-routing-index.test.mjs`

## How to install (portable)
- Registry-owned projection via scoped sync (preferred for this slice).
- Package README still documents a manual symlink into
  `~/.cursor/plugins/local/` for portable plugin-only installs:
  `cursor-plugin-routing/README.md`.

## Source of truth and derived index
- Source-of-truth: installed plugin metadata on disk (plugin manifests + component
  description metadata like `SKILL.md` frontmatter, rule `.mdc` frontmatter,
  `mcp.json`, and `hooks/hooks.json`).
- Derived artifact: `hhpe-hrg-plugin-stack/derived/plugin-index.md` (+ `.fingerprint`).
- The generated index is explicitly non-authoritative; it is a routing hint, not a
  rewrite of the real component instructions.

## Index regeneration
- Hook: `cursor-plugin-routing/hooks/session-start.mjs` runs at `sessionStart`.
- Guidance only: `failClosed` false — failures do not close the session.
- Incremental behavior: `scripts/plugin-description-index.mjs` computes a
  routing-relevant fingerprint and does not rewrite the index when the
  fingerprint is unchanged.

## Plan integration contract
- The always-applied rule `cursor-plugin-routing/rules/plugin-routing.mdc`
  requires the agent to document selections under `## Plugin and capability use`
  with `Planning`, `Execution`, and `Validation` subsections.

## Execution gating (must-hold)
- Hook: `cursor-plugin-routing/hooks/route-gate.mjs` blocks state-changing
  `beforeShellExecution` commands until routing completion is recorded for the
  hook session id.
- Mark completion:

```sh
node ${CURSOR_PLUGIN_ROOT}/scripts/mark-routing-complete.mjs --context <session>
```

- Missing `--context` exits non-zero.
- Must-hold deny reasons include missing session id, incomplete/stale session
  fingerprint, and unreadable session state.
- Bypass: set `CURSOR_PLUGIN_ROUTING_DISABLE_GATE=1` in the environment for the
  agent/hook.

## Troubleshooting missing plugin discovery
1. Ensure the derived index exists under the active plugin-stack install’s
   `derived/plugin-index.md`.
2. If missing/stale, re-run the generator via the sessionStart hook (restart Cursor).
3. If gated shell commands deny unexpectedly, confirm
   `mark-routing-complete.mjs --context <session>` was run for **this** session
   and that the fingerprint still matches.
4. If the index builds but candidates are wrong, improve plugin component
   descriptions (see next section).

## Writing better plugin descriptions for routing
- Prefer `SKILL.md` YAML frontmatter with `name` and `description` that explain
  when the skill should be used.
- Put tool/constraint specificity into the `description` (and into explicit
  “Use when” / “Do not use when” sections if you have them).
- For rules, ensure `.mdc` frontmatter includes a meaningful `description`.
