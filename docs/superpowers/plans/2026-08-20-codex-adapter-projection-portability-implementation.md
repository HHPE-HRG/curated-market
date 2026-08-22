# Codex Adapter Projection Portability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make all seven approved HHPE Codex wrapper projections reproducible checked-in regular-file/directory trees generated from canonical overlays, with no historical host-absolute symlinks and no expansion of generator authority beyond the reviewed set.

**Architecture:** Keep `scripts/sync-adapters.mjs` as the narrow Codex-specific reconciler. An explicit closed source-to-destination mapping drives generation into either the checked-in skills root or an isolated output root; a structural snapshot comparator proves path-set, representation, bytes, and Git-relevant mode parity. Each owned destination alone may be replaced, while canonical overlays remain source authority and reviewed Git state remains publication authority.

**Tech Stack:** Node.js ESM, `node:fs`, `node:path`, `node:os`, `node:test`, `node:assert/strict`, Git executable-bit metadata, Markdown.

## Global Constraints

- Binding specification: [`../specs/2026-08-20-codex-adapter-projection-portability-design.md`](../specs/2026-08-20-codex-adapter-projection-portability-design.md). Specification outranks this plan.
- Work only on branch `fix/codex-adapter-portability`, based on frozen ToolSpec HEAD `4e0a852be267f5d1e52c77e425d2e089c6f4403f`.
- Do not modify the frozen ToolSpec branch, Track B, ADR-026, ToolSpec design, exposures, ToolSpec data, provider runtime, plugin installation, or host configuration.
- Canonical source authority remains `registry/overlays/wrappers/<wrapper>`.
- Compatibility projection remains `registry/adapters/codex/marketplace/plugins/hhpe-registry/skills/<wrapper>`.
- Generator ownership is exactly `ast-grep`, `registry-health`, `stack-router`, `serena-guidance`, `context7-guidance`, `playwright-guidance`, and `session-start`; directory discovery must never expand it.
- Generation is reconciliation/write mechanism only. Reviewed checked-in projection is publication/approval state. Plugin installation and activation are outside scope.
- Reconciliation deletion authority is restricted to the seven exact owned destination directories. Never clean their parent, neighboring skills, `.codex-plugin`, or other adapter content.
- Generated trees contain only real directories and regular files. Symlinks are invalid even when they resolve to equal bytes.
- Normalize generated file mode to `0755` when canonical Git-relevant executable bit is set and `0644` otherwise; create directories as `0755`. Ignore other platform permission noise.
- Generator mechanics must not add checkout, worktree, temporary-root, username, home, historical `/home/hold3n`, or generation-time data. Source-authored bytes must remain byte-identical and are not subject to blanket path-string rejection.
- Use TDD for every behavioral change: observe intended RED, implement minimum GREEN, then refactor only while tests stay green.
- Make one task-local commit per task. Do not merge, push, publish, deploy, install, activate, or open a PR.

## File and Interface Map

| Path | Responsibility | Planned action |
| --- | --- | --- |
| `scripts/sync-adapters.mjs` | Closed seven-wrapper ownership mapping, scoped recursive reconciliation, structural parity comparison, isolated check entry point | Expand and format existing script; no generic provider abstraction |
| `tests/sync-adapters.test.mjs` | Focused generator characterization, safety, representation, modes, portability, idempotence, stale-state, and isolated-check tests | Create |
| `tests/registry.test.mjs` | Existing checked-in seven-wrapper parity contract | Strengthen to use exported representation-aware parity helper |
| `registry/adapters/codex/marketplace/plugins/hhpe-registry/skills/{serena-guidance,context7-guidance,playwright-guidance,session-start}/SKILL.md` | Four invalid absolute symlinks | Replace through generator with checked-in regular files |
| `registry/adapters/codex/marketplace/plugins/hhpe-registry/skills/{ast-grep,registry-health,stack-router}/**` | Existing generated trees | Reconcile without semantic content change |
| `docs/host-adapters.md` | Narrow operator statement of canonical source, seven-name generator ownership, checked-in state, and regeneration/check workflow | Update |
| `package.json` | Repository-native non-destructive adapter check command | Add `adapters:generate` and `adapters:check` scripts only |

