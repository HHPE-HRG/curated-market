# Native-Plugin Validation Authority Boundary Design

**Status:** Proposed for written-spec review  
**Date:** 2026-08-20  
**Architectural authority:** [ADR-026: HHPE plane authority model](../../decisions/ADR-026-hhpe-plane-authority-model.md)

## Purpose

Separate repository/static validity from explicit current-host native-plugin realization validation without weakening either question.

The two logical operations are:

```text
Repository/static validation:
Are checked-in declarations, references, policies, packages, and portable configuration valid?

Explicit native-plugin host-realization validation:
Does this selected execution context currently satisfy the native-plugin realization requirements that Compatibility policy says apply?
```

Both may be true or false independently. A repository can be structurally valid while a designated host is missing a required plugin. A host can have a plugin installed while its repository declaration is malformed or unauthorized.

## Current evidence and defect

[`lib/registry.mjs`](../../../lib/registry.mjs) currently performs package, capability, exposure, policy, ToolSpec, and managed-object validation in `validate()`. While iterating exposure declarations, it also executes `codex plugin list` for every Codex `native-plugin` record and requires each target to appear installed.

[`lib/skills-ci.mjs`](../../../lib/skills-ci.mjs) implements `staticIntegrity()`, then imports every error returned by `validate()`. Therefore the nominally static path is:

```text
staticIntegrity()
  -> validate()
    -> codex plugin list
      -> ambient current-host installation state
        -> FAIL_STATIC_INTEGRITY
```

[`registry/manifests/exposures.yaml`](../../../registry/manifests/exposures.yaml) currently uses two status values: `planned` and `active`. All six Codex native-plugin exposure records are `planned`, yet current validation treats their absence as a repository-integrity failure. Three HHPE capabilities share target `00-hhpe-registry@hhpe-hrg`, so one missing plugin is emitted three times as separate errors.

The inspected host lacks the declared HHPE Codex marketplace plugins. That is valid execution evidence about this host. It is not evidence that immutable packages, capability references, or planned exposure declarations are corrupt.

The defect is not that missing plugins are reported. The defect is that the report is produced by the wrong validation context and labeled static integrity.

## Authority classification

### Supply and checked-in repository authority

Curated Market Supply owns canonical package identity, pinned revisions, package contents, capability identity, and the checked-in declaration records it actually approves. Static validation may reject malformed or inconsistent records without claiming that a host realizes them.

### Compatibility/Capability Realization

Compatibility owns exposure lifecycle meaning, the accepted Codex native-plugin discovery mechanism, which exposures apply to a selected host/context, and whether observed host state satisfies those requirements.

### Execution

Codex owns the native plugin inventory exposed by `codex plugin list`. Process availability, exit status, stdout, stderr, and listed installation state are current execution-context facts.

### Observability/Evidence

A host-realization validation result records the observation, limitations, and scoped satisfaction conclusion. Retaining such a result is optional unless another governed workflow requires evidence. The result does not become Supply truth.

### Control

Control may request repository validation or host validation and identify the selected context. It does not become authoritative for package identity, exposure policy, or observed Codex state.

## Logical validation operations

### Repository/static validation

The existing `validate()` operation becomes repository/static validation. It answers only repository-governed questions, including:

- package roots exist and match approved revisions and trees;
- upstream package checkouts are clean and licenses exist;
- capability IDs are unique and refer to known packages;
- source paths and required supporting files are safe and present;
- skill frontmatter is structurally valid;
- exposure capability references exist;
- exposure status is one of the supported reviewed values;
- native-plugin targets are well formed and structurally safe;
- exposure host, mode, target, and adapter combinations form accepted declarations;
- contradictory static exposure policy fails where existing repository rules define a contradiction;
- final-stack constraints are internally consistent;
- portable ToolSpec declarations are valid; and
- managed-object ownership records satisfy their static and safely inspectable invariants.

Repository/static validation must not invoke `codex plugin list` or otherwise require ambient plugin installation. It must remain deterministic for the same checkout and locked package inputs.

“Static” describes the absence of ambient realization inspection; it does not make realization declarations unchecked strings. Unsupported status, unknown capability, malformed or unsafe native-plugin target, invalid host/mode declaration, and statically contradictory reviewed policy remain repository/static failures.

