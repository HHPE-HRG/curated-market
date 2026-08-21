# OpenCode-Only Specialization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a deterministic `opencode_only` specialization whose visible, project-local OpenCode 1.x personalization is generated only from a closed Curated Market selection while provider policy stays fail-closed and portable ToolSpec behavior stays unchanged.

**Architecture:** `registry/manifests/specialization.yaml` is the executable selector and supply-policy authority. Native `AGENTS.md`, `opencode.json`, and `.opencode/agents/*.md` are canonical source; a narrow `scripts/sync-opencode.mjs` reconciles exactly seven reviewed wrapper trees into checked-in `.opencode/skills`, and existing static validators consume a small OpenCode-only policy validator without invoking authentication, caches, models, or host state. Direct Cursor, direct Codex, and global-home OpenCode personalization remain in the general registry but are bypassed by this specialization.

**Tech Stack:** Node.js ESM, `node:fs`, `node:path`, `node:os`, `node:test`, `node:assert/strict`, JSON-in-`.yaml` manifests, OpenCode 1.x Markdown/configuration, Git executable-bit metadata.

## Global Constraints

- Binding specification: [`../specs/2026-08-20-opencode-only-design.md`](../specs/2026-08-20-opencode-only-design.md). Specification outranks this plan.
- Work only in `/Users/maxholden/src/curated-market/.worktrees/feat-opencode_only` on branch `feat/opencode_only`, starting at approved specification HEAD `00c6ee8e05e4b835b6789eb4a33626b344ef4556` based on `63da34b3f3e20e5b0e7333286c04b881bc39b747`.
- OpenCode is the only selected agent-personalization runtime. Cursor and OpenAI/Codex are provider bindings inside OpenCode, not direct personalization hosts.
- `registry/manifests/specialization.yaml` must contain `schema_version: 1`, `specialization_id: opencode_only`, `agent_runtime: opencode`, `personalization_target: opencode`, OpenCode range `>=1.18.19 <2.0.0`, exact approved provider policies, and exact bypass set `codex-direct`, `cursor-direct`, `opencode-global-home`.
- Phase 1 uses reviewed OpenCode 1.x configuration only. Never load `cursor-opencode-provider/plugin/opencode2`, mix 1.x/2.0 entrypoints, or claim OpenCode 2.0 support.
- OpenAI realization is ChatGPT Plus/Pro OAuth only. Never configure or fall back to `OPENAI_API_KEY`, separately billed API access, or another provider.
- Cursor realization is browser OAuth through exact `cursor-opencode-provider@0.6.3`. Never fall back to direct Cursor, proxy, credential extraction, API-key mode, an unpinned fork, or OpenAI substitution.
- Deterministic work must never authenticate, query models, install OpenCode/plugins, inspect auth files, inspect package caches, or depend on current host state.
- Do not read or copy `~/.local/share/opencode/auth.json`, `$XDG_DATA_HOME/opencode/auth.json`, OpenCode/Cursor/npm/Bun caches, `node_modules`, or account-specific model catalogs.
- Keep `registry/manifests/tools.yaml`, ToolSpec, ToolRealizationObservation, ADR-026, AST Grep/Serena/Context7/Playwright runtime semantics, and the five separate PR #4 findings untouched.
- Do not delete or rewrite general-purpose Cursor, Codex, or global-home OpenCode adapters/exposures. `opencode_only` bypasses them only through its explicit selector and its own project-local command surface.
- No profile framework, agent ABI, personalization engine, provider router, compatibility VM, universal realization framework, package-manager abstraction, or generalized projection API.
- Use strict TDD: confirm each RED fails for the named missing behavior, implement minimum GREEN, refactor only after green, and make one task-local commit per task.
- Do not merge, push, publish, deploy, open a PR, authenticate, or run live provider acceptance while executing this plan.

---

# Phase-1 Selection Contract

## IMPLEMENTATION APPROVAL GATE

Repository evidence establishes the seven HHPE wrappers as an existing closed, portable, recursively complete set, but does not uniquely prescribe initial OpenCode agent roles. This plan proposes the smallest coherent two-role native-agent set and the existing seven-wrapper set. **Implementation must not begin until this exact section is explicitly approved.** Approval does not authorize package auto-discovery or expansion.

## Agents

| OpenCode source | Mode | Role | Canonical instruction source | Model behavior | Required capabilities |
| --- | --- | --- | --- | --- | --- |
| `.opencode/agents/operator.md` | `primary` | Own interactive repository work, delegate bounded work, preserve specialization/tool boundaries, and require verification before completion | File itself plus root `AGENTS.md`; no intermediate HHPE agent schema | No `model` frontmatter: inherit operator-selected authenticated OpenCode model/provider | `hhpe-hrg/session-start`, `hhpe-hrg/stack-router`, `hhpe-hrg/registry-health`; may invoke the four task-triggered specialist wrappers below |
| `.opencode/agents/worker.md` | `subagent` | Execute one bounded delegated assignment, report evidence, and avoid lifecycle/provider/config mutation | File itself plus root `AGENTS.md`; no intermediate HHPE agent schema | No `model` frontmatter: inherit delegating/operator-selected authenticated model | Assignment-relevant subset of the seven selected capabilities; cannot delegate another worker |

