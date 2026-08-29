# Cursor Realization Boundary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Realize the first approved Cursor slice: scoped user-local/project bindings, deterministic filesystem projection, a session-bound routing gate, and isolated local SDK acceptance fixtures.

**Architecture:** Start from the verified ToolSpec / native-plugin remediation baseline. Extend existing `exposures.yaml` + `sync({home})` + `created_by_hhpe` rollback with explicit Cursor `scope`, optional `cursor_visible_name` / `enforcement`, `projectRoot` injection, and one in-repo capability for `hhpe-hrg-plugin-stack`. Keep routing state in `cursor-plugin-routing` as session-keyed files. Treat `@cursor/sdk` as an optional local execution surface; hermetic filesystem and hook-stdin tests remain the always-on proof.

**Tech Stack:** Node.js ES modules, `node:test`, existing `lib/registry.mjs` / `cursor-plugin-routing`, optional `@cursor/sdk` for gated acceptance only.

## Global Constraints

- Binding specification: [`../specs/2026-08-21-cursor-realization-boundary-design.md`](../specs/2026-08-21-cursor-realization-boundary-design.md) at `32fefeb7fd54f99e91a02f1a84613e7f8f0fdc13`. The specification outranks this plan.
- Implementation baseline: `integrate/toolspec-remediations` at `63da34b3f3e20e5b0e7333286c04b881bc39b747`, or an equivalent revision that already contains portable ToolSpec separation, context-bound host-realization observations, static versus host-native-plugin validation, and hermetic `sync({home})`.
- Do not recreate or work around those solved contracts. Consume them.
- First slice only: realize `user-local` and `project`. Keep `cloud-project` representable. Do not apply it.
- MCP deferred.
- One binding = `capability + host: cursor + mechanism + scope + target`. One scope per binding. No automatic fan-out.
- Mechanisms are not capability identities. Allowed first-slice Cursor mechanisms: `skill-symlink`, `local-plugin`. Do not add `mcp` or a generalized hook-exposure mode unless a later task proves it is required.
- Skills, rules, and indexes are guidance. Hooks enforce only observable supported events.
- If a hook is the authoritative enforcement mechanism for a must-hold precondition, inability to establish that precondition must not silently degrade into guidance.
- Routing completion for context A ≠ authorization for context B.
- No `skills-cursor`, no hidden ranking claims, no generalized Compatibility framework, no host registry, no Cloud API, no CE/Superpowers/Caveman/Ponytail mechanism selection.
- Tests must not mutate the developer’s normal `~/.cursor`. `sync({apply:true})` imported against live `ROOT` writes `registry/manifests/migration-state.yaml` in this checkout. Apply-mode tests must use an isolated `HHPE_HRG_HOME` spawn, matching `tests/rollback.test.mjs`.
- `npm test` must stay green without `CURSOR_API_KEY` or a live Cursor agent.
- Do not run `scripts/generate-manifests.mjs` as part of this slice. It is a destructive writer for some manifests.
- Manifest files under `registry/manifests/*.yaml` are JSON text. Read them with `JSON.parse`.

## Implementation Base

Current `main` at `32fefeb7fd54f99e91a02f1a84613e7f8f0fdc13` contains the approved spec and this plan. It does **not** contain the ToolSpec / native-plugin remediations.

Required start, before Task 1 production work:

1. Create an execution branch from `63da34b3f3e20e5b0e7333286c04b881bc39b747`.
2. Bring in spec commits `1bbc0d25083724fc297b480f63178abc67f18e3d` and `32fefeb7fd54f99e91a02f1a84613e7f8f0fdc13`, plus this plan commit.
3. Do not rebase remediations away.

If those lineages cannot be combined without rewriting ToolSpec, native-plugin, or hermetic `sync({home})` contracts, **stop**. That is an execution blocker.

## Current Cursor Seam

| Surface | Producer | Consumer |
| --- | --- | --- |
| 14 Cursor skill exposures (`mode: skill-symlink`, `~/.cursor/skills/...`, no `scope`) | `registry/manifests/exposures.yaml` | `sync()` in `lib/registry.mjs` |
| Cursor adapter stub (`skill_root: null`) | `registry/adapters/cursor/adapter.json` | docs / inventory only |
| Relationship allowlist | `EXPOSURE_RELATIONSHIPS` — currently only `cursor\|skill-symlink\|registry/adapters/cursor` | `validateExposureDeclarations()` |
| Tilde expansion / hermetic home | `sync({apply, host, home})` | `tests/sync.test.mjs` |
| Managed ownership | `migration-state.yaml` `{path, kind: symlink, classification: created_by_hhpe, source, created_at}` | `rollback()`, `validateManagedToolLinks()` |
| Collision | preexisting non-matching target → `COLLISION` | `tests/sync.test.mjs` |
| Plugin routing source | `cursor-plugin-routing/**` | README symlink; **not** an exposure |
| Complete flag | `markRoutingComplete({fingerprintPath, routingCompleteFlagPath})` / `isRoutingComplete({routingCompleteFlagPath, routingFingerprintPath, currentFingerprintPath})` | `hooks/route-gate.mjs`, `scripts/mark-routing-complete.mjs` |
| Route gate | stdin JSON; uses `data.command` only; catch → `{permission: allow}` | Cursor `beforeShellExecution` |
| Project `.cursor` | none in this repo | SDK would load project `.cursor` from `local.cwd` |
| SDK | absent from `package.json` | `lib/skills-ci.mjs` looks for `cursor-agent` |

Baseline already injects `home`. It does not inject `projectRoot`, `scope`, or session-bound routing.

## Planning decisions resolved by this plan

| Decision | Choice | Why |
| --- | --- | --- |
| Binding representation | Optional Cursor fields on existing exposure records: `scope`, `cursor_visible_name`, `enforcement` | Smallest change; `mode` remains the mechanism |
| `hhpe-hrg-plugin-stack` | **Curated Market-owned projection** | Source already lives in this repo; first slice must project it into fixtures; the README symlink is unmanaged today |
| Plugin-routing scopes | Two distinct bindings: `user-local` local-plugin and `project` local-plugin | Spec forbids fan-out; Cloud later needs a repo-visible copy; first-slice fixtures need both roots |
| Hook mechanism exposure | Not added this slice | Enforcement is tested by invoking the plugin hook module; SDK fixtures may copy `hooks/hooks.json` into a temp project without a third registry mode |
| Routing-context identity | **session**, from `payload.conversation_id \|\| payload.conversationId \|\| payload.session_id \|\| payload.executionContext` | Present on Cursor hook stdin; matches mark-once-then-execute; smaller than global; `generation_id` would invalidate mid-plan shells |
| Must-hold hook | `beforeShellExecution` route-gate: `failClosed: true`; missing/stale/unreadable session state → `deny` | Spec §8; this hook is the authoritative gate |
| Guidance hook | `sessionStart` remains `failClosed: false` | Index refresh is not a must-hold precondition |
| First-slice pool migration | Classify/report only; do not retarget the 67 pool links | Not required to prove the slice |
| First-slice aliases | Record `cursor_visible_name` on the 14 existing Cursor skill bindings; treat un-namespaced pool names as `unmanaged-foreign` | Avoids duplicate canonical IDs |
| SDK | Optional gated suite; hermetic tests always run | `npm test` must not require API keys |
| MCP | Deferred | Not required |
| Cloud apply | Schema-legal `.cursor/...` declaration; sync `SKIP` reason `cloud-project-not-implemented` | Representable, unimplemented |
| Test injection | `home`, `projectRoot`, `executionContext` / `sessionId` | No host/filesystem framework |

