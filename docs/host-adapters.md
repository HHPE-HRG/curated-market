# Host adapters

- Claude retains its enabled native plugins for hooks, commands, agents, and MCP. Portable links are withheld where they would duplicate a plugin skill.
- Codex's reviewed intended realization mechanism for Superpowers, Compound Engineering, Ponytail, and the HHPE wrapper set is native plugins; current exposure declarations remain `planned` unless separately activated. Only explicit host validation observes whether a selected context has a target installed, absent, or indeterminate. Planned declarations alone make no current-host installation claim. The checked-in `hhpe-registry` adapter contains seven generator-owned HHPE wrapper trees: `ast-grep`, `registry-health`, `stack-router`, `serena-guidance`, `context7-guidance`, `playwright-guidance`, and `session-start`. Their canonical source is `registry/overlays/wrappers`; `npm run adapters:generate` reconciles those seven regular-file trees, and `npm run adapters:check` compares an isolated fresh generation with reviewed checked-in state. Generator ownership is closed and does not include other overlay wrappers or plugin metadata. Generation neither installs nor activates Codex plugins, and host-absolute symlink projection is unsupported. Caveman uses namespaced individual links because its package has no Codex manifest; upstream packages remain package references. Configuration, approval, sandbox, MCP, and unrelated skills are untouched.
- Cursor and Antigravity retain native plugin/rule surfaces pending live symlink probes. No unsupported path is guessed.
- OpenCode is inventoried as an additional host; its native Ponytail/Caveman adapters remain package capabilities.
- HHPE consumes a generated catalog projection. Local workers may use links; containers mount package roots read-only and state separately; remote workers require a hash-verified bundle.

## OpenCode-only operation

On `feat/opencode_only`, `registry/manifests/specialization.yaml` is the executable selector and takes precedence over general host exposures. It selects only OpenCode project personalization for OpenCode `>=1.18.19 <2.0.0`. Direct Cursor, direct Codex, and global-home OpenCode personalization remain recorded for general use but are bypassed, not deleted or mutated, by this specialization.

State has three boundaries:

- Canonical: `AGENTS.md`, `opencode.json`, `.opencode/agents/operator.md`, `.opencode/agents/worker.md`, `registry/manifests/specialization.yaml`, and mapped sources under `registry/overlays/wrappers`.
- Generated and checked in: regular-file skill trees under `.opencode/skills`. The exact mappings are `hhpe-hrg/ast-grep` to `ast-grep`, `hhpe-hrg/registry-health` to `registry-health`, `hhpe-hrg/stack-router` to `stack-router`, `hhpe-hrg/serena-guidance` to `serena-guidance`, `hhpe-hrg/context7-guidance` to `context7-guidance`, `hhpe-hrg/playwright-guidance` to `playwright-guidance`, and `hhpe-hrg/session-start` to `session-start`.
- Local only and untracked: provider credentials and authentication state, provider/model/package caches, account-specific model discovery, and runtime observations.

The two canonical native agents are `operator` in primary mode and `worker` in subagent mode; the worker cannot delegate. No native command or project plugin directory is generated for this closed selection.

Deterministic operator workflow:

```sh
npm run opencode:generate
npm run opencode:check
npm run validate:opencode
```

Generation reconciles only the seven owned project skill roots from canonical wrapper sources. `npm run opencode:check` validates checked-in generated OpenCode skill parity against isolated generation. `npm run validate:opencode` validates Git-visible specialization policy, project configuration, and native agent source. These commands remain separate responsibilities and are not combined. They perform no network inference, OAuth, plugin installation, auth/cache/model inspection, model invocation, or home mutation.

Provider policy fails closed. OpenAI permits only ChatGPT Plus/Pro OAuth; unavailable OAuth, entitlement, or model access is an explicit contextual failure and never falls back to API-key billing or another provider. Cursor permits only Cursor browser OAuth through the supply-pinned `cursor-opencode-provider@0.6.3`; unavailable authentication, entitlement, discovery, or operation never falls back to an API key, direct Cursor, proxy, alternate package, unpinned source, or disguised OpenAI result.

Deterministic verification does not establish provider authentication, account entitlement, model discovery, text/tool execution, restart behavior, or cache behavior. Those require a separate live-acceptance plan in an authorized environment. No live acceptance has been run or passed by this workflow.

### Production gate

Deterministic success is not production readiness. The following five inherited PR #4 ToolSpec/runtime findings remain separate prerequisites, unchanged by this specialization:

1. AST Grep structural readiness does not forward or validate its fixture through the default child-process runner and does not observe the declared `sg` alias.
2. ToolSpec v2 portability validation does not reject host-bound or traversal values in nested discovery/probe command fields and does not reject the forbidden root `generated_at` field.
3. Capability checks bypass the canonical fail-closed ToolSpec reader and retain a duplicated legacy policy fallback, allowing retired or unknown schemas to drive checks.
4. Requirement evaluation and legacy projection fail open for unknown requirements or same-timestamp observations with mismatched tool/revision/context identity.
5. Executable discovery collapses permission, symlink-loop, realpath, and I/O inspection errors into `absent` rather than indeterminate evidence.

Production merge/readiness remains blocked until separately owned remediation resolves all five findings and the preserved ToolSpec and ToolRealizationObservation paths are reverified.
