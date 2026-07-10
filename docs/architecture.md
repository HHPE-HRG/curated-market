# Architecture

`registry/packages/<package>/<commit>` contains complete upstream Git checkouts. `manifests` records packages, capabilities, dependencies, host exposures, tools, and migration ownership. `active` is a logical catalog, not copied source. `adapters` translates that catalog into narrow host-native registrations. `overlays` contains HHPE-owned wrappers and patches. Runtime state is never written into package trees.

Canonical identity is `<package>/<capability>`. A portable skill exposure points at its complete source directory. Hooks, commands, agents, MCP servers, and plugins remain separately registered package capabilities. Native lifecycle behavior is not approximated by a copied `SKILL.md`.

The HHPE adapter projects canonical IDs and provenance into XLOTYL/Core Dev Services. Runtime binding remains parameterized because current wrapper documents conflict on Workroom versus Stoneforge ownership. OpenHands remains the paddock/control plane in either projection.
