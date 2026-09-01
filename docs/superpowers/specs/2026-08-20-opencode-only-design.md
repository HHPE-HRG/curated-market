# OpenCode-Only Specialization Design

**Status:** Living product contract on `feat/opencode_only`  
**Date:** 2026-08-20 (ownership clarified 2026-08-31 after peel)  
**Branch:** `feat/opencode_only`  
**Sibling:** Agent-agnostic main — `docs/superpowers/specs/2026-08-31-agent-agnostic-main-design.md` on `main`  
**Index:** `docs/superpowers/specs/README.md`

## Purpose

This is the **OpenCode-only** living spec (not the agent-agnostic `main` contract). On `main`, no personalization runtime is privileged; see the sibling agent-agnostic design.

`opencode_only` is a deliberately separate Curated Market development line in which OpenCode is the only agent-personalization runtime. Curated Market remains authority for capability identity, provenance, selected personalization, and portable tool requirements. OpenCode supplies the native agent, skill, instruction, permission, provider, model, and authentication surfaces used by executing agents.

Cursor and OpenAI/Codex are provider bindings inside OpenCode. They are not independent personalization hosts in this specialization.

The intended flow is:

```text
Curated Market canonical personalization
                  |
                  v
        OpenCode-native realization
                  |
                  v
       provider/model/auth binding
          |                   |
          v                   v
       Cursor          OpenAI/Codex
```

This specialization supersedes the proposed “T2²-specific branch” terminology. It is a branch-level specialization, not a remote fork, new product, or generic profile framework.

### Compatibility simplification

```text
BEFORE

canonical personalization
├── Cursor realization
├── Codex realization
└── OpenCode realization

OPENCODE_ONLY

canonical personalization
        |
        v
project-local OpenCode realization
        |
        v
provider/auth/model binding
├── OpenAI/Codex subscription OAuth
└── Cursor community-provider OAuth

SEPARATE AND UNCHANGED

portable tool/runtime realization
```

The specialization removes selected-path projection across three personalization hosts. It must not replace that complexity with a universal personalization framework.

## Scope

This design changes only agent-personalization selection and realization for the `opencode_only` line. It establishes:

- visible Git-tracked OpenCode-native agent definitions;
- Git-tracked persistent project instructions;
- deterministic realization of selected Curated Market skills into OpenCode's project skill root;
- an explicit OpenCode-only specialization marker;
- an OpenCode provider allowlist containing OpenAI and the community Cursor provider;
- local-only authentication and cache state;
- verification that direct Cursor, direct Codex, and general OpenCode global-home personalization exposures are not selected.

This design preserves:

- package locks, canonical capability IDs, provenance, overlays, and supporting-file requirements;
- portable ToolSpec v2 and context-bound ToolRealizationObservation;
- tool discovery, version probes, requirement-specific readiness, and worker-independent realization;
- general-purpose Cursor, Codex, and other adapters in repository history and outside this specialization;
- distinct provider/model/auth limitations even though OpenCode is the single personalization runtime.

OpenCode standardizes personalization. It does not standardize whether AST Grep, Serena, Context7, Playwright, or another runtime tool is installed, configured, authenticated, reachable, or ready.

## Personalization Source

Use OpenCode's native project formats directly where they are already portable and reviewable:

```text
AGENTS.md                         canonical persistent project instructions
opencode.json                    canonical OpenCode/provider policy
.opencode/
  agents/*.md                    canonical agent definitions
  skills/<name>/...              checked-in generated skill realization
registry/
  manifests/specialization.yaml  canonical opencode_only selection marker
  packages/...                   canonical pinned upstream capability sources
  overlays/wrappers/...          canonical HHPE-authored skill sources
```

Do not add `registry/personalization/` or an HHPE agent schema. OpenCode Markdown agent files already express the required source model:

- filename: agent identity;
- Markdown body: instructions and role;
- `description`: discoverability and delegation purpose;
- `mode`: `primary`, `subagent`, or `all`;
- `permission`: tool, skill, task, shell, edit, and external-directory authority;
- `model`: optional reviewed provider/model preference;
- `hidden`: optional subagent visibility;
- `steps`, temperature, and provider options only when a concrete agent needs them.

