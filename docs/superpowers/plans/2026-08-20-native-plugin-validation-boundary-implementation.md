# Native-Plugin Validation Boundary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separate deterministic repository/static integrity from explicitly scoped Codex native-plugin host-realization validation without weakening configured-host enforcement or changing exposure activation policy.

**Architecture:** Keep both operations narrowly in `lib/registry.mjs`: `validate()` validates checked-in declarations and never probes Codex, while `validateHostRealization()` consumes explicit host/context scope, probes one Codex inventory, records target observations, then performs capability-specific requirement evaluations. A dedicated CLI wrapper exposes host validation with its own result category and exit behavior; existing generic validation commands remain static.

**Tech Stack:** Node.js ESM, `node:child_process`, `node:test`, `node:assert/strict`, JSON manifests, shell bin wrappers, Markdown.

## Global Constraints

- Binding specification: [`../specs/2026-08-20-native-plugin-validation-boundary-design.md`](../specs/2026-08-20-native-plugin-validation-boundary-design.md). Specification outranks this plan.
- Work only on branch `fix/native-plugin-validation-boundary`, based on frozen ToolSpec HEAD `4e0a852be267f5d1e52c77e425d2e089c6f4403f`.
- Do not modify the frozen ToolSpec branch, Track B, Track C, ADR-026, ToolSpec design, ToolSpec data, capability identity, package identity, or exposure statuses.
- Preserve only existing lifecycle states: `planned` and `active`.
- Static validation must validate exposure declarations but must execute zero native-plugin inventory subprocesses.
- Host applicability comes from reviewed exposure fields and explicit invocation scope. Never infer applicability from Codex presence, `PATH`, hostname, or developer-workstation execution.
- Active native-plugin exposure is required only when its reviewed host matches the explicitly selected host/context scope. It is not required on every machine.
- Planned exposure is never required by ordinary host validation. Pre-activation validation selects exact planned target(s); no `include all planned` mode is allowed and validation never mutates status.
- Probe unavailable, nonzero, or unusable output is `indeterminate`, never positive absence. Preserve bounded process evidence.
- Deduplicate inventory work and target observations, never capability/policy evaluations.
- Host failures use category `host-realization` and must never appear as `FAIL_STATIC_INTEGRITY`.
- Host observations may be returned without persistence. No report database, host inventory, daemon, Compatibility service, or generalized provider framework.
- Do not install, activate, remove, provision, or mutate plugins or host configuration.
- Use TDD for every behavior change: intended RED, minimum GREEN, then refactor with relevant tests green.
- Make one task-local commit per task. Do not merge, push, publish, deploy, or open a PR.

## File and Interface Map

| Path | Responsibility | Planned action |
| --- | --- | --- |
| `lib/registry.mjs` | Static exposure declaration validation; static `validate()`; explicit Codex host inventory observation and requirement evaluation; CLI dispatch | Modify narrowly |
| `lib/skills-ci.mjs` | Static integrity composition | Preserve interface; verify it calls only static `validate()` |
| `tests/native-plugin-validation.test.mjs` | Focused authority-boundary, declaration, observation, applicability, deduplication, and CLI tests | Create |
| `tests/registry.test.mjs` | Existing generic registry/static expectations | Preserve unchanged; verify generic tests become static |
| `bin/hhpe-registry-validate-host` | Explicit operational entry to scoped host validation | Create |
| `bin/hhpe-registry-validate` | Existing static wrapper | Preserve behavior; update only comments if necessary |
| `package.json` | Explicit host-validation command | Add `validate:host`; preserve `validate` and `skills:ci:static` |
| `docs/operations.md` | Operator distinction and composed designated-host workflow | Update narrowly |
| `docs/host-adapters.md` | Intended/planned mechanism wording versus active/observed realization | Update narrowly |

Do not modify `registry/manifests/exposures.yaml`.

### Exact interfaces selected for this migration

```js
export function validateExposureDeclarations(exposures, capabilityIds) {}

export function validateHostRealization({
  host,
  context,
  requiredPlannedTargets = [],
  inventoryProbe = probeCodexPluginInventory,
  exposures = read('exposures.yaml').exposures,
} = {}) {}
```

`validateExposureDeclarations(exposures, capabilityIds)` returns `string[]` static errors. It accepts a `Set<string>` of known capability IDs and validates:

- status is `planned|active`;
- capability exists;
- supported checked-in host/mode/adapter relationships remain the six existing combinations;
- target is nonempty and contains no `..` traversal;
- Codex `native-plugin` target matches `^[A-Za-z0-9][A-Za-z0-9._-]*@[A-Za-z0-9][A-Za-z0-9._-]*$` and adapter equals `registry/adapters/codex/marketplace`;
- existing static contradictions such as inactive exposure and duplicate plugin-plus-symlink remain checked by their existing owners.

