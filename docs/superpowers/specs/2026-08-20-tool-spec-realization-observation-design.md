# Tool Specification and Realization Observation Design

Date: 2026-08-20

Status: Approved logical design direction; physical representation unresolved

## Purpose

Define the minimum logical contract boundary needed to distinguish portable, approved tool requirements from evidence about realization in a particular execution context. This design applies [ADR-026](../../decisions/ADR-026-hhpe-plane-authority-model.md) to the mixed authority and lifecycle currently represented in [`registry/manifests/tools.yaml`](../../../registry/manifests/tools.yaml).

The design establishes two linked logical record types:

- **ToolSpec** describes approved portable identity and requirements.
- **ToolRealizationObservation** describes evidence produced while attempting to realize a ToolSpec in an identified execution context.

These are logical contracts. This design does not choose file layout, serialization, schema technology, hash algorithm, host identifier, storage system, service boundary, repository boundary, or runtime owner.

## Current evidence and problem

The current tool manifest contains four runtime entries: AST Grep, Serena, Context7, and Playwright. Each combines approved version and source-coordinate facts with Linux paths, `linux-x64`, environment preparation, and `status: present`. All absolute paths refer to `/home/hold3n`, while the inspected macOS host exposes none of the four commands on `PATH`.

Current consumers interpret the same fields differently:

- [`lib/registry.mjs`](../../../lib/registry.mjs) treats every declared binary path and version as a current validation requirement and uses existing source paths as an allowlist for managed symlink targets.
- [`lib/capability-checks.mjs`](../../../lib/capability-checks.mjs) chooses the first existing path for version checks, then uses hard-coded Linux paths for deeper Serena, Context7, and Playwright checks.
- [`tests/capability-expansion.test.mjs`](../../../tests/capability-expansion.test.mjs) treats first binary paths as current runtime facts.
- [`registry/adapters/hhpe-hrg/worker-contract.json`](../../../registry/adapters/hhpe-hrg/worker-contract.json) requires workers to match tool versions while prohibiting host absolute paths.
- Tracked capability-check reports retain timestamped runtime evidence, but do not identify a host or ToolSpec revision.

The producer lifecycle is also inconsistent. [`scripts/generate-manifests.mjs`](../../../scripts/generate-manifests.mjs) overwrites `tools.yaml` with only AST Grep and hard-coded Linux state. Serena, Context7, Playwright, and the root generation time were added directly to the checked-in manifest later. Running the current generator cannot reproduce the current manifest and would erase three registered tools.

These facts demonstrate a logical authority boundary. They do not determine its physical representation.

## Design principles

1. **Authority precedes location.** Repository, file, process, and storage location do not determine authority.
2. **Portable requirements and host observations have different lifecycles.** Approval changes through review; realization changes through host, environment, installation, and runtime events.
3. **Preserve facts instead of compressing them into one status.** Presence, version compatibility, and readiness are related but orthogonal.
4. **Every compatibility conclusion is contextual.** It applies to one ToolSpec requirement and one execution context using identified evidence.
5. **Historical evidence remains historical.** Newer evidence may supersede a prior conclusion for a context without deleting or rewriting the prior observation.
6. **Tool-specific readiness is expected.** Common identity and observation linkage do not require one universal functional probe.
7. **Physical implementation remains replaceable.** One artifact, multiple artifacts, existing reports, or runtime-emitted observations may implement the same logical contracts.
8. **No speculative runtime is required.** The contracts may be implemented by existing validators, workers, probes, and report mechanisms.

## Terminology

### Specification

An approved, portable statement of tool identity and requirements. Specification answers what HHPE accepts or requires, not what one machine currently has.

### Policy

Rules for discovering, provisioning, preparing, probing, and interpreting a realization. Policy determines what evidence is sufficient for a requested capability in a context.

### Observation

Facts produced by an execution context during discovery or probing: paths, platform, version output, process result, service response, and dependency state.

### Evidence

An observation retained with provenance, time, context, probe identity, and limitations so another decision can audit what was observed.

### Derived state

A conclusion computed from a ToolSpec, applicable policy, and one or more observations. Examples include “version requirement satisfied for this host” or “browser acceptance currently blocked.” Derived state is reproducible only while its inputs and interpretation policy remain identifiable.