No third agent, package agent, hidden agent, or automatically discovered agent is selected in Phase 1.

## Capabilities

| Capability ID | Canonical source | Realization class | Exact destination/dependency | Dependencies | ToolSpec involvement |
| --- | --- | --- | --- | --- | --- |
| `hhpe-hrg/session-start` | `registry/overlays/wrappers/session-start` | Pure skill | `.opencode/skills/session-start` | None | None |
| `hhpe-hrg/stack-router` | `registry/overlays/wrappers/stack-router` | Pure skill | `.opencode/skills/stack-router` | None | None |
| `hhpe-hrg/registry-health` | `registry/overlays/wrappers/registry-health` | Pure skill | `.opencode/skills/registry-health` | Existing registry CLI commands | None; diagnoses existing policy only |
| `hhpe-hrg/ast-grep` | `registry/overlays/wrappers/ast-grep` | Pure skill plus tool/runtime dependency | `.opencode/skills/ast-grep`; runtime remains registered `ast-grep` tool | `references/rule_reference.md`; `ast-grep` executable | Existing ToolSpec/observation only; unchanged |
| `hhpe-hrg/serena-guidance` | `registry/overlays/wrappers/serena-guidance` | Pure skill plus tool/runtime dependency | `.opencode/skills/serena-guidance`; runtime remains registered `serena` tool | `serena` executable/service readiness | Existing ToolSpec/observation only; unchanged |
| `hhpe-hrg/context7-guidance` | `registry/overlays/wrappers/context7-guidance` | Pure skill plus tool/runtime dependency | `.opencode/skills/context7-guidance`; runtime remains registered `ctx7` tool | `ctx7` executable/service/auth readiness | Existing ToolSpec/observation only; unchanged |
| `hhpe-hrg/playwright-guidance` | `registry/overlays/wrappers/playwright-guidance` | Pure skill plus tool/runtime dependency | `.opencode/skills/playwright-guidance`; runtime remains registered `playwright-cli` tool | `playwright-cli`, browser/runtime readiness | Existing ToolSpec/observation only; unchanged |
| Specialization persistent instructions | Root specialization policy | Persistent instruction | `AGENTS.md` | None | None |
| `operator` | `.opencode/agents/operator.md` | Agent | Same canonical file, consumed natively | Selected capabilities above | None |
| `worker` | `.opencode/agents/worker.md` | Agent | Same canonical file, consumed natively | Assignment-relevant selected capabilities | None |
| Cursor provider binding | Approved specialization supply policy | Native OpenCode plugin/provider | Exact `cursor-opencode-provider@0.6.3` request in `opencode.json` | OpenCode `>=1.18.19 <2.0.0`; browser OAuth during later live acceptance | None |

No Phase-1 selected capability requires a native OpenCode command or a project plugin file. Therefore this plan does not create `.opencode/commands/` or `.opencode/plugins/`. Compound Engineering, Superpowers, and Ponytail package plugins/commands are not selected and must not be flattened into skills.

Selection is the literal `OPENCODE_SKILL_PROJECTIONS` mapping specified below. Directory enumeration, capability-manifest enumeration, package presence, `SKILL.md` discovery, or general exposure status cannot add an eighth skill.

## File and Interface Map

| Path | Responsibility | Planned action |
| --- | --- | --- |
| `registry/manifests/specialization.yaml` | Executable OpenCode-only selector, runtime range, provider/auth supply policy, bypass set | Create exact JSON-in-`.yaml` authority |
| `lib/opencode-specialization.mjs` | Narrow static reader/validator for specialization, project config, native agent metadata, and selected-path policy | Create; no host or auth operations |
| `lib/registry.mjs` | Generic repository validation aggregation | Modify `validate()` to append OpenCode-only static errors |
| `lib/skills-ci.mjs` | Headless static integrity aggregation | Modify `staticIntegrity()` to append same deterministic OpenCode-only errors |
| `tests/opencode-specialization.test.mjs` | Specialization, native source, provider policy, fail-closed, bypass, and secret/cache-independence tests | Create |
| `opencode.json` | Canonical reviewed OpenCode 1.x provider allowlist and exact Cursor plugin request | Create |
| `AGENTS.md` | Canonical always-on project instructions and specialization boundaries | Create |
| `.opencode/agents/operator.md` | Canonical native primary-agent definition | Create |
| `.opencode/agents/worker.md` | Canonical native subagent definition | Create |
| `scripts/sync-opencode.mjs` | Closed seven-skill recursive reconciler, comparator, and isolated checker | Create |
| `tests/sync-opencode.test.mjs` | Preflight, representation, ownership, parity, modes, idempotence, portability, and bypass tests | Create |
| `.opencode/skills/{ast-grep,registry-health,stack-router,serena-guidance,context7-guidance,playwright-guidance,session-start}/**` | Checked-in generated OpenCode project skill realization | Create through generator only |
| `package.json` | Narrow generation/check/validation command surface | Add `opencode:generate`, `opencode:check`, `validate:opencode` |
| `docs/host-adapters.md` | Concise operator documentation for project-local specialization and later live acceptance boundary | Modify without deleting general adapter documentation |

### Exact validation interfaces