## File map

- Modify: `registry/manifests/exposures.yaml`
- Modify: `registry/manifests/packages.lock.yaml`
- Modify: `registry/manifests/capabilities.yaml`
- Modify: `registry/adapters/cursor/adapter.json`
- Modify: `lib/registry.mjs`
- Modify: `cursor-plugin-routing/scripts/plugin-description-index.mjs`
- Modify: `cursor-plugin-routing/scripts/mark-routing-complete.mjs`
- Modify: `cursor-plugin-routing/hooks/route-gate.mjs`
- Modify: `cursor-plugin-routing/hooks/hooks.json`
- Modify: `tests/sync.test.mjs`
- Modify: `tests/plugin-routing-index.test.mjs`
- Create: `tests/cursor-realization.test.mjs`
- Create: `tests/cursor-routing-gate.test.mjs`
- Create: `tests/cursor-sdk-acceptance.test.mjs`
- Create: `lib/cursor-provenance.mjs`
- Modify: `docs/operations.md`
- Modify: `docs/project_status/plugin-routing-cursor.md`

Do not modify unmanaged `~/.cursor` in any task.

---

### Task 1: Characterize the current Cursor seam

**Files:**
- Create: `tests/cursor-realization.test.mjs`
- Modify: none
- Test: `tests/cursor-realization.test.mjs`

**Interfaces:**
- Consumes: current `exposures.yaml`, `EXPOSURE_RELATIONSHIPS` via `validateExposureDeclarations`, `sync({home})`.
- Produces: a green characterization of the pre-change Cursor seam. Desired-scope tests belong in Task 2.

- [ ] **Step 1: Write the passing characterization tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {ROOT, validateExposureDeclarations} from '../lib/registry.mjs';

const exposures = JSON.parse(fs.readFileSync(path.join(ROOT, 'registry/manifests/exposures.yaml'), 'utf8')).exposures;
const cursor = exposures.filter(e => e.host === 'cursor');

test('Cursor exposures are the fourteen skill-symlink rows', () => {
  assert.equal(cursor.length, 14);
  assert.ok(cursor.every(e => e.mode === 'skill-symlink'));
  assert.ok(cursor.every(e => e.adapter === 'registry/adapters/cursor'));
  assert.ok(cursor.every(e => e.target.startsWith('~/.cursor/skills/')));
  assert.ok(cursor.every(e => e.scope === undefined));
});

test('plugin-stack is not a registry capability or exposure', () => {
  const capabilities = JSON.parse(fs.readFileSync(path.join(ROOT, 'registry/manifests/capabilities.yaml'), 'utf8')).capabilities;
  assert.equal(capabilities.some(c => c.capability_id === 'hhpe-hrg/cursor-plugin-routing'), false);
  assert.equal(cursor.some(e => /hhpe-hrg-plugin-stack/.test(e.target)), false);
});

test('Cursor local-plugin relationship is not yet allowed', () => {
  const errors = validateExposureDeclarations([
    {
      capability_id: 'hhpe-hrg/session-start',
      host: 'cursor',
      mode: 'local-plugin',
      adapter: 'registry/adapters/cursor',
      target: '~/.cursor/plugins/local/hhpe-hrg-plugin-stack',
      status: 'active',
    },
  ], new Set(['hhpe-hrg/session-start']));
  assert.ok(errors.some(e => e.includes('invalid exposure relationship')));
});
```

- [ ] **Step 2: Run the test and confirm GREEN**

Run: `node --test tests/cursor-realization.test.mjs`

Expected: PASS. These assertions document current main/baseline Cursor shape.

- [ ] **Step 3: No production change**

- [ ] **Step 4: Commit**

```bash
git add tests/cursor-realization.test.mjs
git commit -m "test: characterize current Cursor realization seam"
```

---

### Task 2: Add explicit scoped Cursor realization bindings

**Files:**
- Modify: `registry/manifests/exposures.yaml`
- Modify: `lib/registry.mjs` (`validateExposureDeclarations`, `EXPOSURE_RELATIONSHIPS`)
- Modify: `registry/adapters/cursor/adapter.json`
- Modify: `tests/cursor-realization.test.mjs`
- Test: `tests/cursor-realization.test.mjs`

**Interfaces:**
- Consumes: Task 1 characterization.
- Produces: `validateExposureDeclarations(exposures, capabilityIds)` for `host === 'cursor'` also rejects missing/unknown `scope`, illegal scope/target pairs, `skills-cursor`, host-absolute targets, invalid `enforcement`, duplicate `host+capability+scope+target`, and duplicate `host+scope+cursor_visible_name`. Allows `cloud-project` declarations that target `.cursor/...`. Allows `cursor|local-plugin|registry/adapters/cursor`.

- [ ] **Step 1: Replace the “no scope” characterization and add failing contract tests**

Change the first Task 1 test so it now requires `scope` and `enforcement` on every Cursor row. Add:

```js
test('every Cursor exposure declares exactly one approved scope and enforcement', () => {
  assert.ok(cursor.length >= 14);
  for (const e of cursor) {
    assert.equal(['user-local', 'project', 'cloud-project'].includes(e.scope), true, e.capability_id);
    assert.equal(['guidance', 'enforceable'].includes(e.enforcement), true, e.capability_id);
  }
});

test('cloud-project is representable without being applied', () => {
  const errors = validateExposureDeclarations([
    {
      capability_id: 'hhpe-hrg/session-start',
      host: 'cursor',
      mode: 'skill-symlink',
      adapter: 'registry/adapters/cursor',
      target: '.cursor/skills/session-start',
      status: 'planned',
      scope: 'cloud-project',
      enforcement: 'guidance',
    },
  ], new Set(['hhpe-hrg/session-start']));
  assert.equal(errors.length, 0);
});

test('user-local Cursor target cannot be a project path', () => {
  const errors = validateExposureDeclarations([
    {
      capability_id: 'hhpe-hrg/session-start',
      host: 'cursor',
      mode: 'skill-symlink',
      adapter: 'registry/adapters/cursor',
      target: '.cursor/skills/session-start',
      status: 'active',
      scope: 'user-local',
      enforcement: 'guidance',
    },
  ], new Set(['hhpe-hrg/session-start']));
  assert.ok(errors.some(e => e.includes('illegal scope/target')));
});

test('project Cursor target cannot be a home path', () => {
  const errors = validateExposureDeclarations([
    {
      capability_id: 'hhpe-hrg/session-start',
      host: 'cursor',
      mode: 'skill-symlink',
      adapter: 'registry/adapters/cursor',
      target: '~/.cursor/skills/session-start',
      status: 'active',
      scope: 'project',
      enforcement: 'guidance',
    },
  ], new Set(['hhpe-hrg/session-start']));
  assert.ok(errors.some(e => e.includes('illegal scope/target')));
});

test('Cursor targets may not use skills-cursor or host-absolute paths', () => {
  for (const target of ['~/.cursor/skills-cursor/x', '/Users/maxholden/.cursor/skills/x']) {
    const errors = validateExposureDeclarations([
      {
        capability_id: 'hhpe-hrg/session-start',
        host: 'cursor',
        mode: 'skill-symlink',
        adapter: 'registry/adapters/cursor',
        target,
        status: 'active',
        scope: 'user-local',
        enforcement: 'guidance',
      },
    ], new Set(['hhpe-hrg/session-start']));
    assert.ok(errors.some(e => e.includes('unsafe target') || e.includes('illegal scope/target')), target);
  }
});

