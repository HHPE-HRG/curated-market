---
name: skill-creator-guidance
description: >-
  Use when authoring, creating, or editing an agent skill; when invoke
  create-skill, skill-creator, writing-skills, or SKILL.md structure;
  when the user asks for a Cursor skill, Codex skill, or stack-wide skill.
  Overrides host-local install paths from Cursor create-skill and Codex
  skill-creator.
---

# Skill creator guidance (Curated Market)

<!--
Agent context: Host skill-creators (Cursor ~/.cursor/skills-cursor/create-skill
and Codex ~/.codex/skills/.system/skill-creator) tell agents to write into a
single provider home. Intended function: keep those authoring rules for
SKILL.md shape, but land the canonical tree in Curated Market so
hhpe-registry-sync can project it. Observed failure: unmanaged
~/.cursor/skills/<name> that T3/Codex never sees.
-->

## Hard gate

Do **not** treat Cursor `create-skill` or Codex `skill-creator` install
locations as canonical. Read them for frontmatter and body craft only.

**Canonical write root:**
`registry/overlays/wrappers/<skill-name>/` under
`${HHPE_HRG_HOME:-$HOME/.local/share/hhpe-hrg}` (the live HHPE home; on this
machine that is the Curated Market checkout).

Never write a new stack skill as the only copy in:

- `~/.cursor/skills/`
- `~/.cursor/skills-cursor/` (forbidden; Cursor-managed)
- `~/.codex/skills/` including `.system/`
- `~/.claude/skills/`
- `~/.agents/skills/`
- `~/.config/opencode/skills/`
- `~/.hhpe-skill-pool/` (generated projection)

Those paths receive **registry links or adapter copies**, not original trees.

**Exception:** the user explicitly wants a **project-only** skill that must
not ship on the stack. Then use the repo's `.cursor/skills/<name>/` (or the
host's project skill dir) and say so. Do not also drop an unmanaged copy
into `~/.cursor/skills`.

## After SKILL.md exists in the overlay

1. Add `hhpe-hrg/<skill-name>` to `registry/manifests/capabilities.yaml`
   (`package_id: hhpe-overlays`, `source_path: <skill-name>`).
2. Mirror the requires block in `registry/manifests/dependencies.yaml`.
3. Add **active** exposures matching `hhpe-hrg/session-start`:
   - `hhpe-hrg` `registry-reference`
   - `cursor` `skill-symlink` `~/.cursor/skills/<skill-name>`
     (`scope: user-local`, `enforcement: guidance`, `cursor_visible_name`)
   - `opencode` `skill-symlink` `~/.config/opencode/skills/<skill-name>`
   - `antigravity-ide` `skill-symlink` `~/.agents/skills/<skill-name>`
4. Append `<skill-name>` to `CODEX_WRAPPER_PROJECTIONS` in
   `scripts/sync-adapters.mjs` and the matching test `EXPECTED` list.
5. OpenCode checked-in `.opencode/skills` lives on `feat/opencode_only`, not
   agent-agnostic `main`. Do not add `scripts/sync-opencode.mjs` here.
6. Update `tests/cursor-realization.test.mjs` Cursor skill-symlink count.
7. Run `node scripts/sync-adapters.mjs generate`.
8. `hhpe-registry-validate`, then `hhpe-registry-sync`, then
   `hhpe-registry-sync --apply` (additive links only). Apply always
   re-scans Cursor overlay skills into T3's `$` menu (`lib/t3-cursor-skills.mjs`:
   cache inject + t3-server `--import` wrap of `getProviders`). Do not treat
   an empty Cursor `$` list as acceptable. Re-run
   `hhpe-t3-cursor-skills-inject` after a T3 upgrade if `$` goes empty.
9. If a leftover unmanaged directory occupies the Cursor target, remove it
   so the registry can link the overlay.

## Host creators

You may follow Cursor/Codex **authoring** (frontmatter, progressive
disclosure, description triggers). You may **not** follow their **storage**
sections when the skill is for this stack.

Do not edit `~/.cursor/skills-cursor/create-skill` or Codex
`.system/skill-creator`. This overlay is the injection.

## Red flags

- First write is under `~/.cursor/skills/<name>`
- "We'll symlink to Codex later"
- Editing Cursor built-in skills
- Skipping exposures because "Cursor will pick it up"
