# ToolSpec and Realization Observation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish an enforceable portable ToolSpec versus context-bound ToolRealizationObservation boundary for AST Grep, Serena, Context7, and Playwright while preserving current behavior and managed-object safety.

**Architecture:** Retain `registry/manifests/tools.yaml` as the initial checked-in ToolSpec artifact because current Curated Market consumers depend on that path. Introduce a small repository-local contract module, migrate readers before removing legacy host facts, and keep tool-specific readiness in existing capability checks. Existing capability reports remain optional evidence locations; observation construction does not require persistence.

**Tech Stack:** Node.js ES modules, Node built-ins (`assert`, `child_process`, `crypto`, `fs`, `path`, `test`), JSON-formatted registry manifests, existing `node --test` suite.

## Global Constraints

- [ADR-026](../../decisions/ADR-026-hhpe-plane-authority-model.md) remains higher-level authority. Planes are authority boundaries, not repository, service, process, or team boundaries.
- [Approved design specification](../specs/2026-08-20-tool-spec-realization-observation-design.md) remains contract authority. This plan implements it; it does not redesign it.
- Keeping `registry/manifests/tools.yaml` is an initial repository-local migration choice, not permanent architecture or a universal ToolSpec interchange location.
- Schema v2 is a Curated Market migration contract, not a system-wide protocol.
- ToolSpec contains portable approved identity and requirements. Host paths, observed presence, observed platform, health, observation time, and execution-context identity are not ToolSpec truth.
- ToolRealizationObservation records execution-produced facts for one ToolSpec revision and one execution context. It does not mutate ToolSpec.
- External facts, Supply approval, Compatibility requirements/conclusions, Execution facts, Evidence semantics, and Control requests remain separately attributable.
- Discovery, version observation, version comparison, readiness, limitations, and satisfaction conclusions remain distinguishable. Probe failure is not absence or incompatibility.
- No universal TTL, flat realization status, probe runner, evidence store, host inventory, package-manager abstraction, provider framework, compatibility daemon, Agent ABI, or physical Compatibility owner.
- An observation may remain ephemeral. Persistence is optional and occurs only through an intentionally invoked report writer.
- A reusable or persisted observation requires caller-supplied execution-context identity. Hostname never supplies durable identity.
- Lead and worker may realize one ToolSpec through different paths. Lead-host paths never become worker truth.
- Preserve or strengthen managed AST Grep ownership and rollback checks before removing `source_binary_paths`.
- Provisioning and removal commands remain non-executable policy text. Tests and verification must not run `install --skills` or another installer/remover.
- No host field may be removed before inspected consumers are migrated, receive an intentional compatibility projection, or block execution.

## Initial Physical Representation

`registry/manifests/tools.yaml` remains at its existing path to minimize consumer migration risk. After the staged reader and ownership transitions, it becomes schema v2 with stable `tool_id`, `capability_id`, `version`, and `source` plus portable provenance, command, discovery, version-policy, readiness-policy identity, and non-executable provisioning policy. This placement and shape are replaceable implementation details.

ToolSpec revision linkage uses a per-tool deterministic content fingerprint encapsulated by `toolSpecRevision()`. Initial representation is domain-separated and versioned, semantically equivalent to `hhpe-toolspec-json-v1-sha256:<digest>`. External consumers treat it as opaque unless they explicitly adopt this canonicalization contract. It is not universal object identity.

`reports/capability-checks/*.json` remain optional first evidence locations. Newly written reports may contain `tool_observation`; existing historical reports are not mass rewritten. Structured observation is source for newly modeled facts. Legacy top-level fields are derived compatibility projections, never peer truth.

## Compatibility-Surface Matrix

| Surface | Initial migration disposition | Proof task |
|---|---|---|
| Manifest path | Preserved | Tasks 1, 10 |
| Tool IDs | Preserved | Tasks 2, 10 |
| Capability IDs | Preserved unless separately authorized | Tasks 2, 10 |
| `version` / `source` | Preserved | Tasks 2, 10 |
| Manifest schema | Intentional v1 to v2 semantic break after staged/atomic reader migration | Tasks 5, 10 |
| Host-local manifest fields | Removed only after consumer, reader, generator, and ownership gates pass | Tasks 1, 4–6, 10 |
| Report top-level fields | Preserved initially as projections derived from observation plus Compatibility evaluation | Tasks 2, 7–9 |
| Nested structured observation | New; construction required for migrated checks, persistence optional | Tasks 3, 7–9 |
| CLI names/output/exit behavior | Characterized first; each change explicitly asserted | Tasks 2, 7–9 |
| Registry validation | Changes from conflated runtime presence validation to portable static validation | Tasks 2, 5, 10 |
| Runtime verification | Moves to explicit execution-context-bound checks | Tasks 3, 7–9 |
| Worker contract | Version agreement and no lead-host absolute paths preserved | Task 11 |
| Worker observation | Required for consequential satisfaction claims; durable storage not universally required | Task 11 |
| Managed objects | Safety-equivalent or stronger | Tasks 2, 6 |
| Historical reports | Remain interpretable and unmodified where retained | Tasks 2, 9, 13 |
| External integrations | Unknown until inspected; rollout remains scoped | Tasks 1, 13 |

---

### Task 1: Audit Consumers and Establish Scoped Gates

