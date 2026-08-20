# HHPE Curated Market

Canonical GitHub source: [`HHPE-HRG/curated-market`](https://github.com/HHPE-HRG/curated-market).

This registry preserves complete upstream packages as immutable, commit-addressed sources and exposes namespaced capabilities through host adapters. It never replaces a host configuration root. Generated state, backups, overlays, and host links remain separate from upstream sources.

Default install root: `${HHPE_HRG_HOME:-$HOME/.local/share/hhpe-hrg}`.

## Install from the canonical remote

```sh
mkdir -p "${XDG_DATA_HOME:-$HOME/.local/share}"
git clone git@github.com:HHPE-HRG/curated-market.git "${HHPE_HRG_HOME:-$HOME/.local/share/hhpe-hrg}"
export HHPE_HRG_HOME="${HHPE_HRG_HOME:-$HOME/.local/share/hhpe-hrg}"
export PATH="$HHPE_HRG_HOME/bin:$PATH"

# Materialize commit-pinned upstream packages (gitignored; see packages.lock.yaml)
# Clone each lock entry into registry/packages/<id>/<commit>, then:
hhpe-registry-validate
hhpe-registry-discover
hhpe-registry-sync                 # dry run
```

Pinned package trees under `registry/packages/` are intentionally not published in git; `registry/manifests/packages.lock.yaml` is the source of truth for repository + commit. Host-local link state lives in `migration-state.yaml` / `discovered-installations.yaml` and is regenerated on each machine via discover/sync.

## Cursor Team Marketplace (private)

This repo is **import-ready** as a Cursor Team Marketplace. Committed projection:

- `.cursor-plugin/marketplace.json`
- `plugins/{compound-engineering,superpowers,ponytail,caveman,trailofbits,hhpe-registry}/`

**Only remaining operator step:** Dashboard → Plugins → Import from Repo → `https://github.com/HHPE-HRG/curated-market`. Details: [`docs/cursor-team-marketplace.md`](docs/cursor-team-marketplace.md).

Regenerate after pin/overlay changes (requires local `registry/packages/`):

```sh
npm run marketplace:cursor
npm run marketplace:cursor:validate
```

## Operations

```sh
export PATH="$HOME/.local/share/hhpe-hrg/bin:$PATH"
hhpe-registry-discover
hhpe-registry-status
hhpe-registry-validate
hhpe-registry-sync                 # dry run
hhpe-registry-sync --apply         # additive links only
hhpe-registry-diff
hhpe-registry-update --check
hhpe-registry-update --package superpowers
hhpe-registry-rollback             # dry run
hhpe-registry-rollback --apply
hhpe-registry-capability-check all
npm run agent:verify:serena
npm run agent:verify:context7
npm run agent:verify:specialists
npm run agent:verify:playwright
npm run agent:verify:session-start
npm run agent:verify:skill-routing
```

The update command checks candidates only. Activation requires a new commit-addressed package directory, regenerated lock, review, and passing tests. Existing native plugins remain active until parity proves they are redundant.

Capability expansion keeps Serena and Trail of Bits as complete immutable packages. Context7 and Playwright are centrally provisioned runtimes with HHPE routing wrappers; Beads is documented as inactive because HHPE already owns live task state. See `docs/capability-expansion.md` and `registry/manifests/final-stack.yaml` for the ownership and activation policy.
