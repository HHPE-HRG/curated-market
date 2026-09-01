/**
 * Peel acceptance: post-peel agent-agnostic main contract.
 *
 * Default `npm test` SKIPS this file's assertions unless HHPE_PEEL_ACCEPTANCE=1.
 * On unpeeled main with the env set, these MUST FAIL (proves the gate).
 * After the peel, they MUST PASS.
 *
 * Spec: docs/superpowers/specs/2026-08-31-agent-agnostic-main-opencode-only-peel-design.md
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ENABLED = process.env.HHPE_PEEL_ACCEPTANCE === '1'

function peelTest(name, fn) {
  test(name, {skip: !ENABLED && 'set HHPE_PEEL_ACCEPTANCE=1 to run peel acceptance'}, fn)
}

peelTest('peel: registry.mjs does not import or call validateOpencodeOnly', () => {
  const source = fs.readFileSync(path.join(ROOT, 'lib/registry.mjs'), 'utf8')
  assert.doesNotMatch(source, /validateOpencodeOnly/)
  assert.doesNotMatch(source, /opencode-specialization\.mjs/)
})

peelTest('peel: skills-ci.mjs does not invoke validateOpencodeOnly in static path', () => {
  const source = fs.readFileSync(path.join(ROOT, 'lib/skills-ci.mjs'), 'utf8')
  assert.doesNotMatch(source, /validateOpencodeOnly/)
})

peelTest('peel: default validate does not require specialization.yaml', async () => {
  const {validate, ROOT: registryRoot} = await import('../lib/registry.mjs')
  assert.equal(path.resolve(registryRoot), path.resolve(ROOT))
  const result = validate()
  assert.ok(result)
  const specializationErrors = (result.errors || []).filter(
    (error) =>
      /specialization|opencode\.json|OpenCode|opencode_only|\.opencode\/agents/i.test(String(error)),
  )
  assert.deepEqual(specializationErrors, [])
})

peelTest('peel: main AGENTS.md does not claim OpenCode sole personalization runtime', () => {
  const agentsPath = path.join(ROOT, 'AGENTS.md')
  if (!fs.existsSync(agentsPath)) return
  const agents = fs.readFileSync(agentsPath, 'utf8')
  assert.doesNotMatch(agents, /OpenCode is sole personalization runtime/i)
})

peelTest('peel: inventory still lists forbidden peel actions', () => {
  const inventory = JSON.parse(
    fs.readFileSync(
      path.join(ROOT, 'docs/superpowers/plans/2026-08-31-opencode-only-peel-inventory.json'),
      'utf8',
    ),
  )
  assert.ok(inventory.forbidden_during_peel.some((item) => /pre-PR#5|pre–PR #5|pre-PR #5/i.test(item) || /pre-PR/i.test(item)))
  assert.ok(inventory.keep_on_main_shared.some((item) => /function-control/i.test(item)))
  assert.ok(inventory.keep_on_main_shared.some((item) => /cursor-plugin-routing|adapters\/cursor/i.test(item)))
})