`staticIntegrity()` consumes repository/static validation only. `FAIL_STATIC_INTEGRITY` means a static declaration, source, reference, policy, or portable configuration failure—not missing ambient host realization.

### Explicit native-plugin host-realization validation

A separate narrow operation, logically equivalent to `validateHostRealization(...)`, validates Codex native-plugin realization for an explicitly selected host/context and requirement scope.

It:

1. consumes already-valid exposure declarations;
2. selects applicable Codex `native-plugin` exposures from reviewed exposure/policy semantics and the explicit requested scope;
3. groups them by host and plugin target;
4. executes Codex's native inventory probe once per validation invocation, not once per capability;
5. preserves process availability, exit status, and relevant output or limitations;
6. records one target-level observation with all affected capability IDs;
7. evaluates that observation against active or explicitly requested pre-activation requirements; and
8. returns a scoped host-realization result independently of repository/static validity.

This operation may live beside `validate()` in `lib/registry.mjs`; no new service or Compatibility runtime is implied. Exact exported function and CLI spelling remain implementation-plan decisions, but callers must select host realization explicitly.

## Existing exposure status semantics

No new lifecycle status is introduced.

### `planned`

`planned` means:

- the exposure is an intended, structurally reviewable realization mechanism;
- repository/static validation validates its declaration;
- the record does not claim that arbitrary or generic current hosts already realize it;
- absence does not invalidate repository/static integrity;
- absence does not fail ordinary active-requirement host validation; and
- pre-activation validation may explicitly select the planned target and require it for that scoped check.

Explicit pre-activation validation does not mutate the exposure to `active`. It provides evidence to the separate activation decision.

### `active`

`active` means:

- Compatibility policy currently requires this exposure only for the explicitly selected host/provider/context to which reviewed exposure policy applies;
- explicit host-realization validation includes it by default when validating that applicable host/context;
- missing required realization fails that explicit host validation; and
- the active declaration still does not assert installation as portable Supply truth.

An installed plugin alone does not activate an exposure. Activation remains an explicit policy change governed separately from observation.

### Status applicability

Status is evaluated together with reviewed host/provider binding, mode, target, policy applicability, and explicit requested context. `active` is not a claim that every machine in existence—or every machine that happens to run host validation—must realize the exposure. Applicability must not be inferred merely because Codex is installed, because `codex` is on `PATH`, or because the validator runs on a developer workstation. A host validation invocation must identify which selected context and reviewed policy scope it is evaluating; exact context identifier representation is outside this seam and need not create a global host registry.

## Planned-target pre-activation validation

A deployment or activation workflow may need to prove a planned plugin target before policy changes it to `active`. That workflow must explicitly supply the planned target, capability IDs, or a specifically selected requirement set under review.

Conceptually:

```text
validate selected host
  requirements:
    - all applicable active native-plugin targets
    - explicitly requested planned targets for this pre-activation check
```

Missing explicitly requested planned target fails that pre-activation validation. It does not make the repository invalid, change the stored status, or imply that unselected planned targets are required.

No generic option or default equivalent to “require all planned plugins” is allowed.

## Target-level observation and evaluation

Several capabilities may be delivered by one native plugin. Host validation therefore groups by at least:

```text
selected host/context
+ native-plugin target
```

One target-level observation carries:

- selected host/context supplied by caller;
- plugin target;
- affected capability IDs;
- each affected exposure's status;
- probe command identity;
- process availability and exit status;
- bounded relevant stdout/stderr or parsed inventory facts;
- observed target state such as installed, not installed, or indeterminate;
- limitations such as missing Codex executable or unusable output.

That one observation may support N capability/policy evaluations. Each evaluation retains its capability ID, reviewed applicability, exposure status, requirement source, and requirement-specific satisfaction conclusion. Target deduplication removes redundant inventory probes and duplicate observations; it must not erase capability-specific applicability or policy.

Exact field names and serialization are implementation details. The operation must preserve enough underlying evidence to distinguish:

- plugin absent;
- Codex executable unavailable;
- inventory command failure;
- inventory output unparseable or indeterminate;
- plugin installed; and
- plugin installed but not acceptable if current policy later distinguishes enabled or version state.

