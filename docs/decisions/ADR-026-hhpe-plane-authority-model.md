# ADR-026: HHPE plane authority model

Status: Accepted

Date: 2026-08-20

## Decision

HHPE uses five conceptual planes: **Control**, **Observability and Evidence**, **Vended/Supply**, **Compatibility/Capability Realization**, and **Execution**. These are authority boundaries, not necessarily repository or process boundaries. A repository may currently implement more than one plane, but co-location does not merge their authorities.

This document is the canonical definition of the plane model. Existing repository terminology remains authoritative for implementation details within each plane. If this document conflicts with a current implementation, the conflict is a recorded mismatch requiring a separate decision rather than permission to silently reinterpret, move, or redesign code.

## Interpretation and authorization effect

A plane identifies a coherent authority and its limits. It does not imply a repository, process, service, deployment unit, team, daemon, or other physical boundary. One component may implement responsibilities from several planes. One plane may be implemented across several components. Co-location does not merge distinct authorities, and distribution does not remove the need for deterministic authority, versioning, precedence, and decision ownership.

This ADR accepts only:

- the plane vocabulary;
- scoped authority and non-authority boundaries;
- information-flow and control-flow constraints;
- interpretation and conflict-resolution rules; and
- architectural review obligations.

This ADR does **not** authorize repository reorganization, ownership transfer, a compatibility-plane implementation, new services, new schemas or universal plan formats, new runtime gates, manifest migration, adapter movement, execution-substrate selection, or implementation sequencing. A mismatch recorded here is evidence for a later decision, not approval to fix, move, split, or redesign anything. Each later change requires its own evidence, affected authority owner, scope, design, and verification.

## Why this document lives here

No inspected repository currently owns system-wide HHPE architecture. Curated Market already contains the cross-host package, capability, exposure, adapter, runtime, and architecture decision records that meet at the least-defined boundary in this model. Placing this ADR beside those records is the smallest reversible choice.

Curated Market is the **document custodian**: it stores and publishes the current canonical record. Custody conveys no architectural parenthood and no approval, veto, implementation, sequencing, or supersession authority over another plane. Changes affecting another plane require the authority governing that concern regardless of this ADR's location. Curated Market is not the owner of T3 control policy, T2 Squared conclusions, execution-provider behavior, or the unresolved physical implementation of Compatibility/Capability Realization. A future documentation location may supersede this one only through an explicit decision that preserves stable discovery and the authority of every affected concern.

Evidence used for this decision:

- T3 checkout: `main` at `1e59b4c4004ce3c724d09ca0b140ed4523758d1e`, with uncommitted Cursor provider work; 200 commits behind fetched `origin/main`. Existing work was not changed or rebased.
- T2 Squared: clean `main` at `6fc950308a6bf79c89c24c16df4a8c7fb39ab267`, equal to `origin/main`.
- Curated Market: clean `main` at `13c47367517aaec9905741cbe46bd010ef975c6b`, equal to `origin/main` before this ADR.

The T2 Squared checkout has shallow history. Historical absence claims are therefore limited to its available checkout.

## Plane taxonomy

### Control Plane — T3

Question: **What should run, where, and under whose direction?**

**Canonical authority.** T3 owns HHPE operator interaction and accepted work intent: environments, projects, threads, turns, provider-instance selection, interaction and runtime modes, approvals, interruption, resume and recovery, and representation of active work. T3 persisted orchestration state is authoritative for HHPE-accepted and persisted control/work-domain history. It is not authoritative for facts that remain exclusively provider-native.

**Current implementation.** The inspected T3 server authenticates commands, orders and persists domain events, derives projections, dispatches side effects through reactors, and persists thread-to-provider-instance bindings. Its provider boundary implements the mechanics required for T3 to communicate with a provider: driver configuration, instance lifecycle, protocol sessions, normalized runtime events, and routing a controlled thread to its selected provider instance. `ProviderDriverKind` remains an implementation selector; `ProviderInstanceId` remains the routing identity. The environment server also supervises provider processes, terminals, Git, filesystem operations, and checkpoints, so T3 currently implements both Control authority and parts of Execution.

