# Host adapters

- Claude retains its enabled native plugins for hooks, commands, agents, and MCP. Portable links are withheld where they would duplicate a plugin skill.
- Codex uses native plugins for Superpowers, Compound Engineering, Ponytail, and the small HHPE wrapper set. Caveman uses namespaced individual links because its package has no Codex manifest. Codex omits symlinked content while materializing plugins, so the HHPE-owned wrapper plugin is deterministically generated from canonical overlays; upstream packages remain package references. Configuration, approval, sandbox, MCP, and unrelated skills are untouched.
- Cursor and Antigravity retain native plugin/rule surfaces pending live symlink probes. No unsupported path is guessed.
- OpenCode is inventoried as an additional host; its native Ponytail/Caveman adapters remain package capabilities.
- HHPE consumes a generated catalog projection. Local workers may use links; containers mount package roots read-only and state separately; remote workers require a hash-verified bundle.
