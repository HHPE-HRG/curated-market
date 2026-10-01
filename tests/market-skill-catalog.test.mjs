/**
 * Agent context: T3 `$` must list Market input only. Intended: unique skill
 * `name` from overlay/package SKILL.md, `displayName` prefixed only when
 * `availability_host` is not `any`. Observed: `$` walked Codex homes and
 * duplicated caveman-compress.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  listMarketSkills,
  matchMarketSkillQuery,
  skillDisplayName,
} from '../lib/market-skill-catalog.mjs';

function writeSkill(packageRoot, dir, yamlName, description) {
  const skillDir = path.join(packageRoot, dir);
  fs.mkdirSync(skillDir, {recursive: true});
  fs.writeFileSync(
    path.join(skillDir, 'SKILL.md'),
    `---\nname: ${yamlName}\ndescription: ${description}\n---\n# ${yamlName}\n`,
  );
}

function fixtureRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hhpe-market-catalog-'));
  const overlay = path.join(root, 'registry/overlays/wrappers');
  writeSkill(overlay, 'original-source-research', 'original-source-research', 'Original-source research. Find producers.');
  writeSkill(overlay, 'serena-guidance', 'serena-guidance', 'Serena guidance.');
  writeSkill(overlay, 'context7-guidance', 'context7-guidance', 'Context7 guidance.');
  writeSkill(overlay, 'compress-a', 'caveman-compress', 'Compress memory. original');
  writeSkill(overlay, 'compress-b', 'caveman-compress', 'Second compress copy.');
  writeSkill(overlay, 'computer-use', 'computer-use', 'Use a computer.');
  fs.mkdirSync(path.join(root, 'registry/manifests'), {recursive: true});
  fs.writeFileSync(
    path.join(root, 'registry/manifests/packages.lock.yaml'),
    JSON.stringify({
      packages: [
        {
          package_id: 'hhpe-overlays',
          revision: {type: 'overlay', value: '1'},
          package_root: 'registry/overlays/wrappers',
          license: {path: '.'},
        },
      ],
    }),
  );
  fs.writeFileSync(
    path.join(root, 'registry/manifests/capabilities.yaml'),
    JSON.stringify({
      capabilities: [
        {
          capability_id: 'hhpe-hrg/original-source-research',
          display_name: 'original-source-research',
          package_id: 'hhpe-overlays',
          type: 'skill',
          source_path: 'original-source-research',
          availability_host: 'any',
        },
        {
          capability_id: 'hhpe-hrg/serena-guidance',
          display_name: 'serena-guidance',
          package_id: 'hhpe-overlays',
          type: 'skill',
          source_path: 'serena-guidance',
          availability_host: 'any',
        },
        {
          capability_id: 'hhpe-hrg/context7-guidance',
          display_name: 'context7-guidance',
          package_id: 'hhpe-overlays',
          type: 'skill',
          source_path: 'context7-guidance',
        },
        {
          capability_id: 'hhpe-hrg/compress-a',
          display_name: 'compress-a',
          package_id: 'hhpe-overlays',
          type: 'skill',
          source_path: 'compress-a',
          availability_host: 'any',
        },
        {
          capability_id: 'hhpe-hrg/compress-b',
          display_name: 'compress-b',
          package_id: 'hhpe-overlays',
          type: 'skill',
          source_path: 'compress-b',
          availability_host: 'any',
        },
        {
          capability_id: 'codex/computer-use',
          display_name: 'computer-use',
          package_id: 'hhpe-overlays',
          type: 'skill',
          source_path: 'computer-use',
          availability_host: 'codex',
        },
      ],
    }),
  );
  return root;
}

test('catalog includes unlabeled original-source-research (AE1)', () => {
  const root = fixtureRoot();
  try {
    const skills = listMarketSkills({root});
    const orig = skills.find((s) => s.name === 'original-source-research');
    assert.ok(orig);
    assert.equal(orig.displayName, 'original-source-research');
    assert.equal(orig.enabled, true);
    assert.match(orig.path, /SKILL\.md$/);
  } finally {
    fs.rmSync(root, {recursive: true, force: true});
  }
});

test('Serena and Context7 stay unlabeled when any (AE3)', () => {
  const root = fixtureRoot();
  try {
    const skills = listMarketSkills({root});
    assert.equal(skills.find((s) => s.name === 'serena-guidance')?.displayName, 'serena-guidance');
    assert.equal(skills.find((s) => s.name === 'context7-guidance')?.displayName, 'context7-guidance');
  } finally {
    fs.rmSync(root, {recursive: true, force: true});
  }
});

test('duplicate YAML names collapse to one row', () => {
  const root = fixtureRoot();
  try {
    const skills = listMarketSkills({root});
    assert.equal(skills.filter((s) => s.name === 'caveman-compress').length, 1);
  } finally {
    fs.rmSync(root, {recursive: true, force: true});
  }
});

test('host-bound fixture displays Codex:computer-use without renaming name', () => {
  assert.equal(skillDisplayName('computer-use', 'codex'), 'Codex:computer-use');
  const root = fixtureRoot();
  try {
    const row = listMarketSkills({root}).find((s) => s.name === 'computer-use');
    assert.equal(row.displayName, 'Codex:computer-use');
    assert.equal(row.name, 'computer-use');
  } finally {
    fs.rmSync(root, {recursive: true, force: true});
  }
});

test('search matches origi on name and Codex:comp on displayName (R8)', () => {
  const root = fixtureRoot();
  try {
    const skills = listMarketSkills({root});
    assert.ok(matchMarketSkillQuery(skills, 'origi').some((s) => s.name === 'original-source-research'));
    assert.ok(matchMarketSkillQuery(skills, 'Codex:comp').some((s) => s.name === 'computer-use'));
  } finally {
    fs.rmSync(root, {recursive: true, force: true});
  }
});

test('live Market catalog includes unlabeled original-source-research', () => {
  const orig = listMarketSkills().find((s) => s.name === 'original-source-research');
  assert.ok(orig);
  assert.equal(orig.displayName, 'original-source-research');
});