`validateHostRealization` initially supports explicit `host: 'codex'` only. `context` is a caller-supplied nonempty opaque scope/correlation string; it is neither hostname-derived nor registered globally. Reviewed applicability for this concrete seam is `exposure.host === host && exposure.mode === 'native-plugin'`; active matching exposures are required. `requiredPlannedTargets` is a unique exact target list and selects only matching planned exposures. Unknown host, empty context, or selected target with no matching planned declaration fails invocation before probing.

Result shape:

```js
{
  category: 'host-realization',
  status: 'passed' | 'failed',
  host: 'codex',
  context: 'caller-supplied-id',
  probe: {
    command: ['codex', 'plugin', 'list'],
    available: true | false,
    exit_status: number | null,
    stdout: 'bounded text',
    stderr: 'bounded text',
  },
  observations: [{
    target: 'plugin@marketplace',
    outcome: 'installed' | 'absent' | 'indeterminate',
    affected_capability_ids: ['package/capability'],
    evaluations: [{
      capability_id: 'package/capability',
      exposure_status: 'active' | 'planned',
      applicable: true,
      required: true | false,
      requirement_source: 'active' | 'explicit-planned' | null,
      satisfied: true | false | null,
    }],
  }],
}
```

- `probeCodexPluginInventory()` executes `codex plugin list` once and returns raw process facts plus parsed installed targets.
- Exit `0` plus nonempty usable inventory is observed; matching target is `installed`, missing target is `absent`.
- Spawn failure, nonzero exit, or empty/unusable output is `indeterminate`. `available` means process spawn was possible, not that inventory was usable.
- Raw `stdout`/`stderr` are bounded to 16 KiB each; truncation is recorded by appending `\n<truncated>`.
- A required evaluation is satisfied only by `installed`. `absent` and `indeterminate` both leave required satisfaction false, while observation outcome remains distinct. Unrequired planned evaluations have `satisfied: null`.
- `status` is `failed` if any required evaluation is not satisfied; otherwise `passed`. Result construction performs no persistence.

CLI selected for this migration:

```text
node lib/registry.mjs validate-host --host codex --context <id>
  [--require-planned-target <plugin@marketplace>]...
```

- Missing/invalid invocation exits `2` with usage/error on stderr.
- Completed host result prints JSON; `passed` exits `0`, `failed` exits `1`.
- Existing `validate` prints static result; static failure remains exit `1`.
- `bin/hhpe-registry-validate-host` forwards to this subcommand. `npm run validate:host -- --context <id>` supplies `--host codex` in its script.

---

### Task 1: Characterize Conflation and Make Repository Validation Genuinely Static

**Files:**
- Create: `tests/native-plugin-validation.test.mjs`
- Modify: `lib/registry.mjs`
- Test: `lib/skills-ci.mjs` (no production change expected)
- Test: `tests/registry.test.mjs` (generic behavior remains static)

**Interfaces:**
- Consumes: current manifests and existing `validate()` / `staticIntegrity()`.
- Produces: `validateExposureDeclarations(exposures, capabilityIds)` and static-only `validate()`.

- [ ] **Step 1: Capture current authority conflation and duplicate target errors**

Run:

```bash
node --test --test-name-pattern='registry integrity passes|headless static integrity' tests/registry.test.mjs
```

Expected pre-change: both tests fail due to ambient `native plugin not installed` messages inherited from repeated `codex plugin list`; shared target `00-hhpe-registry@hhpe-hrg` appears once per capability. Record exact output in task notes only.

- [ ] **Step 2: Write RED fail-if-called tests for both static entry points**

Create `tests/native-plugin-validation.test.mjs` with a temporary fake `codex` executable that writes a marker whenever invoked:

```js
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {validate, validateExposureDeclarations} from '../lib/registry.mjs';
import {staticIntegrity} from '../lib/skills-ci.mjs';

function withFailingCodex(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'hhpe-codex-probe-'));
  const marker = path.join(directory, 'called');
  const executable = path.join(directory, 'codex');
  fs.writeFileSync(executable, `#!/bin/sh\nprintf called > '${marker}'\nexit 99\n`);
  fs.chmodSync(executable, 0o755);
  const previous = process.env.PATH;
  process.env.PATH = `${directory}${path.delimiter}${previous}`;
  t.after(() => { process.env.PATH = previous; fs.rmSync(directory, {recursive: true, force: true}); });
  return marker;
}

test('validate never invokes native plugin inventory', t => {
  const marker = withFailingCodex(t);
  validate();
  assert.equal(fs.existsSync(marker), false);
});

