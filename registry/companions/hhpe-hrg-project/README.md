# HHPE-HRG project companion

Owned stack wrapper: <https://github.com/HHPE-HRG/hhpe-hrg-project>

This curated-market companion does **not** vendor the whole wrapper monorepo.
It records the ownership link and the two integration surfaces:

1. **Overlays** — canonical HHPE routing skills live in this repo at
   `registry/overlays/wrappers` (`hhpe-overlays` package). The wrapper consumes
   them via `HHPE_HRG_HOME` / Core Dev Services registry binding.
2. **Core Dev Services MCP** — `xlotyl-dev-services` is launched from the
   wrapper checkout at
   `infrastructure/xlotyl/services/core-dev-services` (see `mcp/core-dev-services.json`).

Do not treat this companion as a skill marketplace pin.