### Exact interfaces selected for this migration

```js
export const CODEX_WRAPPER_PROJECTIONS = Object.freeze([
  'ast-grep',
  'registry-health',
  'stack-router',
  'serena-guidance',
  'context7-guidance',
  'playwright-guidance',
  'session-start',
]);

export function syncAdapters({
  root = REPOSITORY_ROOT,
  outputRoot = codexSkillsRoot(root),
} = {}) {}

export function compareAdapterProjection({
  root = REPOSITORY_ROOT,
  outputRoot = codexSkillsRoot(root),
} = {}) {}

export function checkAdapters({root = REPOSITORY_ROOT} = {}) {}
```

- `syncAdapters` consumes canonical overlays below `root` and reconciles only the seven owned children below `outputRoot`; it returns `{wrappers: [...CODEX_WRAPPER_PROJECTIONS]}` or throws with wrapper/relative-path context.
- `compareAdapterProjection` performs no writes and returns `{ok: true, differences: []}` or `{ok: false, differences: string[]}`. Differences cover missing/extra entries, wrong entry type, byte mismatch, and executable-bit mismatch.
- `checkAdapters` creates a temporary directory, calls `syncAdapters` into it, compares that fresh projection to checked-in state, removes the temporary directory in `finally`, and returns the same comparison shape. It never rewrites checked-in projection.
- CLI behavior stays narrow: default or `generate` reconciles checked-in output; `check` performs isolated comparison and exits nonzero with differences. No other provider is accepted.

---

### Task 1: Characterize Existing Projection and Establish Closed Generator Seam

**Files:**
- Create: `tests/sync-adapters.test.mjs`
- Modify: `scripts/sync-adapters.mjs`

**Interfaces:**
- Consumes: existing canonical wrapper and Codex skills paths.
- Produces: `CODEX_WRAPPER_PROJECTIONS`, `syncAdapters({root, outputRoot})`, and import-safe CLI execution guarded by `import.meta.url === pathToFileURL(process.argv[1]).href`.

- [ ] **Step 1: Record pre-change repository characterization**

Run:

```bash
git ls-files -s registry/adapters/codex/marketplace/plugins/hhpe-registry/skills
node --test tests/registry.test.mjs
```

Expected: modes show three regular generated wrapper trees and four `120000` symlink entries; registry parity fails while reading the historical Linux targets on this host. Save exact failure text in task notes, not a repository artifact.

- [ ] **Step 2: Write focused RED tests for closed ownership and isolated output**

Create `tests/sync-adapters.test.mjs` with fixture helpers and these initial tests:

```js
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  CODEX_WRAPPER_PROJECTIONS,
  syncAdapters,
} from '../scripts/sync-adapters.mjs';

const EXPECTED = [
  'ast-grep',
  'registry-health',
  'stack-router',
  'serena-guidance',
  'context7-guidance',
  'playwright-guidance',
  'session-start',
];

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hhpe-adapters-'));
  const source = path.join(root, 'registry/overlays/wrappers');
  for (const name of [...EXPECTED, 'unreviewed-wrapper']) {
    fs.mkdirSync(path.join(source, name), {recursive: true});
    fs.writeFileSync(path.join(source, name, 'SKILL.md'), `${name}\n`);
  }
  return {root, outputRoot: path.join(root, 'isolated-output')};
}

test('generator ownership is the explicit reviewed seven-wrapper set', () => {
  assert.deepEqual(CODEX_WRAPPER_PROJECTIONS, EXPECTED);
  assert.ok(Object.isFrozen(CODEX_WRAPPER_PROJECTIONS));
});

test('syncAdapters writes all and only owned wrappers beneath an injected output root', t => {
  const {root, outputRoot} = fixture();
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  syncAdapters({root, outputRoot});
  assert.deepEqual(fs.readdirSync(outputRoot).sort(), [...EXPECTED].sort());
  assert.equal(fs.existsSync(path.join(outputRoot, 'unreviewed-wrapper')), false);
});
```