test('staticIntegrity never invokes native plugin inventory', t => {
  const marker = withFailingCodex(t);
  staticIntegrity();
  assert.equal(fs.existsSync(marker), false);
});
```

Run these tests serially (`--test-concurrency=1`) because they temporarily modify process `PATH`.

- [ ] **Step 3: Run zero-probe tests and verify intended RED**

Run:

```bash
node --test --test-concurrency=1 --test-name-pattern='never invokes native plugin inventory' tests/native-plugin-validation.test.mjs
```

Expected: FAIL because marker exists after each static operation, proving the subprocess was invoked. Failure must not depend on whether real Codex is installed.

- [ ] **Step 4: Write RED static declaration validation tests**

Add table-driven tests:

```js
const capabilityIds = new Set(['pkg/cap']);
const valid = {
  capability_id: 'pkg/cap',
  host: 'codex',
  mode: 'native-plugin',
  target: 'plugin-name@marketplace-name',
  adapter: 'registry/adapters/codex/marketplace',
  status: 'planned',
};

test('planned native plugin declaration is statically valid without inventory', () => {
  assert.deepEqual(validateExposureDeclarations([valid], capabilityIds), []);
});

for (const [name, exposure, pattern] of [
  ['unsupported status', {...valid, status: 'installed'}, /unsupported exposure status/],
  ['unknown capability', {...valid, capability_id: 'missing/cap'}, /exposure unknown capability/],
  ['malformed target', {...valid, target: '../plugin'}, /unsafe native-plugin target/],
  ['wrong native adapter', {...valid, adapter: 'registry/adapters/codex'}, /invalid exposure relationship/],
]) test(name, () => {
  assert.ok(validateExposureDeclarations([exposure], capabilityIds).some(error => pattern.test(error)));
});
```

Add one valid fixture for every existing host/mode/adapter combination discovered in `exposures.yaml` so the helper does not accidentally reject reviewed non-Codex declarations.

- [ ] **Step 5: Run declaration tests and verify intended RED**

Run:

```bash
node --test --test-name-pattern='statically valid|unsupported status|unknown capability|malformed target|wrong native adapter|existing exposure relationship' tests/native-plugin-validation.test.mjs
```

Expected: FAIL because `validateExposureDeclarations` is not exported/implemented, not because test fixtures use invalid JSON or imports.

- [ ] **Step 6: Implement static exposure helper and remove ambient inventory from `validate()`**

Implement in `lib/registry.mjs`:

```js
const EXPOSURE_RELATIONSHIPS = new Set([
  'antigravity-ide|skill-symlink|registry/adapters/antigravity-ide',
  'codex|native-plugin|registry/adapters/codex/marketplace',
  'codex|skill-symlink|registry/adapters/codex',
  'cursor|skill-symlink|registry/adapters/cursor',
  'hhpe-hrg|registry-reference|registry/adapters/hhpe-hrg',
  'opencode|skill-symlink|registry/adapters/opencode',
]);
const NATIVE_PLUGIN_TARGET = /^[A-Za-z0-9][A-Za-z0-9._-]*@[A-Za-z0-9][A-Za-z0-9._-]*$/;

