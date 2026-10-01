# Architecture

The canonical system-wide plane taxonomy and authority boundaries are defined in [ADR-026: HHPE plane authority model](decisions/ADR-026-hhpe-plane-authority-model.md). Plane boundaries are authority boundaries, not necessarily repository boundaries. This repository currently contains both Vended/Supply concerns and Compatibility/Capability Realization concerns; ADR-026 records that mismatch without authorizing a code move.

Skill **output** is where hosts create skills. Skill **input** is Market-published overlay and package trees plus `availability_host` metadata. Lookers (Cursor, Codex CLI, T3 `$`, later OpenHands) read input only. T3 `$` is `lib/market-skill-catalog.mjs`, not `~/.cursor/skills`, `~/.codex/skills`, `.system`, or skill-pool. Codex `.system` builtins enter `$` only after Market ingest with `availability_host: codex`.

Injection points (stubs this increment): `lib/skill-output-hook.mjs` for future output ingest; `lib/market-mcp-contract.mjs` for a Caveman-like persist MCP; `registry/adapters/openhands/` for an OpenHands host adapter. None of those is a second catalog.

`registry/packages/<package>/<commit>` contains complete upstream Git checkouts. `manifests` records packages, capabilities, dependencies, host exposures, tools, and migration ownership. `active` is a logical catalog, not copied source. `adapters` translates that catalog into narrow host-native registrations. `overlays` contains HHPE-owned wrappers and patches. Runtime state is never written into package trees.

Canonical identity is `<package>/<capability>`. A portable skill exposure points at its complete source directory. Hooks, commands, agents, MCP servers, and plugins remain separately registered package capabilities. Native lifecycle behavior is not approximated by a copied `SKILL.md`.

The HHPE adapter projects canonical IDs and provenance into XLOTYL/Core Dev Services. Runtime binding remains parameterized because current wrapper documents conflict on Workroom versus Stoneforge ownership. OpenHands remains the paddock/control plane in either projection.

Function Control (OAuth accounts, credential vault, routing, leases) is defined in [ADR-027: Function Control Plane](decisions/ADR-027-function-control-plane.md). It is a separate authority from the Behavior catalog (`lib/registry.mjs`, manifests) even though both live in this repository.
