# Cursor Realization Boundary Design

Date: 2026-08-21

Status: Hardened design for review. Not an implementation plan. Does not appoint Curated Market as the physical Compatibility/Capability Realization owner.

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

## Implementation baseline prerequisite

Cursor implementation must begin from a baseline that already contains the verified ToolSpec / native-plugin remediation work, or an equivalent revision with those boundaries already integrated.

The investigation that produced this spec inspected `main` at `5009119d9b405b69ea046e18a1bc3812a207528e`. Several defects recorded there — host-local paths in `tools.yaml`, ambient native-plugin checks inside static validation, and compressed host realization state — are **observed current-main / migration context**. They are not Cursor requirements to re-solve.

Verified remediation lives on `integrate/toolspec-remediations` (inspected HEAD `63da34b3f3e20e5b0e7333286c04b881bc39b747`) together with the ToolSpec observation design and the native-plugin validation-boundary design carried on that baseline. Those contracts already require:

- portable ToolSpec identity separate from host realization observations;
- static validation that does not inspect ambient native-plugin installation;
- host realization state as context-bound observation, not a compressed portable status.

**Cursor implementation must not recreate, replace, or work around those solved contracts.** Cursor work consumes them. Cursor-specific remaining work is Cursor binding, scoped projection, context-bound routing, and requirement-specific SDK/Cloud observation.

Where later sections describe `tools.yaml` absolute paths, `validate()` Codex plugin probes, or `SUPPORTED_AND_INSTALLED` compression, those sentences document the inspected `main` migration snapshot. They do not authorize Cursor implementation to rebuild ToolSpec or native-plugin validation.

## Authority distinctions this design preserves

| Record | Answers |
| --- | --- |
| Canonical capability | Portable identity and content |
| Cursor binding | Compatibility policy for this provider |
| Generated Cursor files | Provider projection |
| Actual Cursor / SDK / Cloud behavior | Runtime observation |
| Requirement satisfied? | Compatibility conclusion for one requirement in one execution context |

Portable supply manifests must not absorb current-host observations. Current-machine absolute paths must not become canonical truth. Provider realization must not redefine portable capability identity.

If Cursor support declarations remain in `hosts.yaml` or an equivalent manifest, those declarations are **supported realization policy** only. They must not persist current installation paths, current plugin state, current readiness, or other execution observations. Runtime state belongs in context-bound observations.

## Design principles

1. Use only Cursor-supported surfaces: user and project config files, local plugins, hooks, MCP configuration, Cloud Agents, and the public SDK/Cloud API.
2. Do not depend on `~/.cursor/skills-cursor` or any other private/hidden catalog.
3. Do not collapse user-local, project, and cloud-project realization into one filesystem projection.
4. Do not automatically project every capability into every scope. One binding does not fan out across scopes.
5. Skills, rules, prompts, and indexes are guidance. Hooks can enforce only observable hookable actions.
6. A hook that requires routing state before a shell/tool action is a valid hard gate. A claim that the model internally selected skill X is not.
7. Static validation must not launch Cursor or inspect private provider state.
8. SDK fixtures establish only requirement-specific observable claims in that execution context.
9. Cloud must be validatable without implicit developer-home state. Local SDK observation is not cloud observation.
10. Prefer the smallest existing seams: `exposures.yaml`, `registry/adapters/cursor`, `cursor-plugin-routing`, existing isolated tests, and report artifacts. Do not add a host registry, daemon, compatibility service, or universal status enum.

## Alternatives considered

| Approach | What it would do | Why not chosen |
| --- | --- | --- |
| A. Cursor-local binding fields and isolated validators | Add scope, mechanism, and enforcement class to Cursor exposures/adapter; add static checks and SDK fixtures that do not require ambient `~/.cursor` | Chosen. Matches existing exposure/sync/test patterns. |
| B. New Cursor realization manifest and service | Create a separate realization file plus a runtime that compiles bindings | Exceeds demonstrated need and violates the no-new-infrastructure rule. |
| C. Treat Cursor like Codex native-plugin materialization | Register Superpowers/CE/Ponytail as Cursor native plugins and treat that as complete realization | Codex and Cursor host contracts differ. Cursor `.cursor-plugin` capabilities are indexed but not exposed. Choosing native-plugin vs skill-symlink is a per-capability disposition, not a host-wide copy of Codex. |