Agent files under `.opencode/agents/` are canonical source, not generated copies. They must use portable relative file references and contain no credentials, host paths, or observed local state.

Root `AGENTS.md` is canonical always-on behavior. Additional persistent instruction modules may be stored as ordinary reviewed Markdown and referenced by relative paths from `opencode.json` `instructions`. Skills remain invocable procedures and must not be flattened into `AGENTS.md`.

### Capability realization classes

Selection must preserve native lifecycle semantics. The implementation plan classifies every selected Phase-1 capability using existing capability evidence; this is a planning checklist, not a new universal manifest enum:

| Realization class | Native destination | Constraint |
|---|---|---|
| Pure skill | `.opencode/skills/<name>/...` | May be reconciled only when the complete selected capability is an invocable skill tree. |
| Persistent instruction | `AGENTS.md` or a relative `opencode.json` instruction source | Always-on behavior must not masquerade as an on-demand skill. |
| Agent | `.opencode/agents/<name>.md` | Preserve role, mode, permissions, delegation, and optional model preference through native OpenCode agent fields. |
| Native OpenCode plugin | Exact version-pinned `opencode.json` plugin declaration, or project plugin file when separately justified | Required hooks, custom tools, lifecycle, or provider behavior must use plugin semantics. |
| Native command | `.opencode/commands/<name>.md` or native command configuration | Required command invocation behavior must use OpenCode command semantics. |
| Tool/runtime | Existing portable ToolSpec and contextual realization | Installation, version, service, browser, activation, and readiness remain outside personalization projection. |

A `SKILL.md` found beside a plugin, hook, command, or agent does not authorize flattening the complete capability into `.opencode/skills`. Presence under `registry/packages` does not select a capability. Initial `.opencode/plugins/` or `.opencode/commands/` omission is valid only when the closed Phase-1 selection contains no capability that requires those lifecycle surfaces.

### Skills

OpenCode 1.18 natively discovers project skills under `.opencode/skills/<name>/SKILL.md`, as well as `.agents/skills` and `.claude/skills`. `opencode_only` uses only `.opencode/skills` so the checked-in realization does not accidentally activate direct Codex or Claude-compatible project discovery.

Selected skills retain existing Curated Market canonical sources:

- HHPE-authored wrappers: `registry/overlays/wrappers/<name>`;
- upstream capabilities: locked `registry/packages/<package>/<commit>/<source_path>` recorded by capability manifests.

An explicit reviewed mapping selects each source and its OpenCode destination. Directory discovery must not auto-enroll every package skill. Materialization recursively reconciles complete skill trees into checked-in regular files and directories under `.opencode/skills`. Generated skill roots must be symlink-free, path-portable, reproducible, and stale-file-free. Adding a skill requires a reviewed mapping change.

Checked-in regular files are preferred over symlinks because they remain readable in clean checkouts before package hydration, do not encode commit-addressed ignored package paths as filesystem dependencies, and survive arbitrary checkout locations and Git worktrees. Duplication is limited to selected published realization; canonical authority remains the mapped registry source.

OpenCode plugins are not required merely to expose a `SKILL.md`. A selected capability that genuinely requires plugin hooks, commands, or custom tools must retain that capability type and earn a separately pinned native OpenCode plugin entry. Initial specialization does not create `.opencode/plugins/` or `.opencode/commands/` without such evidence.

### Phase-1 selection contract

Initial scope is a closed execution gate, not directory discovery. Before implementation execution, the approved plan must list:

```text
agents:
  exact .opencode/agents source files

skills:
  exact selected capability IDs and canonical source directories

capability realization:
  each selected capability -> one or more justified realization classes
```

The plan must state when one capability legitimately spans classes, such as a native plugin plus skills it registers. It must prevent duplicate registration. If current repository evidence does not uniquely determine the smallest coherent initial set, `$writing-plans` may propose that set, but must mark the selection as an explicit review gate before implementation. Auto-discovery of all packages, all skills, or every capability of a selected package is forbidden.

## OpenCode Realization

