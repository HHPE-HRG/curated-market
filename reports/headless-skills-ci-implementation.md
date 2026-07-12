# Headless skills CI implementation

Date: 2026-07-12

## Implemented

- Static integrity checks cover all 71 capabilities without model calls.
- Ephemeral nonce canaries use native project skill paths and fresh processes.
- Claude, Codex, Cursor, Antigravity CLI, OpenCode, and HHPE adapters share normalized reports.
- Claude and Codex use structured JSON output; all child processes have wall-clock bounds and process-group cleanup.
- Linux `strace` evidence is captured when available.
- Routing cases cover CE planning, TDD support, debugging support, and ast-grep.
- Reports are generated under `reports/skills-ci/` and ignored as runtime artifacts.

## Verification

| Check | Result |
|---|---|
| Registry validation | PASS — 5 packages / 71 capabilities / 13 exposures |
| Static skills CI | PASS |
| HHPE canary and routing | PASS |
| Codex canary | PASS twice; routing calls bounded out as `BLOCKED_BY_UNAVAILABLE_MODEL` |
| Claude canary | Native catalog/file access observed; `FAIL_CE_PRECEDENCE` because legacy plugins expose disabled Superpowers lifecycle skills; model rate-limited |
| Cursor CLI | `SUPPORTED_NOT_INSTALLED` (`cursor-agent` absent) |
| Antigravity CLI | Installed; model calls classified `BLOCKED_BY_UNAVAILABLE_MODEL` by explicit quota response |
| OpenCode | Existing loader/restart acceptance retained with documented model timeout |
| Harness tests | PASS — 9/9 |

## Root integration boundary

The registry package exposes `npm run skills:ci:*` and `bin/hhpe-skills-ci`.
The requested root aliases `npm run agent:verify:skills:*` were documented but
not added because the active `workflow-durable-lifecycle-safety` policy allows
`docs/operations/**` and excludes root `package.json` and `scripts/**`.
No policy bypass or unrelated wrapper change was made.
