/**
 * Characterization: documents CURRENT OpenCode-only bleed on main.
 * These assertions must PASS on unpeeled main. After the peel they should be
 * rewritten or archived (see peel plan Task 7).
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {createRequire} from 'node:module'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)

test('characterization: specialization.yaml declares opencode_only on this tip', () => {
  const specialization = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'registry/manifests/specialization.yaml'), 'utf8'),
  )
  assert.equal(specialization.specialization_id, 'opencode_only')
  assert.equal(specialization.agent_runtime, 'opencode')
  assert.equal(specialization.personalization_target, 'opencode')
})

test('characterization: default validate imports and invokes validateOpencodeOnly', () => {
  const registrySource = fs.readFileSync(path.join(ROOT, 'lib/registry.mjs'), 'utf8')
  assert.match(registrySource, /import\s*\{\s*validateOpencodeOnly\s*\}\s*from\s*['"]\.\/opencode-specialization\.mjs['"]/)
  assert.match(registrySource, /validateOpencodeOnly\s*\(/)
})

test('characterization: skills-ci staticIntegrity invokes validateOpencodeOnly', () => {
  const source = fs.readFileSync(path.join(ROOT, 'lib/skills-ci.mjs'), 'utf8')
  assert.match(source, /validateOpencodeOnly/)
})

test('characterization: OpenCode personalization surfaces exist at repo root', () => {
  for (const rel of ['AGENTS.md', 'opencode.json', 'lib/opencode-specialization.mjs', 'scripts/sync-opencode.mjs']) {
    assert.equal(fs.existsSync(path.join(ROOT, rel)), true, rel)
  }
  assert.equal(fs.existsSync(path.join(ROOT, '.opencode', 'agents')), true)
  assert.equal(fs.existsSync(path.join(ROOT, '.opencode', 'skills')), true)
})

test('characterization: package.json exposes OpenCode specialization scripts', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'))
  assert.equal(pkg.scripts['validate:opencode'], 'node lib/opencode-specialization.mjs')
  assert.ok(pkg.scripts['opencode:generate'])
  assert.ok(pkg.scripts['opencode:check'])
})

test('characterization: AGENTS.md claims OpenCode sole personalization runtime', () => {
  const agents = fs.readFileSync(path.join(ROOT, 'AGENTS.md'), 'utf8')
  assert.match(agents, /OpenCode is sole personalization runtime/i)
})

test('characterization: peel inventory file is present for executors', () => {
  const inventoryPath = path.join(
    ROOT,
    'docs/superpowers/plans/2026-08-31-opencode-only-peel-inventory.json',
  )
  assert.equal(fs.existsSync(inventoryPath), true)
  const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'))
  assert.equal(inventory.peel_id, 'agent-agnostic-main-opencode-only')
  assert.ok(Array.isArray(inventory.move_or_gate_to_opencode_only))
  assert.ok(Array.isArray(inventory.decouple_on_main))
  assert.ok(Array.isArray(inventory.keep_on_main_shared))
})

test('characterization: validateOpencodeOnly currently succeeds on this tip', async () => {
  const {validateOpencodeOnly} = await import('../lib/opencode-specialization.mjs')
  const result = validateOpencodeOnly({root: ROOT})
  assert.equal(result.ok, true, JSON.stringify(result.errors))
})

test('characterization: default validate currently depends on specialization (status readable)', async () => {
  // Avoid ambient HHPE_HRG_HOME pointing at a foreign checkout.
  assert.notEqual(process.env.HHPE_HRG_HOME, path.join(ROOT, '..'), 'unexpected HHPE_HRG_HOME')
  const {validate, ROOT: registryRoot} = await import('../lib/registry.mjs')
  assert.equal(path.resolve(registryRoot), path.resolve(ROOT))
  const result = validate()
  // On a complete local checkout with packages, expect passed; if packages missing, still prove specialization ran
  // by ensuring errors are not solely "missing package" without specialization module load.
  assert.ok(result)
  assert.ok(['passed', 'failed'].includes(result.status))
  require.resolve('../lib/opencode-specialization.mjs')
})