```js
export const APPROVED_OPENCODE_ONLY_POLICY;

export function readOpencodeOnlyFiles({root} = {}) {
  // -> {specialization, projectConfig, agents: Map<string, {frontmatter, body}>}
}

export function validateOpencodeOnly({
  root,
  specialization,
  projectConfig,
  agents,
} = {}) {
  // -> {ok: boolean, errors: string[]}
}
```

`validateOpencodeOnly` reads only Git-visible repository files when arguments are omitted. It never reads environment credentials, home directories, runtime executables, models, caches, `hosts.yaml`, or package installations. `validate()` and `staticIntegrity()` consume only its `errors` array.

### Exact skill realization interfaces

```js
export const OPENCODE_SKILL_PROJECTIONS = Object.freeze([
  {capabilityId: 'hhpe-hrg/ast-grep', source: 'ast-grep', destination: 'ast-grep'},
  {capabilityId: 'hhpe-hrg/registry-health', source: 'registry-health', destination: 'registry-health'},
  {capabilityId: 'hhpe-hrg/stack-router', source: 'stack-router', destination: 'stack-router'},
  {capabilityId: 'hhpe-hrg/serena-guidance', source: 'serena-guidance', destination: 'serena-guidance'},
  {capabilityId: 'hhpe-hrg/context7-guidance', source: 'context7-guidance', destination: 'context7-guidance'},
  {capabilityId: 'hhpe-hrg/playwright-guidance', source: 'playwright-guidance', destination: 'playwright-guidance'},
  {capabilityId: 'hhpe-hrg/session-start', source: 'session-start', destination: 'session-start'},
]);

export function syncOpencodeSkills({root, outputRoot} = {}) {
  // -> {capabilities: string[], destinations: string[]}; throws before mutation on invalid input
}

export function compareOpencodeSkills({root, outputRoot} = {}) {
  // -> {ok: boolean, differences: string[]}; read-only
}

export function checkOpencodeSkills({root} = {}) {
  // -> isolated fresh-generation comparison result; never rewrites checked-in state
}
```

---

### Task 1: Add Executable Specialization Selector and Static Policy Core

**Files:**
- Create: `registry/manifests/specialization.yaml`
- Create: `lib/opencode-specialization.mjs`
- Create: `tests/opencode-specialization.test.mjs`

**Interfaces:**
- Consumes: approved constants from the binding specification and repository root path.
- Produces: `APPROVED_OPENCODE_ONLY_POLICY`, `readOpencodeOnlyFiles({root})`, and `validateOpencodeOnly({root, specialization, projectConfig, agents})`.

- [ ] **Step 1: Write RED tests for exact selector and host independence**

Create `tests/opencode-specialization.test.mjs` with fixture helpers that pass in-memory policy objects and this initial coverage:

```js
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {
  APPROVED_OPENCODE_ONLY_POLICY,
  readOpencodeOnlyFiles,
  validateOpencodeOnly,
} from '../lib/opencode-specialization.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('specialization manifest is exact executable opencode_only authority', () => {
  const {specialization} = readOpencodeOnlyFiles({root: ROOT});
  assert.deepEqual(specialization, APPROVED_OPENCODE_ONLY_POLICY);
  assert.deepEqual(validateOpencodeOnly({root: ROOT, specialization}).errors, []);
});

test('specialization rejects contradictory runtime, target, range, and bypass selection', () => {
  for (const mutate of [
    value => { value.specialization_id = 'general'; },
    value => { value.agent_runtime = 'cursor'; },
    value => { value.personalization_target = 'codex'; },
    value => { value.opencode_runtime.maximum_exclusive = '3.0.0'; },
    value => { value.personalization_paths_bypassed = ['codex-direct', 'cursor-direct']; },
  ]) {
    const value = structuredClone(APPROVED_OPENCODE_ONLY_POLICY);
    mutate(value);
    assert.equal(validateOpencodeOnly({specialization: value}).ok, false);
  }
});

test('static specialization validation does not inspect hosts or local auth state', () => {
  const original = fs.readFileSync;
  fs.readFileSync = function(file, ...args) {
    const value = String(file);
    if (/hosts\.yaml|auth\.json|node_modules|\.cache|opencode.*cache/i.test(value)) {
      throw new Error(`forbidden read: ${value}`);
    }
    return original.call(this, file, ...args);
  };
  try {
    assert.equal(validateOpencodeOnly({root: ROOT}).ok, true);
  } finally {
    fs.readFileSync = original;
  }
});
```

- [ ] **Step 2: Run tests and verify intended RED**

Run:

```bash
node --test tests/opencode-specialization.test.mjs
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `lib/opencode-specialization.mjs`, proving missing specialization validation rather than fixture or syntax failure.

- [ ] **Step 3: Create exact specialization authority**

Create `registry/manifests/specialization.yaml` as JSON-in-`.yaml`:

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

Implement `APPROVED_OPENCODE_ONLY_POLICY` as the same frozen nested value and compare exact scalar values, provider order/IDs, runtime bounds, package provenance, and bypass set. `readOpencodeOnlyFiles` must resolve only paths below injected `root`; missing later-task files return `null`/empty agent map rather than touching home state. For Task 1, validate project/agents only when supplied or present.

- [ ] **Step 4: Run focused GREEN tests**

Run:

```bash
node --test tests/opencode-specialization.test.mjs
```

Expected: 3 tests pass; no host/auth/cache path is read.

- [ ] **Step 5: Commit Task 1**

```bash
git add registry/manifests/specialization.yaml lib/opencode-specialization.mjs tests/opencode-specialization.test.mjs
git commit -m "feat: define OpenCode-only specialization authority"
```

---

### Task 2: Add Canonical OpenCode Project Policy and Wire Static Validation

**Files:**
- Create: `opencode.json`
- Create: `AGENTS.md`
- Modify: `lib/opencode-specialization.mjs`
- Modify: `lib/registry.mjs`
- Modify: `lib/skills-ci.mjs`
- Modify: `tests/opencode-specialization.test.mjs`
- Modify: `tests/registry.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: `validateOpencodeOnly()` and `APPROVED_OPENCODE_ONLY_POLICY` from Task 1.
- Produces: complete project-config checks; `validate()` and `staticIntegrity()` include `opencode_only` errors without host probing; `npm run validate:opencode` invokes a static-only CLI branch in `lib/opencode-specialization.mjs`.

- [ ] **Step 1: Write RED tests for native project config and generic static integration**

Add tests that load real root files and mutate in-memory clones:

```js
test('project configuration selects only OpenAI and Cursor and pins classic Cursor provider', () => {
  const files = readOpencodeOnlyFiles({root: ROOT});
  assert.deepEqual(files.projectConfig.enabled_providers, ['openai', 'cursor']);
  assert.deepEqual(files.projectConfig.plugin, ['cursor-opencode-provider@0.6.3']);
  assert.equal(validateOpencodeOnly({...files, root: ROOT}).ok, true);
});

test('project configuration contains no credential, model catalog, local path, or OpenCode 2 entrypoint', () => {
  const text = fs.readFileSync(path.join(ROOT, 'opencode.json'), 'utf8');
  assert.doesNotMatch(text, /OPENAI_API_KEY|api[_-]?key|auth\.json|opencode2|node_modules|(?:^|["'])\/(?:Users|home|tmp)\//i);
  assert.equal(Object.hasOwn(JSON.parse(text), 'model'), false);
});
```

Extend `tests/registry.test.mjs`:

```js
test('generic repository validation includes opencode_only policy statically', () => {
  assert.equal(validate().status, 'passed');
  assert.equal(staticIntegrity().status, 'PASS');
});
```

- [ ] **Step 2: Run tests and verify intended RED**

Run:

```bash
node --test tests/opencode-specialization.test.mjs tests/registry.test.mjs
```

Expected: FAIL because `opencode.json` and `AGENTS.md` do not exist and generic validators do not yet consume specialization errors.

- [ ] **Step 3: Add minimum canonical OpenCode 1.x files**

Create `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "enabled_providers": ["openai", "cursor"],
  "plugin": ["cursor-opencode-provider@0.6.3"],
  "instructions": ["AGENTS.md"]
}
```

Create root `AGENTS.md` containing only persistent boundaries: OpenCode is sole personalization runtime; use project-local agents/skills; inherit operator-selected authenticated model; preserve ToolSpec runtime evidence; do not use direct Cursor/Codex/global-home OpenCode personalization; do not read secrets or silently fall back across auth/providers; invoke skills only when relevant; verify before claiming completion. Do not copy any complete `SKILL.md` body into this file.

Extend `validateOpencodeOnly` to require exact `enabled_providers`, exact `plugin`, relative `instructions: ["AGENTS.md"]`, no root `model`, and recursively reject property names/strings matching credentials, `OPENAI_API_KEY`, absolute/local plugin paths, `latest`, Git URLs/branches, or `opencode2`. Add import/calls:

```js
const specialization = validateOpencodeOnly({root: ROOT});
errors.push(...specialization.errors);
```

to both `validate()` and `staticIntegrity()`. Do not catch errors as warnings. Add package script:

```json
"validate:opencode": "node lib/opencode-specialization.mjs"
```

CLI prints JSON result and exits `1` when `ok` is false.

- [ ] **Step 4: Run GREEN tests and static commands**

Run:

```bash
node --test tests/opencode-specialization.test.mjs tests/registry.test.mjs
npm run validate:opencode
npm run validate
npm run skills:ci:static
```

Expected: focused tests pass; all three commands exit `0`; outputs identify static success without OAuth, models, inventory, or cache access.

- [ ] **Step 5: Commit Task 2**

```bash
git add opencode.json AGENTS.md lib/opencode-specialization.mjs lib/registry.mjs lib/skills-ci.mjs tests/opencode-specialization.test.mjs tests/registry.test.mjs package.json
git commit -m "feat: add static OpenCode project policy"
```

---

### Task 3: Add Closed Native Agent Source

**Files:**
- Create: `.opencode/agents/operator.md`
- Create: `.opencode/agents/worker.md`
- Modify: `lib/opencode-specialization.mjs`
- Modify: `tests/opencode-specialization.test.mjs`

**Interfaces:**
- Consumes: `readOpencodeOnlyFiles({root})` agent parser from Task 1 and root `AGENTS.md` from Task 2.
- Produces: exact two-file native agent inventory and validation for `description`, `mode`, permissions, no model pin, no secrets/host paths, and no extra agents.

- [ ] **Step 1: Write RED agent inventory and policy tests**

