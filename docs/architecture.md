# Architecture

The canonical system-wide plane taxonomy and authority boundaries are defined in [ADR-026: HHPE plane authority model](decisions/ADR-026-hhpe-plane-authority-model.md). Plane boundaries are authority boundaries, not necessarily repository boundaries. This repository currently contains both Vended/Supply concerns and Compatibility/Capability Realization concerns; ADR-026 records that mismatch without authorizing a code move.

`registry/packages/<package>/<commit>` contains complete upstream Git checkouts. `manifests` records packages, capabilities, dependencies, host exposures, tools, and migration ownership. `active` is a logical catalog, not copied source. `adapters` translates that catalog into narrow host-native registrations. `overlays` contains HHPE-owned wrappers and patches. Runtime state is never written into package trees.

Canonical identity is `<package>/<capability>`. A portable skill exposure points at its complete source directory. Hooks, commands, agents, MCP servers, and plugins remain separately registered package capabilities. Native lifecycle behavior is not approximated by a copied `SKILL.md`.

The HHPE adapter projects canonical IDs and provenance into XLOTYL/Core Dev Services. Runtime binding remains parameterized because current wrapper documents conflict on Workroom versus Stoneforge ownership. OpenHands remains the paddock/control plane in either projection.
