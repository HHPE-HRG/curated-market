# Native discovery results

Observed installations:

| Host | Observation | Result |
|---|---|---|
| Codex | 0.144.1, native plugins active and shared `~/.agents/skills` present | additive registry exposure is active; new-session persistence verified by existing plugin state |
| Claude Code | 2.1.207, native plugin marketplace and hooks present; headless probe returned `Not logged in` | blocked by external authentication before skill load; no retirement |
| Cursor | 3.9.16, native `~/.cursor/skills-cursor` exists; no `cursor-agent` headless surface | blocked by unavailable interactive UI; internal catalog untouched |
| Antigravity IDE | 2.0.10 binary present; IDE launch probe is interactive | blocked by unavailable interactive UI; no exposure changed |
| Antigravity CLI | no separate CLI runtime identified; IDE binary is not treated as CLI | blocked by missing distinct runtime |
| OpenCode | 1.17.1, `debug skill --pure` discovered canonical project links and package-relative sources | loader and restart PASS; model-backed Test A timed out at the bounded limit |

The registry deliberately made no host-wide replacement. Existing Claude/Codex/other configuration, authentication, hooks, MCP, and unrelated skills remain untouched.

## Continuation classification

OpenCode 1.17.1 exposes `debug paths`, `debug skill`, and native global/project skill locations; its resolved global config is empty and no HHPE skill exposure is active. This is `INSTALLED_PENDING_VALIDATION`, not an unsupported host.

Antigravity has an installed IDE (`/usr/local/bin/antigravity`, 2.0.10) and a separate `~/.gemini/antigravity-cli/skills` cache, but no distinct CLI executable. The CLI surface is therefore `SUPPORTED_NOT_INSTALLED` / `NOT_APPLICABLE`; the cache is not treated as proof of an installed runtime.

A disposable OpenCode project exposure and isolated HOME produced a reliable
native discovery record. The project links were removed after capture; no
host-wide exposure was changed.