```js
test('native agent source is the closed operator and worker set', () => {
  const files = readOpencodeOnlyFiles({root: ROOT});
  assert.deepEqual([...files.agents.keys()].sort(), ['operator.md', 'worker.md']);
  assert.equal(files.agents.get('operator.md').frontmatter.mode, 'primary');
  assert.equal(files.agents.get('worker.md').frontmatter.mode, 'subagent');
  assert.equal('model' in files.agents.get('operator.md').frontmatter, false);
  assert.equal('model' in files.agents.get('worker.md').frontmatter, false);
  assert.equal(validateOpencodeOnly({...files, root: ROOT}).ok, true);
});

test('worker cannot delegate and agent source rejects host-bound or secret values', () => {
  const files = readOpencodeOnlyFiles({root: ROOT});
  assert.equal(files.agents.get('worker.md').frontmatter.permission.task, 'deny');
  const agents = new Map(files.agents);
  agents.set('extra.md', {frontmatter: {description: 'extra', mode: 'all'}, body: '/Users/example/auth.json'});
  assert.equal(validateOpencodeOnly({...files, agents, root: ROOT}).ok, false);
});
```

- [ ] **Step 2: Run tests and verify intended RED**

Run:

```bash
node --test tests/opencode-specialization.test.mjs
```

Expected: FAIL because `.opencode/agents/operator.md` and `worker.md` are absent.

- [ ] **Step 3: Add exact native OpenCode agent files and validation**

Create `.opencode/agents/operator.md` with this frontmatter:

```yaml
---
description: Primary Curated Market operator for verified repository work
mode: primary
permission:
  edit: allow
  bash: ask
  webfetch: allow
  skill: allow
  task: allow
---
```

Body: own complete assigned outcome; begin serious sessions with `session-start`; use `stack-router` for capability selection and `registry-health` for registry diagnosis; delegate only bounded work; keep provider/auth and ToolSpec boundaries; report evidence; verify before completion.

Create `.opencode/agents/worker.md`:

```yaml
---
description: Bounded implementation and investigation worker
mode: subagent
permission:
  edit: allow
  bash: ask
  webfetch: allow
  skill: allow
  task: deny
---
```

Body: execute only delegated scope; use assignment-relevant selected skills; do not delegate, change provider/auth configuration, or broaden selection; preserve unrelated work; return commands/results and blockers.

Implement a small frontmatter parser inside `lib/opencode-specialization.mjs` sufficient for the exact scalar/nested permission form above; do not add a dependency or agent schema. Require exact filenames/modes, nonempty descriptions, permission values `allow|ask|deny`, worker `task: deny`, absent `model`, and portable/secret-free text.

- [ ] **Step 4: Run GREEN tests**

Run:

```bash
node --test tests/opencode-specialization.test.mjs
npm run validate:opencode
```

Expected: tests and static validator pass with exactly two agents and no model pin.

- [ ] **Step 5: Commit Task 3**

```bash
git add .opencode/agents/operator.md .opencode/agents/worker.md lib/opencode-specialization.mjs tests/opencode-specialization.test.mjs
git commit -m "feat: add closed OpenCode agent source"
```

---

### Task 4: Implement Closed Project-Local Skill Reconciliation

**Files:**
- Create: `scripts/sync-opencode.mjs`
- Create: `tests/sync-opencode.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: seven canonical directories under `registry/overlays/wrappers`.
- Produces: `OPENCODE_SKILL_PROJECTIONS`, `syncOpencodeSkills({root, outputRoot})`, `compareOpencodeSkills({root, outputRoot})`, `checkOpencodeSkills({root})`, and CLI `generate|check`.

- [ ] **Step 1: Write RED tests for closed ownership and complete preflight**

Create fixtures with seven sources, an eighth unselected source, recursive supporting file, executable/non-executable files, neighboring output, stale owned file, canonical symlink, FIFO where supported, and overlapping roots. Initial tests must assert:

```js
test('ownership mapping is the exact frozen Phase-1 seven', () => {
  assert.deepEqual(OPENCODE_SKILL_PROJECTIONS.map(item => item.capabilityId), [
    'hhpe-hrg/ast-grep',
    'hhpe-hrg/registry-health',
    'hhpe-hrg/stack-router',
    'hhpe-hrg/serena-guidance',
    'hhpe-hrg/context7-guidance',
    'hhpe-hrg/playwright-guidance',
    'hhpe-hrg/session-start',
  ]);
  assert.ok(Object.isFrozen(OPENCODE_SKILL_PROJECTIONS));
});

test('invalid source aborts before any owned destination mutation', () => {
  const fixture = makeFixture();
  fs.symlinkSync('SKILL.md', path.join(fixture.sources, 'session-start', 'bad-link'));
  const before = snapshot(fixture.outputRoot);
  assert.throws(() => syncOpencodeSkills(fixture), /unsupported canonical entry/);
  assert.deepEqual(snapshot(fixture.outputRoot), before);
});
```

Add separate tests for missing source, canonical root symlink, unsupported entry, source/output overlap in either direction, filesystem-root output, recursive copy, stale owned removal, neighboring skill preservation, regular-file/directory representation, executable-bit normalization, idempotence, no eighth skill, comparison detecting equal-byte symlink, and isolated check not rewriting checked-in output.

- [ ] **Step 2: Run tests and verify intended RED**

Run:

```bash
node --test tests/sync-opencode.test.mjs
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `scripts/sync-opencode.mjs`.