**Current exceptions / transitional / unresolved placement.** T3's hosted relay is a scoped access/discovery control surface, not a second owner of environment runtime state. Client caches and advertised endpoints are hints. Active local Cursor work includes provider-facing skill projection; repository presence alone does not decide whether each behavior is provider protocol mechanics, capability realization, or a mixed boundary requiring a later decision.

**Authorized now.** Existing T3 control, persisted orchestration, provider protocol, routing, and supervised execution responsibilities remain where they are. Reviews must distinguish these scoped authorities and preserve provider-native provenance when events are normalized.

**Not authorized.** This ADR does not transfer provider-native authority into T3, relocate T3 code, redesign provider adapters, assign T3 general semantic capability policy, or make T3 the Compatibility/Capability Realization owner. T3 is not authoritative for canonical upstream revisions, package provenance, evaluation methodology, or long-term observational conclusions.

### Observability and Evidence Plane — T2 Squared

Question: **What happened, why, and how well did it work?**

**Canonical authority.** T2 Squared owns observation integrity, evidence schemas, trace and correlation semantics, evaluation methods, measurements, and evidence-backed conclusions about behavior, tool usage, capability activation, routing outcomes, failures, retries, latency, resource use where observable, verification outcomes, provider comparisons, and regressions.

**Current implementation.** The inspected T2 Squared repository remains a T3-derived application. It implements inherited server control/execution machinery, server logs, completed-span NDJSON, optional OTLP export, provider-stream records, deterministic tests, and narrow evidence/governance gates. Runtime receipts are test-only and are not production authority. No standalone general evaluation service was found.

**Current exceptions / transitional / unresolved placement.** T2 Squared's inherited T3 control/execution machinery retains the authority of those implemented concerns; repository identity does not reclassify it as observability authority. The general evaluation scope described above is partly a target authority boundary, not a claim that every function or service already exists. Current governance evidence also trails inspected HEAD as recorded below.

**Authorized now.** Existing observation and evidence artifacts may measure, compare, and recommend with provenance. T2 Squared may establish evidence that provider-native and T3-recorded state diverged.

**Not authorized.** Observation does not silently rewrite provider-native state, T3 persisted history, control policy, capability policy, supplied source, or execution semantics. T2 Squared may propose a change or execute one only through an explicit governed contract granted by the owner of the affected policy. This ADR does not refactor inherited T3 machinery or create a standalone evaluation service.

### Vended/Supply Plane — Curated Market

Question: **What do we trust and make available?**

**Canonical authority.** Curated Market owns canonical upstream identity and revision, complete package contents, provenance, integrity, claimed capability inventory, portable dependency declarations, approved versions, and supply lifecycle records. Upstream packages remain complete and commit-addressed. HHPE-authored material remains distinguishable. Generated or machine-local state does not become portable supply truth.

**Current implementation.** The inspected Curated Market repository implements immutable package locks and preservation policy together with capability catalogs, adapters, overlays, exposure and routing policy, tool records, host checks, parity reports, generated projections, update, and rollback mechanisms. Some of those latter responsibilities implement Compatibility/Capability Realization behavior rather than Supply authority.

**Current exceptions / transitional / unresolved placement.** Current co-location is an implementation fact, not evidence that Curated Market owns Compatibility/Capability Realization. Several manifests mix portable supply facts, policy, host realization, and machine observations. The mismatch inventory preserves those facts without deciding a physical split or destination.

**Authorized now.** Curated Market continues to govern approved source identity, revision, provenance, integrity, and package preservation. Existing realization behavior remains in place until a separate decision changes it.

**Not authorized.** Supply authority does not establish that a capability is installed, active, compatible, correctly routed, or behaviorally equivalent on a given host. This ADR does not make Curated Market the architectural parent, Compatibility/Capability Realization owner, or authority for provider-specific rules, hooks, invocation syntax, absolute executable paths, machine provisioning state, or runtime selection. It authorizes no manifest or repository restructuring.

### Compatibility/Capability Realization Plane