test('skill-symlink cannot be declared enforceable', () => {
  const errors = validateExposureDeclarations([
    {
      capability_id: 'hhpe-hrg/session-start',
      host: 'cursor',
      mode: 'skill-symlink',
      adapter: 'registry/adapters/cursor',
      target: '~/.cursor/skills/session-start',
      status: 'active',
      scope: 'user-local',
      enforcement: 'enforceable',
    },
  ], new Set(['hhpe-hrg/session-start']));
  assert.ok(errors.some(e => e.includes('unsupported enforcement')));
});

test('duplicate Cursor-visible names on one host and scope are rejected', () => {
  const row = {
    capability_id: 'trailofbits/c-review',
    host: 'cursor',
    mode: 'skill-symlink',
    adapter: 'registry/adapters/cursor',
    status: 'active',
    scope: 'user-local',
    enforcement: 'guidance',
    cursor_visible_name: 'c-review',
  };
  const errors = validateExposureDeclarations([
    {...row, target: '~/.cursor/skills/trailofbits-c-review'},
    {...row, target: '~/.cursor/skills/c-review'},
  ], new Set(['trailofbits/c-review']));
  assert.ok(errors.some(e => e.includes('ambiguous Cursor-visible name')));
});
```

- [ ] **Step 2: Run and confirm RED**

Run: `node --test tests/cursor-realization.test.mjs`

Expected: FAIL because current Cursor exposures have no `scope` / `enforcement` and the extra validation rules do not exist.

- [ ] **Step 3: Minimum GREEN**

Add to `EXPOSURE_RELATIONSHIPS`:

```js
'cursor|local-plugin|registry/adapters/cursor',
```

In `validateExposureDeclarations`, after the existing per-exposure checks, and only when `exposure.host === 'cursor'`:

```js
const CURSOR_SCOPES = new Set(['user-local', 'project', 'cloud-project']);
const CURSOR_ENFORCEMENT = new Set(['guidance', 'enforceable']);
const GUIDANCE_MODES = new Set(['skill-symlink', 'skill', 'rule', 'local-plugin']);
if (!CURSOR_SCOPES.has(exposure.scope)) errors.push(`unsupported Cursor scope ${exposure.capability_id}: ${exposure.scope}`);
if (!CURSOR_ENFORCEMENT.has(exposure.enforcement)) errors.push(`unsupported Cursor enforcement ${exposure.capability_id}: ${exposure.enforcement}`);
if (GUIDANCE_MODES.has(exposure.mode) && exposure.enforcement === 'enforceable') {
  errors.push(`unsupported enforcement ${exposure.capability_id}: ${exposure.mode} cannot be enforceable`);
}
const target = exposure.target || '';
if (target.includes('skills-cursor') || /^(?:\/|\\\\|[A-Za-z]:\\)/.test(target)) {
  errors.push(`unsafe target ${exposure.capability_id}`);
}
if (exposure.scope === 'user-local' && !target.startsWith('~/.cursor/')) errors.push(`illegal scope/target ${exposure.capability_id}`);
if (exposure.scope === 'project' && !target.startsWith('.cursor/')) errors.push(`illegal scope/target ${exposure.capability_id}`);
if (exposure.scope === 'cloud-project' && !target.startsWith('.cursor/')) errors.push(`illegal scope/target ${exposure.capability_id}`);
```

After the loop, scan Cursor exposures for duplicate `host|capability_id|scope|target` and duplicate `host|scope|cursor_visible_name` when `cursor_visible_name` is present.

On every existing Cursor skill-symlink row set:

```json
"scope": "user-local",
"enforcement": "guidance",
"cursor_visible_name": "<basename after ~/.cursor/skills/>"
```

Example: `~/.cursor/skills/trailofbits-c-review` → `cursor_visible_name: "trailofbits-c-review"`. Do not also bind `c-review`.

Update `registry/adapters/cursor/adapter.json` to record that Cursor bindings require `scope` and that `skill_root` for skill-symlink is `~/.cursor/skills`. Do not invent a realization engine. Suggested fields:

```json
{
  "mode": "scoped-filesystem-projection",
  "skill_root": "~/.cursor/skills",
  "scopes": ["user-local", "project", "cloud-project"],
  "preserve": ["settings", "rules", "mcp", "agents", "plugins"],
  "reload": "window-reload"
}
```

Do not add plugin-stack exposures yet.

- [ ] **Step 4: Run tests GREEN**

Run: `node --test tests/cursor-realization.test.mjs tests/registry.test.mjs tests/sync.test.mjs tests/native-plugin-validation.test.mjs`

Expected: PASS. Codex native-plugin fixtures are unchanged because the new checks are Cursor-only. Existing hermetic sync tests still pass because `sync` ignores unknown fields.

- [ ] **Step 5: Commit**

```bash
git add registry/manifests/exposures.yaml registry/adapters/cursor/adapter.json lib/registry.mjs tests/cursor-realization.test.mjs
git commit -m "feat: add scoped Cursor realization bindings"
```

---

### Task 3: Deterministic user-local and project filesystem projection

**Files:**
- Modify: `lib/registry.mjs` (`sync` signature and target resolution; CLI `--home` / `--project-root`)
- Modify: `registry/manifests/packages.lock.yaml`
- Modify: `registry/manifests/capabilities.yaml`
- Modify: `registry/manifests/exposures.yaml`
- Modify: `tests/sync.test.mjs`
- Modify: `tests/cursor-realization.test.mjs`
- Test: `tests/sync.test.mjs`, `tests/cursor-realization.test.mjs`, `tests/rollback.test.mjs`

**Interfaces:**
- Consumes: `sync({apply=false, host=null, home=os.homedir()}={})`.
- Produces: `sync({apply=false, host=null, home=os.homedir(), projectRoot=null}={})`.
- Target resolution:
  - non-Cursor: existing `target.replace(/^~(?=\/)/, home)`
  - Cursor `user-local`: `target.replace(/^~(?=\/)/, home)`
  - Cursor `project`: if `projectRoot` is a non-empty string, `path.join(projectRoot, target)`; else action `SKIP` reason `projectRoot-required`
  - Cursor `cloud-project`: action `SKIP` reason `cloud-project-not-implemented`; never create files
- `local-plugin` uses the same LINK/SKIP/COLLISION path as `skill-symlink`.
- Ownership record on apply: `{path, kind: 'symlink', classification: 'created_by_hhpe', source, capability_id, host, scope, created_at}`. Rollback still requires symlink + `realpath(path) === realpath(source)`. Extra fields are provenance, not a new rollback heuristic.
- CLI: `sync --apply --host cursor --home <dir> --project-root <dir>`. Do not add test-only flags.

**Plugin-stack ownership:** Curated Market-owned projection.

Add overlay package:

```json
{
  "package_id": "hhpe-cursor-plugin-routing",
  "repository": "local:hhpe-hrg",
  "revision": { "type": "overlay", "value": "1" },
  "package_root": "cursor-plugin-routing",
  "integrity": { "policy": "tracked-by-registry-git" },
  "license": { "spdx": "MIT", "path": "." },
  "modified": true,
  "architectural_owner": "hhpe-hrg"
}
```

Add capability:

```json
{
  "capability_id": "hhpe-hrg/cursor-plugin-routing",
  "display_name": "cursor-plugin-routing",
  "package_id": "hhpe-cursor-plugin-routing",
  "type": "plugin",
  "source_path": ".",
  "self_contained": true,
  "requires": {
    "files": [".cursor-plugin/plugin.json", "hooks/hooks.json", "hooks/route-gate.mjs"]
  },
  "architecture": {
    "owner": "hhpe-hrg",
    "decision_record": "docs/superpowers/specs/2026-08-21-cursor-realization-boundary-design.md"
  }
}
```

Add **two** bindings, not one binding with two scopes:

```json
{
  "capability_id": "hhpe-hrg/cursor-plugin-routing",
  "host": "cursor",
  "mode": "local-plugin",
  "adapter": "registry/adapters/cursor",
  "target": "~/.cursor/plugins/local/hhpe-hrg-plugin-stack",
  "status": "active",
  "scope": "user-local",
  "enforcement": "guidance",
  "cursor_visible_name": "hhpe-hrg-plugin-stack"
}
```

```json
{
  "capability_id": "hhpe-hrg/cursor-plugin-routing",
  "host": "cursor",
  "mode": "local-plugin",
  "adapter": "registry/adapters/cursor",
  "target": ".cursor/plugins/local/hhpe-hrg-plugin-stack",
  "status": "active",
  "scope": "project",
  "enforcement": "guidance",
  "cursor_visible_name": "hhpe-hrg-plugin-stack"
}
```

Same visible name is legal because scopes differ. Rejecting cross-scope alias collision is out of scope.

- [ ] **Step 1: Write failing projection tests**

Append to `tests/sync.test.mjs`. Reuse `withHome` and `actionFor`. Add `withProject`:

```js
function withProject(run) {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'hhpe-sync-project-'));
  try { return run(projectRoot); }
  finally { fs.rmSync(projectRoot, {recursive: true, force: true}); }
}

