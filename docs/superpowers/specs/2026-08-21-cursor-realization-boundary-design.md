# Cursor Realization Boundary Design

Date: 2026-08-21

Status: Design for review. Not an implementation plan. Does not appoint Curated Market as the physical Compatibility/Capability Realization owner.

## Purpose

Define the smallest repository-local boundary needed so Curated Market can take canonical capabilities and deterministically realize them through supported Cursor surfaces, then verify requirement-specific behavior without Cursor source, private catalogs, or hidden ranking.

Intended information flow:

```text
canonical capability
        ↓
Cursor compatibility binding
        ├── user-local projection
        ├── project projection
        ├── cloud-project projection
        └── SDK/runtime acceptance
```

Cursor local configuration, the Cursor SDK, and Cloud Agents are **realization surfaces** of one provider. They are not architectural authorities. The SDK is both an execution surface and an acceptance surface. Cloud is a distinct execution environment that may produce evidence; it is not evidence infrastructure.

This design applies [ADR-026](../../decisions/ADR-026-hhpe-plane-authority-model.md) and the logical observation/specification split in [the tool-spec realization observation design](./2026-08-20-tool-spec-realization-observation-design.md) to Cursor only. It does not introduce a generalized provider realization engine.

## Authority distinctions this design preserves

| Record | Answers |
| --- | --- |
| Canonical capability | Portable identity and content |
| Cursor binding | Compatibility policy for this provider |
| Generated Cursor files | Provider projection |
| Actual Cursor / SDK / Cloud behavior | Runtime observation |
| Requirement satisfied? | Compatibility conclusion for one requirement in one execution context |

Portable supply manifests must not absorb current-host observations. Current-machine absolute paths must not become canonical truth. Provider realization must not redefine portable capability identity.

## Design principles

1. Use only Cursor-supported surfaces: user and project config files, local plugins, hooks, MCP configuration, Cloud Agents, and the public SDK/Cloud API.
2. Do not depend on `~/.cursor/skills-cursor` or any other private/hidden catalog.
3. Do not collapse user-local, project, and cloud-project realization into one filesystem projection.
4. Do not automatically project every capability into every scope.
5. Skills, rules, prompts, and indexes are guidance. Hooks can enforce only observable hookable actions.
6. A hook that requires routing state before a shell/tool action is a valid hard gate. A claim that the model internally selected skill X is not.
7. Static validation must not launch Cursor or inspect private provider state.
8. SDK fixtures establish only observable claims.
9. Cloud must be validatable without implicit developer-home state.
10. Prefer the smallest existing seams: `exposures.yaml`, `registry/adapters/cursor`, `cursor-plugin-routing`, existing isolated tests, and report artifacts. Do not add a host registry, daemon, compatibility service, or universal status enum.

## Alternatives considered

| Approach | What it would do | Why not chosen |
| --- | --- | --- |
| A. Cursor-local binding fields and isolated validators | Add scope, mechanism, and enforcement class to Cursor exposures/adapter; add static checks and SDK fixtures that do not require ambient `~/.cursor` | Chosen. Matches existing exposure/sync/test patterns. |
| B. New Cursor realization manifest and service | Create a separate realization file plus a runtime that compiles bindings | Exceeds demonstrated need and violates the no-new-infrastructure rule. |
| C. Treat Cursor like Codex native-plugin materialization | Register Superpowers/CE/Ponytail as Cursor native plugins and treat that as complete realization | Codex and Cursor host contracts differ. Cursor `.cursor-plugin` capabilities are indexed but not exposed. Choosing native-plugin vs skill-symlink is a per-capability disposition, not a host-wide copy of Codex. |

Recommendation: Approach A.

---

## 1. Current-state evidence

