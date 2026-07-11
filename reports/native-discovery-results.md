# Native discovery results

Observed installations:

| Host | Observation | Result |
|---|---|---|
| Codex | 0.144.1, native plugins active and shared `~/.agents/skills` present | additive registry exposure is active; new-session persistence verified by existing plugin state |
| Claude Code | 2.1.207, native plugin marketplace and hooks present | retained native installation; no retirement or duplicate symlink added |
| Cursor | 3.9.16, native `~/.cursor/skills-cursor` exists; global registry path behavior not proven | blocked pending controlled discovery probe |
| Antigravity IDE | 2.0.10 binary present; IDE launch probe is interactive | blocked pending non-destructive native skill probe |
| Antigravity CLI | no separate CLI runtime identified; IDE binary is not treated as CLI | blocked by missing distinct runtime |
| OpenCode | 1.17.1, global config directory exists but no verified active skill catalog | blocked pending native Agent Skills probe |

The registry deliberately made no host-wide replacement. Existing Claude/Codex/other configuration, authentication, hooks, MCP, and unrelated skills remain untouched.