test('project scope plans LINK under injected projectRoot only', () => withHome(home => withProject(projectRoot => {
  const projectTarget = path.join(projectRoot, '.cursor/plugins/local/hhpe-hrg-plugin-stack');
  const userTarget = path.join(home, '.cursor/plugins/local/hhpe-hrg-plugin-stack');
  const developerPlugin = path.join(os.homedir(), '.cursor/plugins/local/hhpe-hrg-plugin-stack');
  const beforeDeveloper = fs.existsSync(developerPlugin);
  const result = sync({host: 'cursor', home, projectRoot});
  assert.equal(actionFor(result, projectTarget)?.action, 'LINK');
  assert.equal(actionFor(result, userTarget)?.action, 'LINK');
  assert.equal(fs.existsSync(projectTarget), false);
  assert.equal(fs.existsSync(userTarget), false);
  assert.equal(fs.existsSync(developerPlugin), beforeDeveloper);
})));

test('missing projectRoot skips project bindings and does not use process cwd', () => withHome(home => {
  const result = sync({host: 'cursor', home});
  assert.ok(result.actions.some(a => a.reason === 'projectRoot-required' && a.action === 'SKIP'));
  assert.equal(result.actions.some(a => typeof a.target === 'string' && a.target.startsWith(process.cwd() + path.sep + '.cursor')), false);
}));
```

Use this isolated apply helper in the same file:

```js
import {spawnSync} from 'node:child_process';

function isolatedApply({home, projectRoot, extraExposures = []}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hhpe-sync-root-'));
  fs.mkdirSync(path.join(root, 'lib'), {recursive: true});
  fs.mkdirSync(path.join(root, 'registry/manifests'), {recursive: true});
  fs.mkdirSync(path.join(root, 'cursor-plugin-routing/.cursor-plugin'), {recursive: true});
  fs.writeFileSync(path.join(root, 'cursor-plugin-routing/.cursor-plugin/plugin.json'), '{"name":"hhpe-hrg-plugin-stack"}\n');
  fs.mkdirSync(path.join(root, 'cursor-plugin-routing/hooks'), {recursive: true});
  fs.writeFileSync(path.join(root, 'cursor-plugin-routing/hooks/hooks.json'), '{}\n');
  fs.writeFileSync(path.join(root, 'cursor-plugin-routing/hooks/route-gate.mjs'), 'export {}\n');
  fs.copyFileSync(new URL('../lib/registry.mjs', import.meta.url), path.join(root, 'lib/registry.mjs'));
  fs.copyFileSync(new URL('../lib/tool-contracts.mjs', import.meta.url), path.join(root, 'lib/tool-contracts.mjs'));
  const write = (name, value) => fs.writeFileSync(path.join(root, 'registry/manifests', name), JSON.stringify(value));
  write('packages.lock.yaml', {packages: [{package_id: 'hhpe-cursor-plugin-routing', revision: {type: 'overlay', value: '1'}, package_root: 'cursor-plugin-routing', license: {path: '.'}}]});
  write('capabilities.yaml', {capabilities: [{capability_id: 'hhpe-hrg/cursor-plugin-routing', package_id: 'hhpe-cursor-plugin-routing', type: 'plugin', source_path: '.', requires: {files: []}}]});
  write('exposures.yaml', {exposures: [
    {capability_id: 'hhpe-hrg/cursor-plugin-routing', host: 'cursor', mode: 'local-plugin', adapter: 'registry/adapters/cursor', target: '~/.cursor/plugins/local/hhpe-hrg-plugin-stack', status: 'active', scope: 'user-local', enforcement: 'guidance'},
    {capability_id: 'hhpe-hrg/cursor-plugin-routing', host: 'cursor', mode: 'local-plugin', adapter: 'registry/adapters/cursor', target: '.cursor/plugins/local/hhpe-hrg-plugin-stack', status: 'active', scope: 'project', enforcement: 'guidance'},
    ...extraExposures,
  ]});
  write('migration-state.yaml', {phase: 'test', managed_objects: [], limitations: []});
  write('tools.yaml', {tools: []});
  const args = ['sync', '--apply', '--host', 'cursor', '--home', home];
  if (projectRoot) args.push('--project-root', projectRoot);
  const result = spawnSync(process.execPath, [path.join(root, 'lib/registry.mjs'), ...args], {
    env: {...process.env, HHPE_HRG_HOME: root},
    encoding: 'utf8',
  });
  return {root, result};
}
```

Then:

```js
test('apply mutates only owned destinations and is idempotent', () => withHome(home => withProject(projectRoot => {
  const first = isolatedApply({home, projectRoot});
  assert.equal(first.result.status, 0, first.result.stderr);
  const userTarget = path.join(home, '.cursor/plugins/local/hhpe-hrg-plugin-stack');
  const projectTarget = path.join(projectRoot, '.cursor/plugins/local/hhpe-hrg-plugin-stack');
  assert.equal(fs.lstatSync(userTarget).isSymbolicLink(), true);
  assert.equal(fs.lstatSync(projectTarget).isSymbolicLink(), true);
  const state = JSON.parse(fs.readFileSync(path.join(first.root, 'registry/manifests/migration-state.yaml'), 'utf8'));
  assert.ok(state.managed_objects.every(o => o.classification === 'created_by_hhpe' && o.source && o.capability_id && o.scope));
  const second = spawnSync(process.execPath, [path.join(first.root, 'lib/registry.mjs'), 'sync', '--apply', '--host', 'cursor', '--home', home, '--project-root', projectRoot], {env: {...process.env, HHPE_HRG_HOME: first.root}, encoding: 'utf8'});
  assert.equal(second.status, 0, second.stderr);
  const plan = JSON.parse(second.stdout);
  assert.ok(plan.actions.filter(a => a.target === userTarget || a.target === projectTarget).every(a => a.action === 'SKIP'));
  fs.rmSync(first.root, {recursive: true, force: true});
})));

