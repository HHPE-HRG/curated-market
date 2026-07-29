# Project status: HHPE-HRG Cursor plugin stack

Implemented organization-wide Cursor plugin stack in
[`HHPE-HRG/curated-market`](https://github.com/HHPE-HRG/curated-market).
No individual HHPE-HRG project repository owns or configures this stack.

## What’s included
- Always-applied rule: `cursor-plugin-routing/rules/plugin-routing.mdc`
  - forces plugin routing before planning/execution
- Routing skill: `cursor-plugin-routing/skills/plugin-routing/SKILL.md`
  - hierarchical (plugin → component) discovery
  - documents selections in `## Plugin and capability use`
  - records routing completion via `scripts/mark-routing-complete.mjs`
- Index generation hook:
  - `cursor-plugin-routing/hooks/session-start.mjs`
  - generates derived index + fingerprint:
    - `~/.cursor/hhpe-hrg-plugin-stack/derived/plugin-index.md`
    - `~/.cursor/hhpe-hrg-plugin-stack/derived/.fingerprint`
- Optional execution gating hook (default on):
  - `cursor-plugin-routing/hooks/route-gate.mjs`
  - blocks state-changing `beforeShellExecution` commands until:
    - `~/.cursor/hhpe-hrg-plugin-stack/state/routing-complete.json`

## Validation
- `node --test tests/plugin-routing-index.test.mjs`

## How to install (portable)
- `cursor-plugin-routing/README.md` (symlink into `~/.cursor/plugins/local/`).

## Source of truth and derived index
- Source-of-truth: installed plugin metadata on disk (plugin manifests + component description metadata like `SKILL.md` frontmatter, rule `.mdc` frontmatter, `mcp.json`, and `hooks/hooks.json`).
- Derived artifact: `~/.cursor/hhpe-hrg-plugin-stack/derived/plugin-index.md` (+ `.fingerprint`).
- The generated index is explicitly non-authoritative; it is a routing hint, not a rewrite of the real component instructions.

## Index regeneration
- Hook: `cursor-plugin-routing/hooks/session-start.mjs` runs at `sessionStart`.
- Incremental behavior: `scripts/plugin-description-index.mjs` computes a routing-relevant fingerprint and does not rewrite the index when the fingerprint is unchanged.

## Plan integration contract
- The always-applied rule `cursor-plugin-routing/rules/plugin-routing.mdc` requires the agent to document selections under `## Plugin and capability use` with `Planning`, `Execution`, and `Validation` subsections.

## Execution gating (optional bypass)
- Hook: `cursor-plugin-routing/hooks/route-gate.mjs` blocks state-changing `beforeShellExecution` commands until routing completion is recorded.
- Bypass: set `CURSOR_PLUGIN_ROUTING_DISABLE_GATE=1` in the environment for the agent/hook.

## Troubleshooting missing plugin discovery
1. Ensure the derived index exists: `~/.cursor/hhpe-hrg-plugin-stack/derived/plugin-index.md`.
2. If missing/stale, re-run the generator via the sessionStart hook (restart Cursor).
3. If the index builds but candidates are wrong, improve plugin component descriptions (see next section).

## Writing better plugin descriptions for routing
- Prefer `SKILL.md` YAML frontmatter with `name` and `description` that explain when the skill should be used.
- Put tool/constraint specificity into the `description` (and into explicit “Use when” / “Do not use when” sections if you have them).
- For rules, ensure `.mdc` frontmatter includes a meaningful `description`.