export function validateExposureDeclarations(exposures, capabilityIds) {
  const errors = [];
  for (const exposure of exposures) {
    if (!capabilityIds.has(exposure.capability_id)) errors.push(`exposure unknown capability ${exposure.capability_id}`);
    if (!['planned', 'active'].includes(exposure.status)) errors.push(`unsupported exposure status ${exposure.capability_id}: ${exposure.status}`);
    const relationship = `${exposure.host}|${exposure.mode}|${exposure.adapter}`;
    if (!EXPOSURE_RELATIONSHIPS.has(relationship)) errors.push(`invalid exposure relationship ${exposure.capability_id}: ${relationship}`);
    if (typeof exposure.target !== 'string' || !exposure.target || exposure.target.includes('..')) errors.push(`unsafe target ${exposure.capability_id}`);
    if (exposure.mode === 'native-plugin' && !NATIVE_PLUGIN_TARGET.test(exposure.target || '')) errors.push(`unsafe native-plugin target ${exposure.capability_id}: ${exposure.target}`);
  }
  return errors;
}
```

Replace `validate()`'s exposure loop with `errors.push(...validateExposureDeclarations(exposures, ids))`. Preserve final-stack contradiction checks, package/capability/provenance checks, ToolSpec validation, and managed-object validation. Delete only `codex plugin list` and corresponding `native plugin not installed` static errors.

- [ ] **Step 7: Run focused static tests and verify GREEN**

Run:

```bash
node --test --test-concurrency=1 tests/native-plugin-validation.test.mjs
node --test --test-name-pattern='registry integrity passes|headless static integrity' tests/registry.test.mjs
npm run validate
npm run skills:ci:static
```

Expected: focused declaration and zero-probe tests pass; valid planned declarations no longer require current-host installation; generic commands retain static result shapes and exit according to static facts only.

- [ ] **Step 8: Confirm no static caller gained a renamed inventory path**

Run:

```bash
rg -n "plugin', *'list|plugin list|probeCodexPluginInventory|validateHostRealization" lib/registry.mjs lib/skills-ci.mjs
```

Expected: inventory appears only in the host-specific code added later; at this task boundary it may be absent. Neither `validate()` nor `staticIntegrity()` contains/calls it.

- [ ] **Step 9: Commit Task 1**

```bash
git add lib/registry.mjs tests/native-plugin-validation.test.mjs
git commit -m "fix: keep registry integrity validation static"
```

---

### Task 2: Add Explicit Context-Bound Host Observation and Requirement Evaluation

**Files:**
- Modify: `lib/registry.mjs`
- Modify: `tests/native-plugin-validation.test.mjs`

**Interfaces:**
- Consumes: statically valid `exposures.yaml`, explicit `host`, explicit `context`, exact `requiredPlannedTargets`, injected `inventoryProbe`.
- Produces: `probeCodexPluginInventory()` and `validateHostRealization({...})` with the result shape defined above; no persistence.

- [ ] **Step 1: Write RED tests for explicit scope and planned/active applicability**

Add fixture exposure constructors and injected inventory probes:

```js
const exposure = (capability_id, target, status = 'active') => ({
  capability_id,
  host: 'codex',
  mode: 'native-plugin',
  target,
  adapter: 'registry/adapters/codex/marketplace',
  status,
});
const observed = (...targets) => () => ({
  command: ['codex', 'plugin', 'list'], available: true, exit_status: 0,
  stdout: targets.map(target => `${target} installed`).join('\n'), stderr: '',
  usable: true, installed_targets: targets,
});

test('host and context are explicit and never inferred from ambient Codex', () => {
  assert.throws(() => validateHostRealization(), /host.*required/);
  assert.throws(() => validateHostRealization({host: 'codex'}), /context.*required/);
  assert.throws(() => validateHostRealization({host: 'claude', context: 'deploy-1'}), /unsupported host/);
});

test('active applicable installed requirement passes', () => {
  const result = validateHostRealization({host: 'codex', context: 'deploy-1', exposures: [exposure('pkg/a', 'one@market')], inventoryProbe: observed('one@market')});
  assert.equal(result.status, 'passed');
  assert.equal(result.observations[0].outcome, 'installed');
  assert.equal(result.observations[0].evaluations[0].requirement_source, 'active');
});

test('planned absence is unrequired unless exact target is explicitly selected', () => {
  const planned = exposure('pkg/a', 'one@market', 'planned');
  const ordinary = validateHostRealization({host: 'codex', context: 'dev-1', exposures: [planned], inventoryProbe: observed('other@market')});
  assert.equal(ordinary.status, 'passed');
  assert.equal(ordinary.observations.length, 0);
  const selected = validateHostRealization({host: 'codex', context: 'activation-1', exposures: [planned], requiredPlannedTargets: ['one@market'], inventoryProbe: observed('other@market')});
  assert.equal(selected.status, 'failed');
  assert.equal(selected.observations[0].evaluations[0].requirement_source, 'explicit-planned');
});
```

For test injection only, permit an optional `exposures = read('exposures.yaml').exposures` property in the function options. Keep it documented as a narrow data input, not host inventory abstraction.

- [ ] **Step 2: Run scope tests and verify intended RED**

Run:

```bash
node --test --test-name-pattern='explicit|active applicable|planned absence' tests/native-plugin-validation.test.mjs
```

Expected: FAIL because `validateHostRealization` does not exist, not because ambient Codex state differs.

- [ ] **Step 3: Write RED tests for installed, absent, and indeterminate observations**

Add table-driven tests:

```js
for (const [name, probe, outcome] of [
  ['spawn unavailable', () => ({command: ['codex','plugin','list'], available: false, exit_status: null, stdout: '', stderr: 'ENOENT', usable: false, installed_targets: []}), 'indeterminate'],
  ['nonzero probe', () => ({command: ['codex','plugin','list'], available: true, exit_status: 7, stdout: '', stderr: 'failed', usable: false, installed_targets: []}), 'indeterminate'],
  ['unusable output', () => ({command: ['codex','plugin','list'], available: true, exit_status: 0, stdout: '', stderr: '', usable: false, installed_targets: []}), 'indeterminate'],
  ['observed absence', observed('other@market'), 'absent'],
  ['observed installed', observed('one@market'), 'installed'],
]) test(name, () => {
  const result = validateHostRealization({host: 'codex', context: 'host-1', exposures: [exposure('pkg/a', 'one@market')], inventoryProbe: probe});
  assert.equal(result.observations[0].outcome, outcome);
  assert.equal(result.status, outcome === 'installed' ? 'passed' : 'failed');
  assert.equal(result.category, 'host-realization');
});
```

Assert nonzero/unavailable results preserve exit status, `available`, bounded stdout, and bounded stderr. Assert neither result contains `native plugin not installed` or `FAIL_STATIC_INTEGRITY`.

- [ ] **Step 4: Write RED deduplication and capability-policy preservation tests**

Add:

```js
test('one inventory and target observation preserve multiple capability evaluations', () => {
  let calls = 0;
  const result = validateHostRealization({
    host: 'codex', context: 'deploy-2',
    exposures: [exposure('pkg/a', 'shared@market'), exposure('pkg/b', 'shared@market')],
    inventoryProbe: () => { calls += 1; return observed('other@market')(); },
  });
  assert.equal(calls, 1);
  assert.equal(result.observations.length, 1);
  assert.deepEqual(result.observations[0].affected_capability_ids, ['pkg/a', 'pkg/b']);
  assert.deepEqual(result.observations[0].evaluations.map(item => item.capability_id), ['pkg/a', 'pkg/b']);
});