None of these categories is interchangeable with generic “tool metadata.”

## Authority model

| Authority | Owns | Does not own by implication |
| --- | --- | --- |
| External tool, package, or service | Facts intrinsic to published artifacts and native services: package versions, package contents, command behavior, service responses, browser/daemon behavior | HHPE approval, host installation claims, HHPE compatibility conclusions |
| Vended/Supply | HHPE approval of stable tool identity, external coordinate/version, and provenance or integrity claims actually recorded | Machine presence, resolved paths, runtime health, unrecorded upstream-source guarantees |
| Compatibility/Capability Realization | Acceptable discovery, provisioning, environment preparation, version compatibility, readiness criteria, and interpretation of whether evidence satisfies a requested capability | Native runtime facts, historical evidence authorship, control/session ownership |
| Execution | Actual platform, path resolution, executable target, native version output, process behavior, dependency state, and probe result | Approved identity/version policy or retained-evidence semantics |
| Observability/Evidence | Observation provenance, time, limitations, retained evidence semantics, and historical interpretation inputs | Compatibility policy changes or execution-state mutation |
| Control | Capability request and selected execution context where implemented | Tool identity, realization truth, compatibility policy, or evidence authority |

Facts remain externally authoritative when appropriate. Recording `npm:@playwright/cli@0.1.17` does not make HHPE authoritative for npm package contents or Playwright-native behavior. HHPE Supply is authoritative only for its approval and the provenance or integrity strength it actually records.

## Logical contract: ToolSpec

ToolSpec represents portable approved identity and requirements. At logical level it must be capable of expressing:

- stable HHPE tool identity;
- applicable capability linkage;
- approved external source coordinate;
- approved version or version requirement;
- provenance or integrity claims where available;
- command identities and aliases;
- Compatibility-defined discovery requirements;
- Compatibility-defined provisioning and removal policy where applicable;
- Compatibility-defined version and readiness probe policy; and
- platform constraints only when they are requirements rather than observations.

### ToolSpec semantics

- Stable identity distinguishes the HHPE record from executable names and external package names.
- Capability linkage states which capability requirement consumes the tool. It does not make a guidance skill the runtime's external identity.
- Approved coordinate/version records an HHPE decision about an external artifact. It does not imply complete vendoring.
- Command identities describe portable names or roles. They do not contain one host's resolved path.
- Discovery policy describes acceptable resolution behavior, such as aliases or expected executable names. It does not assert that resolution succeeded.
- Provisioning/removal policy is included only when HHPE governs that mechanism. A documentation hint and an enforceable provisioning rule must remain distinguishable.
- Probe policy identifies what evidence may establish version compatibility or readiness. Probe results belong to observations.
- Platform constraints belong in ToolSpec only when the tool or approved realization is intentionally limited. “Observed on Linux” is not a platform constraint.

### Provenance strengths

ToolSpec must allow truthful provenance strengths rather than treating all tools as completely vendored:

1. **Complete pinned source.** Example: Serena has a complete commit-addressed upstream checkout and tree identity, plus a separately installed runtime.
2. **Approved external package coordinate.** Example: Context7 and Playwright currently record npm coordinates and versions without complete package trees in Curated Market.
3. **Approved external package plus local realization relationship.** Example: AST Grep records an npm coordinate and HHPE-managed symlinks to a preexisting NVM installation.
4. **External service dependency.** Example: Context7 readiness also depends on service, network, and possibly authentication outside local package provenance.

An implementation must not upgrade a weak claim into a stronger one. An approved external coordinate is not immutable-source provenance unless integrity or preserved content is actually recorded.

## Logical contract: ToolRealizationObservation

ToolRealizationObservation represents evidence about attempting to satisfy a ToolSpec in a particular execution context. At logical level it must be capable of expressing:

- tool identity;
- applicable ToolSpec revision or fingerprint;
- host or execution-context identity;
- platform;
- resolved executable and path information;
- alias and underlying-target information when materially relevant;
- observed version;
- presence and discovery outcome;
- readiness and health outcome;
- probe identity and result;
- observation time;
- limitation or failure classification; and
- evidence reference where retained.

### Logical identity relationship

Every reusable realization observation is interpreted through approximately:

```text
tool identity
+ applicable specification revision
+ host or execution-context identity
+ observation identity and time
```