test('dry-run does not create project or user-local plugin destinations', () => withHome(home => withProject(projectRoot => {
  const result = sync({host: 'cursor', home, projectRoot});
  assert.equal(result.mode, 'dry-run');
  assert.equal(fs.existsSync(path.join(home, '.cursor/plugins/local/hhpe-hrg-plugin-stack')), false);
  assert.equal(fs.existsSync(path.join(projectRoot, '.cursor/plugins/local/hhpe-hrg-plugin-stack')), false);
}));

test('unmanaged plugin destination remains a collision', () => withHome(home => {
  const target = path.join(home, '.cursor/plugins/local/hhpe-hrg-plugin-stack');
  fs.mkdirSync(target, {recursive: true});
  fs.writeFileSync(path.join(target, 'owned.txt'), 'keep\n');
  const result = sync({host: 'cursor', home});
  assert.equal(actionFor(result, target)?.action, 'COLLISION');
  assert.equal(fs.readFileSync(path.join(target, 'owned.txt'), 'utf8'), 'keep\n');
}));

test('cloud-project rows never create files', () => withHome(home => withProject(projectRoot => {
  const extra = [{
    capability_id: 'hhpe-hrg/cursor-plugin-routing',
    host: 'cursor',
    mode: 'local-plugin',
    adapter: 'registry/adapters/cursor',
    target: '.cursor/plugins/local/cloud-only',
    status: 'planned',
    scope: 'cloud-project',
    enforcement: 'guidance',
  }];
  const first = isolatedApply({home, projectRoot, extraExposures: extra});
  assert.equal(fs.existsSync(path.join(projectRoot, '.cursor/plugins/local/cloud-only')), false);
  const plan = JSON.parse(first.result.stdout);
  assert.ok(plan.actions.some(a => a.reason === 'cloud-project-not-implemented' && a.action === 'SKIP'));
  fs.rmSync(first.root, {recursive: true, force: true});
})));
```

Existing empty / expected-link / mismatched-link / unmanaged-file / unmanaged-directory / home-isolation tests stay. They already cover those collision classes for skill-symlink.

- [ ] **Step 2: Run RED**

Run: `node --test tests/sync.test.mjs`

Expected: FAIL because `projectRoot` is ignored, plugin-stack bindings do not exist, and CLI does not accept `--home` / `--project-root`.

- [ ] **Step 3: Minimum GREEN**

Resolve targets inside `sync`:

```js
function resolveExposureTarget(exposure, {home, projectRoot}) {
  if (exposure.host === 'cursor' && exposure.scope === 'cloud-project') {
    return {skip: 'cloud-project-not-implemented'};
  }
  if (exposure.host === 'cursor' && exposure.scope === 'project') {
    if (!projectRoot) return {skip: 'projectRoot-required'};
    return {target: path.join(projectRoot, exposure.target)};
  }
  return {target: exposure.target.replace(/^~(?=\/)/, home)};
}
```

Keep LINK/SKIP/COLLISION. On apply, record `capability_id`, `host`, and `scope` on the managed object. Never delete sibling `.cursor` files. Never walk `~/.cursor` or project `.cursor` to discover extra owners.

Wire CLI:

```js
else if (argument === '--home') values.home = args[++index];
else if (argument === '--project-root') values.projectRoot = args[++index];
```

Pass those into `sync`.

- [ ] **Step 4: Run GREEN**

Run: `node --test tests/sync.test.mjs tests/cursor-realization.test.mjs tests/rollback.test.mjs tests/registry.test.mjs`

Expected: PASS. Rollback still refuses retargeted or non-symlink objects. Update the Task 1 “plugin-stack is not a registry capability” test so it now asserts the capability and both scoped bindings exist.

- [ ] **Step 5: Commit**

```bash
git add lib/registry.mjs registry/manifests/packages.lock.yaml registry/manifests/capabilities.yaml registry/manifests/exposures.yaml tests/sync.test.mjs tests/cursor-realization.test.mjs
git commit -m "feat: project Cursor bindings with explicit ownership"
```

---

### Task 4: Context-bound routing gate

**Files:**
- Modify: `cursor-plugin-routing/scripts/plugin-description-index.mjs`
- Modify: `cursor-plugin-routing/scripts/mark-routing-complete.mjs`
- Modify: `cursor-plugin-routing/hooks/route-gate.mjs`
- Modify: `cursor-plugin-routing/hooks/hooks.json`
- Modify: `tests/plugin-routing-index.test.mjs`
- Create: `tests/cursor-routing-gate.test.mjs`
- Test: `tests/cursor-routing-gate.test.mjs`, `tests/plugin-routing-index.test.mjs`

**Interfaces:**
- Consumes:
  - `markRoutingComplete({fingerprintPath, routingCompleteFlagPath})`
  - `isRoutingComplete({routingCompleteFlagPath, routingFingerprintPath, currentFingerprintPath})`
- Produces the same functions plus optional `sessionId` / `stateDir`:
  - `sessionIdFromHookPayload(data)` → `string | null`
  - `routingCompletePath({stateDir, sessionId, routingCompleteFlagPath})` → path
  - `markRoutingComplete({fingerprintPath, routingCompleteFlagPath, stateDir, sessionId})`
  - `isRoutingComplete({routingCompleteFlagPath, routingFingerprintPath, currentFingerprintPath, stateDir, sessionId})`
  - `evaluateRouteGate({command, payload, stateDir, fingerprintPath, disableGate})` → `{permission, reason}`
- Session id: `payload.conversation_id || payload.conversationId || payload.session_id || payload.executionContext`
- When `sessionId` is provided, state file is `path.join(stateDir, 'routing-complete.' + encodeURIComponent(sessionId) + '.json')` containing `{session_id, fingerprint, recorded_at}`.
- Legacy `routing-complete.json` is never treated as authorization for a gated command.
- Lifetime: valid only while `session_id` matches and fingerprint matches current index fingerprint.
- Must-hold: `beforeShellExecution` route-gate. Gated command + missing session id, missing/stale state, or unreadable state → `{permission: 'deny'}`. Remove catch-all allow for gated commands.
- Guidance: `sessionStart` remains `failClosed: false`.
- `CURSOR_PLUGIN_ROUTING_DISABLE_GATE=1` remains an explicit operator bypass.

- [ ] **Step 1: Write failing gate tests**

Create `tests/cursor-routing-gate.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {markRoutingComplete, isRoutingComplete, sessionIdFromHookPayload} from '../cursor-plugin-routing/scripts/plugin-description-index.mjs';
import {evaluateRouteGate} from '../cursor-plugin-routing/hooks/route-gate.mjs';

function withState(run) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hhpe-route-'));
  const fingerprintPath = path.join(dir, '.fingerprint');
  fs.writeFileSync(fingerprintPath, 'fp1');
  try { return run({dir, fingerprintPath}); }
  finally { fs.rmSync(dir, {recursive: true, force: true}); }
}

test('session id prefers conversation_id', () => {
  assert.equal(sessionIdFromHookPayload({conversation_id: 'sess-a', session_id: 'other'}), 'sess-a');
  assert.equal(sessionIdFromHookPayload({command: 'git commit'}), null);
});

test('completion for session A does not authorize session B', async () => withState(async ({dir, fingerprintPath}) => {
  await markRoutingComplete({fingerprintPath, stateDir: dir, sessionId: 'sess-a'});
  assert.equal(await isRoutingComplete({currentFingerprintPath: fingerprintPath, stateDir: dir, sessionId: 'sess-a'}), true);
  assert.equal(await isRoutingComplete({currentFingerprintPath: fingerprintPath, stateDir: dir, sessionId: 'sess-b'}), false);
  const denied = await evaluateRouteGate({
    command: 'git commit -m x',
    payload: {conversation_id: 'sess-b'},
    stateDir: dir,
    fingerprintPath,
  });
  assert.equal(denied.permission, 'deny');
  assert.equal(denied.reason, 'incomplete-or-stale');
}));