Those conditions must not collapse into one generic “missing” string.

One absent `00-hhpe-registry@hhpe-hrg` target produces one observation listing `hhpe-hrg/ast-grep`, `hhpe-hrg/registry-health`, and `hhpe-hrg/stack-router`, rather than three duplicate inventory errors. Where their applicability or requirement scope differs, it still produces separate capability/policy evaluations. Distinct targets remain distinct observations.

## Host observation states

Explicit host validation preserves at least three distinct observation states:

1. **Inventory observed, target installed.** Codex inventory executed successfully and positively identified the target.
2. **Inventory observed, target absent.** Codex inventory executed successfully with usable output and did not contain the target.
3. **Inventory unavailable or indeterminate.** Codex could not execute, inventory probing failed, or output could not establish installed/absent state.

The third state is not positive evidence of absence. Raw process failure evidence—command availability, exit status, and bounded relevant stdout/stderr—must be preserved where appropriate. A required realization that cannot be established may remain unsatisfied and cause explicit host validation to fail, but its observation remains unavailable or indeterminate rather than absent.

## Missing Codex executable

If repository/static validation runs where `codex` is absent, static validation remains unaffected.

If explicit Codex host-realization validation runs where `codex` cannot execute, the result records contextual indeterminate or unavailable probe evidence. Satisfaction then depends on requested requirements:

- required active or explicitly selected planned targets cannot be proven satisfied, so the explicit host validation fails;
- unrequired planned declarations remain structurally valid and do not fail; and
- the repository is not labeled corrupt.

No installation or provisioning is attempted.

## Command and caller semantics

The following existing generic operations remain static:

- `validate()`;
- `npm run validate`;
- `hhpe-registry-validate`;
- `staticIntegrity()`;
- `npm run skills:ci:static`; and
- the static phase of generic repository tests.

Explicit host-realization validation is invoked only through a clearly selected operation or mode. Exact CLI naming is deferred, but it must require an explicit host/context and return nonzero when applicable required targets are not satisfied.

A designated deployment host or activation gate must invoke both questions when both matter:

```text
repository/static validation
AND
explicit host-realization validation for selected context
```

Success in one cannot mask failure in the other. Generic developer checkout validation invokes only the repository/static question.

Static and host-realization operations require distinguishable result and exit semantics. A host-realization failure must never surface as `FAIL_STATIC_INTEGRITY`. Exact result names and exit codes are implementation details, but callers and tests must be able to determine which authority question failed and whether both were requested.

Full host-loader or model-backed CI may include host-realization validation only when its invocation explicitly selects that context and requirement scope. It must not be inherited merely because a static helper calls `validate()`.

## Documentation semantics

Documentation must distinguish:

- **intended realization mechanism:** policy says Codex realization uses a native plugin target;
- **active realization requirement:** an `active` exposure currently requires that target for an applicable context; and
- **observed current-host realization:** an explicit probe saw the target installed, absent, or indeterminate in one context.

[`docs/host-adapters.md`](../../../docs/host-adapters.md) currently says Codex “uses” Superpowers, Compound Engineering, Ponytail, and the HHPE wrapper plugin while the corresponding exposure records remain `planned`. The implementation migration must either clarify this as intended/planned mechanism or obtain separate policy approval to activate those exposures. This design does not silently choose activation and does not modify status records.

Historical host inventory or reports remain historical evidence. They do not override current exposure status or current native inventory observations.

## Error and result semantics

Repository/static failures identify malformed or inconsistent checked-in facts.

Host-realization results identify:

- selected context;
- requirement scope;
- target-level observation;
- affected capabilities;
- limitations; and
- scoped conclusion.

Probe execution failure is not plugin absence unless native output establishes absence. An unavailable or failed probe is indeterminate execution evidence; a required realization still remains unsatisfied because satisfaction was not established.

Host validation reports its own category and exit outcome. It does not append host realization failures to the static error category. A composed command may report both result sections, but each retains its independent category, evidence, and conclusion.

Host results need not be persisted. If retained by an existing report workflow, they remain contextual evidence with observation time and invocation scope. No evidence database or universal retention policy is introduced.

## Verification requirements

A future implementation must prove repository/static behavior:

- static validation never invokes `codex plugin list` or another ambient native-plugin inventory subprocess;
- a fail-if-called or invocation-counting native-inventory probe proves `validate()` and `staticIntegrity()` make zero probe calls; a test that passes only because Codex is missing is insufficient;
- valid planned native-plugin declarations pass without installed plugins;
- malformed targets and unknown capability references still fail;
- invalid host/mode declarations and contradictory static policy still fail under reviewed repository rules;
- unsupported exposure status values fail closed;
- `staticIntegrity()` remains deterministic and ambient-plugin-independent; and
- generic developer checkout validation does not require configured deployment state.

It must prove explicit host-realization behavior:

- installed required active target passes when reviewed policy applies to the explicitly selected context;
- absent required active target fails when reviewed policy applies to the explicitly selected context;
- missing Codex executable is contextual indeterminate evidence and fails required satisfaction without corrupting repository status;
- inventory command failure and unparseable output remain distinguishable from absence;
- unrequired planned target absence does not fail ordinary host validation;
- explicitly selected planned target absence fails its pre-activation check;
- ordinary host validation does not broaden scope to all planned targets;
- one shared target produces one result containing all affected capability IDs;
- one shared target observation preserves separate capability/policy evaluations where applicability or requirements differ;
- distinct targets produce distinct results;
- one inventory probe can support grouped target evaluation without repeated identical process calls; and
- explicit host-validation command exits nonzero when required realization is unsatisfied.

It must also prove composition:

- repository validity and host realization can be reported independently;
- a valid repository plus missing required plugin yields static pass and host fail;
- an invalid repository plus installed plugin does not yield overall approval; and
- no validator installs, activates, removes, or provisions plugins.

## Migration surface

Likely implementation files are:

- `lib/registry.mjs`;
- `lib/skills-ci.mjs`;
- `tests/registry.test.mjs` or focused native-plugin validation tests;
- `bin/hhpe-registry-validate` for clarified static semantics;
- optionally one narrow explicit host-validation wrapper;
- `package.json` if an explicit repository-native command is added;
- `docs/operations.md`;
- `docs/host-adapters.md`; and
- possibly `docs/host-support-policy.md` for terminology alignment.

`registry/manifests/exposures.yaml` changes only if a separately approved policy decision changes planned/active status. Such a policy change is not part of implementing this validation boundary.

## Explicit non-goals

This design does not authorize:

- ignoring missing required plugins;
- plugin installation, activation, removal, or provisioning;
- changing planned exposures to active;
- inventing lifecycle statuses;
- a host inventory service or global host identifier;
- a Compatibility daemon or runtime;
- a generalized provider realization framework;
- redesigning all skills CI;
- ToolSpec or ToolRealizationObservation changes;
- changing canonical package or capability identity;
- persisting every host observation;
- treating host observations as Supply truth; or
- resolving unrelated stale fields in `hosts.yaml`.

## Acceptance criteria

The design is satisfied when a future implementation can demonstrate:

1. Repository/static validity is deterministic and independent of ambient Codex plugin installation.
2. Explicit native-plugin host validation preserves and evaluates current execution evidence for one selected context.
3. `planned` and `active` retain the semantics defined here without new lifecycle states.
4. An explicitly selected context fails host validation when reviewed policy makes an active plugin applicable and that plugin is absent.
5. Planned-target pre-activation checks are explicit and do not mutate policy.
6. Shared plugin targets produce one target observation with all affected capability IDs while preserving distinct capability/policy evaluations where required.
7. Missing executables, failed probes, absence, and installed state remain distinguishable.
8. Static and host results can be composed without either borrowing the other's authority.
9. Host-realization failures are distinguishable from `FAIL_STATIC_INTEGRITY` in result and exit semantics.
10. No generalized Compatibility infrastructure or host inventory is introduced.

## Deferred implementation decisions

The implementation plan may select:

- exact exported host-validation function name and return field names;
- exact explicit CLI or npm command spelling;
- whether focused tests remain in `tests/registry.test.mjs` or move to a dedicated test file;
- how bounded native inventory output is parsed while retaining raw process evidence; and
- whether an existing report location optionally retains a host result.

These choices may not make host validation implicit in static validation, change lifecycle status semantics, require universal persistence, or weaken required-plugin enforcement.