This design does not select exact field names, fingerprint algorithm, host identifier, observation identifier, or serialization. A future physical design must make these relationships deterministic.

### Observation semantics

- An observation states what one execution context observed. It does not mutate ToolSpec.
- A resolved path is meaningful only within its execution context.
- Alias and target provenance matter when several commands refer to one installation or when HHPE owns a symlink but not its target installation.
- Version output is a native execution fact. Compatibility determines whether it satisfies ToolSpec.
- A readiness result identifies its probe. “Version check passed” and “functional browser workflow passed” are different evidence.
- Limitations preserve why a probe was incomplete, including network, credentials, optional dependencies, project context, browser binaries, or daemon availability.
- Retained evidence may live apart from the observation envelope if the relationship remains auditable.

## State and conclusion semantics

The design must preserve underlying facts instead of requiring one universal status enum. Presence, version compatibility, and readiness may be independent dimensions.

It must support conclusions equivalent to:

- **Unknown:** no sufficient observation exists for the applicable ToolSpec and context.
- **Absent:** discovery completed successfully and found no acceptable executable or realization.
- **Present but insufficiently verified:** a candidate exists, but required version or readiness evidence is missing.
- **Compatible / requirement satisfied:** applicable ToolSpec requirements and required readiness policy are satisfied for the context.
- **Incompatible or unhealthy:** a candidate exists, but version, native behavior, dependency, or required readiness check fails.
- **Blocked / indeterminate:** a probe cannot determine satisfaction because required external conditions or probe infrastructure are unavailable.

Required distinctions:

- Probe failure is not absence.
- Executable presence is not compatible version.
- Compatible version is not functional readiness.
- Historical readiness is not current readiness.
- Readiness on one host is not readiness on another.
- Optional dependency absence may limit a capability without invalidating local CLI installation.
- External-service failure may block functional readiness without changing local binary presence.

A physical implementation may represent these as separate facts, outcomes, or derived conclusions. It must not collapse them in a way that destroys source evidence.

## Freshness, invalidation, and supersession

ToolRealizationObservation is historical evidence as soon as it is produced. Its sufficiency for a later consequential operation is a Compatibility decision based on ToolSpec, requested capability, probe type, execution context, retained evidence, and known invalidators.

No universal time-to-live is defined. A future policy may require re-probing for a particular tool, operation, or risk level without imposing one TTL on every observation.

Potential invalidators include:

- ToolSpec revision change;
- approved version or requirement change;
- host or execution-context change;
- platform change;
- PATH or environment mutation;
- executable, binary, alias, or symlink-target mutation;
- package-manager mutation;
- runtime evidence contradicting a stored observation;
- project context changes where applicable;
- authentication, network, or external service changes where applicable; and
- browser, daemon, language-server, or other runtime-dependency changes where applicable.

A changed ToolSpec invalidates compatibility conclusions derived solely from an older specification. It does not erase the older observation as historical evidence.

Newer runtime verification may supersede an older conclusion for the same requirement and context. It must preserve provenance of both observations where historical evidence is retained. “Latest” alone does not mean “currently sufficient”; the applicable policy decides whether evidence remains reusable.

## Tool-class validation

The common contracts must support tool-specific probe policy rather than one flat readiness model.

### AST Grep

Required coverage:

- local executable discovery;
- `ast-grep` and `sg` aliases;
- symlink ownership and underlying NVM target provenance;
- approved npm version;
- deterministic local structural-search and rewrite fixture; and
- rollback distinction between HHPE-owned links and externally installed runtime.

AST Grep demonstrates that alias/path provenance can be material and that a functional local probe may be deterministic without network state.

### Serena

Required coverage:

- complete pinned upstream source provenance;
- separately installed `serena-agent` runtime and version;
- executable discovery;
- project activation;
- language/toolchain dependencies;
- disposable project health probe; and
- project-context limitations.

Serena demonstrates that host-level presence can be insufficient without project-level readiness and that source revision and installed runtime version are related but distinct facts.

### Context7

Required coverage:

- local CLI identity and version;
- executable discovery;
- external network service availability;
- optional authentication;
- bounded documentation lookup evidence; and
- distinction between local installation, external service readiness, and blocked/limited state.

Context7 demonstrates that external service readiness cannot be inferred from local CLI presence.