test('distinct targets remain distinct observations while sharing one inventory probe', () => {
  let calls = 0;
  const result = validateHostRealization({host: 'codex', context: 'deploy-3', exposures: [exposure('pkg/a', 'one@market'), exposure('pkg/b', 'two@market')], inventoryProbe: () => { calls += 1; return observed('one@market')(); }});
  assert.equal(calls, 1);
  assert.deepEqual(result.observations.map(item => item.target), ['one@market', 'two@market']);
});
```

- [ ] **Step 5: Run observation/deduplication tests and verify intended RED**

Run:

```bash
node --test --test-name-pattern='spawn unavailable|nonzero probe|unusable output|observed absence|observed installed|one inventory|distinct targets' tests/native-plugin-validation.test.mjs
```

Expected: FAIL because observation/evaluation implementation is absent.

- [ ] **Step 6: Implement one-probe observation and per-capability evaluation**

Implement in `lib/registry.mjs`:

```js
const boundOutput = text => {
  const value = String(text || '');
  return value.length <= 16384 ? value : `${value.slice(0, 16384)}\n<truncated>`;
};

export function probeCodexPluginInventory() {
  const process = run('codex', ['plugin', 'list']);
  const stdout = boundOutput(process.stdout);
  const stderr = boundOutput(process.stderr || process.error?.message);
  const available = !process.error;
  const usable = available && process.status === 0 && stdout.trim().length > 0;
  const installed_targets = usable
    ? stdout.split(/\r?\n/).filter(line => /\binstalled\b/.test(line)).map(line => line.trim().split(/\s+/)[0])
    : [];
  return {command: ['codex', 'plugin', 'list'], available, exit_status: process.status, stdout, stderr, usable, installed_targets};
}
```

Implement `validateHostRealization` using this sequence:

1. validate `host === 'codex'`, nonempty `context`, unique well-formed `requiredPlannedTargets`;
2. select matching Codex native-plugin exposures;
3. require all selected `active` exposures and only planned exposures whose exact target appears in `requiredPlannedTargets`;
4. reject an explicitly selected planned target without a matching planned declaration;
5. if no requirement is selected, return `passed` with no probe and `observations: []`;
6. invoke `inventoryProbe()` exactly once;
7. group selected exposures by target, sort targets/capabilities for deterministic output, classify target outcome, and create every capability evaluation;
8. return category/status/probe/observations without writing a report.

Do not read hostname, infer host from `PATH`, or persist the result.

- [ ] **Step 7: Run all focused host tests and verify GREEN**

Run:

```bash
node --test --test-concurrency=1 tests/native-plugin-validation.test.mjs
```

Expected: all static, applicability, observation, and deduplication tests pass; injected probes make results deterministic.

- [ ] **Step 8: Add and verify a successful real-manifest no-requirement check**

Add a test calling `validateHostRealization({host: 'codex', context: 'developer-checkout', inventoryProbe: () => { throw new Error('must not probe'); }})` against current all-planned native-plugin declarations. Expected result: `passed`, zero observations, and probe not called. This proves ordinary host validation does not broaden scope to all planned targets.

Run:

```bash
node --test --test-name-pattern='developer-checkout|does not broaden' tests/native-plugin-validation.test.mjs
```

Expected: PASS.

- [ ] **Step 9: Commit Task 2**

```bash
git add lib/registry.mjs tests/native-plugin-validation.test.mjs
git commit -m "feat: add scoped Codex host realization validation"
```

---

### Task 3: Expose Distinct Host Validation Command and Operator Semantics

**Files:**
- Modify: `lib/registry.mjs`
- Modify: `tests/native-plugin-validation.test.mjs`
- Create: `bin/hhpe-registry-validate-host`
- Modify: `package.json`
- Modify: `docs/operations.md`
- Modify: `docs/host-adapters.md`

**Interfaces:**
- Consumes: Task 2 `validateHostRealization`.
- Produces: `validate-host` CLI, `hhpe-registry-validate-host`, `npm run validate:host`, and explicit documentation.

- [ ] **Step 1: Write RED CLI tests for category and exit semantics**

Use a temporary `HHPE_HRG_HOME` fixture containing copied manifests/packages needed by `registry.mjs`, or invoke the repository CLI with a temporary fake `codex` first on `PATH`. Add subprocess tests:

```js
test('explicit host command fails required planned target as host realization, not static integrity', t => {
  const fixture = cliFixture(t, {inventory: 'other@market installed\n'});
  const result = fixture.run(['validate-host', '--host', 'codex', '--context', 'activation-4', '--require-planned-target', '00-hhpe-registry@hhpe-hrg']);
  assert.equal(result.status, 1);
  const body = JSON.parse(result.stdout);
  assert.equal(body.category, 'host-realization');
  assert.equal(body.status, 'failed');
  assert.equal(result.stdout.includes('FAIL_STATIC_INTEGRITY'), false);
});