Question: **What ability is required, and how is it made to work in this selected environment?**

**Canonical authority.** Compatibility/Capability Realization owns the coherent rules by which trusted capability identities and portable requirements become usable in a selected environment. Its concerns include semantic capability contracts, dependency resolution, provider/host realizers, invocation binding, skills/rules/hooks projection, MCP wrapping and provisioning, required host binaries, PATH and runtime preparation, capability composition and conflicts, semantic routing outside T3's session control, enforcement obligations, and scoped parity or compatibility claims.

**Current implementation.** Compatibility behavior is distributed. Curated Market currently contains adapters, overlays, exposures, invocation transports, routing policy, tool checks, and parity evidence. T3 provider boundaries may contain provider-facing mechanics that participate in realizing a capability. Providers, host configuration, workers, MCP services, and executables may supply other mechanisms. Existing accepted records remain authoritative only for their scoped concerns.

**Current exceptions / transitional / unresolved placement.** No inspected evidence appoints one repository, service, runtime, team, database, or physical source as this plane's implementation owner. Its physical/runtime home and governance mechanism remain unresolved. A distributed implementation is acceptable only if authority, versioning, precedence, conflict resolution, and decision ownership remain deterministic. That requirement means one coherent authority model, not one file or component.

**Authorized now.** Reviews may classify demonstrated compatibility concerns, preserve their provenance, require scoped validation evidence, and prevent a realization mechanism from redefining supplied identity. A realization may bind one canonical requirement to provider-specific mechanisms. For example, `caveman/output-compression = full` may require different plugin, hook, skill, or persistent-rule mechanisms on Claude, Codex, and Cursor. AST-aware structural refactoring may require both instructions and an executable exposed through a verified environment.

**Not authorized.** This ADR appoints no physical owner and creates no universal Agent ABI, realization plan format, compatibility service, runtime compiler, blocking gate, schema, repository, or migration program. Curated Market containing realization artifacts does not make Curated Market this plane. T3 implementing provider-facing mechanics does not make T3 this plane. Provider-native differences must remain explicit, and parity may not be claimed where behavior cannot be reproduced and verified.

### Execution Plane

Question: **Perform the requested work using the realized environment.**

**Canonical authority.** Execution performs requested work through federated executors. Each executor is authoritative for its native operation and state within its scope. Provider runtimes are authoritative for provider-native execution facts and hidden/native state. T3 is authoritative for HHPE orchestration and the execution substrate it actually supervises. MCP services, host executables, terminals, Git/filesystem/checkpoint machinery, and later execution substrates retain their appropriately scoped native authority.

**Current implementation.** Execution currently includes combinations of Cursor, Codex, Claude, Grok, OpenCode, and other provider runtimes; T3-supervised subprocesses, terminals, Git, filesystem, and checkpoints; MCP servers; CLIs; compilers; browsers; AST Grep and other host tools; and worker/runtime projections described by Curated Market. No single executor covers every path.

**Current exceptions / transitional / unresolved placement.** Workroom versus Stoneforge ownership remains unresolved. Other execution paths may exist outside T3 supervision. The exact boundary between a compatibility mechanism and the executor that applies it depends on the concrete capability and native runtime contract.

**Authorized now.** Existing executors retain their scoped authority. Provider-native facts remain provider-native; T3 records what HHPE accepted and persisted; execution evidence may be correlated without erasing either provenance. Native differences remain explicit rather than reducing providers to a least-capable common denominator.

**Not authorized.** This ADR creates no universal execution owner, repository, service, runtime, scheduler, substrate, or abstraction. It does not select Workroom, Stoneforge, or a later substrate; move execution machinery; require every execution path to pass through T3; or give Compatibility authority over work results or hidden provider state.

## Authority table