OpenCode v1.18.19 is the reviewed Phase-1 runtime floor. Phase 1 is hard-bounded to the OpenCode 1.x contract: minimum `1.18.19`, maximum exclusive `2.0.0`. Evidence is OpenCode upstream commit `40282c1d4d5476e6b536a72c0baf3a27bcf0e4df` and release `v1.18.19`, published 2026-08-20. Upstream is `anomalyco/opencode`, MIT licensed.

OpenCode consumes the specialization through native project loading:

1. `opencode.json` supplies provider allowlisting, provider plugin configuration, and relative instruction references.
2. Root `AGENTS.md` supplies always-on project instructions.
3. `.opencode/agents/*.md` supplies primary/subagent definitions and permissions.
4. `.opencode/skills/*/SKILL.md` supplies on-demand skills through OpenCode's native `skill` tool.
5. `.opencode/commands/` and `.opencode/plugins/` remain absent until a selected capability requires them.

The minimum specialization marker is a single repository manifest, not a generic profile system:

```json
{
  "schema_version": 1,
  "specialization_id": "opencode_only",
  "agent_runtime": "opencode",
  "personalization_target": "opencode",
  "opencode_runtime": {
    "minimum": "1.18.19",
    "maximum_exclusive": "2.0.0"
  },
  "provider_bindings": [
    {
      "provider_id": "openai",
      "auth_realization": "chatgpt-plus-pro-oauth"
    },
    {
      "provider_id": "cursor",
      "auth_realization": "browser-oauth",
      "package": {
        "name": "cursor-opencode-provider",
        "version": "0.6.3",
        "upstream_commit": "7c474be70898cd69defc174eca4071c3b57e6e48",
        "npm_integrity": "sha512-G5eQiYvLM5gKaKvnWzkBEv+8VzEL78zfbY+ui5u36gI9ukJW+3DmIW0OR6tqa6RvuratNkwjpnI2MAijiPSY1w=="
      }
    }
  ],
  "personalization_paths_bypassed": [
    "codex-direct",
    "cursor-direct",
    "opencode-global-home"
  ]
}
```

This content lives in `registry/manifests/specialization.yaml`, matching the repository's existing JSON-in-`.yaml` convention. This manifest is the authoritative selector for this checkout, not descriptive documentation. Validation is specific to this marker and must fail if the selected realization policy contradicts it—for example by selecting direct Cursor, direct Codex, or global-home OpenCode personalization alongside project-local OpenCode realization. It must not introduce reusable profile inheritance, composition, or arbitrary profile names.

The same marker is the portable authority for the OpenCode runtime constraint. OpenCode is the selected provider/personalization runtime, not one of the portable task tools currently governed by ToolSpec, so this design does not force it into `registry/manifests/tools.yaml`. Actual executable path, installed version, availability, and startup health are contextual runtime observations produced by clean-checkout or live acceptance. `registry/manifests/hosts.yaml` remains historical inventory evidence; its v1.17.1 Linux path and installation claim cannot satisfy the specialization constraint or become current compatibility truth.

Phase 1 must not load `cursor-opencode-provider/plugin/opencode2`, use an OpenCode 2.0 `plugins` contract, mix classic and 2.0 entrypoints, or claim forward compatibility. OpenCode 2.0 requires a separate later design review and migration decision.

`opencode.json` uses `enabled_providers: ["openai", "cursor"]`. OpenCode documents this as a provider allowlist; loaded credentials or environment variables for other providers do not make them available. The file also requests the exact Cursor plugin package/version recorded by the specialization manifest and contains no secret values. Static validation compares these two Git-visible authorities and rejects drift.

Direct Cursor/Codex exposures and existing general OpenCode exposures targeting `~/.config/opencode/skills` remain in general manifests for provenance and comparison, but specialization selection excludes all three paths. `sync --host cursor`, direct Codex plugin validation, Codex adapter generation, direct Cursor/Codex personalization activation, and mutation of `~/.config/opencode/skills` are not part of the `opencode_only` realization command or verification path. For selected skills, the only specialization path is canonical source to checked-in project-local `.opencode/skills/<name>`.

## Provider Bindings

### OpenAI/Codex through ChatGPT subscription OAuth

OpenCode v1.18.19 provides first-party OpenAI authentication through `/connect` or `opencode auth login`:

1. select `OpenAI`;
2. select `ChatGPT Plus/Pro` browser OAuth, or the supported headless device flow;
3. authenticate at `auth.openai.com`;
4. select an available `openai/<model-id>` through `/models`.