- [ ] **Step 3: Run focused tests and verify intended RED**

Run:

```bash
node --test tests/sync-adapters.test.mjs
```

Expected: FAIL because current script exports neither `CODEX_WRAPPER_PROJECTIONS` nor `syncAdapters`, not because fixture setup or module syntax fails.

- [ ] **Step 4: Implement minimum closed mapping and injected output seam**

Refactor `scripts/sync-adapters.mjs` into readable ESM. Use this exact ownership list and signature:

```js
export const CODEX_WRAPPER_PROJECTIONS = Object.freeze([
  'ast-grep',
  'registry-health',
  'stack-router',
  'serena-guidance',
  'context7-guidance',
  'playwright-guidance',
  'session-start',
]);

export function syncAdapters({root = REPOSITORY_ROOT, outputRoot = codexSkillsRoot(root)} = {}) {
  for (const name of CODEX_WRAPPER_PROJECTIONS) {
    const source = path.join(root, 'registry/overlays/wrappers', name);
    const destination = path.join(outputRoot, name);
    if (!fs.statSync(source, {throwIfNoEntry: false})?.isDirectory()) {
      throw new Error(`missing canonical Codex wrapper: ${name}`);
    }
    fs.rmSync(destination, {recursive: true, force: true});
    copyCanonicalTree(source, destination);
  }
  return {wrappers: [...CODEX_WRAPPER_PROJECTIONS]};
}
```

For this task, `copyCanonicalTree` may recursively create directories and regular files. Task 2 tightens representation and mode behavior. Guard CLI invocation so importing the module does not generate into repository state.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run:

```bash
node --test tests/sync-adapters.test.mjs
```

Expected: PASS, proving explicit ownership and output-root injection without touching checked-in projection.

- [ ] **Step 6: Verify production default still points only at checked-in Codex skills root**

Run:

```bash
node -e "import('./scripts/sync-adapters.mjs').then(m => console.log(m.CODEX_WRAPPER_PROJECTIONS.join(',')))"
git status --short
```

Expected: seven comma-separated reviewed names; only task files changed. Import must not modify adapter output.

- [ ] **Step 7: Commit Task 1**

```bash
git add scripts/sync-adapters.mjs tests/sync-adapters.test.mjs
git commit -m "test: define Codex adapter generator boundary"
```

---

### Task 2: Implement Scoped Reconciliation and Representation-Aware Isolated Checking

**Files:**
- Modify: `scripts/sync-adapters.mjs`
- Modify: `tests/sync-adapters.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: Task 1 `CODEX_WRAPPER_PROJECTIONS` and `syncAdapters({root, outputRoot})`.
- Produces: `compareAdapterProjection({root, outputRoot})`, `checkAdapters({root})`, deterministic recursive reconciliation, CLI `generate|check`, and npm scripts `adapters:generate` / `adapters:check`.

- [ ] **Step 1: Add RED fixture tests for exact reconciliation and containment**

Extend fixture creation to add nested files and an unrelated sentinel outside owned roots. Add tests equivalent to:

```js
test('reconciliation removes stale owned files but preserves neighboring adapter content', t => {
  const {root, outputRoot} = fixture();
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  fs.mkdirSync(path.join(outputRoot, 'ast-grep'), {recursive: true});
  fs.writeFileSync(path.join(outputRoot, 'ast-grep/stale.txt'), 'stale');
  fs.mkdirSync(path.join(outputRoot, 'neighbor'), {recursive: true});
  fs.writeFileSync(path.join(outputRoot, 'neighbor/keep.txt'), 'keep');
  syncAdapters({root, outputRoot});
  assert.equal(fs.existsSync(path.join(outputRoot, 'ast-grep/stale.txt')), false);
  assert.equal(fs.readFileSync(path.join(outputRoot, 'neighbor/keep.txt'), 'utf8'), 'keep');
});