| Concern | Authority | Legitimate participants |
| --- | --- | --- |
| User and session control | T3 / Control | Clients submit intent; environment server accepts, orders, and persists it |
| Provider session lifecycle and thread binding | T3 / Control | Provider adapter performs native protocol operations |
| HHPE-accepted and persisted control/work-domain history | T3 environment event log | Projections are derived; normalization records provider input without taking ownership of exclusively provider-native facts |
| Provider-native facts and hidden/native state | Applicable provider runtime | T3 may record normalized observations; T2 Squared may establish evidence of divergence |
| Client connection lifetime and retry | T3 client connection runtime | Server authenticates each connection |
| Canonical upstream revision and package provenance | Curated Market / Supply | Compatibility consumes immutable identity and hashes |
| Canonical supplied capability identity and claims | Curated Market / Supply | Compatibility derives a semantic contract without rewriting source claims |
| Capability semantic contract | Compatibility/Realization | Supply provides source facts; Control requests requirements; T2 provides evidence |
| Provider/host realization rules and invocation binding | Compatibility/Realization authority; physical owner unresolved | Curated Market, T3 adapters, providers, hosts, workers, or MCP services may implement scoped mechanics |
| Capability dependency provisioning and environment preparation | Compatibility/Realization | Supply pins portable coordinates; Execution supplies actual runtime |
| Cross-provider enforcement and parity claims | Compatibility/Realization | T2 may measure outcomes; providers expose native limits |
| Runtime execution | Applicable federated executor | T3 supervises only execution substrate within its control; compatibility supplies requirements and mechanisms where implemented |
| Trace and evidence collection semantics | T2 Squared / Observability and Evidence | All planes emit governed events or artifacts |
| Evaluation method and conclusions | T2 Squared / Observability and Evidence | Affected policy owner decides resulting change |
| Control-policy change based on evidence | T3 / Control | T2 supplies evidence; Compatibility may be consulted |
| Capability-policy change based on evidence | Compatibility/Realization | T2 supplies evidence; Supply changes only when trusted source or approval changes |
| Package approval or revision change | Curated Market / Supply | Compatibility validates realizability before activation |
| Machine-local installation and health status | Compatibility/Realization generated state | Execution provides probe results; Supply must not record it as portable truth |

## Cross-plane contracts

Each boundary names both producer and consumer. Consumers may reject invalid input but do not acquire producer authority. These are contract obligations; they do not assert that one universal schema, plan object, service, compiler, or gate currently implements them.

1. **Control request:** T3 produces task/session intent, selected provider instance, and required capabilities where that vocabulary is implemented. Compatibility mechanisms consume requirements; they do not take over thread or approval policy.
2. **Supply contract:** Curated Market produces canonical IDs, immutable revisions and hashes, complete source, provenance, portable dependency declarations, and approved eligibility. Compatibility consumes these facts; it may not rewrite them in place.
3. **Realization contract:** Whatever mechanism realizes a capability must preserve capability identity, declare applicable mechanisms and resolved requirements, expose conflicts and native limitations, identify the policy/version it follows, and retain validation evidence appropriate to its claim. Current artifacts satisfy parts of these obligations. This ADR does not define or require one realization-plan format or pre-execution gate.
4. **Execution events:** T3 and execution runtimes produce correlated events and artifacts. Normalized and persisted provider events establish what HHPE recorded in its control/work history. They do not transfer authority over provider-native facts or hidden state that remain exclusively known to the provider.
5. **Evidence contract:** T2 Squared consumes observations and produces measurements, conclusions, confidence, and recommendations with provenance. Policy owners accept, reject, or govern changes explicitly.
6. **Activation/update contract:** Supply revision approval and realization compatibility are separate gates joined by immutable IDs/hashes. Neither a new pin nor a passing host probe alone activates a capability.
7. **Worker/distribution contract:** supplied package hashes and portable requirements are inputs; read-only mounts or verified bundles, active-set projection, runtime health, and writable state separation are current realization obligations where the worker contract applies.

Absolute host paths, installed/present flags, transient health, provider hidden state, and observations do not flow backward into portable supply truth. T2 Squared may establish evidence that provider-native and T3-persisted accounts diverge; observation does not silently rewrite either account. Evaluation conclusions do not flow directly into control or capability policy without an explicit owner action.

## Information and authority flow

