# Package initiation kinds

MCP repositories and skill repositories are initiated differently. Curated-market records the initiation kind on each lock entry (`packages.lock.yaml` → `initiation`) and in `vendors.yaml`.

| Initiation kind | `enabled_components` | Typical vend_kind | Examples |
|---|---|---|---|
| `skill_repository` | skill / agent / workflow / command / hook | `claude_plugin_marketplace` | Compound Engineering, Superpowers, Trail of Bits |
| `skill_repository_with_nested_mcp` | skill surfaces **plus** `mcpServer` | skill marketplace that ships MCP | Ponytail (`ponytail-mcp`), Caveman (`caveman-shrink`) |
| `mcp_repository` | `mcpServer` only | `mcp_server_package` | Serena, Context7, Playwright MCP, private-journal-mcp |
| `cli_repository` | none (runtime via `tools.yaml`) | `cli_runtime_package` | ast-grep |
| `owned_overlay` | skill / command | overlay | `hhpe-overlays` (canonical in curated-market) |
| `companion_repository` | usually `mcpServer` (+ references) | `owned_companion` | `hhpe-hrg-project` → overlays link + Core Dev Services MCP |

## Rules

1. Never initiate an MCP repository as a skill marketplace (no invented `SKILL.md` market for MCP-only products).
2. Never coerce a CLI repository into `mcpServer` because a third-party MCP wrapper exists.
3. Application transport may prefer CLI+skill even when the upstream repo is MCP-shaped (Context7, Playwright). That preference does not change initiation: the source remains `mcp_repository`.
4. Nested MCP companions inside skill packages must be registered as `mcp-server` capabilities and must add `mcpServer` to the parent source `enabled_components`, while remaining opt-in unless an ADR says otherwise.
5. Owned stack pairing: overlays stay canonical in **curated-market**; **hhpe-hrg-project** is a companion link (not a second overlay owner) and launches Core Dev Services MCP from the wrapper checkout.
6. XLOTYL / Core Dev Services must project `initiation.enabled_components` into `SourceDefinition.enabledComponents` so MCP and skill sources stay distinct at import time.

## Owned stack link

| Repo | Role |
|---|---|
| [`HHPE-HRG/curated-market`](https://github.com/HHPE-HRG/curated-market) | Capability registry + canonical `hhpe-overlays` |
| [`HHPE-HRG/hhpe-hrg-project`](https://github.com/HHPE-HRG/hhpe-hrg-project) | Stack wrapper companion; consumes overlays via `HHPE_HRG_HOME`; hosts `xlotyl-dev-services` MCP |

Companion stub: `registry/companions/hhpe-hrg-project/`.
