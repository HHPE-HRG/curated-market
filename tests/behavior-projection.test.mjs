import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  createBehaviorControl,
  resolveBehaviorProjection,
} from '../lib/behavior-projection.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..');

test('BehaviorControl.resolve works without Function Control', () => {
  const behavior = createBehaviorControl({ manifestRoot: REPO });
  const projection = behavior.resolve({
    profile_id: 'default',
    capability_ids: ['hhpe-hrg/session-start', 'superpowers/systematic-debugging'],
  });

  assert.ok(projection.behavior_bundle_id);
  assert.equal(typeof projection.behavior_bundle_id, 'string');
  assert.ok(Array.isArray(projection.skills));
  assert.ok(projection.skills.length >= 1);
  assert.ok(projection.skills.every((s) => s.capability_id && s.package_id));
  assert.ok(projection.provenance?.manifests?.length >= 1);
  assert.ok(!JSON.stringify(projection).includes('refresh_credential'));
  assert.ok(!JSON.stringify(projection).includes('HHPE_FUNCTION_VAULT'));
});

test('Behavior projection is bounded — no full capabilities catalog', () => {
  const projection = resolveBehaviorProjection({
    manifestRoot: REPO,
    capability_ids: ['hhpe-hrg/session-start'],
  });
  const raw = JSON.stringify(projection);
  assert.ok(!raw.includes('trailofbits/dimensional-analysis') || projection.skills.length < 20);
  assert.ok(projection.skills.length <= 5);
  assert.ok(!('accounts' in projection));
  assert.ok(!raw.includes('"capabilities":[')); // full manifest dump
});

test('same behavior inputs yield stable behavior_bundle_id', () => {
  const a = resolveBehaviorProjection({
    manifestRoot: REPO,
    capability_ids: ['hhpe-hrg/session-start', 'hhpe-hrg/serena-guidance'],
  });
  const b = resolveBehaviorProjection({
    manifestRoot: REPO,
    capability_ids: ['hhpe-hrg/session-start', 'hhpe-hrg/serena-guidance'],
  });
  assert.equal(a.behavior_bundle_id, b.behavior_bundle_id);
});

test('unknown capability fails Behavior resolution', () => {
  assert.throws(
    () =>
      resolveBehaviorProjection({
        manifestRoot: REPO,
        capability_ids: ['does-not-exist/capability'],
      }),
    (err) => err.code === 'BEHAVIOR_CAPABILITY_UNRESOLVED',
  );
});

test('startup layers and policy slice come from final-stack without dumping it', () => {
  const projection = resolveBehaviorProjection({
    manifestRoot: REPO,
    capability_ids: ['hhpe-hrg/session-start'],
    include_startup_layers: true,
    include_policy_slice: true,
  });
  assert.ok(Array.isArray(projection.startup_layers));
  assert.ok(projection.startup_layers.includes('caveman'));
  assert.equal(projection.policy_projection?.lifecycle_owner, 'compound-engineering');
  assert.ok(!JSON.stringify(projection).includes('natural_language_routing_fixtures'));
});
