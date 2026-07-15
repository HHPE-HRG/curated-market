# Package initiation kinds

MCP repositories and skill repositories are initiated differently. Curated-market records the initiation kind on each lock entry (`packages.lock.yaml` → `initiation`) and in `vendors.yaml`.

| Initiation kind | `enabled_components` | Typical vend_kind | Examples |
|---|---|---|---|
| `skill_repository` | skill / agent / workflow / command / hook | `claude_plugin_marketplace` | Compound Engineering, Superpowers, Trail of Bits, Ponytail, Caveman |
| `mcp_repository` | `mcpServer` only | `mcp_server_package` | Serena, Context7, Playwright MCP |
| `cli_repository` | none (runtime via `tools.yaml`) | `cli_runtime_package` | ast-grep |
| `local_overlay` | skill / command | overlay | `hhpe-overlays` |

## Rules

1. Never initiate an MCP repository as a skill marketplace (no invented `SKILL.md` market for MCP-only products).
2. Never coerce a CLI repository into `mcpServer` because a third-party MCP wrapper exists.
3. Application transport may prefer CLI+skill even when the upstream repo is MCP-shaped (Context7, Playwright). That preference does not change initiation: the source remains `mcp_repository`.
4. XLOTYL / Core Dev Services must project `initiation.enabled_components` into `SourceDefinition.enabledComponents` so MCP and skill sources stay distinct at import time.