test('explicit host command rejects missing context before probing', t => {
  const fixture = cliFixture(t, {inventory: '00-hhpe-registry@hhpe-hrg installed\n'});
  const result = fixture.run(['validate-host', '--host', 'codex']);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /--context/);
  assert.equal(fs.existsSync(fixture.probeMarker), false);
});
```

Add installed target exit `0`, unavailable inventory exit `1` with `indeterminate`, repeated `--require-planned-target` parsing, and unknown target invocation exit `2` tests.

- [ ] **Step 2: Run CLI tests and verify intended RED**

Run:

```bash
node --test --test-name-pattern='explicit host command' tests/native-plugin-validation.test.mjs
```

Expected: FAIL because `validate-host` is not in CLI dispatch and no dedicated wrapper exists.

- [ ] **Step 3: Implement strict CLI parsing and distinct exits**

Add a small parser local to `lib/registry.mjs`:

```js
function hostValidationOptions(args) {
  const values = {requiredPlannedTargets: []};
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--host') values.host = args[++index];
    else if (argument === '--context') values.context = args[++index];
    else if (argument === '--require-planned-target') values.requiredPlannedTargets.push(args[++index]);
    else fail(`unknown validate-host option: ${argument}`);
  }
  if (!values.host) fail('validate-host requires --host');
  if (!values.context) fail('validate-host requires --context');
  return values;
}
```

Use a typed invocation error carrying `exitCode = 2`, or catch argument errors separately, so malformed invocation exits `2`. Completed host result exits `1` only when `status === 'failed'`. Preserve existing `validate` and collision/refusal exit behavior. Update usage text to include `validate-host` without renaming any generic command.

- [ ] **Step 4: Add dedicated wrapper and npm script**

Create executable `bin/hhpe-registry-validate-host`:

```sh
#!/bin/sh
exec node "${HHPE_HRG_HOME:-$HOME/.local/share/hhpe-hrg}/lib/registry.mjs" validate-host "$@"
```

Add to `package.json`:

```json
"validate:host": "node lib/registry.mjs validate-host --host codex"
```

Do not modify `validate` or `skills:ci:static` scripts.

- [ ] **Step 5: Run CLI and existing-wrapper tests and verify GREEN**

Run:

```bash
node --test --test-concurrency=1 tests/native-plugin-validation.test.mjs
node --test --test-name-pattern='all executable wrappers invoke a registry core|registry integrity passes|headless static integrity' tests/registry.test.mjs
npm run validate
npm run skills:ci:static
npm run validate:host -- --context developer-checkout
```

Expected: focused and generic static tests pass; current all-planned host command exits `0` without probing; wrapper inventory test recognizes new executable. A separately selected missing planned target test exits `1` as host realization.

- [ ] **Step 6: Update operator documentation without changing policy**

In `docs/operations.md`, document:

```markdown
`hhpe-registry-validate` and `npm run validate` validate checked-in repository declarations only. They do not inspect native-plugin installation.

