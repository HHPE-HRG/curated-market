# OpenCode-Only Specialization Design

**Status:** Proposed for review
**Date:** 2026-08-20
**Base:** `63da34b3f3e20e5b0e7333286c04b881bc39b747`

## Purpose

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

## Scope

This design changes only agent-personalization selection and realization for the `opencode_only` line. It establishes:

- visible Git-tracked OpenCode-native agent definitions;
- Git-tracked persistent project instructions;
- deterministic realization of selected Curated Market skills into OpenCode's project skill root;
- an explicit OpenCode-only specialization marker;
- an OpenCode provider allowlist containing OpenAI and the community Cursor provider;
- local-only authentication and cache state;
- verification that direct Cursor and Codex personalization exposures are not selected.

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

### Skills

OpenCode 1.18 natively discovers project skills under `.opencode/skills/<name>/SKILL.md`, as well as `.agents/skills` and `.claude/skills`. `opencode_only` uses only `.opencode/skills` so the checked-in realization does not accidentally activate direct Codex or Claude-compatible project discovery.

Selected skills retain existing Curated Market canonical sources:

- HHPE-authored wrappers: `registry/overlays/wrappers/<name>`;
- upstream capabilities: locked `registry/packages/<package>/<commit>/<source_path>` recorded by capability manifests.

An explicit reviewed mapping selects each source and its OpenCode destination. Directory discovery must not auto-enroll every package skill. Materialization recursively reconciles complete skill trees into checked-in regular files and directories under `.opencode/skills`. Generated skill roots must be symlink-free, path-portable, reproducible, and stale-file-free. Adding a skill requires a reviewed mapping change.

Checked-in regular files are preferred over symlinks because they remain readable in clean checkouts before package hydration, do not encode commit-addressed ignored package paths as filesystem dependencies, and survive arbitrary checkout locations and Git worktrees. Duplication is limited to selected published realization; canonical authority remains the mapped registry source.

OpenCode plugins are not required merely to expose a `SKILL.md`. A selected capability that genuinely requires plugin hooks, commands, or custom tools must retain that capability type and earn a separately pinned native OpenCode plugin entry. Initial specialization does not create `.opencode/plugins/` or `.opencode/commands/` without such evidence.

## OpenCode Realization