- [ ] **Step 3: Implement minimum OpenCode-specific reconciler**

Use explicit objects shown in interface map—never `readdir` to establish ownership. Implement `resolvedLocation`, strict containment/overlap checks, full recursive `lstat`/readability preflight of all seven sources before the first write, and scoped reconciliation that removes/replaces only each mapped destination. Preserve all children of `.opencode/skills` not named by mapping.

Copy real directories and regular files only. Reject canonical/output symlinks and unsupported entries. Normalize generated files to `0755` iff canonical mode has any executable bit, otherwise `0644`; directories `0755`. Comparison must cover path set, directory/file/symlink type, bytes, and executable-bit boolean, ignoring irrelevant permission noise.

`checkOpencodeSkills` must create a temporary output, generate there, compare fresh result to checked-in `.opencode/skills`, and remove temporary data in `finally`. CLI:

```js
generate -> syncOpencodeSkills(); print summary; exit 0
check    -> checkOpencodeSkills(); print differences and exit 1 on drift
other    -> print usage and exit 2
```

Add scripts:

```json
"opencode:generate": "node scripts/sync-opencode.mjs generate",
"opencode:check": "node scripts/sync-opencode.mjs check"
```

- [ ] **Step 4: Run focused GREEN tests without writing checked-in output**

Run:

```bash
node --test tests/sync-opencode.test.mjs
```

Expected: all focused fixture tests pass; repository `.opencode/skills` remains absent until Task 5.

- [ ] **Step 5: Commit Task 4**

```bash
git add scripts/sync-opencode.mjs tests/sync-opencode.test.mjs package.json
git commit -m "feat: add closed OpenCode skill reconciler"
```

---

### Task 5: Generate Checked-In Skills and Prove Specialization Bypass

**Files:**
- Create: `.opencode/skills/ast-grep/**`
- Create: `.opencode/skills/registry-health/**`
- Create: `.opencode/skills/stack-router/**`
- Create: `.opencode/skills/serena-guidance/**`
- Create: `.opencode/skills/context7-guidance/**`
- Create: `.opencode/skills/playwright-guidance/**`
- Create: `.opencode/skills/session-start/**`
- Modify: `tests/sync-opencode.test.mjs`
- Modify: `tests/opencode-specialization.test.mjs`

**Interfaces:**
- Consumes: `syncOpencodeSkills`, `checkOpencodeSkills`, and specialization bypass policy.
- Produces: reviewed checked-in seven-skill projection and evidence that specialization generate/check touches no direct/global-home personalization root.

- [ ] **Step 1: Write RED checked-in parity and injected-home sentinel tests**

```js
test('checked-in OpenCode skills match isolated generation', () => {
  const result = checkOpencodeSkills({root: ROOT});
  assert.deepEqual(result, {ok: true, differences: []});
});

test('specialization generation does not inspect or mutate provider home skill roots', t => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'opencode-only-home-'));
  t.after(() => fs.rmSync(home, {recursive: true, force: true}));
  const sentinels = [
    '.cursor/skills/sentinel',
    '.agents/skills/sentinel',
    '.config/opencode/skills/sentinel',
  ];
  for (const relative of sentinels) {
    fs.mkdirSync(path.dirname(path.join(home, relative)), {recursive: true});
    fs.writeFileSync(path.join(home, relative), 'unchanged');
  }
  const outputRoot = path.join(home, 'project/.opencode/skills');
  syncOpencodeSkills({root: ROOT, outputRoot});
  for (const relative of sentinels) assert.equal(fs.readFileSync(path.join(home, relative), 'utf8'), 'unchanged');
});
```

Also assert real checked-in roots contain no symlink anywhere and all seven capability IDs have exact source/destination mappings. Assert general `registry/manifests/exposures.yaml` still contains Cursor, Codex, and OpenCode global-home declarations—the bypass is selection, not deletion.

- [ ] **Step 2: Run tests and verify intended RED**

Run:

```bash
node --test tests/sync-opencode.test.mjs tests/opencode-specialization.test.mjs
```

Expected: checked-in parity test FAILS with seven missing generated roots; sentinel and general-exposure preservation tests already pass.

- [ ] **Step 3: Generate only owned project-local skills**

Run:

```bash
npm run opencode:generate
```

Expected: creates exactly seven children under `.opencode/skills`; does not modify canonical overlays, exposures, adapters, or home paths.

- [ ] **Step 4: Run GREEN parity, idempotence, and representation checks**

Run:

```bash
node --test tests/sync-opencode.test.mjs tests/opencode-specialization.test.mjs
npm run opencode:check
before=$(git status --porcelain=v1)
npm run opencode:generate
after=$(git status --porcelain=v1)
test "$before" = "$after"
find .opencode/skills -type l -print -quit | test -z "$(cat)"
```

Expected: tests pass; isolated check exits `0`; second generation changes no worktree state; symlink command prints nothing and exits `0`.

- [ ] **Step 5: Commit Task 5**

```bash
git add .opencode/skills tests/sync-opencode.test.mjs tests/opencode-specialization.test.mjs
git commit -m "feat: publish project-local OpenCode skills"
```