test('gated command without session id denies', async () => {
  const denied = await evaluateRouteGate({
    command: 'rm -rf /tmp/x',
    payload: {command: 'rm -rf /tmp/x'},
    stateDir: '/tmp',
    fingerprintPath: '/tmp/missing',
  });
  assert.equal(denied.permission, 'deny');
  assert.equal(denied.reason, 'missing-session');
});

test('stale fingerprint denies', async () => withState(async ({dir, fingerprintPath}) => {
  await markRoutingComplete({fingerprintPath, stateDir: dir, sessionId: 'sess-a'});
  fs.writeFileSync(fingerprintPath, 'fp2');
  const denied = await evaluateRouteGate({
    command: 'git push',
    payload: {conversation_id: 'sess-a'},
    stateDir: dir,
    fingerprintPath,
  });
  assert.equal(denied.permission, 'deny');
}));

test('valid session state allows gated command', async () => withState(async ({dir, fingerprintPath}) => {
  await markRoutingComplete({fingerprintPath, stateDir: dir, sessionId: 'sess-a'});
  const allowed = await evaluateRouteGate({
    command: 'git commit -m x',
    payload: {conversation_id: 'sess-a'},
    stateDir: dir,
    fingerprintPath,
  });
  assert.equal(allowed.permission, 'allow');
}));

test('non-gated command remains guidance-only allow', async () => {
  const allowed = await evaluateRouteGate({
    command: 'ls',
    payload: {conversation_id: 's'},
    stateDir: '/tmp',
    fingerprintPath: '/tmp/missing',
  });
  assert.equal(allowed.permission, 'allow');
  assert.equal(allowed.reason, 'not-gated');
});

test('unreadable must-hold state denies instead of catch-allow', async () => {
  const denied = await evaluateRouteGate({
    command: 'git commit -m x',
    payload: {conversation_id: 'sess-a'},
    stateDir: '/definitely-not-a-usable-state-dir',
    fingerprintPath: '/definitely-not-a-fingerprint',
  });
  assert.equal(denied.permission, 'deny');
});

test('legacy global routing-complete.json does not authorize', async () => withState(async ({dir, fingerprintPath}) => {
  fs.writeFileSync(path.join(dir, 'routing-complete.json'), JSON.stringify({fingerprint: 'fp1'}));
  const denied = await evaluateRouteGate({
    command: 'git commit -m x',
    payload: {conversation_id: 'sess-a'},
    stateDir: dir,
    fingerprintPath,
  });
  assert.equal(denied.permission, 'deny');
}));
```

Export `evaluateRouteGate` from `route-gate.mjs`. Keep `main()` reading stdin and printing JSON `{permission}`.

- [ ] **Step 2: Run RED**

Run: `node --test tests/cursor-routing-gate.test.mjs`

Expected: FAIL — `sessionIdFromHookPayload` / `evaluateRouteGate` are missing; current catch path allows on error.

- [ ] **Step 3: Minimum GREEN**

Add `sessionIdFromHookPayload` and `routingCompletePath` in `plugin-description-index.mjs`. When `sessionId` is supplied, `markRoutingComplete` / `isRoutingComplete` use the session-keyed file. When it is omitted, keep the old path so the existing index test can be updated in the same task rather than silently authorizing a global flag.

In `evaluateRouteGate`:

```js
export async function evaluateRouteGate({command, payload, stateDir, fingerprintPath, disableGate} = {}) {
  if (disableGate || process.env.CURSOR_PLUGIN_ROUTING_DISABLE_GATE === '1') {
    return {permission: 'allow', reason: 'operator-bypass'};
  }
  if (!shouldGateShellCommand(command)) return {permission: 'allow', reason: 'not-gated'};
  const sessionId = sessionIdFromHookPayload(payload || {});
  if (!sessionId) return {permission: 'deny', reason: 'missing-session'};
  try {
    const ok = await isRoutingComplete({
      stateDir,
      sessionId,
      currentFingerprintPath: fingerprintPath,
    });
    return ok
      ? {permission: 'allow', reason: 'complete'}
      : {permission: 'deny', reason: 'incomplete-or-stale'};
  } catch {
    return {permission: 'deny', reason: 'unavailable-enforcement-dependency'};
  }
}
```

`main()`:

```js
const data = input ? JSON.parse(input) : {};
const {fingerprintPath} = defaultPaths();
const stateDir = path.dirname(defaultPaths().routingCompleteFlagPath);
const result = await evaluateRouteGate({
  command: data.command || '',
  payload: data,
  stateDir,
  fingerprintPath,
});
console.log(JSON.stringify({
  permission: result.permission,
  ...(result.permission === 'deny' ? {user_message: '...', agent_message: '...'} : {}),
}));
```

Do not wrap `evaluateRouteGate` in a catch that allows.

`mark-routing-complete.mjs` requires `--context <sessionId>` and writes the session-keyed file. Missing `--context` exits non-zero.

Set only `beforeShellExecution.failClosed` to `true`. Leave `sessionStart.failClosed` `false`.

Update `tests/plugin-routing-index.test.mjs` to pass `sessionId: 'test-session'` and `stateDir`.

- [ ] **Step 4: Run GREEN**

Run: `node --test tests/cursor-routing-gate.test.mjs tests/plugin-routing-index.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add cursor-plugin-routing tests/cursor-routing-gate.test.mjs tests/plugin-routing-index.test.mjs
git commit -m "feat: bind Cursor routing completion to session context"
```

---

### Task 5: Isolated local SDK acceptance fixtures

**Files:**
- Create: `tests/cursor-sdk-acceptance.test.mjs`
- Modify: none in production unless a tiny helper must be shared; prefer keeping helpers in the test file
- Test: `tests/cursor-sdk-acceptance.test.mjs`

**Interfaces:**
- Consumes: Task 3 projection and Task 4 `evaluateRouteGate`.
- Produces observations of the shape `{requirement, context, observation, satisfied, limitations}`.
- Always-on requirements:
  - `managed_projection_resolves`
  - `routing_gate_blocks_before_completion`
  - `routing_gate_allows_after_completion`
  - `hook_executes`
  - `projected_skill_discoverable`
  - `legacy_pool_not_used_for_selected_fixture`
- Optional SDK requirement:
  - `project_rule_loaded` → `observation: 'unobserved'` unless `@cursor/sdk` imports **and** `CURSOR_API_KEY` is set **and** the SDK actually reports the project rule. Never claim satisfied from file presence alone.
- Do not add `cursor_sdk_validated: true`.
- Do not write into `os.homedir()/.cursor`. If user-local cannot be isolated through the SDK, do not make user-local SDK claims; keep those on hermetic tests.

- [ ] **Step 1: Write the always-on observation tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {ROOT, sync} from '../lib/registry.mjs';
import {markRoutingComplete} from '../cursor-plugin-routing/scripts/plugin-description-index.mjs';
import {evaluateRouteGate} from '../cursor-plugin-routing/hooks/route-gate.mjs';

function observation({requirement, context, observation, satisfied, limitations = []}) {
  return {requirement, context, observation, satisfied, limitations};
}

test('managed projection resolves from canonical overlay', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'hhpe-sdk-home-'));
  try {
    const result = sync({host: 'cursor', home});
    const target = path.join(home, '.cursor/skills/serena-guidance');
    const action = result.actions.find(a => a.target === target);
    assert.equal(action.action, 'LINK');
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.symlinkSync(action.source, target, 'dir');
    const resolved = fs.realpathSync(target);
    assert.equal(resolved, fs.realpathSync(path.join(ROOT, 'registry/overlays/wrappers/serena-guidance')));
    assert.deepEqual(observation({
      requirement: 'managed_projection_resolves',
      context: {home, scope: 'user-local'},
      observation: resolved,
      satisfied: true,
    }).satisfied, true);
    assert.match(resolved, /registry\/overlays\/wrappers\/serena-guidance$/);
    assert.equal(resolved.includes(`${os.homedir()}/.hhpe-skill-pool`), false);
  } finally {
    fs.rmSync(home, {recursive: true, force: true});
  }
});

test('legacy pool is unused in the fixture home', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'hhpe-sdk-home-'));
  try {
    sync({host: 'cursor', home});
    const skills = path.join(home, '.cursor/skills');
    if (fs.existsSync(skills)) {
      for (const name of fs.readdirSync(skills)) {
        const full = path.join(skills, name);
        if (fs.lstatSync(full).isSymbolicLink()) {
          assert.equal(fs.realpathSync(full).includes('.hhpe-skill-pool'), false, name);
        }
      }
    }
    assert.equal(fs.existsSync(path.join(home, '.hhpe-skill-pool')), false);
  } finally {
    fs.rmSync(home, {recursive: true, force: true});
  }
});

test('routing gate observations are requirement-specific', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hhpe-sdk-route-'));
  const fingerprintPath = path.join(dir, '.fingerprint');
  fs.writeFileSync(fingerprintPath, 'fp1');
  try {
    const blocked = await evaluateRouteGate({
      command: 'git commit -m x',
      payload: {conversation_id: 'sess-sdk'},
      stateDir: dir,
      fingerprintPath,
    });
    assert.equal(blocked.permission, 'deny');
    await markRoutingComplete({fingerprintPath, stateDir: dir, sessionId: 'sess-sdk'});
    const allowed = await evaluateRouteGate({
      command: 'git commit -m x',
      payload: {conversation_id: 'sess-sdk'},
      stateDir: dir,
      fingerprintPath,
    });
    assert.equal(allowed.permission, 'allow');
    const executed = await evaluateRouteGate({
      command: 'ls',
      payload: {conversation_id: 'sess-sdk', executionContext: 'sess-sdk'},
      stateDir: dir,
      fingerprintPath,
    });
    assert.equal(executed.permission, 'allow');
  } finally {
    fs.rmSync(dir, {recursive: true, force: true});
  }
});

test('SDK project_rule_loaded is unobserved without SDK credentials', async () => {
  let sdk = null;
  try { sdk = await import('@cursor/sdk'); } catch { sdk = null; }
  const available = Boolean(sdk) && Boolean(process.env.CURSOR_API_KEY);
  const result = observation({
    requirement: 'project_rule_loaded',
    context: {scope: 'project', runtime: 'cursor-sdk'},
    observation: available ? 'attempted' : 'unobserved',
    satisfied: null,
    limitations: available ? [] : ['@cursor/sdk or CURSOR_API_KEY unavailable'],
  });
  if (!available) {
    assert.equal(result.observation, 'unobserved');
    assert.equal(result.satisfied, null);
  }
});
```

