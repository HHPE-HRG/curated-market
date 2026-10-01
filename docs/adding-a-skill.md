# Adding a skill

Register the original skill directory and all supporting paths. Preserve its package namespace. Mark it non-self-contained until references, scripts, sibling skills, hooks, agents, executables, environment, and relative paths have been tested. Use one individual host link; never copy only `SKILL.md`.

Set `availability_host` on the capability (`any`, `codex`, `cursor`, `claude`, `t3`, or `openhands`). Missing means `any`. `$` labels host-bound skills as `Codex:name` (and the matching prefix for other hosts) from that field; it does not rename `SKILL.md` `name`. Codex `.system` builtins are not `$` rows until Market ingest creates a capability with `availability_host: codex`.