test('missing canonical source fails instead of silently omitting owned output', t => {
  const {root, outputRoot} = fixture();
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  fs.rmSync(path.join(root, 'registry/overlays/wrappers/session-start'), {recursive: true});
  assert.throws(() => syncAdapters({root, outputRoot}), /missing canonical Codex wrapper: session-start/);
});
```

- [ ] **Step 2: Run reconciliation tests and verify intended RED**

Run:

```bash
node --test --test-name-pattern='reconciliation|missing canonical' tests/sync-adapters.test.mjs
```

Expected: at least stale-state or missing-source behavior FAILS against Task 1's minimum copier for the asserted reason; no ambient adapter path is touched.

- [ ] **Step 3: Add RED representation, recursive-path, byte, and mode tests**

Add a `walkTree(root)` fixture helper using `fs.lstatSync` so symlinks are never followed. Test:

```js
test('generated trees recursively match source bytes, types, and executable bits', t => {
  const {root, outputRoot} = fixture();
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const nested = path.join(root, 'registry/overlays/wrappers/ast-grep/references/run.sh');
  fs.mkdirSync(path.dirname(nested), {recursive: true});
  fs.writeFileSync(nested, '#!/bin/sh\nexit 0\n');
  fs.chmodSync(nested, 0o755);
  syncAdapters({root, outputRoot});
  assert.deepEqual(walkTree(path.join(outputRoot, 'ast-grep')), walkTree(path.join(root, 'registry/overlays/wrappers/ast-grep')));
  assert.equal(fs.statSync(path.join(outputRoot, 'ast-grep/SKILL.md')).mode & 0o777, 0o644);
  assert.equal(fs.statSync(path.join(outputRoot, 'ast-grep/references/run.sh')).mode & 0o777, 0o755);
});

test('a byte-equivalent symlink fails representation parity', t => {
  const {root, outputRoot} = fixture();
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  syncAdapters({root, outputRoot});
  const target = path.join(outputRoot, 'ast-grep/SKILL.real');
  fs.renameSync(path.join(outputRoot, 'ast-grep/SKILL.md'), target);
  fs.symlinkSync('SKILL.real', path.join(outputRoot, 'ast-grep/SKILL.md'));
  const result = compareAdapterProjection({root, outputRoot});
  assert.equal(result.ok, false);
  assert.ok(result.differences.some(item => /ast-grep\/SKILL.md.*symlink/.test(item)));
});
```

Expected comparison snapshots record relative path, `directory|file|symlink`, SHA-256 or bytes for files, and executable boolean only. Tests assert `0644/0755` generated modes but never compare irrelevant group/other platform metadata.

- [ ] **Step 4: Run representation tests and verify intended RED**

Run:

```bash
node --test --test-name-pattern='recursively match|symlink fails' tests/sync-adapters.test.mjs
```

Expected: FAIL because `compareAdapterProjection` does not exist and Task 1 has not yet guaranteed normalized modes. Failure must not come from reading through a broken link.

- [ ] **Step 5: Implement deterministic copy and read-only comparison**

Implement scoped helpers in `scripts/sync-adapters.mjs`:

```js
function copyCanonicalTree(source, destination) {
  fs.mkdirSync(destination, {recursive: true, mode: 0o755});
  for (const entry of fs.readdirSync(source, {withFileTypes: true})) {
    const from = path.join(source, entry.name);
    const to = path.join(destination, entry.name);
    if (entry.isDirectory()) copyCanonicalTree(from, to);
    else if (entry.isFile()) {
      fs.copyFileSync(from, to);
      fs.chmodSync(to, fs.statSync(from).mode & 0o111 ? 0o755 : 0o644);
    } else throw new Error(`unsupported canonical entry: ${from}`);
  }
}

export function compareAdapterProjection({root = REPOSITORY_ROOT, outputRoot = codexSkillsRoot(root)} = {}) {
  const differences = [];
  for (const name of CODEX_WRAPPER_PROJECTIONS) {
    compareTrees(path.join(root, 'registry/overlays/wrappers', name), path.join(outputRoot, name), name, differences);
  }
  return {ok: differences.length === 0, differences};
}
```

`compareTrees` must use `lstat`, compare sorted relative entry sets, reject every symlink/unsupported type, compare regular-file bytes, and compare only `Boolean(mode & 0o111)` for executable parity. Error strings include wrapper and relative path.

- [ ] **Step 6: Add RED tests for isolated check, idempotence, drift, and path-root independence**

Add tests that:

```js
test('checkAdapters compares isolated fresh generation without rewriting checked-in state', t => {
  const {root} = fixtureWithCheckedInProjection();
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const before = snapshotWholeAdapter(root);
  assert.deepEqual(checkAdapters({root}), {ok: true, differences: []});
  assert.deepEqual(snapshotWholeAdapter(root), before);
});