Use `hhpe-registry-validate-host --host codex --context <id>` when an applicable active Codex exposure must be realized. Add `--require-planned-target <plugin@marketplace>` only for an explicitly selected pre-activation target. A designated host runs static validation and host validation as separate gates. Host failure reports `host-realization`; it is not `FAIL_STATIC_INTEGRITY`. Validation never installs or activates a plugin.
```

In `docs/host-adapters.md`, replace “Codex uses” for currently planned native-plugin declarations with wording equivalent to:

```markdown
- Codex's reviewed intended realization mechanism for Superpowers, Compound Engineering, Ponytail, and the HHPE wrapper set is native plugins; current exposure declarations remain `planned` unless separately activated. Only explicit host validation observes whether a selected context has a target installed, absent, or indeterminate. Planned declarations alone make no current-host installation claim.
```

Leave `docs/host-support-policy.md` unchanged: its support-state vocabulary is not the native-plugin observation result defined by this seam.

- [ ] **Step 7: Verify documentation and task-local diff**

Run:

```bash
rg -n 'validate-host|static|planned|active|installed|absent|indeterminate|install|activate' docs/operations.md docs/host-adapters.md
git diff --check
git status --short
```

Expected: authority distinction and non-mutating behavior are explicit; no exposure manifest or Track C file changed.

- [ ] **Step 8: Commit Task 3**

```bash
git add lib/registry.mjs tests/native-plugin-validation.test.mjs bin/hhpe-registry-validate-host package.json docs/operations.md docs/host-adapters.md
git commit -m "feat: expose explicit native plugin host validation"
```

---

### Task 4: Verify Composition, Safety, and Complete Requirement Coverage

**Files:**
- Modify: `tests/native-plugin-validation.test.mjs`
- Test: `tests/registry.test.mjs` (no production or assertion change)

**Interfaces:**
- Consumes: static validation, host validation, and explicit CLI from Tasks 1–3.
- Produces: final evidence only; no new architecture.

- [ ] **Step 1: Add RED composition tests if not already covered**

Add focused tests proving both independent truth combinations:

```js
test('valid static declarations and missing required realization remain separate results', () => {
  assert.deepEqual(validateExposureDeclarations([exposure('pkg/a', 'one@market')], new Set(['pkg/a'])), []);
  const host = validateHostRealization({host: 'codex', context: 'deploy-5', exposures: [exposure('pkg/a', 'one@market')], inventoryProbe: observed('other@market')});
  assert.equal(host.category, 'host-realization');
  assert.equal(host.status, 'failed');
});