Do not add a test that asserts hidden ranking or model reasoning.

- [ ] **Step 2: Run RED**

Run: `node --test tests/cursor-sdk-acceptance.test.mjs`

Expected: FAIL until Task 3/4 exports and bindings exist. If this task is executed after 3 and 4, the first three tests should already be writable to PASS; the file is still added here so acceptance identity lives in one place. If a helper name from Task 4 is missing, that is the RED reason.

- [ ] **Step 3: Minimum GREEN**

Keep helpers in the test file. If `@cursor/sdk` is later added, add it as a dev-only optional dependency and keep every SDK test skip-clean to `unobserved`. Do not add it merely for symmetry.

Optional live SDK block, only when available:

```js
// temp projectRoot
// copy cursor-plugin-routing/rules/plugin-routing.mdc to projectRoot/.cursor/rules/
// copy hooks/hooks.json into projectRoot/.cursor/hooks.json
// do not symlink into os.homedir()
// if the SDK exposes a documented way to read loaded rules, record observation
// otherwise remain unobserved
```

- [ ] **Step 4: Run GREEN**

Run: `node --test tests/cursor-sdk-acceptance.test.mjs tests/sync.test.mjs tests/cursor-routing-gate.test.mjs`

Expected: PASS without network.

- [ ] **Step 5: Commit**

```bash
git add tests/cursor-sdk-acceptance.test.mjs
git commit -m "test: add isolated Cursor acceptance observations"
```

---

### Task 6: First-slice legacy provenance and alias classification

**Files:**
- Create: `lib/cursor-provenance.mjs`
- Modify: `tests/cursor-realization.test.mjs`
- Test: `tests/cursor-realization.test.mjs`

**Interfaces:**
- Consumes: a fixture inventory of `{name, target}` plus `bindings`, `registryRoots`, `poolRoot`.
- Produces: `classifyCursorSkillLink({name, target, bindings, registryRoots, poolRoot})` → one of `registry-owned projection` | `native Cursor realization` | `explicitly unsupported or retired` | `unmanaged-foreign`.
- This function is not called from `sync()`. Sync must not adopt classified foreign objects.

This slice does **not** retarget live pool links.

It **does** classify:

- namespaced `trailofbits-*` whose realpath is under a registry root → `registry-owned projection`
- un-namespaced `c-review` / `semgrep` whose realpath is under `poolRoot` → `unmanaged-foreign`
- names listed in `final-stack.yaml` `superpowers.inactive` → `explicitly unsupported or retired`
- `execution-discipline` / `lfg` → `unmanaged-foreign`

- [ ] **Step 1: Write failing classification tests**

```js
import {classifyCursorSkillLink} from '../lib/cursor-provenance.mjs';

const bindings = [
  {capability_id: 'trailofbits/c-review', cursor_visible_name: 'trailofbits-c-review', scope: 'user-local', target: '~/.cursor/skills/trailofbits-c-review'},
];
const registryRoots = ['/repo/registry'];
const poolRoot = '/home/user/.hhpe-skill-pool';
const inactive = new Set(['superpowers/brainstorming']);

test('namespaced registry link is registry-owned', () => {
  assert.equal(classifyCursorSkillLink({
    name: 'trailofbits-c-review',
    target: '/repo/registry/packages/trailofbits/skills/c-review',
    bindings,
    registryRoots,
    poolRoot,
    inactive,
  }), 'registry-owned projection');
});

test('un-namespaced pool alias is unmanaged-foreign', () => {
  assert.equal(classifyCursorSkillLink({
    name: 'c-review',
    target: '/home/user/.hhpe-skill-pool/c-review',
    bindings,
    registryRoots,
    poolRoot,
    inactive,
  }), 'unmanaged-foreign');
});

test('inactive Superpowers pool name is retired', () => {
  assert.equal(classifyCursorSkillLink({
    name: 'brainstorming',
    target: '/home/user/.hhpe-skill-pool/brainstorming',
    bindings,
    registryRoots,
    poolRoot,
    inactive,
  }), 'explicitly unsupported or retired');
});

test('unmanaged local directory is unmanaged-foreign', () => {
  assert.equal(classifyCursorSkillLink({
    name: 'execution-discipline',
    target: '/Users/maxholden/.cursor/skills/execution-discipline',
    bindings,
    registryRoots,
    poolRoot,
    inactive,
  }), 'unmanaged-foreign');
});
```