---

### Task 6: Enforce Provider Pins and Fail-Closed Authentication Policy

**Files:**
- Modify: `lib/opencode-specialization.mjs`
- Modify: `tests/opencode-specialization.test.mjs`

**Interfaces:**
- Consumes: project/specialization values from Tasks 1–2.
- Produces: deterministic negative-policy validation for provider drift, forbidden fallbacks, and classic/OpenCode-2 separation; no execution observation.

- [ ] **Step 1: Add table-driven RED tests for every prohibited provider configuration**

```js
test('provider policy fails closed on every unapproved realization', () => {
  const files = readOpencodeOnlyFiles({root: ROOT});
  const cases = [
    ['OpenAI API key', value => { value.projectConfig.provider = {openai: {apiKey: '{env:OPENAI_API_KEY}'}}; }],
    ['extra provider', value => { value.projectConfig.enabled_providers.push('anthropic'); }],
    ['floating Cursor package', value => { value.projectConfig.plugin = ['cursor-opencode-provider@latest']; }],
    ['Git Cursor package', value => { value.projectConfig.plugin = ['github:oakimov/cursor-opencode-provider#main']; }],
    ['local Cursor package', value => { value.projectConfig.plugin = ['/tmp/cursor-opencode-provider']; }],
    ['OpenCode 2 entrypoint', value => { value.projectConfig.plugin = ['cursor-opencode-provider/plugin/opencode2']; }],
    ['Cursor API key auth', value => { value.specialization.provider_bindings[1].auth_realization = 'api-key'; }],
    ['wrong package version', value => { value.specialization.provider_bindings[1].package.version = '0.6.4'; }],
    ['wrong upstream commit', value => { value.specialization.provider_bindings[1].package.upstream_commit = 'deadbeef'; }],
    ['wrong npm integrity', value => { value.specialization.provider_bindings[1].package.npm_integrity = 'sha512-wrong'; }],
  ];
  for (const [name, mutate] of cases) {
    const value = structuredClone({specialization: files.specialization, projectConfig: files.projectConfig});
    mutate(value);
    assert.equal(validateOpencodeOnly({...files, ...value, root: ROOT}).ok, false, name);
  }
});
```

Add a fail-if-called test replacing `child_process.spawnSync`, `fetch`, and sensitive `fs.readFileSync` paths; run `validateOpencodeOnly`, `validate()`, and `staticIntegrity()` and assert zero calls/reads. Add a test proving account/model data does not appear in accepted schema.

- [ ] **Step 2: Run focused tests and verify intended RED**

Run:

```bash
node --test tests/opencode-specialization.test.mjs
```

Expected: FAIL on at least the injected `provider.openai.apiKey` case because recursive forbidden-field/value validation is not yet complete; existing exact-pin cases remain green.

- [ ] **Step 3: Implement minimum recursive fail-closed checks**

Walk only supplied Git-visible objects. Reject any unapproved provider key, secret-bearing property (`apiKey`, `token`, `credential`, `authFile`), environment/API-key fallback, model catalog/pin, floating/Git/local plugin spec, OpenCode 2 entrypoint, or deviation from approved package/auth metadata. Do not resolve/install the npm package or inspect runtime cache. Keep error messages path-specific, for example `opencode.json provider.openai.apiKey is forbidden`.

- [ ] **Step 4: Run GREEN provider/static suites**

Run:

```bash
node --test tests/opencode-specialization.test.mjs tests/native-plugin-static-probe.test.mjs tests/registry.test.mjs
npm run validate:opencode
npm run validate
npm run skills:ci:static
```

Expected: all commands exit `0`; fail-if-called tests prove zero auth, model, subprocess, cache, or host-state operations.

- [ ] **Step 5: Commit Task 6**

```bash
git add lib/opencode-specialization.mjs tests/opencode-specialization.test.mjs
git commit -m "test: enforce fail-closed OpenCode provider policy"
```

---

### Task 7: Document Operations and Run Integrated Deterministic Verification

**Files:**
- Modify: `docs/host-adapters.md`
- Modify: `tests/opencode-specialization.test.mjs`
- Modify only if a verified command description is missing: `README.md`

**Interfaces:**
- Consumes: all prior tasks' commands and exact authority boundaries.
- Produces: concise deterministic operator workflow plus explicit separate live-acceptance and production gates.

- [ ] **Step 1: Write documentation assertions as a RED test**

Add to `tests/opencode-specialization.test.mjs` only if Task 2 did not already cover documentation:

```js
test('host adapter documentation separates deterministic and live OpenCode acceptance', () => {
  const text = fs.readFileSync(path.join(ROOT, 'docs/host-adapters.md'), 'utf8');
  for (const required of [
    'npm run opencode:generate',
    'npm run opencode:check',
    'npm run validate:opencode',
    'ChatGPT Plus/Pro OAuth',
    'Cursor browser OAuth',
    'cursor-opencode-provider@0.6.3',
    'separate live-acceptance plan',
    'PR #4',
  ]) assert.match(text, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});
```

- [ ] **Step 2: Run test and verify intended RED**

Run:

```bash
node --test tests/opencode-specialization.test.mjs
```

Expected: FAIL because current host-adapter documentation lacks specialization commands and acceptance/production gates.

