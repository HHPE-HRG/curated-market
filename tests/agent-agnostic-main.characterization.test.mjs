/**
 * Historical bleed characterization (pre-peel main).
 *
 * After the agent-agnostic peel, these assertions are obsolete. They remain as
 * an archive note and are always skipped. Live post-peel proof is
 * `tests/agent-agnostic-main.peel-acceptance.test.mjs` with HHPE_PEEL_ACCEPTANCE=1.
 *
 * Spec: docs/superpowers/specs/2026-08-31-agent-agnostic-main-opencode-only-peel-design.md
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ARCHIVE = 'historical bleed — peel completed; use peel-acceptance'

function archived(name, fn) {
  test(name, {skip: ARCHIVE}, fn)
}

archived('characterization: specialization.yaml declares opencode_only on this tip', () => {
  const specialization = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'registry/manifests/specialization.yaml'), 'utf8'),
  )
  assert.equal(specialization.specialization_id, 'opencode_only')
})

archived('characterization: default validate imports and invokes validateOpencodeOnly', () => {
  const registrySource = fs.readFileSync(path.join(ROOT, 'lib/registry.mjs'), 'utf8')
  assert.match(registrySource, /validateOpencodeOnly/)
})

archived('characterization: skills-ci staticIntegrity invokes validateOpencodeOnly', () => {
  const source = fs.readFileSync(path.join(ROOT, 'lib/skills-ci.mjs'), 'utf8')
  assert.match(source, /validateOpencodeOnly/)
})

archived('characterization: OpenCode personalization surfaces exist at repo root', () => {
  for (const rel of ['AGENTS.md', 'opencode.json', 'lib/opencode-specialization.mjs', 'scripts/sync-opencode.mjs']) {
    assert.ok(fs.existsSync(path.join(ROOT, rel)), rel)
  }
})

archived('characterization: package.json exposes OpenCode specialization scripts', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'))
  assert.equal(pkg.scripts['validate:opencode'], 'node lib/opencode-specialization.mjs')
})

archived('characterization: AGENTS.md claims OpenCode sole personalization runtime', () => {
  const agents = fs.readFileSync(path.join(ROOT, 'AGENTS.md'), 'utf8')
  assert.match(agents, /OpenCode is sole personalization runtime/i)
})

archived('characterization: peel inventory file is present for executors', () => {
  const inventory = JSON.parse(
    fs.readFileSync(
      path.join(ROOT, 'docs/superpowers/plans/2026-08-31-opencode-only-peel-inventory.json'),
      'utf8',
    ),
  )
  assert.ok(Array.isArray(inventory.move_or_gate_to_opencode_only))
})

test('archive note: peel inventory still present after peel', () => {
  const inventory = JSON.parse(
    fs.readFileSync(
      path.join(ROOT, 'docs/superpowers/plans/2026-08-31-opencode-only-peel-inventory.json'),
      'utf8',
    ),
  )
  assert.ok(Array.isArray(inventory.move_or_gate_to_opencode_only))
  assert.ok(inventory.forbidden_during_peel.length > 0)
})