test('generation is idempotent and one source edit changes only its projection', t => {
  const {root, outputRoot} = fixture();
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  syncAdapters({root, outputRoot});
  const first = snapshotWholeAdapterAt(outputRoot);
  syncAdapters({root, outputRoot});
  assert.deepEqual(snapshotWholeAdapterAt(outputRoot), first);
  fs.appendFileSync(path.join(root, 'registry/overlays/wrappers/session-start/SKILL.md'), 'changed\n');
  syncAdapters({root, outputRoot});
  assert.deepEqual(changedWrappers(first, snapshotWholeAdapterAt(outputRoot)), ['session-start']);
});
```

Also instantiate equivalent fixtures under two different temporary roots and assert output snapshots are identical. Add a canonical file containing an intentional `/example/home/path` and prove it is copied byte-for-byte; assert no generated entry is a symlink, so generator-introduced link targets cannot carry root metadata.

- [ ] **Step 7: Run isolated-check tests and verify intended RED**

Run:

```bash
node --test --test-name-pattern='checkAdapters|idempotent|source edit|temporary roots' tests/sync-adapters.test.mjs
```

Expected: FAIL because `checkAdapters` and its temporary-generation comparison do not exist yet.

- [ ] **Step 8: Implement isolated check and narrow CLI**

Implement:

```js
export function checkAdapters({root = REPOSITORY_ROOT} = {}) {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'hhpe-codex-adapters-'));
  try {
    syncAdapters({root, outputRoot: temporaryRoot});
    return compareProjectionRoots(temporaryRoot, codexSkillsRoot(root));
  } finally {
    fs.rmSync(temporaryRoot, {recursive: true, force: true});
  }
}
```

`compareProjectionRoots` compares only seven named children and uses representation-aware snapshots. Add CLI dispatch: `generate` invokes `syncAdapters`; `check` invokes `checkAdapters`, prints differences to stderr, and sets exit code `1` when stale; unknown arguments exit `2`. CLI must call no Codex/provider command.

- [ ] **Step 9: Add npm commands and verify GREEN**

Add to `package.json`:

```json
"adapters:generate": "node scripts/sync-adapters.mjs generate",
"adapters:check": "node scripts/sync-adapters.mjs check"
```

Run:

```bash
node --test tests/sync-adapters.test.mjs
```

Expected: all focused tests PASS. Do not run `adapters:generate` against repository state yet; checked-in four-symlink conversion belongs to Task 3.

- [ ] **Step 10: Commit Task 2**

```bash
git add scripts/sync-adapters.mjs tests/sync-adapters.test.mjs package.json
git commit -m "feat: reconcile portable Codex adapter projections"
```

---

### Task 3: Convert and Verify Checked-In Seven-Wrapper Projection

**Files:**
- Modify: `tests/registry.test.mjs`
- Modify: `registry/adapters/codex/marketplace/plugins/hhpe-registry/skills/ast-grep/**`
- Modify: `registry/adapters/codex/marketplace/plugins/hhpe-registry/skills/registry-health/**`
- Modify: `registry/adapters/codex/marketplace/plugins/hhpe-registry/skills/stack-router/**`
- Replace symlink with regular tree: `registry/adapters/codex/marketplace/plugins/hhpe-registry/skills/serena-guidance/**`
- Replace symlink with regular tree: `registry/adapters/codex/marketplace/plugins/hhpe-registry/skills/context7-guidance/**`
- Replace symlink with regular tree: `registry/adapters/codex/marketplace/plugins/hhpe-registry/skills/playwright-guidance/**`
- Replace symlink with regular tree: `registry/adapters/codex/marketplace/plugins/hhpe-registry/skills/session-start/**`

**Interfaces:**
- Consumes: Task 2 generator and comparison functions.
- Produces: portable checked-in projection and representation-aware repository parity test.

- [ ] **Step 1: Strengthen existing parity test before regeneration**

Replace the content-only recursive reader in `tests/registry.test.mjs` with the exported read-only comparator:

```js
import {compareAdapterProjection} from '../scripts/sync-adapters.mjs';

test('generated HHPE Codex adapter matches canonical overlays', () => {
  assert.deepEqual(compareAdapterProjection({root: ROOT}), {ok: true, differences: []});
});
```

- [ ] **Step 2: Run parity test and verify intended RED**

Run:

```bash
node --test --test-name-pattern='generated HHPE Codex adapter matches canonical overlays' tests/registry.test.mjs
```

Expected: FAIL with representation differences identifying the four generator-owned symlink entries; it must not fail merely because their historical absolute targets cannot be opened.

- [ ] **Step 3: Reconcile checked-in projection using the reviewed generator**

Run:

```bash
npm run adapters:generate
```

Expected: generator replaces only the seven owned roots. Four historical symlinks become regular `SKILL.md` files; existing canonical nested files are copied.

- [ ] **Step 4: Verify exact Git representation and containment before staging**

Run:

```bash
find registry/adapters/codex/marketplace/plugins/hhpe-registry/skills/{ast-grep,registry-health,stack-router,serena-guidance,context7-guidance,playwright-guidance,session-start} -type l -print
git diff --summary
git status --short
```

Expected: `find` prints nothing; diff summary shows four symlink-to-regular-file representation changes and no deletion or modification outside seven owned roots plus `tests/registry.test.mjs`.

- [ ] **Step 5: Run focused parity and isolated regeneration checks**

Run:

```bash
node --test tests/sync-adapters.test.mjs
node --test --test-name-pattern='generated HHPE Codex adapter matches canonical overlays' tests/registry.test.mjs
npm run adapters:check
```

Expected: all commands exit `0`; isolated regeneration matches checked-in state.

- [ ] **Step 6: Prove idempotence against Git**

Run:

```bash
git diff --binary > /tmp/hhpe-codex-adapter-before.diff
npm run adapters:generate
git diff --binary > /tmp/hhpe-codex-adapter-after.diff
cmp /tmp/hhpe-codex-adapter-before.diff /tmp/hhpe-codex-adapter-after.diff
```

Expected: `cmp` exits `0`. Remove the two temporary diff files afterward; they are outside repository state.

- [ ] **Step 7: Commit Task 3**

```bash
git add tests/registry.test.mjs registry/adapters/codex/marketplace/plugins/hhpe-registry/skills
git commit -m "fix: replace host-bound Codex adapter links"
```

---

### Task 4: Document Policy and Perform Final Safety Verification

**Files:**
- Modify: `docs/host-adapters.md`

**Interfaces:**
- Consumes: completed generator/check workflow.
- Produces: narrow operator documentation; no runtime interface.

- [ ] **Step 1: Update narrow Codex adapter documentation**

In `docs/host-adapters.md`, replace the current Codex sentence with text containing these exact commitments:

```markdown
- Codex's checked-in `hhpe-registry` adapter contains seven generator-owned HHPE wrapper trees: `ast-grep`, `registry-health`, `stack-router`, `serena-guidance`, `context7-guidance`, `playwright-guidance`, and `session-start`. Their canonical source is `registry/overlays/wrappers`; `npm run adapters:generate` reconciles those seven regular-file trees, and `npm run adapters:check` compares an isolated fresh generation with reviewed checked-in state. Generator ownership is closed and does not include other overlay wrappers or plugin metadata. Generation neither installs nor activates Codex plugins, and host-absolute symlink projection is unsupported.
```

Keep neighboring provider policy unchanged.

- [ ] **Step 2: Verify documentation and diff hygiene**

Run:

```bash
rg -n 'adapters:(generate|check)|seven|host-absolute|installs|activates' docs/host-adapters.md
git diff --check
git status --short
```

Expected: documented commands and boundaries found; `git diff --check` exits `0`; only `docs/host-adapters.md` remains uncommitted.

- [ ] **Step 3: Commit Task 4**

```bash
git add docs/host-adapters.md
git commit -m "docs: define Codex wrapper projection policy"
```

- [ ] **Step 4: Run complete focused and repository verification**

Run fresh:

```bash
node --test tests/sync-adapters.test.mjs
node --test tests/registry.test.mjs
npm run adapters:check
npm test
npm run validate
npm run skills:ci:static
find registry/adapters/codex/marketplace/plugins/hhpe-registry/skills/{ast-grep,registry-health,stack-router,serena-guidance,context7-guidance,playwright-guidance,session-start} -type l -print
git diff --check
git status --short --branch
```

Expected:

- focused generator and adapter parity tests pass;
- `adapters:check` exits `0` without modifying Git state;
- `find` prints no symlink below any owned tree;
- `git status` is clean after task commits;
- no test reports a Codex adapter historical Linux-path resolution failure;
- on this independent branch, Track A's two native-plugin/static-integrity failures and Track B's ambient collision failure may remain because neither independent remediation commit is present. Record exact actual results; do not claim repository-wide green.

- [ ] **Step 5: Verify requirement coverage and protected scope**

Run:

```bash
git diff --stat 4e0a852be267f5d1e52c77e425d2e089c6f4403f..HEAD
git diff --name-only 4e0a852be267f5d1e52c77e425d2e089c6f4403f..HEAD
git log --oneline 4e0a852be267f5d1e52c77e425d2e089c6f4403f..HEAD
```

Review output line-by-line against binding specification. Confirm:

- exactly seven explicit mappings; no directory-discovered ownership;
- complete recursive reconciliation and stale-file removal only inside owned roots;
- regular files/directories, zero symlinks, byte parity, nested-file parity, and executable-bit parity;
- isolated non-destructive checking, idempotence, drift detection, and temporary-root independence;
- no generator-introduced host/worktree paths and no blanket rejection of canonical content;
- plugin metadata and neighboring content untouched;
- no installation, activation, provider invocation, exposure, ToolSpec, Track A, Track B, or generic framework change;
- four representation changes are intentional; canonical identities, seven names, paths, content, and unrelated plugin metadata are preserved.

If any item lacks fresh evidence, add the smallest focused test or verification before reporting completion. Do not modify another track.

## Backward-Compatibility Surface

| Surface | Commitment | Proving task/test |
| --- | --- | --- |
| Canonical wrapper identity/source | Preserved under `registry/overlays/wrappers` | Tasks 1–3 closed mapping and byte parity |
| Seven Codex skill names | Preserved | Task 1 ownership test |
| Checked-in adapter paths | Preserved | Tasks 1 and 3 |
| Recursive content parity | Preserved and strengthened | Task 2 tree tests; Task 3 parity test |
| Plugin metadata and neighboring skills | Preserved untouched | Task 2 containment test; final diff review |
| Four historical Git symlinks | Intentionally replaced with regular trees | Task 3 RED/GREEN and `find -type l` |
| Generator ownership | Intentionally expands from three to reviewed seven only | Task 1 exact-list test |
| Plugin installation/activation | Unchanged and outside scope | Task 2 CLI/safety tests; final diff review |

## Planning Decisions Resolved

- Use narrow `root` and `outputRoot` parameters on existing script rather than a provider-projection framework.
- Reconcile by removing and recreating each exact owned destination; never remove the parent skills directory.
- Normalize regular-file modes to `0644` or `0755` based only on canonical executable bits; directories use `0755`.
- Use an exported representation-aware comparator for focused tests and existing repository parity.
- Add explicit `adapters:generate` and non-destructive `adapters:check` npm commands.
- Keep generated ownership metadata in the explicit script constant and specification; do not modify canonical content with banners or add an ownership database.

## Execution Gate

This plan authorizes no implementation by itself. Execute only after explicit approval, on `fix/codex-adapter-portability`, with the required execution/TDD/verification skills. Do not merge or push without separate authorization.