- [ ] **Step 3: Add concise documentation**

Document:

1. `specialization.yaml` precedence and OpenCode `>=1.18.19 <2.0.0`;
2. canonical versus generated versus local-only files;
3. exact seven skill mappings and two native agents;
4. `npm run opencode:generate`, `opencode:check`, and `validate:opencode`;
5. direct Cursor/Codex/global-home OpenCode bypass without deleting general exposures;
6. fail-closed OpenAI subscription OAuth and pinned Cursor browser-OAuth policies;
7. no deterministic auth/cache/model access;
8. later separate live-acceptance plan;
9. five PR #4 findings as separate production-readiness prerequisites.

Do not include tokens, account names, local paths, current model catalogs, installation instructions that perform auth, or claims that live acceptance passed.

- [ ] **Step 4: Run documentation GREEN test**

Run:

```bash
node --test tests/opencode-specialization.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Run final deterministic verification**

Run from repository root:

```bash
npm run opencode:generate
npm run opencode:check
npm run validate:opencode
node --test tests/opencode-specialization.test.mjs tests/sync-opencode.test.mjs
npm run validate
npm run skills:ci:static
npm run adapters:check
npm test
git diff --check
git status --short
```

Expected:

- `opencode:generate` is idempotent and `opencode:check` reports exact checked-in parity;
- focused OpenCode suites pass;
- `validate`, `skills:ci:static`, and `adapters:check` exit `0`;
- `npm test` reports zero failures and at least the protected baseline `106` passing tests plus new tests;
- `git diff --check` emits nothing;
- `git status --short` lists only Task 7 documentation/test changes before commit;
- no command performs network inference, OAuth, plugin installation, cache inspection, or home mutation.

- [ ] **Step 6: Audit protected boundaries**

Run:

```bash
git diff 00c6ee8e05e4b835b6789eb4a33626b344ef4556 -- registry/manifests/tools.yaml docs/decisions/ADR-026-hhpe-plane-authority-model.md
git diff --name-only 00c6ee8e05e4b835b6789eb4a33626b344ef4556 | rg '(^|/)(auth\.json|node_modules|\.cache)(/|$)' && exit 1 || true
git grep -nE '(access[_-]?token|refresh[_-]?token|session[_-]?cookie|sk-[A-Za-z0-9_-]{16,})' -- AGENTS.md opencode.json .opencode registry/manifests/specialization.yaml && exit 1 || true
find .opencode/skills -type l -print -quit | test -z "$(cat)"
```

Expected: protected-file diff is empty; no forbidden tracked path or credential value is found; generated skills contain no symlink.

- [ ] **Step 7: Commit Task 7**

```bash
git add docs/host-adapters.md tests/opencode-specialization.test.mjs
git commit -m "docs: describe OpenCode-only operation gates"
```

---

## Final Integrated Verification

After Task 7 commit, rerun fresh completion evidence:

```bash
test "$(git branch --show-current)" = "feat/opencode_only"
npm run opencode:check
npm run validate:opencode
node --test tests/opencode-specialization.test.mjs tests/sync-opencode.test.mjs
npm run validate
npm run skills:ci:static
npm run adapters:check
npm test
git diff --check
git status --porcelain=v1
```

Required result: every command exits `0`; final `npm test` has zero failures and preserves at least 106 passing baseline tests; final status output is empty. Do not claim live provider acceptance or production readiness from deterministic success.

Inspect final delta:

```bash
git diff --stat 00c6ee8e05e4b835b6789eb4a33626b344ef4556..HEAD
git diff --name-status 00c6ee8e05e4b835b6789eb4a33626b344ef4556..HEAD
git log --oneline --reverse 00c6ee8e05e4b835b6789eb4a33626b344ef4556..HEAD
```

Required audit conclusions:

- exact specialization policy and OpenCode 1.x boundary are represented;
- exactly two agent files and seven skill roots exist;
- no native command/project plugin directory was invented;
- only project-local OpenCode personalization is selected;
- direct/global-home general paths remain recorded but untouched;
- provider policy is exact and fail-closed;
- ToolSpec/ToolRealizationObservation and five PR #4 findings are unchanged;
- no secret/cache/local path entered Git.

## Separate Live-Acceptance Boundary

Live acceptance is explicitly outside implementation tasks and deterministic completion. Author a separate approved plan later, in an authorized environment, for:

```text
OpenAI:
OpenCode >=1.18.19 <2.0.0
  -> ChatGPT Plus/Pro OAuth
  -> authenticated model discovery
  -> minimal model-backed operation

Cursor:
OpenCode >=1.18.19 <2.0.0
  -> cursor-opencode-provider@0.6.3
  -> browser OAuth
  -> model discovery
  -> text operation
  -> tool operation
  -> restart/cache verification
```

Outcomes remain contextual. Failure must remain explicit and must never activate a forbidden fallback. Acceptance reports record only bounded non-secret classifications and never raw auth/cache material.

## Production Gate

Deterministic `opencode_only` implementation may complete while the five inherited PR #4 ToolSpec findings remain open. Final production merge/readiness must not be claimed until that separately owned work is resolved and all preserved ToolSpec/runtime paths are reverified. This plan does not repair, redesign, or suppress those findings.
