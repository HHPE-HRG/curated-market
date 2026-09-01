# Host adapters

- Claude retains its enabled native plugins for hooks, commands, agents, and MCP. Portable links are withheld where they would duplicate a plugin skill.
- Codex's reviewed intended realization mechanism for Superpowers, Compound Engineering, Ponytail, and the HHPE wrapper set is native plugins; current exposure declarations remain `planned` unless separately activated. Only explicit host validation observes whether a selected context has a target installed, absent, or indeterminate. Planned declarations alone make no current-host installation claim. The checked-in `hhpe-registry` adapter contains seven generator-owned HHPE wrapper trees: `ast-grep`, `registry-health`, `stack-router`, `serena-guidance`, `context7-guidance`, `playwright-guidance`, and `session-start`. Their canonical source is `registry/overlays/wrappers`; `npm run adapters:generate` reconciles those seven regular-file trees, and `npm run adapters:check` compares an isolated fresh generation with reviewed checked-in state. Generator ownership is closed and does not include other overlay wrappers or plugin metadata. Generation neither installs nor activates Codex plugins, and host-absolute symlink projection is unsupported. Caveman uses namespaced individual links because its package has no Codex manifest; upstream packages remain package references. Configuration, approval, sandbox, MCP, and unrelated skills are untouched.
- Cursor and Antigravity retain native plugin/rule surfaces pending live symlink probes. No unsupported path is guessed. Cursor-as-host (skills/plugins/`cursor-plugin-routing`) is a peer host on `main`.
- OpenCode is inventoried as an additional host; its native Ponytail/Caveman adapters remain package capabilities.
- HHPE consumes a generated catalog projection. Local workers may use links; containers mount package roots read-only and state separately; remote workers require a hash-verified bundle.

## Agent-agnostic main vs OpenCode specialization

`main` is **agent-agnostic**: default `npm run validate` / skills-ci static integrity do **not** require OpenCode personalization. Peer host adapters (Codex, Cursor host projection, Claude) remain equal.

OpenCode-only project personalization is owned by **`feat/opencode_only`**. Design contract: `docs/superpowers/specs/2026-08-31-agent-agnostic-main-opencode-only-peel-design.md`. Historical specialization authority: `docs/superpowers/specs/2026-08-20-opencode-only-design.md`.

On `feat/opencode_only`, `registry/manifests/specialization.yaml` is the executable selector and takes precedence over general host exposures. It selects only OpenCode project personalization for OpenCode `>=1.18.19 <2.0.0`. Direct Cursor, direct Codex, and global-home OpenCode personalization remain recorded for general use but are bypassed, not deleted or mutated, by this specialization.

Specialization state (oo branch only) has three boundaries:

- Canonical: `AGENTS.md`, `opencode.json`, `.opencode/agents/operator.md`, `.opencode/agents/worker.md`, `registry/manifests/specialization.yaml`, and mapped sources under `registry/overlays/wrappers`.
- Generated and checked in: regular-file skill trees under `.opencode/skills`. The exact mappings are `hhpe-hrg/ast-grep` to `ast-grep`, `hhpe-hrg/registry-health` to `registry-health`, `hhpe-hrg/stack-router` to `stack-router`, `hhpe-hrg/serena-guidance` to `serena-guidance`, `hhpe-hrg/context7-guidance` to `context7-guidance`, `hhpe-hrg/playwright-guidance` to `playwright-guidance`, and `hhpe-hrg/session-start` to `session-start`.
- Local only and untracked: provider credentials and authentication state, provider/model/package caches, account-specific model discovery, and runtime observations.

Deterministic operator workflow on the specialization branch:

```sh
npm run opencode:generate
npm run opencode:check
npm run validate:opencode
```

Do not treat those scripts as required on agent-agnostic `main`. Cursor-as-OpenCode-provider pins (`cursor-opencode-provider`) belong on `feat/opencode_only`, not as a main validate requirement.

Generation reconciles only the seven owned project skill roots from canonical wrapper sources. `npm run opencode:check` validates checked-in generated OpenCode skill parity against isolated generation. `npm run validate:opencode` validates Git-visible specialization policy, project configuration, and native agent source. These commands remain separate responsibilities and are not combined. They perform no network inference, OAuth, plugin installation, auth/cache/model inspection, model invocation, or home mutation.

Provider policy fails closed. OpenAI permits only ChatGPT Plus/Pro OAuth; unavailable OAuth, entitlement, or model access is an explicit contextual failure and never falls back to API-key billing or another provider. Cursor permits only Cursor browser OAuth through the supply-pinned `cursor-opencode-provider@0.6.3`; unavailable authentication, entitlement, discovery, or operation never falls back to an API key, direct Cursor, proxy, alternate package, unpinned source, or disguised OpenAI result.

Deterministic verification does not establish provider authentication, account entitlement, model discovery, text/tool execution, restart behavior, or cache behavior. Those require a separate live-acceptance plan in an authorized environment.

Authorized live acceptance on this specialization line established:

- OpenAI ChatGPT Plus/Pro OAuth and model discovery succeed; durable oauth credentials persist across process restart. Text inference remains blocked by ChatGPT Plus `usage_limit_reached` (primary window at 100%, credits 0), not by missing or invalid OAuth. No API-key fallback was used.
- Cursor browser OAuth through `cursor-opencode-provider@0.6.3` succeeds with durable oauth credentials, model discovery, text inference, tool execution, and restart persistence. No API-key, direct Cursor, or OpenAI substitution was used.

Full OpenAI text/tool live acceptance remains pending Plus usage reset. Secrets, account identifiers, model catalogs, and local credential paths stay out of Git.

### Production readiness (shared ToolSpec remediations)

Live provider acceptance is runtime evidence, not a Git gate for the deterministic specialization. The five inherited PR #4 ToolSpec/runtime findings are remediated under existing ToolSpec and ToolRealizationObservation authority:

1. AST Grep structural readiness forwards its fixture through the default child-process runner and observes the declared `sg` alias.
2. ToolSpec v2 portability validation recursively rejects host-bound or traversal values in nested discovery/probe command fields and rejects forbidden root `generated_at`.
3. Capability checks consume the canonical fail-closed ToolSpec reader; legacy policy fallback is removed.
4. Requirement evaluation and legacy projection fail closed for unknown requirements and mismatched tool/revision/context identity.
5. Executable discovery reports permission, symlink-loop, realpath, and I/O inspection failures as indeterminate rather than absent.