This is subscription-backed ChatGPT Plus/Pro access and does not require `OPENAI_API_KEY`. OpenCode's implementation uses PKCE for browser OAuth, supports a headless device flow, and sends authorized requests to the ChatGPT Codex responses endpoint. At reviewed upstream commit, OAuth filtering explicitly includes `gpt-5.5`, `gpt-5.3-codex-spark`, `gpt-5.4`, and `gpt-5.4-mini`, while additional post-5.4 model exposure is code- and account-dependent. The runtime `/models` result is authoritative; the repository must not claim an account has a model merely because upstream code permits it.

OpenAI API-key authentication and ChatGPT subscription OAuth are distinct provider-auth realizations. `opencode_only` selects only:

```text
OpenCode
  -> OpenAI provider
  -> ChatGPT Plus/Pro OAuth
  -> subscription-backed Codex endpoint/model access
```

Phase 1 must not configure `OPENAI_API_KEY`, store an API key in project configuration, or silently select manually entered API-key authentication. If OAuth is unavailable, subscription entitlement is missing, or the authenticated context does not expose a requested model, acceptance reports that contextual outcome and stops. It must not fall back to separately billed OpenAI API usage or substitute another provider while reporting OpenAI/Codex success.

OpenCode stores OAuth access and refresh material in the local data file `~/.local/share/opencode/auth.json` by default, or the corresponding `$XDG_DATA_HOME/opencode/auth.json`, with mode `0600`. `opencode auth list` may establish provider presence without printing tokens; any future health check must record only provider ID and non-secret outcome. No token, refresh token, authorization code, account cookie, API key, or raw auth file enters Git or a report.

Git-visible policy may contain provider ID `openai`, allowed model preferences, and the required local action “authenticate with ChatGPT Plus/Pro.” Actual account identity, credentials, subscription state, and observed available models remain local contextual evidence.

### Cursor community provider