### Playwright

Required coverage:

- local CLI identity and version;
- host-generated skill material;
- browser/runtime dependencies;
- daemon readiness;
- project or browser-context preparation;
- bounded browser execution where available; and
- richer acceptance evidence such as traces or screenshots when required.

Playwright demonstrates layered realization: CLI presence, generated material, browser dependencies, daemon readiness, and functional browser acceptance are distinct facts.

## Worker contract

Workers consume portable requirements, not lead-host realization state.

Each worker must:

1. identify the applicable ToolSpec or equivalent portable requirement;
2. independently discover or provision an acceptable realization within governed policy;
3. produce its own ToolRealizationObservation for its execution context;
4. evaluate or submit evidence for evaluation against the same ToolSpec; and
5. avoid inheriting lead-host absolute paths as portable truth.

Two workers may satisfy the same ToolSpec through different valid paths. Matching paths are neither required nor sufficient. Matching the applicable approved requirement and readiness criteria is what matters.

The existing worker contract's combination of “tool versions match tools.yaml” and `host_absolute_paths_allowed: false` is an acceptance case for this design. A future implementation must preserve version agreement while eliminating reliance on lead-host path state.

## Evidence governance and location

Evidence semantics and evidence location are separate concerns.

The logical workflow distinguishes:

1. **Evidence semantics authority:** defines required provenance, time, context, limitation, and result meaning. Under ADR-026 this is Observability/Evidence authority.
2. **Probe executor:** runs discovery or readiness checks and produces native facts. This may be Curated Market tooling, a worker, T3-supervised execution, an MCP service, a provider, or another executor.
3. **Observation store:** retains the observation or referenced evidence. Current Curated Market reports may fulfill this role without making Curated Market the system-wide Observability authority.
4. **Compatibility evaluator:** determines whether observations satisfy ToolSpec and the requested capability requirement.

These roles may be implemented by different components. This design neither requires nor prohibits co-location and does not authorize repository movement.

## Viable physical representations

Any later physical design must preserve logical contracts and invariants. Viable forms include:

- one physical artifact with typed ToolSpec and ToolRealizationObservation records;
- canonical ToolSpec records plus generated realization observations;
- ToolSpec records plus existing report/evidence mechanisms;
- worker- or runtime-emitted observations joined to ToolSpec during evaluation; or
- another representation proven against current consumers and invariants.

No option is selected here. Physical choice requires consumer inventory, compatibility requirements, generator ownership, evidence-retention needs, and migration design.

## Invariants

1. Host-specific paths cannot become portable ToolSpec truth.
2. Machine presence cannot be asserted by Vended/Supply.
3. Every compatibility claim must identify the applicable ToolSpec or equivalent approved specification revision.
4. Every reusable realization observation must identify its execution context.
5. A changed ToolSpec invalidates compatibility conclusions derived solely from an older specification.
6. Workers may satisfy the same ToolSpec through different valid paths.
7. Probe errors cannot silently become absence.
8. Executable presence cannot silently become version compatibility or functional readiness.
9. Historical observations remain historical evidence after supersession.
10. External service readiness cannot be inferred solely from local CLI presence.
11. Generated state cannot silently overwrite approved specification authority.
12. Regeneration of canonical specification must be reproducible before generation is allowed to become authoritative.
13. A weak provenance claim cannot be presented as complete immutable-source provenance.
14. Physical co-location cannot merge Supply, Compatibility, Execution, and Evidence authority.
15. Tool-specific readiness policy cannot be replaced by a universal flat status that loses evidence.

## Current generator defect

The current generator cannot reproduce checked-in `tools.yaml` and would erase Serena, Context7, and Playwright. This is a real lifecycle defect, but it is separate from the logical authority design.

Any later implementation must establish reproducible ownership of canonical ToolSpec data before changing generator behavior. It must determine which inputs are approved source, which producer may write them, how regeneration preserves all registered tools, and how generated observations remain unable to overwrite specification authority.

This design does not fix or authorize fixing the generator.

## Likely future implementation and migration surface

If a later decision approves implementation, investigation must cover at least:

- `registry/manifests/tools.yaml` current mixed record and all external readers;
- `scripts/generate-manifests.mjs` destructive, incomplete writer;
- `lib/registry.mjs` validation, status, and managed-symlink target allowlist;
- `lib/capability-checks.mjs` generic version selection and hard-coded functional probes;
- `tests/registry.test.mjs` validation and ambient-PATH AST Grep fixture;
- `tests/capability-expansion.test.mjs` historical path assertions;
- `registry/adapters/hhpe-hrg/worker-contract.json` portable version and path constraints;
- `registry/manifests/migration-state.yaml` ownership of AST Grep symlinks;
- capability, dependency, exposure, and final-stack references to tool/capability identity;
- AST Grep, Serena, Context7, and Playwright ADRs and guidance;
- tracked capability-check reports and evidence retention;
- runtime-binding, container, and remote-worker documentation;
- external XLOTYL, worker, or wrapper consumers not implemented in this repository; and
- backward-compatible reading or projection if current flat-shape consumers require it.

This list identifies investigation and compatibility surface. It is not an implementation sequence.

## Future verification strategy

### Contract integrity

Verify:

- stable, unique ToolSpec identities;
- valid capability linkage;
- approved coordinate and version provenance;
- no host paths or presence observations in portable specification;
- reproducible canonical specification generation;
- no registered tool loss during regeneration; and
- deterministic linkage between observation and specification revision.

### Realization semantics

Fixtures must distinguish:

- no observation from successful absence;
- probe error from absence;
- present candidate from compatible version;
- compatible version from functional readiness;
- functional failure from blocked external dependency;
- alias from underlying target;
- one host's observation from another host's state; and
- current specification evidence from stale-specification evidence.

### Tool-specific behavior

Verify AST Grep aliases, target ownership, version, and deterministic structural fixture; Serena version, project activation, and language-tooling limitations; Context7 local version plus external-service and authentication limitations; Playwright CLI, generated skill material, browser/daemon limitations, and browser evidence where available.

### Worker portability

Verify:

- lead and worker use the same applicable ToolSpec revision;
- worker never consumes lead-host absolute paths;
- different worker path may satisfy same ToolSpec;
- wrong worker version fails compatibility;
- worker observation identifies its own execution context; and
- bundle or mount transport preserves portable tool requirements.

### Backward compatibility and safety

Verify:

- all current consumers are enumerated;
- transitional reading preserves required behavior if needed;
- managed AST Grep symlink rollback remains ownership-safe;
- historical reports remain interpretable;
- no unreviewed installer runs;
- no generator silently deletes tool specifications; and
- no generated observation overwrites approved specification.

## Acceptance criteria for a future physical design

A future physical design is acceptable only if it:

1. preserves every invariant in this specification;
2. represents current tools without forcing one flat readiness model;
3. supports multiple execution contexts concurrently;
4. makes observation freshness and invalidation evaluable without a universal TTL;
5. preserves worker portability and independent realization;
6. truthfully distinguishes complete vendoring from approved external coordinates;
7. keeps evidence semantics separate from storage location;
8. reproduces canonical ToolSpec data without destructive drift;
9. provides a compatibility path for demonstrated consumers; and
10. adds no infrastructure beyond what concrete consumer and evidence requirements justify.

## Non-goals

This design does not authorize:

- migration or modification of `tools.yaml`;
- file splitting or a new physical artifact;
- a new service, database, schema implementation, daemon, or repository;
- construction of a Compatibility runtime;
- selection of a physical Compatibility owner;
- tool installation, upgrade, or removal;
- changes to worker runtime or worker transport;
- report migration;
- a universal freshness TTL;
- a universal status enum;
- AST Grep runtime/guidance identity redesign;
- Context7 or Playwright vending changes;
- Workroom or Stoneforge selection;
- repository reorganization;
- changes to current consumers;
- generator changes; or
- an implementation plan or implementation sequence.

## Open decisions reserved for later approval

- Physical representation and storage location
- Exact field names and serialization
- Specification revision or fingerprint mechanism
- Host and execution-context identity model
- Observation identity model
- Evidence retention and redaction policy
- Tool-specific freshness requirements
- Compatibility evaluation location and governance mechanism
- Backward-compatibility duration and projection shape
- Generator input ownership and reproducibility mechanism
- External consumer migration requirements

These decisions require additional evidence or an approved implementation plan. They cannot be inferred from this logical design.