**Files:**
- Create: `reports/tool-consumer-migration.md`
- Modify: none
- Test: repository and configured external-root searches

**Interfaces:**
- Consumes: current manifest fields and repository/configuration evidence.
- Produces: `local-repository-migration: allowed|blocked` and `external-rollout: allowed|blocked|unknown`, with inspected roots and search boundaries.

- [ ] **Step 1: Capture repository consumers**

Run:

```bash
rg -n --hidden --glob '!registry/packages/**' --glob '!.git/**' \
  'tools\.yaml|binary_paths|source_binary_paths|health_check|noninteractive_path|status.?present' .
```

Expected: manifest, generator, library, tests, worker contract, wrappers, reports, and documentation. Record exact matches and command.

- [ ] **Step 2: Discover and search evidence-backed external roots**

Run:

```bash
rg -n --hidden --glob '!registry/packages/**' --glob '!.git/**' \
  'XLOTYL|worker|container|remote|mount|HHPE_HRG_HOME' registry docs reports lib scripts
env | cut -d= -f1 | rg '^(HHPE|XLOTYL|WORKER|CONTAINER|REGISTRY)'
for root in /Users/maxholden/src/t3code /Users/maxholden/T2-SQUARED /Users/maxholden/OrchestrationVM/T2-SQUARED; do
  if test -d "$root"; then
    rg -n --hidden --glob '!.git/**' \
      'registry/manifests/tools\.yaml|binary_paths|source_binary_paths|tool versions match tools\.yaml' "$root" || true
  fi
done
```

Expected: exact matches, `no matches` within a named search boundary, or `root unavailable`. Do not equate no matches with all consumers known.

- [ ] **Step 3: Write scoped audit record**

Create `reports/tool-consumer-migration.md` with exact inspected roots, search commands, matches, unavailable integrations, and:

```yaml
local-repository-migration: allowed
external-rollout: unknown
```

Set local status to `blocked` if an inspected local consumer needs a removed field and lacks migration/projection. Set external status to `unknown` for XLOTYL/Core Dev Services or remote worker implementations unavailable for inspection. Local work may continue with external rollout still unknown; deployment to unknown consumers may not.

- [ ] **Step 4: Verify gate completeness**

Run:

```bash
rg -n 'Inspected root|Search boundary|Unavailable|local-repository-migration: (allowed|blocked)|external-rollout: (allowed|blocked|unknown)' reports/tool-consumer-migration.md
```

Expected: every inspected/unavailable root and both scoped states present.

- [ ] **Step 5: Commit audit**

```bash
git add reports/tool-consumer-migration.md
git commit -m "docs: scope tool manifest migration consumers"
```

---

### Task 2: Characterize Existing Contracts and Safety

**Files:**
- Create: `tests/tool-migration-characterization.test.mjs`
- Modify: none
- Test: `tests/tool-migration-characterization.test.mjs`, `tests/rollback.test.mjs`

**Interfaces:**
- Consumes: current v1 manifest, validator, generator, report files, and migration records.
- Produces: executable backstops for existing identities, report envelopes, reader dependencies, generator defect, four tool classes, and managed-link behavior.

- [ ] **Step 1: Add v1 and report characterization tests**

Create tests which assert current four tool IDs/versions/sources, current host fields, and legacy report keys without invoking installed tools:

```js
test('v1 records four approved tool identities and mixed host facts',()=>{
  const manifest=readManifest('tools.yaml');
  assert.equal(manifest.schema_version,1);
  assert.deepEqual(manifest.tools.map(({tool_id,version,source})=>[tool_id,version,source]),[
    ['ast-grep-runtime','0.43.0','npm:@ast-grep/cli@0.43.0'],
    ['serena-runtime','1.5.3','uv:serena-agent==1.5.3'],
    ['context7-runtime','0.5.4','npm:ctx7@0.5.4'],
    ['playwright-cli-runtime','0.1.17','npm:@playwright/cli@0.1.17']
  ]);
  assert.equal(manifest.tools.some(tool=>'binary_paths' in tool||'status' in tool),true);
});
```

For each tracked tool report, assert existing `check`, `result`, `generated_at`, and `evidence` where currently present. Record tool-class distinctions as fixture descriptions: AST structural probe, Serena project activation, Context7 service/auth/network, Playwright skill/browser/daemon dependencies.

- [ ] **Step 2: Add generator and ownership characterization**

Read `scripts/generate-manifests.mjs` as text and assert it contains one `save('tools.yaml', ...)` writer whose literal payload names only `ast-grep-runtime`, while checked-in manifest contains four tool IDs. Do not execute current generator: repository evidence confirms it has no output-root seam and would overwrite canonical manifests. Extend `tests/rollback.test.mjs` with current guarantees: recorded HHPE link accepted, retarget refused, non-symlink refused, and rollback refuses changed target.

Extend `tests/rollback.test.mjs` with current guarantees: recorded HHPE link accepted, retarget refused, non-symlink refused, and rollback refuses changed target.

- [ ] **Step 3: Run characterization suite**

```bash
node --test tests/tool-migration-characterization.test.mjs tests/rollback.test.mjs
```

Expected: existing behavior passes; generator defect is proven from source plus checked-in data without executing destructive generation.

- [ ] **Step 4: Commit backstops**

