# Cursor Team Marketplace (private)

`HHPE-HRG/curated-market` ships a committed Cursor Team Marketplace projection so the only remaining operator step is importing the GitHub repo in the Cursor Dashboard.

## Layout (import contract)

| Path | Role |
|---|---|
| `.cursor-plugin/marketplace.json` | Root marketplace manifest (`name`, `owner`, `plugins[]`) |
| `plugins/<name>/.cursor-plugin/plugin.json` | Per-plugin manifest |
| `plugins/<name>/skills/` | Skill trees (materialized; no absolute symlinks) |
| `plugins/<name>/.hhpe-pin.json` | Pin metadata tying the projection to `packages.lock.yaml` |

Plugins: `compound-engineering`, `superpowers`, `ponytail`, `caveman`, `trailofbits`, `hhpe-registry`.

## Manual step (only remaining work)

Requires Cursor **Teams** or **Enterprise**.

1. Open **Dashboard → Plugins → Team Marketplaces**.
2. **Import from Repo** → `https://github.com/HHPE-HRG/curated-market`.
3. Review the six parsed plugins → add to marketplace.
4. Set access (org/groups) and installation mode (`Default Off` / `Default On` / `Required`).
5. Optional: enable **Auto Refresh** and install the **Cursor GitHub App** on `HHPE-HRG/curated-market`.

After import, teammates and Cloud Agents can install the same skill pack from Customize without running local registry sync for skills.

## Maintainers: regenerate after pin bumps

When locked vendor commits or overlays change:

```sh
# Requires materialized trees under registry/packages/<id>/<commit>
npm run marketplace:cursor
npm test
npm run marketplace:cursor:validate
```

`hhpe-registry-validate` / `npm run validate` also fail if the Cursor projection is missing, stale vs overlays, or contains absolute symlinks.

## Local smoke (optional)

Before Dashboard import:

```sh
ln -s "$HHPE_HRG_HOME/plugins/hhpe-registry" ~/.cursor/plugins/local/hhpe-registry
# Reload Cursor window; confirm skills appear under Customize
```

## Out of scope for this projection

- Public Cursor Marketplace submission / Anysphere review
- MCP runtime installers for Serena / Context7 / Playwright (remain pin + runtime locked; use Team MCP / companion launch separately)
- Replacing host-local `hhpe-registry-sync` symlink mode for non-Cursor hosts