Inspected repository: [`HHPE-HRG/curated-market`](https://github.com/HHPE-HRG/curated-market) at `5009119d9b405b69ea046e18a1bc3812a207528e` (`main`). Additional host-local projection observed on this machine on 2026-08-21 is labeled **host-local** and is not portable supply truth.

### 1.1 Cursor adapter

[`registry/adapters/cursor/adapter.json`](../../../registry/adapters/cursor/adapter.json):

```json
{
  "mode": "retain-native-plugin-pending-probe",
  "skill_root": null,
  "preserve": ["settings", "rules", "mcp", "agents", "plugins"],
  "reload": "window-reload"
}
```

This is a stub. It does not declare scopes, mechanisms, or projection targets. Codex's adapter declares `individual-namespaced-links` and a skill root. Cursor's `skill_root: null` contradicts the fourteen Cursor exposures that already target `~/.cursor/skills/...`.

[`docs/host-adapters.md`](../../host-adapters.md) states Cursor retains native plugin/rule surfaces pending live symlink probes.

### 1.2 Host record

[`registry/manifests/hosts.yaml`](../../../registry/manifests/hosts.yaml) cursor row:

- `support_state`: `INSTALLED_PENDING_VALIDATION`
- `global_skill_path`: `~/.cursor/skills`
- `project_skill_path`: `.cursor/skills`
- `plugin_mechanism`: `native extensions`
- `symlink_supported`: `not_proven`
- `result`: `BLOCKED_BY_UNAVAILABLE_INTERACTIVE_UI`
- limitation: do not modify `~/.cursor/skills-cursor`
- `executable` / `version` are lead-host facts (`/usr/bin/cursor`, `3.9.16`)

[`reports/interactive-hosts/cursor-3.9.16.yaml`](../../../reports/interactive-hosts/cursor-3.9.16.yaml) records that the 2026-07-11 probe found a GUI launcher, no headless agent, and did not install registry exposures. That report is historical evidence, not current realization truth.

[`lib/skills-ci.mjs`](../../../lib/skills-ci.mjs) looks for `cursor-agent`, not the Cursor SDK, and classifies missing executable as `SUPPORTED_NOT_INSTALLED`.

### 1.3 Capabilities that currently target Cursor

Fourteen exposures in [`registry/manifests/exposures.yaml`](../../../registry/manifests/exposures.yaml) have `host: "cursor"`. All use `mode: "skill-symlink"` and `adapter: "registry/adapters/cursor"`. All targets are user-local `~/.cursor/skills/...`. None declare project or cloud-project scope. None use `rule`, `hook`, `local-plugin`, or `mcp` modes.

| capability_id | canonical source | declared Cursor target | mechanism | runtime dependency |
| --- | --- | --- | --- | --- |
| `hhpe-hrg/serena-guidance` | `registry/overlays/wrappers/serena-guidance` | `~/.cursor/skills/serena-guidance` | skill-symlink | `serena` |
| `hhpe-hrg/context7-guidance` | `registry/overlays/wrappers/context7-guidance` | `~/.cursor/skills/context7-guidance` | skill-symlink | `ctx7` |
| `hhpe-hrg/playwright-guidance` | `registry/overlays/wrappers/playwright-guidance` | `~/.cursor/skills/playwright-guidance` | skill-symlink | `playwright-cli` |
| `hhpe-hrg/session-start` | `registry/overlays/wrappers/session-start` | `~/.cursor/skills/session-start` | skill-symlink | none |
| `trailofbits/dimensional-analysis` | trailofbits package skill | `~/.cursor/skills/trailofbits-dimensional-analysis` | skill-symlink | none declared |
| `trailofbits/property-based-testing` | trailofbits package skill | `~/.cursor/skills/trailofbits-property-based-testing` | skill-symlink | none declared |
| `trailofbits/differential-review` | trailofbits package skill | `~/.cursor/skills/trailofbits-differential-review` | skill-symlink | none declared |
| `trailofbits/supply-chain-risk-auditor` | trailofbits package skill | `~/.cursor/skills/trailofbits-supply-chain-risk-auditor` | skill-symlink | none declared |
| `trailofbits/rust-review` | trailofbits package skill | `~/.cursor/skills/trailofbits-rust-review` | skill-symlink | none declared |
| `trailofbits/c-review` | trailofbits package skill | `~/.cursor/skills/trailofbits-c-review` | skill-symlink | none declared |
| `trailofbits/sharp-edges` | trailofbits package skill | `~/.cursor/skills/trailofbits-sharp-edges` | skill-symlink | none declared |
| `trailofbits/static-analysis/codeql` | trailofbits package skill | `~/.cursor/skills/trailofbits-codeql` | skill-symlink | none declared |
| `trailofbits/static-analysis/semgrep` | trailofbits package skill | `~/.cursor/skills/trailofbits-semgrep` | skill-symlink | none declared |
| `trailofbits/static-analysis/sarif-parsing` | trailofbits package skill | `~/.cursor/skills/trailofbits-sarif-parsing` | skill-symlink | none declared |

ADRs 019–022 and 020 authorize those Cursor skill exposures. They do not authorize Cursor native-plugin, hook, rule, MCP, project, or cloud-project bindings.

### 1.4 Capabilities indexed for Cursor but not exposed

| capability_id | type | Cursor exposure |
| --- | --- | --- |
| `superpowers/plugin-.cursor-plugin` | plugin | none |
| `compound-engineering/plugin-.cursor-plugin` | plugin | none |
| `hhpe-hrg/ast-grep` | overlay skill | Codex native-plugin only |
| `hhpe-hrg/registry-health` | overlay skill | Codex native-plugin only |
| `hhpe-hrg/stack-router` | overlay skill | Codex native-plugin only |
| Superpowers retained skills | skill | no Cursor exposure |
| Superpowers inactive skills | skill | must not be exposed (`final-stack.yaml`) |
| Compound Engineering skills | skill | no Cursor exposure |
| Caveman skills | skill | Codex skill-symlink only; no `.cursor-plugin` capability |
| Ponytail skills | skill | Codex native-plugin only; no `.cursor-plugin` capability |

`cursor-plugin-routing` is not a registry capability and has no exposure row. It is a Cursor-native plugin tree in-repo.

### 1.5 Mechanisms actually present

**Skills (declared).** The fourteen rows above.

**Rules.** No Cursor exposure uses a rule. The only reviewed Cursor rule is `cursor-plugin-routing/rules/plugin-routing.mdc` (`alwaysApply: true`). It is guidance: it tells the agent to consult an index and write `## Plugin and capability use`.

**Hooks.** No Cursor exposure uses a hook. Hooks exist only inside `cursor-plugin-routing/hooks/hooks.json`:

- `sessionStart` → `session-start.mjs` (`failClosed: false`)
- `beforeShellExecution` → `route-gate.mjs` (`failClosed: false`)

`route-gate.mjs` can deny a subset of mutative shell commands when `routing-complete.json` is absent. Catch paths and `failClosed: false` mean denial is not a closed enforcement boundary.

**Local plugins.** `cursor-plugin-routing/.cursor-plugin/plugin.json` names `hhpe-hrg-plugin-stack`. Install instructions symlink it to `~/.cursor/plugins/local/hhpe-hrg-plugin-stack`. That install is not performed by `hhpe-registry-sync` and is not recorded as a Cursor exposure.

**MCP.** No Cursor MCP exposure exists. Plugin-routing indexes MCP metadata when present. Host-local `~/.cursor/mcp.json` currently lists only `caveman` and is unmanaged user configuration.

**Runtime tools.** Guidance skills declare `serena`, `ctx7`, and `playwright-cli`. [`registry/manifests/tools.yaml`](../../../registry/manifests/tools.yaml) currently mixes portable coordinates with host-absolute binary paths. That mixing is already a defect in the tool-spec design. Cursor realization must consume portable tool identity, not embed those paths.

### 1.6 Sync and ownership

[`lib/registry.mjs`](../../../lib/registry.mjs) `sync()`:

- expands `~` with `os.homedir()`
- creates only missing skill-symlinks
- records `created_by_hhpe` in `migration-state.yaml`
- treats `native-plugin` and `registry-reference` as `REGISTER` actions with no Cursor installer
- refuses collisions; does not retarget preexisting links

There is no Cursor-specific sync path for rules, hooks, local plugins, MCP, project trees, or Cloud.

[`registry/manifests/migration-state.yaml`](../../../registry/manifests/migration-state.yaml) contains Cursor skill paths from `/home/hold3n/...` and, after host-local apply on 2026-08-21, `/Users/maxholden/...`. Those are machine observations stored beside policy.

### 1.7 Routing layer

Reviewed sources: [`docs/project_status/plugin-routing-cursor.md`](../../project_status/plugin-routing-cursor.md), `cursor-plugin-routing/**`, [`tests/plugin-routing-index.test.mjs`](../../../tests/plugin-routing-index.test.mjs).

| Piece | Class | Persistence |
| --- | --- | --- |
| `plugin-routing.mdc` | guidance | plugin rule |
| `plugin-routing` skill | guidance | plugin skill |
| derived `plugin-index.md` | guidance; non-authoritative | user-local `~/.cursor/hhpe-hrg-plugin-stack/derived/` |
| `session-start.mjs` | observable init (index refresh) | hook |
| `route-gate.mjs` | intended enforceable precondition | hook; currently `failClosed: false` |
| `routing-complete.json` | observable routing-state flag | user-local, not per-thread |

Index tests use temporary directories except one package-shape test that reads in-repo plugin files. They do not require ambient `~/.cursor`. Hook scripts default to `os.homedir()`.

### 1.8 Tests and ambient `~/.cursor`

| Test | Ambient `~/.cursor`? | Other ambient host facts |
| --- | --- | --- |
| `tests/plugin-routing-index.test.mjs` | no | no |
| `tests/rollback.test.mjs` | no | no |
| `tests/registry.test.mjs` `registry integrity passes` | no `~/.cursor` read | calls `validate()`, which requires current `tools.yaml` binaries and Codex native-plugin list |
| `tests/capability-expansion.test.mjs` | no | may invoke `serena` / host tools |
| `lib/skills-ci.mjs` host `cursor` | no, uses fixture `.cursor/skills` | requires `cursor-agent` on PATH |

No current test observes Cursor loading a projected skill, executing a hook, or honoring the route gate inside a Cursor runtime.

### 1.9 Project and Cloud material in this repository

The curated-market checkout has no `.cursor/` project tree. There is no cloud-project exposure, no Cloud Agent fixture, and no SDK acceptance test.

---

## 2. Current provenance paths

### 2.1 Declared (repository)

```text
packages.lock.yaml / overlays
  → capabilities.yaml
    → exposures.yaml (host=cursor, mode=skill-symlink, target=~/.cursor/skills/...)
      → sync() → migration-state.yaml
```

Plugin routing is a parallel in-repo tree, installed by a documented manual symlink, not by that path.

### 2.2 Host-local (2026-08-21 inspection; not supply truth)

Under `~/.cursor/skills`:

- 14 links → curated-market overlays or trailofbits package commits (matches declared Cursor exposures)
- 67 links → `~/.hhpe-skill-pool/...`
- 1 unmanaged directory: `execution-discipline`

`~/.hhpe-skill-pool/README.md` states the pool was generated from a Forgejo-hosted Curated Market mirror via `link_skill_pool.sh` / `npm run agent:sync-skill-pool`. It is a legacy projection, not a Cursor-native plugin surface.

`~/.cursor/plugins/local/hhpe-hrg-plugin-stack` → `src/curated-market/cursor-plugin-routing` (host-local, unmanaged by registry sync).

`~/.cursor/plugins/cache` contains `caveman`, `cursor-public`, `ponytail`, `superpowers-dev` (Cursor plugin cache; not registry-managed).

`~/.cursor/mcp.json` contains `caveman` only (unmanaged).

No user `~/.cursor/hooks.json`.

### 2.3 Dual provenance (same capability, two Cursor-visible names)

Trail of Bits skills appear twice on this host:

- registry-managed namespaced links: `trailofbits-c-review`, etc.
- skill-pool un-namespaced links: `c-review`, `semgrep`, `codeql`, etc.

HHPE overlays `ast-grep`, `registry-health`, and `stack-router` exist in the skill pool and as Codex exposures, but have no Cursor exposure. Session-start and the three guidance wrappers were retargeted from skill-pool to overlays on this host; the skill-pool copies remain on disk.

Superpowers inactive skills (`brainstorming`, `writing-plans`, `using-superpowers`, …) are present in the skill pool and therefore Cursor-visible, contrary to `final-stack.yaml` `inactive_superpowers_are_not_exposed`.

---

## 3. Concrete defects and ambiguities

1. **Scope is implicit and user-only.** Every Cursor exposure uses `~/.cursor/skills`. Hosts.yaml already names `.cursor/skills` as the project path, but nothing projects there.
2. **Adapter and exposures disagree.** `skill_root: null` vs fourteen `~/.cursor/skills` targets.
3. **Plugin routing is outside the registry binding.** Org-wide Cursor behavior is installed by a README symlink.
4. **Route gate is not fail-closed.** `failClosed: false` plus catch-allow means the hook cannot be claimed as hard enforcement.
5. **Routing state is user-global.** One `routing-complete.json` is shared across projects and threads.
6. **Legacy skill-pool remains the majority Cursor skill surface.** 67 links are unmanaged. Inactive Superpowers are visible.
7. **Native Cursor plugins for CE and Superpowers are indexed, not bound.** Whether they are the intended Cursor mechanism is undecided.
8. **Caveman/Ponytail have no Cursor plugin capability** and no Cursor exposure, yet appear via skill-pool and/or plugin cache/MCP.
9. **Host observations live in supply-adjacent manifests.** `hosts.yaml`, `tools.yaml`, and `migration-state.yaml` contain lead-host absolute paths and compressed statuses.
10. **`SUPPORTED_AND_INSTALLED` / `INSTALLED_PENDING_VALIDATION` collapse distinct facts.** Declared, projected, statically valid, runtime observed, and requirement satisfied are not separable.
11. **No runtime observation of Cursor.** Historical UI-block report plus `cursor-agent` absence; SDK unused.
12. **Cloud is unmodeled.** Cloud agents will not inherit `~/.cursor` unless repository-visible or team-supported material is projected.
13. **`validate()` is not Cursor-static.** It fails on Codex plugin list and host tool paths. `tests/registry.test.mjs` currently requires that ambient state.
14. **Generator hazard.** `scripts/generate-manifests.mjs` can overwrite host/tool records and is already known to be non-reproducible for `tools.yaml`.
15. **T3 Cursor skill projection** is noted in ADR-026 as unclassified (provider protocol vs realization). This design does not assign it.

---

## 4. Proposed scope model

Three explicit Cursor realization scopes. A binding names one or more scopes. Absence of a scope means that surface is not a realization target.

### User-local

Targets under `~/.cursor/...`.

Use only for personalization intended to follow the operator across local projects: operator guidance skills, operator-local plugin install, operator-local derived index, operator MCP that is not repo policy.

Do not use this scope for behavior a Cloud Agent or another machine must receive.

### Project

Targets under `<repo>/.cursor/...`.

Use for repository-owned behavior: project skills, rules, hooks, MCP, and any other repository-scoped Cursor configuration the repo is allowed to carry.

A project projection must be reproducible from reviewed Curated Market sources plus the binding. It must not copy the developer home directory.

### Cloud-project

Uses repository-visible Cursor configuration and any explicitly supported cloud/team configuration.

Validate independently. Do not assume Cloud inherits user-local files. The question is: does this cloud execution context receive the intended curated capability?

### Scope assignment rule

Each Cursor exposure must state its intended scope set. Default is **not** “all scopes.” Suggested defaults for later implementation, subject to review:

| Kind | Default scope | Reason |
| --- | --- | --- |
| Operator guidance wrappers (`session-start`, specialist guidance) | user-local | follows the operator |
| Trail of Bits specialists | user-local unless a repo requires them | operator toolbox |
| Plugin-routing rule/skill/hooks | project, plus optional user-local install | Cloud and clones need repo-visible hooks/rules |
| Repo MCP policy | project | Cloud-visible |
| Derived index / routing-complete flag | generated beside the chosen plugin install; not portable supply | derived state |

These defaults are policy proposals, not an instruction to project everything now.

---

## 5. Proposed canonical projection model

For every supported Cursor capability, the binding identifies:

- `capability_id` (portable)
- canonical source (package root + source path, or overlay path)
- Cursor mechanism set: skill, rule, hook, local plugin, MCP configuration, runtime dependency
- scope set
- portable target template (`~/.cursor/skills/<name>` or `.cursor/skills/<name>`), never a historical host absolute path
- enforcement class: guidance or enforceable
- managed-ownership flag (`created_by_hhpe` only when sync created the object)

Canonical content stays in packages/overlays. Generated Cursor files are projections. Re-running projection from the same reviewed sources must reproduce the same managed objects.

Forbidden dependencies: `skills-cursor`, plugin cache internals, unpublished Cursor ranking, T3 hidden provider state.

`hhpe-registry-sync` remains additive. It must not overwrite unmanaged destinations. Collision remains refuse-and-record.

Local-plugin projection for `cursor-plugin-routing` should become a first-class Cursor binding (capability + exposure + managed symlink or project checkout path) instead of a README-only install. That is a Cursor adapter concern, not a new plugin abstraction.

Runtime dependencies remain ToolSpecs / portable coordinates. Cursor bindings may *require* a tool capability; they must not store `/Users/...` or `/home/hold3n/...` as the requirement.

---

## 6. Legacy skill-pool disposition

Every remaining `~/.cursor/skills` → `~/.hhpe-skill-pool` link needs one explicit authority:

1. **Curated Market canonical package** — if HHPE owns the object, retarget the managed projection to the commit-pinned package or overlay; or
2. **Intentional native Cursor plugin** — record that the Cursor plugin (marketplace/cache/local plugin) is the realization mechanism; do not pretend the filesystem skill link owns it; or
3. **Unmanaged user object** — leave it; do not mutate.

Do not leave indefinite dual provenance.

Proposed dispositions for later implementation (not executed by this spec):

| Skill-pool name | Proposed authority | Notes |
| --- | --- | --- |
| Un-namespaced Trail of Bits (`c-review`, `semgrep`, …) | Curated Market package **or** retire after namespaced projection is the only managed link | Dual with `trailofbits-*` today |
| `session-start`, `*-guidance` (if any remain) | Curated Market overlays | Already retargeted on this host |
| `ast-grep`, `registry-health`, `stack-router` | Curated Market overlays if Cursor should have them; else not a Cursor capability | Present in pool, absent from Cursor exposures |
| Compound Engineering `ce-*` | Decide: `compound-engineering/plugin-.cursor-plugin` **or** skill-symlinks from the locked package | Plugin capability exists; no exposure |
| Superpowers retained | Decide: `superpowers/plugin-.cursor-plugin` **or** skill-symlinks | Inactive set must not be Cursor-visible |
| Superpowers inactive in pool | Remove from managed Cursor visibility; do not expose | `final-stack.yaml` |
| Caveman `caveman*` | Decide: native Cursor plugin (cache already has `caveman`) **or** package skill-symlinks | No `.cursor-plugin` capability indexed |
| Ponytail `ponytail*` | Decide: native Cursor plugin (cache has `ponytail`) **or** package skill-symlinks | No `.cursor-plugin` capability indexed |
| `lfg`, `execution-discipline` | unmanaged unless a canonical source is identified | Do not mutate |

Implementation must not rewrite unmanaged user objects. Adoption of a skill-pool link into HHPE ownership requires an explicit managed-object record and a collision-safe retarget.

---

## 7. Proposed enforcement model

Retain plugin-routing / index / gate where current tests and docs support it.

### Guidance (not proof of internal selection)

- skills
- rules, including `alwaysApply` plugin-routing
- prompts
- derived plugin index
- ranker output

These may influence the agent. They do not prove Cursor's hidden skill ranking or that a particular skill was internally preferred.

### Enforceable (observable hook or execution boundary)

Valid examples:

- routing-state flag absent → deny listed `beforeShellExecution` commands
- `preToolUse` / MCP-call restrictions if a later binding uses those hook events
- session initialization checks that observe hook execution and file outputs
- SDK/local sandbox or approval hooks used as execution boundaries in fixtures

Invalid examples:

- “model must internally prefer skill X”
- “alwaysApply rule proves the skill was used”
- treating `failClosed: false` as hard enforcement

A later implementation may tighten `failClosed` only with tests that show deny on missing state and allow after `mark-routing-complete`. Until then, the gate is an intended enforceable precondition, not a demonstrated closed boundary.

Routing-complete state should be scoped to the realization that owns the plugin (project vs user-local). A single home-global flag is not an acceptable long-term project or Cloud gate.

---

## 8. Proposed static Cursor validation

Add deterministic checks that do not launch Cursor and do not read private provider state.

Static validation should establish, for each Cursor binding:

- canonical source exists inside the package/overlay root
- declared scope is one of `user-local` | `project` | `cloud-project`
- target template is safe (no `..`, no `skills-cursor`, no host-absolute historical path in the binding)
- generated projection from reviewed sources is reproducible in a temp fixture
- managed ownership is explicit
- provider binding is structurally valid (capability exists; mechanism files exist)
- required supporting files are present
- unmanaged destinations would not be overwritten

These checks belong beside existing `staticIntegrity()` / isolated temp-dir tests. They must not call `validate()`'s current Codex plugin or `tools.yaml` absolute-path probes.

`tests/registry.test.mjs` must remain green without requiring a developer's `~/.cursor` or a live Codex plugin list. Fixing that ambient coupling is in scope for the later implementation, not this spec.

---

## 9. Proposed SDK acceptance model

Use `@cursor/sdk` as a **runtime execution surface** that can also produce acceptance observations.

Fixtures run in isolated temporary projects. They must not depend on ambient `~/.cursor` unless a fixture explicitly installs a user-local projection into a fake home.

Minimum investigations, covered where the SDK actually supports the observation:

| Claim | Observable evidence | Not claimed |
| --- | --- | --- |
| Projected skills are discoverable | agent/runtime sees the projected `SKILL.md` path or skill name from the fixture tree | hidden ranking |
| Project rules are loaded | rule file present in project `.cursor/rules` and fixture behavior consistent with load | internal priority vs other rules |
| Required hooks execute | hook script runs and writes observable output / deny / allow | mental model of the agent |
| Routing gate blocks before required state | listed shell/tool call denied while flag absent | that routing “thought” occurred |
| Routing gate allows after required state | same call allowed after `mark-routing-complete` | completeness of all mutative paths |
| MCP configuration is usable | configured server is visible to the fixture runtime | MCP is required for Compatibility |
| Relevant subagent behavior is available | documented SDK subagent surface responds in-fixture | parity with IDE subagents |
| Projection resolves from canonical source | realpath of loaded skill is the package/overlay path | skill-pool is unused by Cursor internals |
| Legacy skill-pool is not used in the fixture | fixture home has no skill-pool links, or they are absent from the resolved path | every user machine is clean |

If a fixture cannot be observed through a supported SDK API, record `unobserved` for that requirement. Do not skip to `requirement satisfied`.

SDK local runtime and SDK cloud runtime are different execution contexts. A pass on one is not a pass on the other.

---

## 10. Proposed Cloud model

After user-local and project bindings are correct, inspect Cloud separately.

Cloud realization material is the **project** (and any documented team/enterprise) subset required for that capability. Do not copy `~/.cursor`.

Cloud validation answers: does this cloud execution context receive the intended curated capability?

Evidence may be retained as reports. Cloud is not the evidence plane.

Deferred until local/project projection is specified in implementation: exact Cloud Agents API fields, team-hook precedence, and whether any capability is Cloud-only.

---

## 11. Requirement-satisfaction semantics

Do not use one universal host state such as `SUPPORTED_AND_INSTALLED` as the Cursor conclusion.

For each capability × scope × execution context × requirement:

| Fact | Meaning |
| --- | --- |
| declared | binding exists in reviewed Curated Market records |
| projected | managed files/links exist at the declared target |
| statically valid | static checks passed for that binding |
| runtime observed | a named fixture/probe produced evidence |
| requirement satisfied | policy says that evidence meets that requirement |

Observations stay in reports or equivalent retained evidence. Conclusions are derived and contextual. A capability may be projected and statically valid while a runtime requirement remains unobserved.

This is a logical record, not a new universal enum stored in `hosts.yaml`.

---

## 12. MCP

An HHPE-facing MCP surface is optional. Current evidence does not require it: no Cursor MCP exposure exists; plugin-routing only indexes MCP metadata; user MCP is unmanaged Caveman.

If later justified, keep it narrow (capabilities, capability status, routing lookup, routing explanation). Do not make MCP the Compatibility plane or a mandatory Cursor mechanism.

---

## 13. Explicit non-goals

This design does not authorize:

- a generalized provider realization engine
- a host registry
- a Cursor daemon
- a universal plugin abstraction
- a universal status enum in supply manifests
- a compatibility service
- a provider-independent hook runtime
- appointment of Curated Market as Compatibility plane owner
- dependence on `skills-cursor` or private ranking
- mutation of unmanaged user Cursor objects
- copying `~/.cursor` into Cloud
- claiming hard enforcement for skills/rules
- treating SDK as proof-only or Cloud as evidence infrastructure
- T3 control-plane redesign
- OpenCode-only fork work
- implementation or a writing-plans document

---

## 14. Explicitly deferred decisions

1. Per-capability choice: native Cursor plugin vs skill-symlink for Compound Engineering, Superpowers, Caveman, and Ponytail.
2. Whether `hhpe-hrg/ast-grep`, `registry-health`, and `stack-router` become Cursor capabilities.
3. Whether plugin-routing is project-scoped, user-local, or both.
4. Whether `failClosed` becomes true after fixtures exist.
5. Physical ToolSpec / observation storage (already deferred).
6. Cloud Agents API / team-hook details.
7. Optional HHPE MCP surface.
8. Classification of T3 Cursor skill-projection code (ADR-026 open item).
9. Disposition of unmanaged `lfg` and `execution-discipline`.
10. Whether `skills-ci` Cursor host should switch from `cursor-agent` to the SDK; that is an implementation choice after this boundary is approved.

---

## 15. Contrary repository evidence

- ADR-026: Compatibility physical owner unresolved; Curated Market containing adapters does not make it that plane. This spec therefore describes Cursor bindings as repository-local compatibility *policy records*, not a plane takeover.
- `hosts.yaml` and `validate()` still compress host support into one status and treat lead-host paths as current requirements.
- `adapter.json` `retain-native-plugin-pending-probe` plus `skill_root: null` conflicts with active skill-symlink exposures.
- `final-stack.yaml` forbids exposing inactive Superpowers; the skill-pool currently does.
- Codex is the only host with native-plugin install validation; copying that to Cursor is unsupported.
- Historical Cursor report says symlink support is unproven; host-local 2026-08-21 apply created skill-symlinks, which is projection evidence, not loader-parity evidence.
- `generate-manifests.mjs` remains a destructive writer for some manifests.
- Plugin-routing documentation describes the route gate as blocking; `failClosed: false` contradicts a hard-enforcement reading.

None of these block writing this boundary. They constrain implementation claims.

---

## 16. Acceptance criteria for a later implementation

A later implementation is acceptable only if it:

1. projects Cursor bindings deterministically from canonical sources
2. never overwrites unmanaged Cursor files
3. keeps user-local, project, and cloud-project scopes distinct
4. resolves legacy dual provenance intentionally
5. keeps static checks free of Cursor runtime and ambient `~/.cursor`
6. uses SDK fixtures only for observable claims
7. uses hooks only for supported observable constraints
8. never claims provider-private ranking as verified
9. validates Cloud without implicit developer-home state
10. introduces no unrelated provider architecture
11. keeps existing deterministic Curated Market tests green

---

## 17. Deliverable status

This document is the design specification only. It does not implement bindings, retarget skill-pool links, change unmanaged Cursor configuration, or create an implementation plan.
