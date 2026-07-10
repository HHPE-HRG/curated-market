# Parity results

| Area | Status | Evidence |
|---|---|---|
| Package integrity | PASS | validation report |
| Capability/supporting paths | PASS | validation report |
| Host discovery | PASS with limitations | host inventory |
| Codex explicit invocation | PASS | ephemeral session 019f4d68-1a95-7320-a698-870ef7005a11 discovered native health skill |
| Codex implicit routing/support file | PASS | ephemeral session 019f4d68-abd9-7590-ae73-807a36bf869a read exact SKILL.md and commands |
| Codex catalog capacity | LIMITATION | 1,414+ preexisting entries omitted; early HHPE alias is visible |
| XLOTYL catalog baseline | PASS | 20/20 tests |
| OpenHands baseline | FAIL | 47 pass, 2 skip, 2 fail |
| Other-host implicit routing | NOT_RUN | Claude/Cursor/Antigravity/OpenCode cutover pending |
| Hook/command/subagent parity | NOT_RUN | native installs retained |
| ast-grep fixture | PASS | structural search, non-mutating preview, exact rewrite, `node --check` |
| ast-grep clean login shell | PASS | ~/.local/bin links resolve pinned 0.43.0 runtime |
