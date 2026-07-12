# Capability expansion preflight

Date: 2026-07-11 (local run; manifest timestamps are UTC)

## Existing state

- Registry root: `/home/hold3n/.local/share/hhpe-hrg`
- Before expansion: 5 pinned packages, 71 capabilities, 13 exposures.
- Compound Engineering owns the lifecycle; Superpowers bootstrap and top-level routing remain disabled; five Superpowers skills remain supporting only.
- Existing ast-grep runtime: 0.43.0.

## Installed runtimes

| Runtime | Version | Path | Result |
|---|---:|---|---|
| Serena | 1.5.3 | `/home/hold3n/.local/bin/serena` | installed; isolated project configuration fixture passed |
| Context7 CLI | 0.5.4 | `/home/hold3n/.nvm/versions/node/v20.20.2/bin/ctx7` | installed; React library resolution passed |
| Playwright CLI | 0.1.17 | `/home/hold3n/.nvm/versions/node/v20.20.2/bin/playwright-cli` | installed; CLI interface passed; browser daemon remains host-dependent |
| Beads | absent | — | inactive by ADR-017; HHPE is authoritative |

## Pinned upstream packages

| Package | Revision | Tree | License |
|---|---|---|---|
| Serena | `6018bf461644dbf405d9ed1d3c3cde2ca07bb8b0` | `baa862570b5fba087f789cbbf657f73dd1680e1c` | MIT |
| Trail of Bits skills | `cfe5d7b1619e47fb5b38b7e2561dad7e5f1e89af` | `5cc023e22a3daabb40a91d7f933062a73442c19d` | CC BY-SA 4.0 |

Both source trees are complete, commit-addressed, and clean. They remain outside the registry Git index under the existing ignored package-source policy; lock manifests record the exact revision and tree hash.

## Capability decisions

- Serena: active, task-triggered semantic code-intelligence specialist.
- Context7: active, task-triggered current-documentation specialist; no automatic session-start fetch.
- Trail of Bits: active specialist skills and package-level plugin records; upstream identities unchanged.
- Playwright: active, task-triggered browser acceptance specialist; browser execution requires installed browser/daemon support.
- Beads: evaluated as a second task authority and rejected; inactive because HHPE already owns live readiness, claims, dependencies, blockers, and completion.
- HHPE session-start: active HHPE-authored read-only hydration capability.

## Initial safety checks

- Registry validator: PASS.
- Expanded tests: 15/15 PASS.
- Static headless capability integrity: PASS for 96 capabilities.
- Protected Workroom test: not touched.
- Wrapper/root concurrent changes: not incorporated.
- Host cutover/uninstall: not performed; existing installations remain until per-host parity.