OpenCode v1.18.19 is the reviewed initial runtime floor. Evidence is OpenCode upstream commit `40282c1d4d5476e6b536a72c0baf3a27bcf0e4df` and release `v1.18.19`, published 2026-08-20. Upstream is `anomalyco/opencode`, MIT licensed.

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
  "provider_bindings": ["openai", "cursor"],
  "direct_personalization_hosts_bypassed": ["codex", "cursor"]
}
```

This content lives in `registry/manifests/specialization.yaml`, matching the repository's existing JSON-in-`.yaml` convention. Validation is specific to this marker. It must not introduce reusable profile inheritance, composition, or arbitrary profile names.

`opencode.json` uses `enabled_providers: ["openai", "cursor"]`. OpenCode documents this as a provider allowlist; loaded credentials or environment variables for other providers do not make them available. The file also pins the Cursor plugin and contains no secret values.

Direct Cursor/Codex exposures remain in the general manifests for provenance and comparison, but specialization selection excludes them. `sync --host cursor`, direct Codex plugin validation, Codex adapter generation, and direct Codex/Cursor personalization activation are not part of the `opencode_only` realization command or verification path.

## Provider Bindings

### OpenAI/Codex through ChatGPT subscription OAuth

OpenCode v1.18.19 provides first-party OpenAI authentication through `/connect` or `opencode auth login`:

1. select `OpenAI`;
2. select `ChatGPT Plus/Pro` browser OAuth, or the supported headless device flow;
3. authenticate at `auth.openai.com`;
4. select an available `openai/<model-id>` through `/models`.

This is subscription-backed ChatGPT Plus/Pro access and does not require `OPENAI_API_KEY`. OpenCode's implementation uses PKCE for browser OAuth, supports a headless device flow, and sends authorized requests to the ChatGPT Codex responses endpoint. At reviewed upstream commit, OAuth filtering explicitly includes `gpt-5.5`, `gpt-5.3-codex-spark`, `gpt-5.4`, and `gpt-5.4-mini`, while additional post-5.4 model exposure is code- and account-dependent. The runtime `/models` result is authoritative; the repository must not claim an account has a model merely because upstream code permits it.

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

The binding is pinned in `opencode.json` as `cursor-opencode-provider@0.6.3`, with provider ID `cursor`. A future version change requires explicit review of package integrity, upstream commit, OpenCode compatibility, auth mechanism, security notes, licensing, model discovery, and tool mapping. Floating `latest`, an unpinned Git branch, or an absolute local plugin path is forbidden.

This binding is community-supported and carries material caveats:

- it is young, single-maintainer-dominant, and has no formal GitHub releases;
- Cursor protocol interoperability is community reverse engineering rather than official Cursor provider support;
- its disclaimer frames interoperability under EU Directive 2009/24/EC and warns that non-interoperability uses may violate law or service terms;
- Cursor subscription/API entitlement and service terms must be confirmed by the operator;
- model catalog is account- and live-API-dependent; no fallback models are invented;
- OpenCode 2.0 support is beta and uses a distinct plugin entrypoint, so this design targets OpenCode v1.18.19 rather than 2.0 beta.

Therefore Cursor is **conditionally supportable**, not generally guaranteed. Implementation may configure and verify the pinned provider, but release readiness requires a live, non-secret acceptance run using an authorized Cursor account. Failure to authenticate, discover models, or complete a bounded text-plus-tool turn is a binding blocker; it must not be replaced with a guessed proxy or unofficial credential extraction.

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

- OpenCode OAuth/API credentials in the platform data root;
- Cursor model, protocol, and conversation caches in the platform cache root;
- installed npm plugin cache under OpenCode/Bun cache;
- runtime observations and bounded non-secret verification output unless an explicit report writer is invoked.

Skill generation is reconciliation, not append-only copying. Each owned destination must exactly match its canonical tree by relative paths, regular-file/directory representation, bytes, nested supporting files, and Git-relevant executable bits. Stale files are removed only inside explicit owned skill roots. The generator must reject source/output overlap, host-absolute metadata, symlinks in generated output, missing sources, and unsupported source entries before mutation.

Checking must generate into a temporary output root and compare without rewriting the worktree. Clean checkout must already contain readable complete `.opencode/skills` projection. Generation must not install OpenCode, authenticate providers, populate caches, invoke models, edit ToolSpec, or activate direct Cursor/Codex exposures.

## Repository Delta

| Current component | `opencode_only` classification | Reason |
|---|---|---|
| `registry/packages`, package lock, capability/provenance manifests | KEEP | Canonical Supply and capability identity remain authoritative. |
| `registry/overlays/wrappers` | KEEP | Canonical HHPE skill source. |
| `registry/manifests/tools.yaml`, tool contracts, capability checks | KEEP | Portable tool/runtime compatibility remains independent. |
| `registry/manifests/hosts.yaml` OpenCode inventory | KEEP, then update through ordinary reviewed evidence | Existing host record establishes native paths but currently describes v1.17.1 rather than reviewed v1.18.19. |
| Existing active OpenCode skill exposures targeting `~/.config/opencode/skills` | REPLACE WITH OPENCODE project realization | Specialization uses checked-in `.opencode/skills`; no global-home mutation is needed. |
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

1. Add `registry/manifests/specialization.yaml` with exact `opencode_only` semantics and static validation that rejects any second personalization target.
2. Add canonical root `AGENTS.md`, minimal `opencode.json`, and first reviewed `.opencode/agents/*.md` definitions. Use native permissions and modes; do not introduce agent schema translation.
3. Define closed skill ownership mapping from existing registry sources to `.opencode/skills`; add isolated generation/check commands and checked-in regular-file projection.
4. Configure `enabled_providers` to exactly `openai` and `cursor`. Pin `cursor-opencode-provider@0.6.3`; do not write credentials or model caches.
5. Make specialization-aware validation prove direct Cursor/Codex personalization exposures are bypassed while general manifests and adapters remain unchanged.
6. Add documented local auth steps: OpenAI ChatGPT Plus/Pro OAuth and Cursor browser OAuth. Record no secrets.
7. Run clean-checkout/worktree acceptance with OpenCode v1.18.19: configuration discovery, agent enumeration, skill enumeration/parity, provider enumeration, and unchanged ToolSpec tests.
8. Run separate authorized live binding acceptance. OpenAI and Cursor outcomes remain contextual; Cursor release is blocked unless the pinned provider authenticates, discovers at least one entitled model, and completes bounded text and tool turns.

This sequence is intentionally additive. It bypasses general adapters through explicit selection before considering deletion.

## Verification

### Static and deterministic

- specialization marker identifies only `opencode_only`, runtime `opencode`, personalization target `opencode`, and provider bindings `openai`/`cursor`;
- `opencode.json` validates against current OpenCode configuration schema and allowlists only `openai` and `cursor`;
- agent Markdown frontmatter validates required description, mode, permissions, and optional portable model ID;
- every generated skill has one reviewed canonical mapping and retains capability ID/provenance;
- isolated regeneration matches checked-in `.opencode/skills` recursively and idempotently;
- generated roots contain no symlinks, secrets, checkout paths, home paths, usernames, auth material, or unexpected files introduced by generation;
- direct Cursor/Codex exposures and adapter commands are not selected by specialization realization;
- no plugin installation, OAuth, model request, or host mutation occurs during static validation;
- existing ToolSpec, observation, rollback, version/readiness, and worker-portability suites remain unchanged and green.

### Clean checkout and worktree

- a clean checkout already contains `AGENTS.md`, `opencode.json`, agents, and complete generated skills;
- OpenCode v1.18.19 started at repository root discovers only intended project agents/instructions/skills;
- no generated or configured path depends on repository location, historical `/home/hold3n`, current username, home, or sibling worktree;
- generation into temporary destination produces byte/type/mode parity with checked-in state;
- project startup does not mutate canonical registry sources.

### Contextual provider acceptance

- `opencode auth list` reports provider presence without emitting credentials;
- OpenAI browser or headless OAuth produces local-only auth state and `/models` exposes only account-entitled OpenAI models;
- Cursor provider is exactly npm `0.6.3`, matching recorded integrity, and uses local-only auth/cache state;
- Cursor OAuth model discovery and bounded text-plus-tool turn either pass or produce explicit contextual blocker;
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
- No OpenCode 2.0 beta support in initial specialization.
- No wholesale migration of every package hook, command, agent, or plugin; only selected personalization capabilities enter the first realization.
- No unrelated repair of pre-existing registry or provider behavior.

## Open Questions

These questions require live or implementation-phase evidence; none changes the approved authority model.

1. **Initial agent set:** Which concrete primary and subagent roles should be selected first? Native representation is settled; role inventory requires a separate reviewed selection from current package agents and desired workflow.
2. **Initial skill allowlist:** Which capabilities constitute the first published `.opencode/skills` set? Selection must account for duplicate names and supporting plugin/hook requirements rather than auto-enrolling all registry skills.
3. **Per-agent model pins:** OpenAI OAuth model allowance changes with upstream and account; Cursor catalog is dynamically entitlement-derived. Initial config should inherit the operator-selected model unless live acceptance establishes stable reviewed IDs worth pinning.
4. **Cursor legal/terms acceptance:** MIT licensing covers provider code, but the operator must decide whether community protocol interoperability and Cursor subscription use comply with applicable terms and jurisdiction. Technical design cannot make that policy decision.
5. **Community provider release gate:** Cursor binding remains blocked for production designation until an authorized account passes OAuth, discovery, text, tool, and restart/cache acceptance on OpenCode v1.18.19 with package `0.6.3`.
6. **Local acceptance environment:** The current macOS investigation host has no `opencode` executable on `PATH`. Native artifact, configuration, and OAuth conclusions in this design are verified against pinned upstream documentation and source; no local OAuth or model-backed run is claimed. A hydrated OpenCode v1.18.19 environment is required during implementation verification.

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