```text
User
  | work intent
  v
T3 Control
  | required capabilities + selected execution context
  v
Compatibility/Capability Realization <--- trusted IDs, revisions, provenance --- Curated Market Supply
  | realized requirements through applicable mechanisms
  v
Execution (T3-supervised processes and provider-native runtimes)
  | correlated events and artifacts
  v
T2 Squared Observability and Evidence
  | recommendations, never implicit mutation
  +------------------> T3 control-policy owner
  +------------------> governing Compatibility authority
                         (physical owner unresolved)
```

Information may cross more freely than authority. Presence of a package does not authorize it to alter T3 policy. Provider selection does not make T3 owner of capability source or provider-native facts. Normalization records what HHPE accepted; it does not supersede hidden/native provider state. Observation does not make T2 Squared owner of observed behavior. A realization may enforce a contract but may not redefine supplied provenance.

## Precedence for conflicting information

Precedence is scoped by concern, not global:

1. The authoritative plane's normative contract or approved policy controls its concern.
2. Immutable identity, revision, and provenance records control supply facts.
3. Persisted T3 domain events control statements about HHPE-accepted and persisted control/work history; projections and UI state are derived.
4. Provider-native state controls exclusively provider-native facts and hidden/native state. A persisted T3 representation controls what HHPE recorded, not facts the provider never exposed.
5. The applicable governed compatibility policy and scoped validation evidence control claimed compatibility for a specific capability/host/provider/version/mechanism tuple. No universal physical policy source or plan format is implied.
6. Runtime observation controls evidence about what occurred and may expose divergence, but not what either state or policy should silently become.
7. Generated reports, caches, discovery output, host paths, and status snapshots describe their recorded time and environment only.
8. Plans, examples, fixtures, and historical reports are non-authoritative unless an authoritative contract explicitly adopts them.

When two planes disagree, the disagreement is preserved with provenance and referred to the owner of the disputed concern. It is not resolved by whichever artifact is newest or most convenient.

## Current responsibility mismatches

These are observations, not migrations authorized by this ADR.

| Current state | Target authority | Migration status |
| --- | --- | --- |
| Curated Market contains immutable package locks and source policy alongside host adapters, overlays, exposures, invocation transports, routing, and parity checks. | Supply and Compatibility require distinct authority semantics even while implementation is co-located. | Documented only. No destination or physical separation is selected. |
| `capabilities.yaml` combines supplied identity/source/dependencies with activation, owner, executable availability, and host behavior. | Consumers must distinguish portable supply facts from realization policy and observations. | Documented only. Representation remains undecided. |
| `exposures.yaml` carries host bindings plus lifecycle, identity, and runtime policy also represented in `final-stack.yaml`. | Exposure records consume canonical policy and IDs; they do not redefine them. | Documented only. |
| `final-stack.yaml` combines eligibility/precedence with host routing and fixture validation. | Compatibility owns routing realization; fixture PASS means policy projection consistency, not proof of every host's native ranking. | Documented only. |
| `tools.yaml` checks in Linux absolute paths, platform, health, and `present` state although this inspected macOS host has no `ast-grep` on PATH. | Portable tool specification and host realization observations require distinct authority semantics. | Smallest evidence-backed future seam; no manifest rewrite or representation selected. |
| AST Grep runtime and guidance are nominally separate, but the runtime points back to the guidance skill capability ID. | Runtime identity, guidance identity, and their dependency relation need unambiguous authority semantics. | Documented only. No identity migration authorized. |
| Context7 and Playwright external npm runtimes are represented through the mutable `hhpe-overlays` package while host-generated artifacts sit beside supplied identity. | External runtime coordinates, HHPE guidance, and generated host realization need distinguishable provenance and lifecycle semantics. | Documented only. No layout selected. |
| Codex adapter declares one general mode while actual capabilities use both native plugins and namespaced links. | Realization claims must identify the mechanism actually used per capability. | Documented only. Adapter shape remains unchanged. |
| Workroom versus Stoneforge execution-substrate ownership remains unresolved in ADR-010 and the HHPE adapter. | Separate owner decision; no plane taxonomy may guess it. | Explicitly unresolved. |
| T3 contains provider protocol adapters and active local Cursor skill-projection work. | Provider protocol authority and Compatibility authority remain distinct even where one implementation participates in both. | Existing changes untouched; classification and implementation ownership require a later evidence-backed decision. |
| T2 Squared currently contains a full T3-derived control/execution implementation plus observability and focused gates. | T2 Squared's intended system role is evidence authority; repository decomposition is a separate decision. | No refactor. Current runtime authority remains truthful. |
| T2 governance manifests claim closed campaigns but genesis/epoch evidence references an older commit than inspected HEAD. | Attestation claims name the exact evidenced revision. | Record gap; do not claim current HEAD is host-attested. |