The concrete community integration is [`oakimov/cursor-opencode-provider`](https://github.com/oakimov/cursor-opencode-provider). Reviewed state:

- commit: `7c474be70898cd69defc174eca4071c3b57e6e48` (2026-08-19);
- npm package: `cursor-opencode-provider@0.6.3`;
- npm integrity: `sha512-G5eQiYvLM5gKaKvnWzkBEv+8VzEL78zfbY+ui5u36gI9ukJW+3DmIW0OR6tqa6RvuratNkwjpnI2MAijiPSY1w==`;
- license: MIT;
- repository status at review: active, not archived, 27 stars, 4 forks, four contributors, no GitHub releases;
- compatibility floor: peer dependency `@opencode-ai/plugin ^1.17.13`.

The package is an OpenCode plugin plus AI SDK `LanguageModelV3` provider. It speaks Cursor's protobuf Connect-RPC agent protocol over HTTP/2; it does not proxy through a separately operated intermediary. It registers provider ID `cursor`, performs model discovery against Cursor, translates OpenCode tool/stream events, and stores cache/conversation material under OpenCode's cache root.

Authentication options are:

- Cursor account browser OAuth using PKCE at `cursor.com`;
- a Cursor API key from account settings;
- `CURSOR_API_KEY` for supported runtime use.

The intended `opencode_only` path is browser OAuth backed by an active Cursor subscription/account with API access. Credentials are stored through OpenCode's local auth store; model and conversation caches default to `$XDG_CACHE_HOME/opencode` or `~/.cache/opencode`. No auth or cache state is committed.

Cursor package control has three distinct authorities:

| Authority | Meaning |
|---|---|
| Supply policy | Approved package `cursor-opencode-provider`, version `0.6.3`, reviewed upstream commit, license, and recorded npm integrity/provenance. |
| Project configuration | Exact `cursor-opencode-provider@0.6.3` plugin/provider request in `opencode.json`. |
| Execution observation | Contextual evidence of the package/plugin OpenCode actually loaded, if OpenCode exposes that identity safely. |

Recording npm integrity does not prove a machine's OpenCode/Bun cache currently contains or loaded those bytes. Phase-1 deterministic enforcement verifies that project configuration requests exactly `cursor-opencode-provider@0.6.3`, rejects floating or alternate specs, and records the reviewed supply metadata. OpenCode/Bun/npm caches and `node_modules` remain local and uncommitted. Machine-local package paths are forbidden. Runtime-loaded identity, when safely observable without cache capture, is contextual acceptance evidence rather than Supply truth. No package-manager framework is introduced.

A future version change requires explicit review of package integrity, upstream commit, OpenCode compatibility, auth mechanism, security notes, licensing, model discovery, and tool mapping. Floating `latest`, an unpinned Git branch, an unreviewed fork, or an absolute local plugin path is forbidden.

This binding is community-supported and carries material caveats:

- it is young, single-maintainer-dominant, and has no formal GitHub releases;
- Cursor protocol interoperability is community reverse engineering rather than official Cursor provider support;
- its disclaimer frames interoperability under EU Directive 2009/24/EC and warns that non-interoperability uses may violate law or service terms;
- Cursor subscription/API entitlement and service terms must be confirmed by the operator;
- model catalog is account- and live-API-dependent; no fallback models are invented;
- OpenCode 2.0 support is beta and uses a distinct plugin entrypoint, so this design targets OpenCode v1.18.19 rather than 2.0 beta.

Therefore Cursor is **conditionally supportable**, not generally guaranteed. Implementation may configure and verify the pinned provider, but release readiness requires a live, non-secret acceptance run using an authorized Cursor account. Failure to authenticate, discover models, load the approved plugin, or complete a bounded text-plus-tool turn is explicit contextual failure. It must not fall back to direct Cursor runtime, a proxy service, credential extraction, an unpinned community fork, API-key mode without separate authorization, or an OpenAI model presented as Cursor success.

## Tool Compatibility

Tool/runtime compatibility remains unchanged and independent of OpenCode personalization:

```text
registry/manifests/tools.yaml
        |
        v
portable ToolSpec v2
        |
        v
context-bound ToolRealizationObservation
        |
        v
requirement-specific compatibility conclusion
```

OpenCode agent permissions determine whether an agent may invoke a tool. They do not prove that executable, service, browser, project activation, credentials, network, or generated material is ready.

In particular:

- AST Grep retains executable identity, alias/version, structural-readiness, and rollback requirements;
- Serena retains installation versus project-activation distinction;
- Context7 retains CLI/service/auth/network distinctions;
- Playwright retains generated-material and browser-readiness observation without provisioning;
- observations remain tied to explicit execution context and cannot be promoted into ToolSpec or reusable cross-context truth.

Provider binding health is not ToolSpec. OpenAI OAuth or Cursor provider availability may be reported as contextual provider evidence, but does not alter portable tool requirements.

## Generated State

Canonical source:

- `AGENTS.md`;
- `opencode.json` provider/personalization policy;
- `.opencode/agents/*.md`;
- `registry/manifests/specialization.yaml`;
- mapped registry package/overlay capability sources;
- explicit OpenCode skill ownership mapping.

Derived checked-in state:

- `.opencode/skills/<name>/...` for the closed selected skill set.

Local untracked state:

- OpenAI OAuth tokens and Cursor OAuth/API credentials in the platform data root;
- OpenCode `auth.json`;
- Cursor model, protocol, and conversation caches in the platform cache root;
- OpenCode provider/model caches and installed package state under OpenCode/Bun/npm caches;
- any `node_modules` used by the local OpenCode installation;
- account-specific discovered model catalogs;
- runtime observations and bounded non-secret verification output unless an explicit report writer is invoked.

No parity fixture or report may copy, serialize, hash as reusable identity, or otherwise ingest local auth files, tokens, cookies, API keys, package caches, model caches, or account-specific catalogs. Acceptance output must avoid credential values by construction; redaction is defense in depth, not permission to collect secrets.

Skill generation is reconciliation, not append-only copying. Each owned destination must exactly match its canonical tree by relative paths, regular-file/directory representation, bytes, nested supporting files, and Git-relevant executable bits. Stale files are removed only inside explicit owned skill roots. The generator must reject source/output overlap, host-absolute metadata, symlinks in generated output, missing sources, and unsupported source entries before mutation.

Checking must generate into a temporary output root and compare without rewriting the worktree. Clean checkout must already contain readable complete `.opencode/skills` projection. Generation must not install OpenCode, authenticate providers, populate caches, invoke models, edit ToolSpec, activate direct Cursor/Codex exposures, or mutate general OpenCode global-home exposures.

## Repository Delta

| Current component | `opencode_only` classification | Reason |
|---|---|---|
| `registry/packages`, package lock, capability/provenance manifests | KEEP | Canonical Supply and capability identity remain authoritative. |
| `registry/overlays/wrappers` | KEEP | Canonical HHPE skill source. |
| `registry/manifests/tools.yaml`, tool contracts, capability checks | KEEP | Portable tool/runtime compatibility remains independent. |
| `registry/manifests/hosts.yaml` OpenCode inventory | KEEP, then update through ordinary reviewed evidence | Existing host record establishes native paths but currently describes v1.17.1 rather than reviewed v1.18.19. |
| Existing active OpenCode skill exposures targeting `~/.config/opencode/skills` | BYPASS IN `opencode_only`; replace selected path with project realization | General exposures remain recorded, but specialization uses checked-in `.opencode/skills` and never mutates global home. |
| Missing `registry/adapters/opencode` referenced by exposures | REPLACE WITH OPENCODE native root artifacts | `AGENTS.md`, `opencode.json`, and `.opencode` are the concrete adapter surface; no empty generic adapter layer is needed. |
| `registry/adapters/cursor` and direct Cursor skill exposures | BYPASS IN `opencode_only` | Cursor is provider ID `cursor` inside OpenCode, not personalization host. |
| `registry/adapters/codex`, Codex marketplace, Codex skill/native-plugin exposures | BYPASS IN `opencode_only` | OpenAI/Codex access is provider ID `openai` inside OpenCode. |
| `scripts/sync-adapters.mjs` Codex projection | BYPASS IN `opencode_only` | Remains general-purpose code but is not specialization realization. |
| `validateHostRealization()` native Codex plugin operation | BYPASS IN `opencode_only` | Direct Codex installation is not required for specialization validity. |
| Upstream `.opencode` plugins in immutable packages | KEEP as source evidence; select only when capability requires plugin behavior | Do not copy/load them automatically or duplicate skill registration. |
| Direct Cursor/Codex adapter files | POTENTIALLY DELETE LATER | Only after consumer evidence proves this branch will never rejoin general behavior and no provenance/test consumer depends on them. No deletion is authorized now. |

Compatibility responsibilities that disappear from the selected path:

- independent Cursor skill projection and host-home mutation;
- independent Codex skill/native-plugin projection and installation assertions;
- general OpenCode `~/.config/opencode/skills` projection and host-home mutation;
- per-provider personalization naming, directory, reload, and plugin activation logic;
- duplicated agent/rule source for Cursor and Codex.

Compatibility responsibilities that remain:

- OpenCode native file formats and precedence;
- closed skill source-to-projection mapping and parity;
- OpenAI and Cursor provider/plugin configuration;
- local authentication and account entitlement;
- provider/model identity and provider-specific feature limitations;
- tool/runtime realization through ToolSpec observations;
- OpenCode version and pinned community-provider compatibility;
- clean-checkout, worktree, and secret-safety verification.

## Migration

1. Add `registry/manifests/specialization.yaml` with exact `opencode_only` precedence, OpenCode `>=1.18.19 <2.0.0`, and static validation that rejects any second personalization target.
2. Approve the closed Phase-1 agent files, selected capability IDs, and realization class for every selection before implementation execution.
3. Add canonical root `AGENTS.md`, minimal `opencode.json`, and the exact approved `.opencode/agents/*.md` definitions. Use native permissions and modes; do not introduce agent schema translation.
4. Define the approved closed skill ownership mapping from existing registry sources to `.opencode/skills`; add isolated generation/check commands and checked-in regular-file projection.
5. Configure `enabled_providers` to exactly `openai` and `cursor`. Pin `cursor-opencode-provider@0.6.3`; do not write credentials or model caches.
6. Make specialization-aware validation prove direct Cursor, direct Codex, and global-home OpenCode personalization exposures are bypassed while general manifests and adapters remain unchanged.
7. Add documented local auth steps: OpenAI ChatGPT Plus/Pro OAuth and Cursor browser OAuth. Record no secrets and provide no API-key fallback.
8. Run clean-checkout/worktree acceptance with OpenCode v1.18.19: configuration discovery, agent enumeration, skill enumeration/parity, provider enumeration, runtime-version observation, and unchanged ToolSpec tests.
9. Run separate authorized live binding acceptance. OpenAI and Cursor outcomes remain contextual; Cursor release is blocked unless the pinned provider authenticates, discovers at least one entitled model, and completes bounded text and tool turns.

This sequence is intentionally additive. It bypasses general adapters through explicit selection before considering deletion.

## Verification

### Static and deterministic

- specialization marker identifies only `opencode_only`, runtime `opencode`, personalization target `opencode`, and provider bindings `openai`/`cursor`;
- specialization marker requires OpenCode `>=1.18.19 <2.0.0` and rejects contradictory direct Cursor, direct Codex, or global-home OpenCode personalization selection;
- `opencode.json` validates against current OpenCode configuration schema and allowlists only `openai` and `cursor`;
- agent Markdown frontmatter validates required description, mode, permissions, and optional portable model ID;
- every generated skill has one reviewed canonical mapping and retains capability ID/provenance;
- isolated regeneration matches checked-in `.opencode/skills` recursively and idempotently;
- generated roots contain no symlinks, secrets, checkout paths, home paths, usernames, auth material, or unexpected files introduced by generation;
- direct Cursor/Codex exposures, global-home OpenCode exposures, and their adapter commands are not selected by specialization realization;
- every Phase-1 capability has an exact reviewed source and realization class, with no plugin/hook/command semantics flattened into skill files;
- `opencode.json` requests exactly `cursor-opencode-provider@0.6.3` and no OpenCode 2.0 entrypoint;
- no plugin installation, OAuth, model request, or host mutation occurs during static validation;
- existing ToolSpec, observation, rollback, version/readiness, and worker-portability suites remain unchanged and green.

### Clean checkout and worktree

- a clean checkout already contains `AGENTS.md`, `opencode.json`, agents, and complete generated skills;
- OpenCode v1.18.19 started at repository root discovers only intended project agents/instructions/skills;
- observed runtime satisfies `>=1.18.19 <2.0.0`; `hosts.yaml` paths or historical status cannot satisfy this check;
- no generated or configured path depends on repository location, historical `/home/hold3n`, current username, home, or sibling worktree;
- generation into temporary destination produces byte/type/mode parity with checked-in state;
- project startup does not mutate canonical registry sources.

### Contextual provider acceptance

- `opencode auth list` reports provider presence without emitting credentials;
- OpenAI browser or headless OAuth produces local-only auth state and `/models` exposes only account-entitled OpenAI models;
- OpenAI OAuth failure or missing model entitlement remains explicit and never selects API-key billing;
- Cursor provider is exactly npm `0.6.3`, matching recorded integrity, and uses local-only auth/cache state;
- Cursor OAuth model discovery and bounded text-plus-tool turn either pass or produce explicit contextual blocker;
- Cursor failure does not activate direct Cursor, proxy, credential extraction, API-key, unpinned fork, or disguised OpenAI fallback;
- provider failure never becomes repository/static corruption and never activates a direct Cursor/Codex personalization path.

Verification may assert absence of secrets by paths, Git status, schema, and known secret-field scanning. It must never print or snapshot credential values.

## Non-goals

- No `PersonalizationEngine`, `AgentABI`, `CompatibilityVM`, `ProviderRouter`, `UniversalAgentSchema`, generalized profile framework, or compatibility service.
- No rewrite of ToolSpec, ToolRealizationObservation, capability provenance, or ADR-026.
- No claim that provider, model, auth, or tool differences disappear behind OpenCode.
- No direct Cursor or Codex personalization installation in this specialization.
- No deletion of general-purpose adapters or exposures during initial migration.
- No OpenCode fork, provider proxy service, credential broker, or token capture.
- No automatic OAuth, secret persistence in repository, or account entitlement claim.
- No OpenCode 2.0 beta support, entrypoint, configuration, compatibility claim, or mixed 1.x/2.0 plugin loading in Phase 1.
- No wholesale migration of every package hook, command, agent, or plugin; only selected personalization capabilities enter the first realization.
- No unrelated repair of pre-existing registry or provider behavior.

## Open Questions

These questions require live or implementation-phase evidence; none changes the approved authority model.

1. **Per-agent model pins:** OpenAI OAuth model allowance changes with upstream and account; Cursor catalog is dynamically entitlement-derived. Initial config should inherit the operator-selected model unless live acceptance establishes stable reviewed IDs worth pinning.
2. **Cursor legal/terms acceptance:** MIT licensing covers provider code, but the operator must decide whether community protocol interoperability and Cursor subscription use comply with applicable terms and jurisdiction. Technical design cannot make that policy decision.
3. **Community provider release gate:** Cursor binding remains blocked for production designation until an authorized account passes OAuth, discovery, text, tool, and restart/cache acceptance on OpenCode v1.18.19 with package `0.6.3`.
4. **Local acceptance environment:** The current macOS investigation host has no `opencode` executable on `PATH`. Native artifact, configuration, and OAuth conclusions in this design are verified against pinned upstream documentation and source; no local OAuth or model-backed run is claimed. A hydrated OpenCode v1.18.19 environment is required during implementation verification.

Initial agent and skill selection are no longer architectural open questions. They are the closed Phase-1 planning gate defined above: `$writing-plans` must propose exact files and capability IDs when repository evidence does not uniquely determine them, and implementation cannot begin until that selection is reviewed.

## Inherited PR #4 Findings

Two reviews used different ranges and therefore reached different results:

- Final integration review of `4e0a852..63da34b` evaluated composition of the already completed ToolSpec base with remediation Tracks A, B, and C. After integration fixes it reported Critical 0, Important 0.
- Later PR review of `main..63da34b` evaluated the complete delta in [HHPE-HRG/curated-market#4](https://github.com/HHPE-HRG/curated-market/pull/4), including the earlier ToolSpec implementation that was the integration review's base. It reported five Important findings.

The five later findings are:

1. AST Grep structural readiness does not forward or validate its fixture through the default child-process runner and does not observe the declared `sg` alias.
2. ToolSpec v2 portability validation does not reject host-bound or traversal values in nested discovery/probe command fields and does not reject the forbidden root `generated_at` field.
3. Capability checks bypass the canonical fail-closed ToolSpec reader and retain a duplicated legacy policy fallback, allowing retired or unknown schemas to drive checks.
4. Requirement evaluation and legacy projection fail open for unknown requirements or same-timestamp observations with mismatched tool/revision/context identity.
5. Executable discovery collapses permission, symlink-loop, realpath, and I/O inspection errors into `absent` rather than indeterminate evidence.

They apply to `feat/opencode_only` because its exact base includes the complete PR #4 head. They do not contradict this personalization architecture and do not block specification approval or writing the specialization plan. They do block production-readiness claims and merging a final `opencode_only` line while its preserved ToolSpec/runtime compatibility depends on those affected paths. Remediation remains a separate, explicitly owned prerequisite; the `opencode_only` plan must not silently absorb or redesign it.

## Upstream Evidence

- OpenCode repository: `https://github.com/anomalyco/opencode`, commit `40282c1d4d5476e6b536a72c0baf3a27bcf0e4df`, release `v1.18.19`, MIT.
- OpenCode agents: `https://opencode.ai/docs/agents/`.
- OpenCode skills: `https://opencode.ai/docs/skills/`.
- OpenCode rules: `https://opencode.ai/docs/rules/`.
- OpenCode configuration: `https://opencode.ai/docs/config/`.
- OpenCode providers: `https://opencode.ai/docs/providers/`.
- OpenCode OAuth storage implementation: `packages/opencode/src/auth/index.ts` at reviewed commit.
- OpenCode ChatGPT/Codex OAuth implementation: `packages/opencode/src/plugin/openai/codex.ts` at reviewed commit.
- Cursor provider repository: `https://github.com/oakimov/cursor-opencode-provider`, commit `7c474be70898cd69defc174eca4071c3b57e6e48`, MIT.
- Cursor provider npm artifact: `cursor-opencode-provider@0.6.3`, integrity recorded above.