test('installed realization cannot approve malformed repository declaration', () => {
  const malformed = exposure('missing/cap', 'one@market');
  assert.ok(validateExposureDeclarations([malformed], new Set()).length > 0);
  const host = validateHostRealization({host: 'codex', context: 'deploy-6', exposures: [malformed], inventoryProbe: observed('one@market')});
  assert.equal(host.status, 'passed');
});
```

The second result demonstrates independent observations, not overall approval: callers must require static pass and applicable host pass.

- [ ] **Step 2: Run composition tests; implement only missing test support**

Run:

```bash
node --test --test-name-pattern='separate results|cannot approve' tests/native-plugin-validation.test.mjs
```

Expected: PASS when Tasks 1–3 already provide correct interfaces. If RED, fix only result composition defects; do not add a composed framework.

- [ ] **Step 3: Run fresh focused and full deterministic verification**

Run:

```bash
node --test --test-concurrency=1 tests/native-plugin-validation.test.mjs
node --test tests/registry.test.mjs
npm run validate
npm run skills:ci:static
npm test
```

Expected:

- zero-probe tests prove `validate()` and `staticIntegrity()` never call Codex inventory;
- static declaration tests retain status, capability, target, relationship, package, provenance, ToolSpec, and managed-object checks;
- installed/absent/indeterminate, active/planned, explicit pre-activation, one-probe, target-deduplication, and capability-evaluation tests pass;
- generic commands are ambient-plugin-independent;
- on this independent branch, Track B's ambient collision failure and Track C's absolute-symlink adapter parity failure may remain because neither independent remediation commit is present. Record exact results; do not claim repository-wide green.

- [ ] **Step 4: Run explicit contextual host evidence checks without mutation**

Run:

```bash
npm run validate:host -- --context developer-checkout
npm run validate:host -- --context preactivation-evidence --require-planned-target 00-hhpe-registry@hhpe-hrg
```

Expected: first exits `0` without inventory because current native-plugin exposures are all planned and unselected. Second may exit `0` or `1` according to this host; if `1`, JSON distinguishes `absent` from `indeterminate` and category is `host-realization`. Neither command writes manifests, installs plugins, or changes status. Record contextual result; do not use it as repository validity.

- [ ] **Step 5: Verify no hidden inventory coupling, provisioning, or persistence**

Run:

```bash
rg -n "plugin', *'list|plugin list" lib tests bin
rg -n 'plugin.*(install|add|remove)|install.*plugin|activate.*plugin' lib/registry.mjs bin/hhpe-registry-validate-host
git diff --name-only 4e0a852be267f5d1e52c77e425d2e089c6f4403f..HEAD
git diff --check
git status --short --branch
```

Expected: inventory command is reachable only from explicit host validation; no provisioning command exists; no host result persistence was added; `registry/manifests/exposures.yaml`, ToolSpec, Track C generator, ADR-026, and ToolSpec design are absent from diff; worktree is clean after commits.

- [ ] **Step 6: Review every specification requirement against final diff**

Confirm line-by-line:

- static validation asks only repository questions but still rejects malformed realization declarations;
- fail-if-called tests prove zero native inventory subprocesses in both static paths;
- explicit host/context and reviewed host binding determine applicability, never ambient traits;
- active requirements apply only to selected matching context; planned requirements require exact explicit selection;
- one probe yields target observations; each capability retains status, applicability, requirement source, and conclusion;
- installed, absent, and indeterminate observations preserve bounded process evidence;
- required indeterminate fails satisfaction without becoming absence or static failure;
- static and host result/exit categories are distinguishable;
- documentation distinguishes intended mechanism, active requirement, and observed current-host fact;
- no status change, installation, activation, host registry, generalized provider framework, Compatibility service, ToolSpec change, Track B change, or Track C change.

If any claim lacks fresh evidence, add the smallest focused test before reporting completion.

- [ ] **Step 7: Commit Task 4 composition tests**

```bash
git add tests/native-plugin-validation.test.mjs
git commit -m "test: verify native plugin authority separation"
```

## Requirement and Compatibility Matrix

| Surface | Commitment | Proving task/test |
| --- | --- | --- |
| `validate()` / `npm run validate` / `hhpe-registry-validate` | Preserved as generic static validation; no inventory | Task 1 fail-if-called tests |
| `staticIntegrity()` / `skills:ci:static` | Preserved as static category; no inherited host failure | Task 1 fail-if-called and registry tests |
| Static exposure declaration checks | Strengthened for status, capability, relationship, target syntax/safety | Task 1 table tests |
| Package/provenance/ToolSpec/managed-object checks | Preserved | Task 1 focused commands and final full suite |
| `planned` | Structurally valid; unrequired unless exact pre-activation target selected | Task 2 planned tests |
| `active` | Required only for matching explicit reviewed Codex host/context scope | Task 2 active/applicability tests |
| Host inventory | Moves from implicit static probe to explicit host operation | Tasks 1–3 zero-probe/CLI tests |
| Host observation | Installed/absent/indeterminate with bounded raw evidence | Task 2 table tests |
| Shared targets | One observation/probe, N capability evaluations | Task 2 deduplication tests |
| Static failure category | Remains `failed` / `FAIL_STATIC_INTEGRITY` for static facts only | Tasks 1 and 3 |
| Host failure category | New `host-realization`, distinct exit/result semantics | Task 3 CLI tests |
| Current exposure statuses | Preserved unchanged | Final diff review |
| Host result persistence | Not required and not added | Task 2 function test/final diff |
| Installation/activation | Not performed | Task 3 docs and Task 4 search |
| Track C projection | Unchanged | Final diff review |

## Planning Decisions Resolved

- Keep implementation beside existing registry validation in `lib/registry.mjs`; no new realization framework/module.
- Export `validateExposureDeclarations` for deterministic static fixture coverage.
- Use explicit `validateHostRealization({host, context, requiredPlannedTargets, inventoryProbe, exposures})`; `exposures` and `inventoryProbe` are narrow deterministic test/data seams.
- Support Codex only. Reviewed applicability is matching `host: codex` plus native-plugin mode in explicit scope.
- Treat context as required opaque caller input; do not derive hostname or create a registry.
- Parse successful nonempty textual `codex plugin list` output; empty, failed, unavailable, or unusable output remains indeterminate.
- Bound stdout/stderr at 16 KiB while retaining availability and exit status.
- Return target observations plus capability evaluations; use `satisfied: null` for unrequired planned policy.
- Add `validate-host`, `hhpe-registry-validate-host`, and `validate:host`; keep all generic command names static.
- Do not persist host results or modify `exposures.yaml`.

## Execution Gate

This plan authorizes no implementation by itself. Execute only after explicit approval, on `fix/native-plugin-validation-boundary`, with required execution/TDD/verification skills. Do not merge or push without separate authorization.
