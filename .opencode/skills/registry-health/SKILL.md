---
name: registry-health
description: Diagnose the active HHPE registry, package provenance, exposures, supporting files, and executable health.
---

# Registry health

Run `hhpe-registry-status` and `hhpe-registry-validate`. Report host identity, adapter identity, canonical package root, pinned revision, capability source path, supporting-file access, tool versions, and validation status. Do not repair collisions automatically; use `hhpe-registry-sync` for a dry-run and explain ownership before `--apply`.