- [ ] **Step 2: Run RED**

Run: `node --test tests/cursor-realization.test.mjs`

Expected: FAIL because `lib/cursor-provenance.mjs` does not exist.

- [ ] **Step 3: Minimum GREEN**

```js
export function classifyCursorSkillLink({name, target, bindings, registryRoots, poolRoot, inactive = new Set()}) {
  const real = String(target || '');
  const bound = (bindings || []).some(b => b.cursor_visible_name === name || (b.target || '').endsWith('/' + name));
  if ((inactive instanceof Set) && (inactive.has(name) || inactive.has(`superpowers/${name}`))) {
    return 'explicitly unsupported or retired';
  }
  if (bound && registryRoots.some(root => real.startsWith(root))) return 'registry-owned projection';
  if (poolRoot && real.startsWith(poolRoot)) return 'unmanaged-foreign';
  return 'unmanaged-foreign';
}
```

Do not return `native Cursor realization` in this slice unless a fixture explicitly names a Cursor plugin-cache path that is not pool-backed and not registry-bound. Leave that branch in the function as:

```js
if (/\/\.cursor\/plugins\/cache\//.test(real) && !bound) return 'native Cursor realization';
```

and add one test for it.

Do not wire this into `sync()`.

- [ ] **Step 4: Run GREEN**

Run: `node --test tests/cursor-realization.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/cursor-provenance.mjs tests/cursor-realization.test.mjs
git commit -m "feat: classify Cursor skill-pool provenance without adopting it"
```

---

### Task 7: Operations documentation and final verification

**Files:**
- Modify: `docs/operations.md`
- Modify: `docs/project_status/plugin-routing-cursor.md`
- Test: repository-wide `npm test`

**Interfaces:**
- Consumes: Tasks 1–6.
- Produces: operator instructions for `hhpe-registry-sync --host cursor --home <dir> --project-root <dir>`; `mark-routing-complete.mjs --context <session>`; statement that Cloud and MCP are not in this slice; statement that skill-pool links are classified, not adopted.

- [ ] **Step 1: Document session-bound mark/gate and scoped sync. Do not document Cloud apply.**

Replace the plugin-routing status claim that a global `routing-complete.json` is the gate. Record that `sessionStart` is guidance and `beforeShellExecution` is must-hold.

- [ ] **Step 2: Run final verification**

```bash
npm test
node --test tests/cursor-realization.test.mjs tests/cursor-routing-gate.test.mjs tests/cursor-sdk-acceptance.test.mjs tests/sync.test.mjs tests/rollback.test.mjs tests/native-plugin-validation.test.mjs tests/tool-contracts.test.mjs
```

Expected: all PASS. Native-plugin static tests still do not call `codex plugin list`. ToolSpec tests still reject host-absolute ToolSpec fields.

Manual checklist (use throwaway `--home` / `--project-root` only):

- no unmanaged Cursor mutation
- user-local vs project isolation
- idempotent projection
- collisions preserved
- rollback refuses retarget
- session A ≠ session B
- must-hold deny on missing/stale session
- guidance `sessionStart` still fail-open
- no hidden-ranking assertions in tests
- no new dual-authority exposures
- no Cloud implementation
- no Compatibility framework
- MCP deferred

- [ ] **Step 3: Commit**

```bash
git add docs/operations.md docs/project_status/plugin-routing-cursor.md
git commit -m "docs: describe scoped Cursor projection and session routing"
```

---

## CE / Superpowers / Caveman / Ponytail

Not selected. The decision contract remains in the spec. First-slice fixtures use HHPE overlays, plugin-routing, and Trail of Bits namespaced projections only.

## Cloud

Not implemented. `cloud-project` validates as a declaration and syncs as `SKIP`. No Cloud API, fixtures, or provisioning. Future cloud-project apply may reuse `scope: cloud-project` plus repository-visible `.cursor/...` targets; do not add a second schema.

## MCP

MCP deferred.

## Expected verification

Always: `npm test`

Focused: `tests/cursor-realization.test.mjs`, `tests/cursor-routing-gate.test.mjs`, `tests/cursor-sdk-acceptance.test.mjs`, `tests/sync.test.mjs`, `tests/rollback.test.mjs`, plus baseline `tests/native-plugin-validation.test.mjs` and `tests/tool-contracts.test.mjs`.

## Spec-deferred decisions this plan resolved

1. `hhpe-hrg-plugin-stack` terminal ownership → Curated Market-owned projection.
2. Plugin-routing bindings → two distinct bindings (`user-local` and `project`), same capability.
3. Routing-context identity → session.
4. Exact `failClosed` → route-gate `true`; sessionStart `false`.
5. First-slice alias handling → record `cursor_visible_name`; do not rename or adopt pool aliases.
6. First-slice skill-pool treatment → classify/report only.
7. SDK strategy → hermetic always-on observations; live SDK optional/`unobserved`.
8. Hook mechanism as a registry mode → not required this slice.

## Decisions still deferred

1. Per-capability Cursor mechanism for Compound Engineering, Superpowers, Caveman, and Ponytail.
2. Whether `hhpe-hrg/ast-grep`, `registry-health`, and `stack-router` become Cursor capabilities.
3. Exact Trail of Bits alias migration of live pool names.
4. Cloud Agents API / team-hook details.
5. Optional HHPE MCP surface.
6. Classification of T3 Cursor skill-projection code.
7. Disposition of unmanaged `lfg` and `execution-discipline` beyond classification.
8. Whether `skills-ci` Cursor host should switch from `cursor-agent` to the SDK.
9. Physical ToolSpec / observation storage.

## Unresolved execution blockers

1. Spec lineage (`32fefeb`) and remediation lineage (`63da34b`) are not yet one branch. Combining them is the first execution step. If the merge/cherry-pick rewrites ToolSpec contracts, stop.
2. Live SDK observations require `@cursor/sdk` + `CURSOR_API_KEY`. Absence is `unobserved`, not a failed static gate.
3. Exact Cursor hook field name for session id must be confirmed against one real hook payload during Task 4 if stdin in this environment shows a different key. The extractor already accepts four keys; add a fifth only with evidence.

## Self-review

- Spec first slice (user-local/project contract, deterministic projection, context-bound routing, local SDK fixtures) → Tasks 1–7.
- Spec §4 one-scope-per-binding / no fan-out → two plugin-stack rows.
- Spec §5.1 mechanisms ≠ identity → `mode` remains mechanism; capability ids unchanged.
- Spec §5.3 plugin-stack terminal category → owned projection, not README half-state.
- Spec §7 context-bound routing → session-keyed files; A ≠ B tests.
- Spec §8 fail-closed policy → only the must-hold hook.
- Spec §9 guidance vs enforcement vs SDK observation → Task 4 and Task 5.
- Spec §10 static validation → Task 2; does not launch Cursor.
- Spec §11–12 SDK isolation → Task 5; no ambient `~/.cursor` mutation.
- Spec §15 skill-pool terminals → Task 6 classifier, no adoption.
- Spec §16 MCP → deferred.
- Spec §17 non-goals → no Compatibility framework, no Cloud impl, no ranking claims.
- ToolSpec / native-plugin contracts consumed, not rebuilt.
- Placeholder scan: no TBD / “add tests later” steps remain.

---

## Execution note

Do not execute this plan until explicit approval. After approval, the two execution options are subagent-driven development (recommended) or inline executing-plans.
