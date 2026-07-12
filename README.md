# HHPE HRG Global Registry

This registry preserves complete upstream packages as immutable, commit-addressed sources and exposes namespaced capabilities through host adapters. It never replaces a host configuration root. Generated state, backups, overlays, and host links remain separate from upstream sources.

Default root: `${HHPE_HRG_HOME:-$HOME/.local/share/hhpe-hrg}`.

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