Recommendation: Approach A.

## First implementation slice

The full design covers too many surfaces for one undifferentiated branch.

**First bounded slice:**

```text
Cursor user-local/project realization contract
+ deterministic filesystem projection
+ context-bound routing gate
+ local SDK acceptance fixtures
```

Cloud remains part of this architecture and must stay independently verifiable. It is a later implementation slice, not a deletion.

MCP remains optional and is not in the first slice.

---

## 1. Current-state evidence

Inspected repository: [`HHPE-HRG/curated-market`](https://github.com/HHPE-HRG/curated-market) at `5009119d9b405b69ea046e18a1bc3812a207528e` (`main`). Additional host-local projection observed on this machine on 2026-08-21 is labeled **host-local** and is not portable supply truth.

This section is an investigation snapshot of that `main`. Where it records ToolSpec path mixing, ambient `validate()` plugin probes, or compressed host status, treat those as migration-context observations already bounded by the ToolSpec/remediation baseline named above.

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

[`registry/manifests/hosts.yaml`](../../../registry/manifests/hosts.yaml) cursor row on inspected `main`:

- `support_state`: `INSTALLED_PENDING_VALIDATION`
- `global_skill_path`: `~/.cursor/skills`
- `project_skill_path`: `.cursor/skills`
- `plugin_mechanism`: `native extensions`
- `symlink_supported`: `not_proven`
- `result`: `BLOCKED_BY_UNAVAILABLE_INTERACTIVE_UI`
- limitation: do not modify `~/.cursor/skills-cursor`
- `executable` / `version` are lead-host facts (`/usr/bin/cursor`, `3.9.16`)

These compressed fields are observed current-main / migration context. Cursor implementation must not treat them as the satisfaction model to rebuild. Policy vs observation is defined later in this document.

[`reports/interactive-hosts/cursor-3.9.16.yaml`](../../../reports/interactive-hosts/cursor-3.9.16.yaml) records that the 2026-07-11 probe found a GUI launcher, no headless agent, and did not install registry exposures. That report is historical evidence, not current realization truth.

[`lib/skills-ci.mjs`](../../../lib/skills-ci.mjs) on inspected `main` looks for `cursor-agent`, not the Cursor SDK, and classifies missing executable as `SUPPORTED_NOT_INSTALLED`.

### 1.3 Capabilities that currently target Cursor

Fourteen exposures in [`registry/manifests/exposures.yaml`](../../../registry/manifests/exposures.yaml) have `host: "cursor"`. All use `mode: "skill-symlink"` and `adapter: "registry/adapters/cursor"`. All targets are user-local `~/.cursor/skills/...`. None declare project or cloud-project scope. None use `rule`, `hook`, `local-plugin`, or `mcp` modes.

That current shape is investigation evidence. It is not the universal Cursor capability model.

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

`cursor-plugin-routing` is not a registry capability and has no exposure row. It is a Cursor-native plugin tree in-repo. Its ownership is currently half-stated (README install vs registry realization) and must terminate as defined in §5.2.

### 1.5 Mechanisms actually present

**Skills (declared).** The fourteen rows above.

**Rules.** No Cursor exposure uses a rule. The only reviewed Cursor rule is `cursor-plugin-routing/rules/plugin-routing.mdc` (`alwaysApply: true`). It is guidance: it tells the agent to consult an index and write `## Plugin and capability use`.

**Hooks.** No Cursor exposure uses a hook. Hooks exist only inside `cursor-plugin-routing/hooks/hooks.json`:

- `sessionStart` → `session-start.mjs` (`failClosed: false`)
- `beforeShellExecution` → `route-gate.mjs` (`failClosed: false`)

`route-gate.mjs` can deny a subset of mutative shell commands when `routing-complete.json` is absent. Catch paths and `failClosed: false` mean the inspected hook cannot be claimed as a closed enforcement boundary. The fail-closed *policy* is defined in §8; the current setting remains an implementation decision after applying that policy.

**Local plugins.** `cursor-plugin-routing/.cursor-plugin/plugin.json` names `hhpe-hrg-plugin-stack`. Install instructions symlink it to `~/.cursor/plugins/local/hhpe-hrg-plugin-stack`. That install is not performed by `hhpe-registry-sync` and is not recorded as a Cursor exposure.

**MCP.** No Cursor MCP exposure exists. Plugin-routing indexes MCP metadata when present. Host-local `~/.cursor/mcp.json` currently lists only `caveman` and is unmanaged user configuration.

**Runtime tools.** Guidance skills declare `serena`, `ctx7`, and `playwright-cli`. On inspected `main`, [`registry/manifests/tools.yaml`](../../../registry/manifests/tools.yaml) mixed portable coordinates with host-absolute binary paths. That mixing is ToolSpec / migration context. Cursor realization must consume the portable ToolSpec identity from the remediation baseline, not embed host paths.

### 1.6 Sync and ownership

[`lib/registry.mjs`](../../../lib/registry.mjs) `sync()` on inspected `main`:

- expands `~` with `os.homedir()`
- creates only missing skill-symlinks
- records `created_by_hhpe` in `migration-state.yaml`
- treats `native-plugin` and `registry-reference` as `REGISTER` actions with no Cursor installer
- refuses collisions; does not retarget preexisting links

There is no Cursor-specific sync path for rules, hooks, local plugins, MCP, project trees, or Cloud.

[`registry/manifests/migration-state.yaml`](../../../registry/manifests/migration-state.yaml) on inspected `main` contains Cursor skill paths from `/home/hold3n/...` and, after host-local apply on 2026-08-21, `/Users/maxholden/...`. Those are machine observations stored beside policy.

### 1.7 Routing layer

Reviewed sources: [`docs/project_status/plugin-routing-cursor.md`](../../project_status/plugin-routing-cursor.md), `cursor-plugin-routing/**`, [`tests/plugin-routing-index.test.mjs`](../../../tests/plugin-routing-index.test.mjs).

| Piece | Class | Persistence |
| --- | --- | --- |
| `plugin-routing.mdc` | guidance | plugin rule |
| `plugin-routing` skill | guidance | plugin skill |
| derived `plugin-index.md` | guidance; non-authoritative | user-local `~/.cursor/hhpe-hrg-plugin-stack/derived/` |
| `session-start.mjs` | observable init (index refresh) | hook |
| `route-gate.mjs` | intended enforceable precondition | hook; inspected `failClosed: false` |
| `routing-complete.json` | observable routing-state flag | user-local, not context-bound |

Index tests use temporary directories except one package-shape test that reads in-repo plugin files. They do not require ambient `~/.cursor`. Hook scripts default to `os.homedir()`.

### 1.8 Tests and ambient `~/.cursor`

| Test | Ambient `~/.cursor`? | Other ambient host facts on inspected `main` |
| --- | --- | --- |
| `tests/plugin-routing-index.test.mjs` | no | no |
| `tests/rollback.test.mjs` | no | no |
| `tests/registry.test.mjs` `registry integrity passes` | no `~/.cursor` read | on inspected `main`, `validate()` required current `tools.yaml` binaries and Codex native-plugin list; that ambient coupling is ToolSpec / native-plugin remediation context, not a Cursor contract to rebuild |
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

Canonical capability identity and Cursor-visible name are different records. `trailofbits/c-review` is the portable identity; `c-review` and `trailofbits-c-review` are provider-facing names/aliases. Provider-facing naming must not create a second canonical capability identity or ambiguous ownership. Exact alias migration remains deferred.

HHPE overlays `ast-grep`, `registry-health`, and `stack-router` exist in the skill pool and as Codex exposures, but have no Cursor exposure. Session-start and the three guidance wrappers were retargeted from skill-pool to overlays on this host; the skill-pool copies remain on disk.

Superpowers inactive skills (`brainstorming`, `writing-plans`, `using-superpowers`, …) are present in the skill pool and therefore Cursor-visible, contrary to `final-stack.yaml` `inactive_superpowers_are_not_exposed`.

---

## 3. Concrete defects and ambiguities

Cursor-specific remaining defects:

1. **Scope is implicit and user-only.** Every Cursor exposure uses `~/.cursor/skills`. Hosts.yaml already names `.cursor/skills` as the project path, but nothing projects there. Current records do not treat scope as a binding dimension.
2. **Adapter and exposures disagree.** `skill_root: null` vs fourteen `~/.cursor/skills` targets.
3. **Plugin routing is outside the registry binding.** Org-wide Cursor behavior is installed by a README symlink. Ownership is half-stated.
4. **Inspected route gate is not a demonstrated closed boundary.** `failClosed: false` plus catch-allow. Policy for must-hold hooks is defined in §8; the current setting is not itself the policy.
5. **Routing state is user-global.** One `routing-complete.json` is shared across projects and threads. That is not a sufficient long-term authority boundary.
6. **Legacy skill-pool remains the majority Cursor skill surface.** 67 links are unmanaged. Inactive Superpowers are visible. Dual provenance is not an accepted end state.
7. **Native Cursor plugins for CE and Superpowers are indexed, not bound.** Mechanism remains deferred; the decision contract is defined in §6.
8. **Caveman/Ponytail have no Cursor plugin capability** and no Cursor exposure, yet appear via skill-pool and/or plugin cache/MCP.
9. **No runtime observation of Cursor.** Historical UI-block report plus `cursor-agent` absence on inspected `main`; SDK unused.
10. **Cloud is architecturally required and unimplemented.** Cloud agents will not inherit `~/.cursor` unless repository-visible or team-supported material is projected. Cloud is a later slice, not absent from the design.
11. **T3 Cursor skill projection** is noted in ADR-026 as unclassified (provider protocol vs realization). This design does not assign it.
12. **Skill-symlink is the only declared Cursor mechanism.** That current exposure shape must not become the universal Cursor capability model.

Observed current-main / migration-context items (not Cursor re-solve work):

- host observations in `tools.yaml` / compressed `hosts.yaml` status / `migration-state.yaml` lead-host paths;
- `validate()` ambient Codex plugin and host-path probes on inspected `main`;
- `generate-manifests.mjs` overwrite hazard for ToolSpec / host records.

Cursor implementation consumes the remediation baseline for those items and applies the same ownership principle to Cursor projection (§14).

---

## 4. Realization-scope model

Scope is an explicit realization dimension. It is not an attribute that one exposure fans out across.

A Cursor realization binding is conceptually:

```text
capability
+ host: cursor
+ mechanism
+ scope
+ target
```

Allowed scope vocabulary:

- `user-local`
- `project`
- `cloud-project`

If the same capability is realized in more than one scope, represent those as **distinct realization bindings** (or equivalent explicit records). Do not model one binding with a scope set that implies automatic copy.

### Legal target forms by scope

| Scope | Legal target forms | Illegal |
| --- | --- | --- |
| `user-local` | portable templates under `~/.cursor/...` | project `.cursor/...`; `skills-cursor`; host-absolute historical paths; Cloud-only team config |
| `project` | portable templates under `<repo>/.cursor/...` | `~/.cursor/...`; `skills-cursor`; host-absolute historical paths |
| `cloud-project` | repository-visible Cursor configuration and explicitly supported cloud/team configuration | implicit inheritance of developer `~/.cursor`; copied home trees |

Absence of a binding for a scope means that scope is not a realization target.

No automatic “copy to all Cursor scopes” behavior.

### Scope meanings

**User-local.** Targets under `~/.cursor/...`. Use only for personalization intended to follow the operator across local projects. Do not use this scope for behavior a Cloud Agent or another machine must receive.

**Project.** Targets under `<repo>/.cursor/...`. Use for repository-owned behavior. A project projection must be reproducible from reviewed Curated Market sources plus the binding. It must not copy the developer home directory.

**Cloud-project.** Uses repository-visible Cursor configuration and any explicitly supported cloud/team configuration. Validate independently. The question is: does this cloud execution context receive the intended curated capability?

### Suggested later bindings (not automatic projection)

These are planning hints. Each would be a separate binding if adopted:

| Kind | Candidate scope | Reason |
| --- | --- | --- |
| Operator guidance wrappers | `user-local` | follows the operator |
| Trail of Bits specialists | `user-local` unless a repo requires a `project` binding | operator toolbox |
| Plugin-routing rule/skill/hooks | `project` binding, and a distinct `user-local` binding only if intentionally dual | Cloud and clones need repo-visible hooks/rules |
| Repo MCP policy | `project` | Cloud-visible |
| Derived index / routing-complete flag | generated beside the chosen plugin install; not portable supply | derived state |

---

## 5. Canonical projection and derived state

### 5.1 Capability identity versus Cursor mechanism

These are realization mechanisms, not capability identities:

- `skill-symlink`
- `skill`
- `rule`
- `hook`
- `local-plugin`
- `mcp`
- runtime dependency

A single capability may use more than one mechanism. Conceptually:

```text
capability
├── guidance
├── enforcement
├── runtime dependency
└── provider projection
```

The inspected skill-symlink exposure shape is one current mechanism, not the Cursor capability model.

### 5.2 State classes for each Cursor realization

For each Cursor realization class, distinguish:

| Class | Meaning |
| --- | --- |
| Canonical source | Reviewed package, overlay, or in-repo source that owns identity and content |
| Provider-specific derived state | Generated index, fingerprint, routing-complete flag, or other reproducible projection byproduct |
| Managed destination | Explicit target the synchronizer is authorized to create |
| Ownership authority | `created_by_hhpe` only when sync created the object; otherwise unmanaged or native-plugin policy |
| Validation source | Static check of declarations/projection, or a named runtime observation |

Canonical content stays in packages/overlays. Generated Cursor files are projections. Re-running projection from the same reviewed sources must reproduce the same managed objects.

### 5.3 `hhpe-hrg-plugin-stack` ownership

Current state is half-owned: in-repo `cursor-plugin-routing` plus a README symlink to `~/.cursor/plugins/local/hhpe-hrg-plugin-stack`, with no registry exposure.

It must eventually be exactly one of:

1. **Curated Market-owned projection** — capability + explicit Cursor binding + managed destination; or
2. **Independently installed native Cursor realization referenced by policy** — Compatibility policy names it; filesystem sync does not pretend to own it.

Do not leave it indefinitely half-owned between README installation and registry realization. The exact migration may remain deferred. The terminal categories may not.

### 5.4 Binding contents

Each Cursor binding identifies:

- `capability_id` (portable; not a Cursor-visible alias)
- canonical source
- one Cursor mechanism (additional mechanisms are additional bindings or explicit companion records on the same capability)
- exactly one scope
- portable target legal for that scope
- enforcement class: guidance or enforceable
- managed-ownership flag

Forbidden dependencies: `skills-cursor`, plugin cache internals, unpublished Cursor ranking, T3 hidden provider state.

Runtime dependencies remain ToolSpecs / portable coordinates from the remediation baseline. Cursor bindings may *require* a tool capability; they must not store `/Users/...` or `/home/hold3n/...` as the requirement.

### 5.5 Cursor-visible name versus canonical identity

Canonical capability identity remains `package/capability` (for example `trailofbits/c-review`).

Cursor-visible names (`c-review`, `trailofbits-c-review`) are aliases or projection basenames. They must not create duplicate canonical identities or split ownership. Exact alias migration remains deferred; dual authority is not an accepted end state.

---

## 6. Deferred mechanism choice with a required decision contract

Do not select the final Cursor realization mechanism for Compound Engineering, Superpowers, Caveman, or Ponytail in this specification.

Later planning must apply this decision contract to each capability:

| Question | Why it matters |
| --- | --- |
| Canonical source exists? | No Cursor binding without reviewed source |
| Cursor-native plugin exists? | May be the intentional mechanism |
| Native mechanism sufficiently controllable? | Uncontrollable native surfaces cannot carry must-hold enforcement |
| Filesystem projection required? | Skill/rule/hook files vs plugin-only |
| Hook enforcement required? | Guidance cannot substitute for a must-hold precondition |
| Runtime dependency required? | Bind to ToolSpec identity, not host paths |
| SDK observable? | Which requirements can be observed locally |
| Cloud-project realizable? | Whether a later Cloud binding is possible |

The mechanism choice may remain deferred. The decision boundary may not.

Proposed later dispositions in the investigation remain planning hints only and do not select mechanisms.

---

## 7. Routing-state invariant

Retain plugin-routing / index / gate where current tests and docs support it.

The inspected global `routing-complete.json` is not a sufficient long-term authority boundary.

**Invariant:** routing completion for one context ≠ authorization for unrelated later activity.

Routing completion must be correlated with the operation it authorizes. The exact identity may remain deferred, but it must be context-bound to an appropriate unit such as:

- session
- turn
- request
- operation

or another explicitly justified execution context.

Do not select storage mechanics in this specification unless a later implementation proves they are required by this invariant.

---

## 8. Fail-closed policy

Do not require `failClosed: true` on every hook.

**Rule:** If a hook is the authoritative enforcement mechanism for a must-hold precondition, inability to establish that precondition must not silently degrade into guidance.

Distinguish:

| Case | Required behavior |
| --- | --- |
| Guidance failure | Index missing, ranker inconclusive, skill unread: agent may proceed with documented limitation; this is not enforcement |
| Enforcement precondition unavailable | Must-hold hook cannot establish required state, cannot run, or cannot decide: must not silently become guidance |

The inspected `failClosed: false` setting remains an implementation decision after applying this rule. Documentation that calls the gate “blocking” is not itself hard enforcement.

---

## 9. Normative guidance, enforcement, and observation

| Surface | Claim it may establish |
| --- | --- |
| Skill / rule / routing index | Guidance or discoverability |
| Hook | Enforcement of an observable supported event or precondition |
| Static config presence | Projection presence |
| SDK fixture | Runtime observation in that execution context |
| Cloud run | Runtime observation in cloud execution context |

These surfaces must not be claimed to prove:

- Cursor’s hidden skill ranking;
- private policy-engine behavior;
- internal model reasoning;
- unobservable loader internals.

Runtime observation ≠ compatibility conclusion.

---

## 10. Static Cursor validation

Add deterministic checks that do not launch Cursor and do not read private provider state.

Static validation should establish, for each Cursor binding:

- canonical source exists inside the package/overlay root
- declared scope is exactly one of `user-local` | `project` | `cloud-project`
- target form is legal for that scope
- target template is safe (no `..`, no `skills-cursor`, no host-absolute historical path in the binding)
- generated projection from reviewed sources is reproducible in a temp fixture
- managed ownership is explicit
- provider binding is structurally valid (capability exists; mechanism files exist)
- required supporting files are present
- unmanaged destinations would not be overwritten

These checks belong beside existing isolated temp-dir tests. They must consume the remediation baseline’s static-validation contract (no ambient native-plugin inventory; no ToolSpec host-path probes as repository integrity).

Cursor static validation must not require a developer’s `~/.cursor`.

---

## 11. SDK acceptance model

Use `@cursor/sdk` as a **runtime execution surface** that can also produce acceptance observations.

Do not use a single status equivalent to `cursor_sdk_validated: true`.

SDK acceptance produces observations against specific requirements. Example requirement identities (shape only; not a mandate to implement all immediately):

- `skill_discoverable`
- `rule_loaded`
- `routing_gate_blocks_before_completion`
- `routing_gate_allows_after_completion`
- `hook_loaded`
- `mcp_available`
- `subagent_surface_available`

Fixtures run in isolated temporary projects. They must not depend on ambient `~/.cursor` unless a fixture explicitly installs a user-local projection into a fake home.

| Requirement example | Observable evidence | Not claimed |
| --- | --- | --- |
| `skill_discoverable` | runtime sees the projected `SKILL.md` path or skill name from the fixture tree | hidden ranking |
| `rule_loaded` | rule file present in project `.cursor/rules` and fixture behavior consistent with load | internal priority vs other rules |
| `hook_loaded` / gate requirements | hook script runs and writes observable deny / allow | mental model of the agent |
| `mcp_available` | configured server is visible to the fixture runtime | MCP is required for Compatibility |
| `subagent_surface_available` | documented SDK subagent surface responds in-fixture | parity with IDE subagents |

If a fixture cannot be observed through a supported SDK API, record `unobserved` for that requirement. Do not skip to `requirement satisfied`.

**Local SDK observation ≠ cloud observation.** A successful local run does not establish cloud support.

---

## 12. Cloud model

Cloud remains in the architecture. It is a later independently verifiable implementation slice.

Cloud realization material is the **project** (and any documented team/enterprise) subset required for that capability. Do not copy `~/.cursor`.

A repository-visible `.cursor` projection does not by itself prove that the cloud runtime loaded or honored it.

The same capability may share canonical source while requiring separate realization evidence per execution context.

Cloud validation answers: does this cloud execution context receive the intended curated capability?

Evidence may be retained as reports. Cloud is not the evidence plane.

Deferred until after the first slice: exact Cloud Agents API fields, team-hook precedence, and whether any capability is Cloud-only.

---

## 13. Requirement-satisfaction semantics

Do not use one universal host state such as `SUPPORTED_AND_INSTALLED` as the Cursor conclusion. That compression on inspected `main` is migration context already bounded by the ToolSpec/remediation baseline.

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

## 14. Projection and generator authority

A generator or synchronizer may modify only explicitly owned destinations.

Cursor projection must prohibit:

- broad cleanup of `~/.cursor`;
- broad cleanup of project `.cursor`;
- directory discovery that silently expands ownership;
- overwrite of canonical sources;
- adoption of unmanaged objects;
- deleting neighboring Cursor configuration.

Generated/projected state must have explicit source-to-destination ownership.

`hhpe-registry-sync` remains additive for owned Cursor destinations. Collision remains refuse-and-record. It must not overwrite unmanaged destinations.

---

## 15. Legacy skill-pool terminal states

The current skill pool may exist during migration. Indefinite dual provenance is not an accepted end state.

Every pool-backed capability must eventually resolve to exactly one terminal category:

1. `registry-owned projection`
2. `native Cursor realization`
3. `explicitly unsupported or retired`

Do not permit permanent registry + skill-pool dual authority.

For unmanaged user objects:

- detect;
- report collision or foreign ownership;
- do not silently adopt;
- do not overwrite.

Investigation hints (not mechanism selections):

| Skill-pool name | Notes for later planning |
| --- | --- |
| Un-namespaced Trail of Bits (`c-review`, `semgrep`, …) | Alias vs `trailofbits-*`; one canonical identity |
| `session-start`, `*-guidance` | Overlay sources; pool copies may remain until retired |
| `ast-grep`, `registry-health`, `stack-router` | Present in pool, absent from Cursor exposures |
| Compound Engineering `ce-*` | Apply §6 decision contract |
| Superpowers retained / inactive | Inactive set must not be Cursor-visible |
| Caveman `caveman*` / Ponytail `ponytail*` | Apply §6 decision contract |
| `lfg`, `execution-discipline` | unmanaged unless a canonical source is identified |

---

## 16. MCP

An HHPE-facing MCP surface is optional. Current evidence does not require it: no Cursor MCP exposure exists; plugin-routing only indexes MCP metadata; user MCP is unmanaged Caveman.

If later justified, keep it narrow (capabilities, capability status, routing lookup, routing explanation). Do not make MCP the Compatibility plane or a mandatory Cursor mechanism. MCP is not in the first implementation slice.

---

## 17. Explicit non-goals

This design does not authorize:

- reverse-engineering Cursor private skill ranking
- dependence on `skills-cursor`
- pretending Cursor has Codex-native plugin semantics
- a generalized Compatibility infrastructure
- a universal provider abstraction
- a universal status enum in supply manifests
- a host registry
- a Compatibility daemon or service
- a Cursor daemon
- a universal plugin abstraction
- a provider-independent hook runtime
- appointment of Curated Market as Compatibility plane owner
- automatic projection into every Cursor scope
- claiming support from config presence alone
- mutation of unmanaged user Cursor objects
- copying `~/.cursor` into Cloud
- claiming hard enforcement for skills/rules
- treating SDK as proof-only or Cloud as evidence infrastructure
- recreating, replacing, or working around verified ToolSpec / native-plugin contracts
- T3 control-plane redesign
- OpenCode-only fork work
- implementation or a writing-plans document

---

## 18. Explicitly deferred decisions

1. Per-capability Cursor mechanism for Compound Engineering, Superpowers, Caveman, and Ponytail (decision contract is not deferred).
2. Whether `hhpe-hrg/ast-grep`, `registry-health`, and `stack-router` become Cursor capabilities.
3. Whether plugin-routing receives a `project` binding, a `user-local` binding, or two distinct bindings.
4. Exact `failClosed` setting after applying §8.
5. Exact routing-context identity (session / turn / request / operation / justified other) and storage mechanics.
6. Exact `hhpe-hrg-plugin-stack` migration path (terminal category is not deferred).
7. Exact Trail of Bits alias migration.
8. Physical ToolSpec / observation storage (already deferred; Cursor consumes the baseline).
9. Cloud Agents API / team-hook details (architecture retained; later slice).
10. Optional HHPE MCP surface.
11. Classification of T3 Cursor skill-projection code (ADR-026 open item).
12. Disposition of unmanaged `lfg` and `execution-discipline`.
13. Whether `skills-ci` Cursor host should switch from `cursor-agent` to the SDK.

---

## 19. Contrary repository evidence

- ADR-026: Compatibility physical owner unresolved; Curated Market containing adapters does not make it that plane. This spec therefore describes Cursor bindings as repository-local compatibility *policy records*, not a plane takeover.
- Inspected `main` `hosts.yaml` and `validate()` still compress host support and treat lead-host paths as current requirements. That is migration context; the remediation baseline already separates those authorities.
- `adapter.json` `retain-native-plugin-pending-probe` plus `skill_root: null` conflicts with active skill-symlink exposures.
- `final-stack.yaml` forbids exposing inactive Superpowers; the skill-pool currently does.
- Codex is the only host with native-plugin install validation; copying that to Cursor is unsupported.
- Historical Cursor report says symlink support is unproven; host-local 2026-08-21 apply created skill-symlinks, which is projection evidence, not loader-parity evidence.
- `generate-manifests.mjs` remains a destructive writer for some manifests on inspected `main`.
- Plugin-routing documentation describes the route gate as blocking; inspected `failClosed: false` contradicts a hard-enforcement reading.

None of these block this boundary. They constrain implementation claims.

---

## 20. Acceptance criteria for a later implementation

A later implementation is acceptable only if it:

1. starts from the ToolSpec / remediation baseline or equivalent
2. projects Cursor bindings deterministically from canonical sources
3. uses one scope per binding and never auto-copies across scopes
4. never overwrites unmanaged Cursor files
5. keeps user-local, project, and cloud-project scopes distinct
6. resolves legacy dual provenance to a terminal category
7. keeps static checks free of Cursor runtime and ambient `~/.cursor`
8. uses SDK fixtures only for requirement-specific observable claims
9. treats local SDK observation as distinct from cloud observation
10. uses hooks only for supported observable constraints and does not let must-hold hooks degrade silently into guidance
11. binds routing completion to the authorized context
12. never claims provider-private ranking as verified
13. validates Cloud without implicit developer-home state when that slice is executed
14. introduces no unrelated provider architecture
15. keeps existing deterministic Curated Market tests green

---

## 21. Deliverable status

This document is the hardened design specification only. It does not implement bindings, retarget skill-pool links, change unmanaged Cursor configuration, or create an implementation plan.