```bash
git add tests/tool-migration-characterization.test.mjs tests/rollback.test.mjs
git commit -m "test: characterize tool manifest migration boundaries"
```

---

### Task 3: Add Minimum Tool Contract Primitives

**Files:**
- Create: `lib/tool-contracts.mjs`
- Create: `tests/tool-contracts.test.mjs`
- Test: `tests/tool-contracts.test.mjs`

**Interfaces:**
- Consumes: ToolSpec objects, explicit context, injected PATH resolver/process runner/time.
- Produces:
  - `toolSpecRevision(spec): string`
  - `executionContext({id, platform?, arch?, reusable?}): ExecutionContext`
  - `ephemeralLocalContext({platform?, arch?}): ExecutionContext`
  - `resolveExecutable(command, {env, realpath?}): DiscoveryFact`
  - `observeToolVersion(spec, options): ToolRealizationObservation`
  - `attachReadiness(observation, readiness, limitations?): ToolRealizationObservation`
  - `assertReusableObservation(observation): void`

- [ ] **Step 1: Write failing fingerprint and context tests**

Create `tests/tool-contracts.test.mjs`. Import only exported functions; canonicalization remains private.

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertReusableObservation, ephemeralLocalContext, executionContext,
  observeToolVersion, toolSpecRevision
} from '../lib/tool-contracts.mjs';

const spec={tool_id:'demo',capability_id:'demo/use',version:'1.2.3',source:'npm:demo@1.2.3',provenance:{strength:'approved-external-coordinate'},commands:['demo'],discovery:{method:'path',required:['demo']},version_probe:{parser:'demo-semver',command:'demo',args:['--version'],requirement:'1.2.3'},readiness_probe:'demo-functional'};

test('revision is order-stable, per-tool, and sensitive to applicable requirements',()=>{
  const reordered={source:spec.source,version:spec.version,tool_id:spec.tool_id,capability_id:spec.capability_id,commands:spec.commands,provenance:spec.provenance,discovery:spec.discovery,version_probe:spec.version_probe,readiness_probe:spec.readiness_probe};
  assert.match(toolSpecRevision(spec),/^hhpe-toolspec-json-v1-sha256:[a-f0-9]{64}$/);
  assert.equal(toolSpecRevision(spec),toolSpecRevision(reordered));
  for(const changed of [
    {...spec,version:'1.2.4'},
    {...spec,provenance:{strength:'pinned-source'}},
    {...spec,discovery:{...spec.discovery,required:['demo2']}},
    {...spec,version_probe:{...spec.version_probe,requirement:'>=1.2.3'}},
    {...spec,readiness_probe:'demo-functional-v2'}
  ]) assert.notEqual(toolSpecRevision(spec),toolSpecRevision(changed));
  assert.equal(toolSpecRevision(spec),toolSpecRevision(spec)); // another tool never enters this input
});