## Smallest evidence-backed future seam: portable tools and host observations

`registry/manifests/tools.yaml` is the smallest demonstrated candidate for future Compatibility/Supply separation because one checked-in record currently combines facts with different authorities and lifecycles.

Portable tool specification authority includes:

- tool identity;
- approved version;
- source coordinate;
- command identity; and
- integrity or provenance where applicable.

Machine realization evidence includes:

- platform;
- absolute path;
- installed or present state;
- health or probe result;
- observation time and freshness; and
- host identity where required.

This distinction is demonstrated rather than hypothetical: the current record contains Linux absolute paths and `present` assertions, while the inspected macOS host does not expose `ast-grep` on `PATH`; the worker contract also prohibits host absolute paths in its projection while using the tool manifest for version checks. Portable approval changes through source/version review. Machine realization changes through installation, environment, host, and probe lifecycle. Treating them as distinct authority semantics improves provenance, portability, freshness, and testability without requiring a new plane.

This ADR does not choose two files, an overlay, a generated manifest, a database, a service, a schema, or a runtime owner. Before implementation, a separate decision must:

1. identify the governing authority for portable tool specifications and for realization-evidence semantics;
2. choose representation and lifecycle without assuming repository separation;
3. define stable identity and revision/hash linkage between specification and observation;
4. define host identity, generation, freshness, invalidation, and failure semantics;
5. enumerate current consumers and define backward-compatible migration; and
6. update and verify validation and worker contracts before changing canonical records.

## Isolation rationale

The boundaries exist only where they improve authority clarity, enforceability, provenance, independent lifecycle, replaceability, testability, or scope containment:

- T3 can replace or add a provider without rewriting canonical packages.
- A capability revision can change without redesigning session control.
- Cursor compatibility can change without modifying upstream Caveman.
- T2 Squared can measure failure without silently changing execution semantics.
- Supply review can verify exact source and provenance without trusting machine-local activation state.
- A governed realization mechanism can report or enforce an unmet requirement within its established scope without becoming owner of user intent.

No subdivision is justified when it improves none of these properties. Conversely, distinct authorities do not merge merely because implementations share a repository. Physical separation is optional and requires its own evidence that it improves one of these properties; this ADR neither prefers nor sequences it.

## Consequences

- New architecture work must name the authoritative concern, its current implementation location, and any cross-plane contract it changes.
- Provider protocol support in T3 and capability realization must be distinguished in reviews even if code is temporarily adjacent.
- Curated Market's custody of this ADR must not be presented as architectural parent authority. Its reports and machine state must not be presented as immutable supply truth.
- T2 Squared recommendations require an explicit policy-owner action before behavior changes.
- Parity claims are scoped to tested capability, provider/host, versions, mechanism, and evidence. Unknown or irreducible differences remain explicit.
- Existing ADRs remain valid within their concern. This ADR clarifies ownership and does not silently resolve ADR-010's runtime-substrate question.

## Non-goals

This decision does not reorganize repositories, rewrite T3 provider architecture, build a compatibility runtime, invent a universal Agent ABI or plan format, create a service, schema, compiler, or runtime gate, implement T2 Squared evaluation logic, move adapters, migrate manifests, select an execution substrate, alter vendored packages, change existing activation state, transfer ownership, or establish implementation sequencing. Implementation follows only after a separate decision identifies a concrete need, affected authority, scope, representation, migration, and verification path.