test('reusable context requires caller identity and never derives hostname',()=>{
  assert.throws(()=>executionContext({platform:'linux',arch:'x64'}),/context id/);
  assert.deepEqual(executionContext({id:'worker-a',platform:'linux',arch:'x64'}),{id:'worker-a',platform:'linux',arch:'x64',reusable:true});
  const local=ephemeralLocalContext({platform:'darwin',arch:'arm64'});
  assert.equal(local.reusable,false);
  assert.equal('id' in local,false);
  assert.throws(()=>assertReusableObservation({execution_context:local}),/not reusable/);
});
```

- [ ] **Step 2: Write failing state-semantics tests**

Add fixtures proving absent, spawn error, nonzero probe, unparseable output, successful mismatch, successful match, raw stdout/stderr/exit preservation, and identical platform/architecture with distinct explicit IDs. A nonzero or unparseable probe must yield version `indeterminate`, not `incompatible`.

- [ ] **Step 3: Verify red state**

```bash
node --test tests/tool-contracts.test.mjs
```

Expected: `ERR_MODULE_NOT_FOUND` for `lib/tool-contracts.mjs`, not duplicate-binding syntax failure.

- [ ] **Step 4: Implement minimum module**

Use private recursive key-sorted JSON canonicalization inside `toolSpecRevision()`, Node `crypto.createHash('sha256')`, `PATH` discovery, `fs.realpathSync`, and injected `spawnSync`. Preserve raw process fields. Use tool-specific injected parser/comparator callbacks:

```js
export function observeToolVersion(spec,{context,now,resolve,run,parseVersion,compareVersion}) {
  const discovery=resolve(spec.version_probe.command);
  const base={tool_id:spec.tool_id,tool_spec_revision:toolSpecRevision(spec),execution_context:context,observed_at:now(),discovery,version:{outcome:'not-observed'},readiness:{outcome:'not-observed'},limitations:[]};
  if(discovery.outcome!=='present') return base;
  const raw=run(discovery.executable,spec.version_probe.args);
  if(raw.error||raw.status!==0) return {...base,version:{outcome:'indeterminate',exit_code:raw.status,stdout:raw.stdout,stderr:raw.stderr,reason:'probe-failed'}};
  const observed=parseVersion(raw.stdout,raw.stderr);
  if(!observed) return {...base,version:{outcome:'indeterminate',exit_code:raw.status,stdout:raw.stdout,stderr:raw.stderr,reason:'unparseable'}};
  return {...base,version:{outcome:compareVersion(observed,spec.version_probe.requirement)?'compatible':'incompatible',observed,requirement:spec.version_probe.requirement,exit_code:raw.status,stdout:raw.stdout,stderr:raw.stderr}};
}
```

PATH is initial discovery support for current CLIs, not a permanent universal rule. No hostname import or persistence API belongs in this module.

- [ ] **Step 5: Run focused tests**

```bash
node --test tests/tool-contracts.test.mjs
```

Expected: all contract tests pass.

- [ ] **Step 6: Commit primitives**

```bash
git add lib/tool-contracts.mjs tests/tool-contracts.test.mjs
git commit -m "feat: add repository-local tool observation contracts"
```

---

### Task 4: Remove Destructive Generator Authority

**Files:**
- Modify: `scripts/generate-manifests.mjs`
- Create: `tests/generate-manifests.test.mjs`
- Modify: `README.md`
- Test: `tests/generate-manifests.test.mjs`

**Interfaces:**
- Consumes: Task 2 generator characterization.
- Produces: general manifest generation cannot create, truncate, or overwrite `tools.yaml`; reviewed Git changes become initial ToolSpec write/approval mechanism.

- [ ] **Step 1: Write safe failing source-level regression**

Current generator has no safe output-root seam. First write a source-level test that fails without executing it:

```js
test('general generator does not own tools.yaml',()=>{
  const source=fs.readFileSync('scripts/generate-manifests.mjs','utf8');
  assert.doesNotMatch(source,/save\(['"]tools\.yaml['"]/);
  assert.match(source,/HHPE_MANIFEST_OUT/);
});
```

- [ ] **Step 2: Verify red state without executing generator**

```bash
node --test tests/generate-manifests.test.mjs
```

Expected: source assertion fails because current generator writes `tools.yaml` and lacks isolated-output support. Repository manifests remain untouched.

- [ ] **Step 3: Add output seam and remove only `tools.yaml` ownership**

Change `out` to resolve `process.env.HHPE_MANIFEST_OUT` when supplied, otherwise preserve current `registry/manifests` destination. Delete only `save('tools.yaml', ...)` and its AST-only payload. Preserve all other generation. Add this exact lifecycle statement to `README.md` beside manifest authority documentation:

```markdown
`registry/manifests/tools.yaml` is initially hand-authored, reviewed canonical ToolSpec data. General manifest generation must not create or overwrite it; any future ToolSpec generator requires a separately reviewed authority and reproducibility decision.
```

Reviewed Git edits are initial ToolSpec write/approval mechanism; do not add replacement generator.

- [ ] **Step 4: Expand regression to execute safely**

After isolated output exists, extend test to run generator against two temporary roots: one containing sentinel `tools.yaml`, one without it. Assert sentinel bytes remain identical and absent file remains absent.

```js
test('general generation neither overwrites nor creates tools.yaml',()=>{
  for(const present of [true,false]){
    const root=fixtureRoot();
    const file=path.join(root,'tools.yaml');
    if(present)fs.writeFileSync(file,'sentinel\n');
    const result=spawnSync(process.execPath,['scripts/generate-manifests.mjs'],{cwd:repo,env:{...process.env,HHPE_MANIFEST_OUT:root},encoding:'utf8'});
    assert.equal(result.status,0,result.stderr);
    assert.equal(fs.existsSync(file),present);
    if(present)assert.equal(fs.readFileSync(file,'utf8'),'sentinel\n');
  }
});
```

- [ ] **Step 5: Verify non-destruction and commit**

```bash
node --test tests/generate-manifests.test.mjs
git add scripts/generate-manifests.mjs tests/generate-manifests.test.mjs README.md
git commit -m "fix: stop general generation from owning tool specs"
```

Expected: tests pass; general generation still writes its other manifests but neither creates nor changes `tools.yaml`.

---

### Task 5: Add Transitional Manifest Readers

**Files:**
- Modify: `lib/tool-contracts.mjs`
- Modify: `lib/registry.mjs`
- Create: `tests/tool-manifest-reader.test.mjs`
- Modify: `tests/registry.test.mjs`
- Test: `tests/tool-manifest-reader.test.mjs`, `tests/registry.test.mjs`

**Interfaces:**
- Consumes: v1 mixed manifest and prospective v2 portable records.
- Produces: `readToolSpecs(manifest): ToolSpec[]` and static validation that accepts v1 during transition and v2 without requiring host paths.

- [ ] **Step 1: Write dual-reader tests**

Use fixtures for current v1 and portable v2. Assert both preserve identity/version/source. Assert v2 rejects absolute command/discovery values and host fields. Assert static v2 validation never probes executable paths.

- [ ] **Step 2: Verify red state**

```bash
node --test tests/tool-manifest-reader.test.mjs tests/registry.test.mjs
```

Expected: missing `readToolSpecs()` and current registry path validation fail v2 fixture.

- [ ] **Step 3: Implement staged reading**

Add explicit schema branches. V1 continues current behavior until Task 10. V2 validates portable identity/policy only and returns ToolSpecs. Unknown schema fails closed. Do not remove current v1 path behavior yet.

- [ ] **Step 4: Verify and commit**

```bash
node --test tests/tool-manifest-reader.test.mjs tests/registry.test.mjs
git add lib/tool-contracts.mjs lib/registry.mjs tests/tool-manifest-reader.test.mjs tests/registry.test.mjs
git commit -m "feat: stage portable tool manifest readers"
```

---

### Task 6: Preserve Managed AST Grep Ownership Without ToolSpec Host Paths

**Files:**
- Modify: `registry/manifests/migration-state.yaml`
- Modify: `lib/registry.mjs`
- Modify: `tests/rollback.test.mjs`
- Test: `tests/rollback.test.mjs`, `tests/registry.test.mjs`

**Interfaces:**
- Consumes: existing exact `path`, exact `source`, `created_by_hhpe`, symlink type, and target-equality rules.
- Produces: machine-local ownership record explicitly associated with `ast-grep-runtime`; ToolSpec `source_binary_paths` is no longer needed for ownership after this task.

- [ ] **Step 1: Add adversarial ownership tests**

Add fixtures for exact recorded source accepted; retargeted link, non-symlink, missing/broken source, unrelated same-basename source, user-owned/unrecorded link refused; rollback never unlinks changed target; PATH discovery alone does not authorize management.

- [ ] **Step 2: Verify attacks fail safely under current transition**

```bash
node --test tests/rollback.test.mjs tests/registry.test.mjs
```

Expected: new explicit tool-association and same-basename adversarial assertions fail; existing retarget/non-symlink protections pass.

- [ ] **Step 3: Add tool association while preserving exact ownership facts**

Add `tool_id: ast-grep-runtime` to existing HHPE-created AST Grep link records. Validation requires:

```text
classification == created_by_hhpe
tool_id == ast-grep-runtime
current object is symlink
recorded path equals managed path
current real target equals exact recorded source/realpath
```

Command identity may corroborate policy but never establish ownership. Do not use PATH, basename, or binary checksum as ownership evidence. If historical links do not exist locally, retain records as historical ownership and do not assert current presence.

- [ ] **Step 4: Verify rollback safety and commit**

```bash
node --test tests/rollback.test.mjs tests/registry.test.mjs
git add registry/manifests/migration-state.yaml lib/registry.mjs tests/rollback.test.mjs tests/registry.test.mjs
git commit -m "fix: preserve tool-linked managed symlink ownership"
```

---

### Task 7: Migrate AST Grep as Vertical Slice

**Files:**
- Modify: `lib/capability-checks.mjs`
- Create: `tests/tool-capability-checks.test.mjs`
- Modify: `package.json`
- Test: `tests/tool-capability-checks.test.mjs`

**Interfaces:**
- Consumes: ToolSpec primitives and v1/v2 reader.
- Produces: `checkAstGrep(options): CapabilityResult`, context-bound observation, requirement-specific `evaluateAstGrep(requirement, observation)`, optional report writer.

- [ ] **Step 1: Write AST slice tests**

Cover absent, probe failure, wrong version, correct version, aliases/realpath, structural probe failure/success, explicit reusable context, ephemeral local context, and no persistence when writer omitted. Add one blocked observation evaluated differently for `cli-inspection` and `structural-refactor` requirements.

- [ ] **Step 2: Verify red state**

```bash
node --test tests/tool-capability-checks.test.mjs
```

Expected: `checkAstGrep` and evaluator exports missing.

- [ ] **Step 3: Implement observation, evaluation, and optional persistence**

Separate functions:

```js
export const observeAstGrep=options=>observeToolVersion(astSpec(),options);
export const evaluateAstGrep=(requirement,observation)=>{/* requirement-specific conclusion */};
export const projectLegacyResult=(check,observation,evaluation)=>({check,result:evaluation.result,generated_at:observation.observed_at,evidence:evaluation.evidence,tool_observation:observation});
export const checkAstGrep=options=>{/* observe; run structural fixture; evaluate; write only when options.writeReport exists */};
```

All legacy top-level fields derive from observation/evaluation. Add a test that deliberately attempts inconsistent projection input and is rejected. No generic blocked-to-pass mapping.

- [ ] **Step 4: Verify and commit**

```bash
node --test tests/tool-contracts.test.mjs tests/tool-capability-checks.test.mjs
git add lib/capability-checks.mjs tests/tool-capability-checks.test.mjs package.json
git commit -m "feat: observe AST Grep realization by execution context"
```

---

### Task 8: Constrain Shared APIs with All Tool Classes

**Files:**
- Modify: `tests/tool-capability-checks.test.mjs`
- Test: `tests/tool-capability-checks.test.mjs`

**Interfaces:**
- Consumes: Task 7 shared identity/discovery/version/envelope primitives.
- Produces: characterization fixtures preventing AST-local readiness assumptions from becoming shared API.

- [ ] **Step 1: Add four-class contract fixtures**

Add table-driven assertions that shared primitives stop at identity/revision, command discovery, executable/realpath, version observation, explicit context, and envelope validation. Define separate expected readiness inputs for Serena project/toolchain, Context7 network/auth/service, and Playwright generated material/browser/daemon.

- [ ] **Step 2: Verify no universal readiness API is required**

```bash
node --test --test-name-pattern='shared boundary|Serena class|Context7 class|Playwright class' tests/tool-capability-checks.test.mjs
```

Expected: fixtures pass using observation factories and tool-specific readiness callbacks. Failure means shared production API requires a separately reviewed correction before Task 9; do not expand it mechanically inside this characterization task.

- [ ] **Step 3: Commit boundary tests**

```bash
git add tests/tool-capability-checks.test.mjs
git commit -m "test: constrain shared tool realization primitives"
```

---

### Task 9: Migrate Serena, Context7, and Playwright Checks

**Files:**
- Modify: `lib/capability-checks.mjs`
- Modify: `tests/tool-capability-checks.test.mjs`
- Test: `tests/tool-capability-checks.test.mjs`

**Interfaces:**
- Consumes: shared primitives constrained by Task 8.
- Produces: `checkSerena`, `checkContext7`, `checkPlaywright` with tool-specific observation, Compatibility evaluation, legacy projection, and optional persistence.

- [ ] **Step 1: Add failing tool-specific tests**

Serena: compatible CLI plus project activation success/failure and missing language dependency. Context7: CLI success plus live service success, auth block, network block, other probe failure. Playwright: CLI success plus existing generated material and browser/daemon readiness independently observed. Assert CLI presence alone never establishes service/browser readiness.

- [ ] **Step 2: Verify red state**

```bash
node --test tests/tool-capability-checks.test.mjs
```

Expected: existing checks lack injected observation/evaluation interfaces and structured projections.

- [ ] **Step 3: Implement separate readiness and evaluators**

Each check uses its discovered executable. Serena uses disposable project/config directories. Context7 classifies recognized auth/network/service unavailability as blocked evidence, not absence. Playwright inspects existing material and bounded read-only CLI/runtime facts only; when no safe browser/daemon probe exists, record `not-observed` or `blocked`.

Do not execute `install --skills`, package installation, removal, or provisioning. Same blocked observation may satisfy CLI inspection but not live-service/browser/project requirements.

- [ ] **Step 4: Prove projection consistency and optional persistence**

For each tool, call check once without writer and assert no filesystem write; call with injected writer and assert exactly one report whose top-level fields derive from nested observation/evaluation. Existing historical files remain unchanged.

- [ ] **Step 5: Verify and commit**

```bash
node --test tests/tool-contracts.test.mjs tests/tool-capability-checks.test.mjs
git add lib/capability-checks.mjs tests/tool-capability-checks.test.mjs
git commit -m "feat: observe tool-specific realization readiness"
```

---

### Task 10: Atomically Convert Canonical Manifest to Portable v2

**Files:**
- Modify: `registry/manifests/tools.yaml`
- Modify: `lib/registry.mjs`
- Modify: `lib/capability-checks.mjs`
- Modify: `tests/tool-manifest-reader.test.mjs`
- Modify: `tests/registry.test.mjs`
- Modify: `tests/capability-expansion.test.mjs`
- Test: all named tests plus generator and rollback tests

**Interfaces:**
- Consumes: local gate allowed; generator detached; dual readers ready; ownership independent of `source_binary_paths`; all four checks migrated.
- Produces: schema-v2 initial ToolSpec artifact without host-local truth; v2 becomes default reader path.

- [ ] **Step 1: Assert all preconditions**

```bash
rg -n '^local-repository-migration: allowed$' reports/tool-consumer-migration.md
node --test tests/generate-manifests.test.mjs tests/tool-manifest-reader.test.mjs tests/rollback.test.mjs tests/tool-capability-checks.test.mjs
```

Expected: local gate present; generator cannot write tools manifest; v2 fixture readers, ownership safety, and all tool checks pass. Stop if any fails.

- [ ] **Step 2: Write failing canonical-manifest assertions**

Assert schema 2, `record_kind: tool-spec`, four stable identity/version/source tuples, appropriate provenance strength, portable command/discovery/version/readiness/provisioning policy, and absence of `binary_paths`, `source_binary_paths`, `platform`, `noninteractive_path`, `status`, and `generated_at`.

- [ ] **Step 3: Convert all four records in one change**

Preserve these exact portable values and policy identities:

| `tool_id` | `capability_id` | version/source | commands | version parser | readiness policy identity | provenance semantics |
|---|---|---|---|---|---|---|
| `ast-grep-runtime` | `hhpe-hrg/ast-grep` | `0.43.0` / `npm:@ast-grep/cli@0.43.0` | `ast-grep`, `sg` | `ast-grep-semver` | `ast-grep-structural-fixture` | approved external npm coordinate; no claim of complete runtime-source vendoring |
| `serena-runtime` | `serena/serena-runtime` | `1.5.3` / `uv:serena-agent==1.5.3` | `serena` | `serena-semver` | `serena-project-activation` | approved external runtime coordinate; separately pinned Serena source package must be referenced without conflating its provenance with installed executable provenance |
| `context7-runtime` | `context7/context7-cli` | `0.5.4` / `npm:ctx7@0.5.4` | `ctx7` | `context7-semver` | `context7-live-lookup` | approved external npm coordinate plus external network-service dependency |
| `playwright-cli-runtime` | `playwright/playwright-cli` | `0.1.17` / `npm:@playwright/cli@0.1.17` | `playwright-cli` | `playwright-cli-semver` | `playwright-layered-readiness` | approved external npm coordinate; generated skill/browser/daemon state excluded from Supply provenance |

Represent PATH as initial discovery method. Store version requirement in each `version_probe`; store readiness value as policy identity, not universal executable protocol. Provisioning/removal remains `manual-only` non-executable text copied from current approved commands. Record provenance strength without claiming approved coordinates equal complete vendored source.

- [ ] **Step 4: Remove transitional v1 runtime dependencies, not reader yet**

Make registry v2 static validation authoritative for canonical file. Capability checks consume v2 and independently discover execution context. Keep v1 reader branch until Task 12; no executable code may read removed fields for canonical v2.

- [ ] **Step 5: Verify atomic transition**

```bash
node --test tests/tool-manifest-reader.test.mjs tests/registry.test.mjs tests/capability-expansion.test.mjs tests/tool-capability-checks.test.mjs tests/generate-manifests.test.mjs tests/rollback.test.mjs
npm run validate
```

Expected: all pass; validator no longer treats host presence as portable truth; generator and rollback safety remain intact.

- [ ] **Step 6: Commit conversion**

```bash
git add registry/manifests/tools.yaml lib/registry.mjs lib/capability-checks.mjs tests/tool-manifest-reader.test.mjs tests/registry.test.mjs tests/capability-expansion.test.mjs
git commit -m "feat: make canonical tool specs portable"
```

---

### Task 11: Align Worker Contract and Operator Documentation

**Files:**
- Modify: `registry/adapters/hhpe-hrg/worker-contract.json`
- Modify: `docs/capability-expansion.md`
- Modify: `registry/overlays/wrappers/ast-grep/SKILL.md`
- Modify: `registry/adapters/codex/marketplace/plugins/hhpe-registry/skills/ast-grep/SKILL.md`
- Modify: `tests/tool-capability-checks.test.mjs`
- Test: `tests/tool-capability-checks.test.mjs`

**Interfaces:**
- Consumes: canonical v2 ToolSpec and migrated checks.
- Produces: portable worker semantics without unconditional observation persistence.

- [ ] **Step 1: Update worker contract**

Preserve no lead-host absolute paths and matching applicable versions. Add semantics equivalent to:

```json
{
  "tool_spec_schema_version": 2,
  "tool_realization": "independent-per-execution-context",
  "consequential_satisfaction_claim_requires_context_evidence": true,
  "durable_tool_observation_required_for_every_operation": false
}
```

Do not add `tool_observation_required: true`.

- [ ] **Step 2: Add worker portability tests**

Use same AST ToolSpec with `/worker-a/bin/ast-grep` and `/opt/homebrew/bin/ast-grep`, distinct explicit context IDs, same ToolSpec revision, independent observations, and satisfied structural probes. Assert no lead path appears.

- [ ] **Step 3: Update documentation**

State that `tools.yaml` is initial repository-local portable ToolSpec storage; reports are optional retained evidence; execution contexts realize independently; Context7 service and Playwright browser/daemon readiness differ from CLI presence; physical Compatibility ownership remains unresolved. Keep canonical/generated AST Grep wrapper text identical.

- [ ] **Step 4: Verify and commit**

```bash
node --test tests/tool-capability-checks.test.mjs
node -e "const w=require('./registry/adapters/hhpe-hrg/worker-contract.json');if(w.host_absolute_paths_allowed!==false||w.durable_tool_observation_required_for_every_operation!==false)process.exit(1)"
git add registry/adapters/hhpe-hrg/worker-contract.json docs/capability-expansion.md registry/overlays/wrappers/ast-grep/SKILL.md registry/adapters/codex/marketplace/plugins/hhpe-registry/skills/ast-grep/SKILL.md tests/tool-capability-checks.test.mjs
git commit -m "docs: align workers with portable tool realization"
```

---

### Task 12: Retire Transitional v1 Reading When Inspected Consumers Permit

**Files:**
- Modify: `lib/tool-contracts.mjs`
- Modify: `lib/registry.mjs`
- Modify: `tests/tool-manifest-reader.test.mjs`
- Modify: `reports/tool-consumer-migration.md`
- Test: `tests/tool-manifest-reader.test.mjs`, full repository search

**Interfaces:**
- Consumes: migrated canonical manifest and updated inspected consumers.
- Produces: fail-closed canonical reader for schema v2; external rollout state remains independently allowed/blocked/unknown.

- [ ] **Step 1: Re-run scoped consumer search**

Repeat Task 1 commands. Update exact inspected results. Do not change `external-rollout: unknown` merely because local search is clean.

- [ ] **Step 2: Write failing legacy-rejection test**

Assert canonical loader rejects schema v1 with a migration-specific error, while any intentionally retained compatibility projection is tested at its named boundary.

- [ ] **Step 3: Remove v1 branch only if local gate remains allowed**

Remove transitional v1 canonical reading. If any inspected consumer still needs it, leave branch and record `local-repository-migration: blocked`; stop this task without pretending retirement occurred.

- [ ] **Step 4: Verify and commit when retirement occurs**

```bash
node --test tests/tool-manifest-reader.test.mjs
rg -n 'binary_paths|source_binary_paths|noninteractive_path|status.?present' lib tests registry/adapters docs
git add lib/tool-contracts.mjs lib/registry.mjs tests/tool-manifest-reader.test.mjs reports/tool-consumer-migration.md
git commit -m "refactor: retire legacy tool manifest reading"
```

Expected: remaining matches are historical/design/report context or explicit compatibility boundaries, not canonical runtime readers.

---

### Task 13: Run Final Migration and Safety Verification

**Files:**
- Modify: `reports/tool-consumer-migration.md` only if fresh audit finds factual omission
- Test: full repository suite and static invariants

**Interfaces:**
- Consumes: Tasks 1–12.
- Produces: verification evidence only; no architecture or new implementation mechanism.

- [ ] **Step 1: Run deterministic suite and static validation**

```bash
npm test
npm run validate
npm run skills:ci:static
```

Expected: zero failures. Default suite requires no ambient AST Grep, Serena, Context7, or Playwright installation.

- [ ] **Step 2: Verify portable specification and revision isolation**

```bash
node --test tests/tool-contracts.test.mjs tests/tool-manifest-reader.test.mjs
```

Expected: stable identities/coordinates, no host truth, order-stable domain-separated per-tool revisions, requirement-change sensitivity, and unrelated-tool isolation pass.

- [ ] **Step 3: Verify realization state distinctions and tool classes**

```bash
node --test --test-name-pattern='absent|probe|unparseable|wrong version|readiness|blocked|same observation|Serena|Context7|Playwright|worker' tests/tool-contracts.test.mjs tests/tool-capability-checks.test.mjs
```

Expected: absence, indeterminate probe, incompatibility, compatibility, readiness failure, blocked dependencies, requirement-specific conclusions, four tool classes, and worker context isolation pass.

- [ ] **Step 4: Verify ownership and generator safety**

```bash
node --test tests/rollback.test.mjs tests/registry.test.mjs tests/generate-manifests.test.mjs
```

Expected: same-basename/path-only attacks refused; changed targets never unlinked; generator neither creates nor overwrites `tools.yaml`.

- [ ] **Step 5: Prove no installer or forbidden physical architecture appeared**

```bash
if rg -n 'install --skills' lib scripts tests; then exit 1; fi
if rg -n 'hostname\(|os\.hostname|tool_observation_required.: true' lib tests registry/adapters; then exit 1; fi
rg -n 'provisioning\.(upgrade|removal)|\.upgrade|\.removal' lib scripts tests || true
```

Expected: first two checks exit 0 with no matches. Provisioning policy may appear only as inert data assertions, never process arguments.

- [ ] **Step 6: Verify historical reports and optional persistence**

```bash
git diff --exit-code e7bcbc96af91e5d5cb51d788b89bc6f72bd589fc -- reports/capability-checks
node --test --test-name-pattern='without writer|projection consistency' tests/tool-capability-checks.test.mjs
```

Expected: retained historical reports unchanged; observation construction without writer and consistent legacy projection pass.

- [ ] **Step 7: Verify scoped rollout state and final diff**

```bash
rg -n '^local-repository-migration: (allowed|blocked)$|^external-rollout: (allowed|blocked|unknown)$' reports/tool-consumer-migration.md
git diff --check e7bcbc96af91e5d5cb51d788b89bc6f72bd589fc..HEAD
git diff --stat e7bcbc96af91e5d5cb51d788b89bc6f72bd589fc..HEAD
```

Expected: both independent states recorded; incomplete external inspection never becomes global clearance; diff contains only planned migration files and evidence.

- [ ] **Step 8: Commit factual audit correction only if needed**

If fresh verification found an objective omission, update only the audit report and commit:

```bash
git add reports/tool-consumer-migration.md
git commit -m "docs: record final tool migration scope"
```

Otherwise create no empty commit.

## Deferred Decisions and Explicit Ceilings

- Long-term ToolSpec physical location and generation lifecycle remain unresolved.
- Schema v2 and domain-separated fingerprint are repository-local initial mechanisms, not universal protocols.
- External fingerprint consumers must explicitly adopt canonicalization; otherwise revision is opaque.
- Durable execution-context identity source remains unresolved. This migration accepts caller identity or marks evidence ephemeral-local; it creates no registry.
- Observation retention, redaction, archival, and deletion remain unresolved. Existing reports are optional evidence locations.
- Freshness remains tool- and operation-specific; no TTL or invalidation daemon is introduced.
- External integrations unavailable during audit remain unknown. Local success does not authorize external rollout.
- Safe bounded Playwright browser/daemon verification remains unresolved when read-only evidence is unavailable.
- Physical Compatibility ownership remains unresolved. Co-location in Curated Market conveys no system-wide authority.
- PATH discovery is initial support for four current CLIs, not permanent universal discovery policy.

## Self-Review Checklist

- [x] No task converts canonical `tools.yaml` before dual readers, generator protection, managed ownership, and four tool checks are ready.
- [x] No task leaves destructive generator capable of overwriting v2.
- [x] No task removes `source_binary_paths` before exact ownership safety is replaced.
- [x] No hostname-derived persistent identity exists.
- [x] No failed/unparseable version probe becomes absence or incompatibility.
- [x] No generic blocked-to-pass mapping exists.
- [x] No Playwright installer/provisioner runs.
- [x] No incomplete inspection produces global external clearance.
- [x] No universal worker-observation persistence requirement exists.
- [x] Fingerprint is repository-local, versioned/domain-separated, per-tool, and opaque externally by default.
- [x] Observation construction and persistence are separate.
- [x] Shared primitives exclude universal readiness execution/evaluation.
- [x] Every intentional compatibility change is named in matrix and task/test.
- [x] Every task names exact files, interfaces, red/green commands, expected outcomes, and task-local commit.
- [x] No implementation occurs while writing this plan.
