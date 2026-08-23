import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

import { fileURLToPath } from 'node:url';
import { OutcomeClass } from '../registry/providers/outcomes.mjs';
import {
  createLocalAuthBackend,
  createCuratedMarketAuthBackend,
  bindingKeyForSession,
  bindingKeyForContinuation,
  selectAuthBackend,
} from '../lib/function-control/opencode/index.mjs';
import { createHermeticFixture } from './fixtures/function-control/two-account-fixture.mjs';

test('binding keys are deterministic, opaque, and account-agnostic', () => {
  assert.equal(bindingKeyForSession('sess-1'), 'opencode:sess-1');
  assert.equal(
    bindingKeyForContinuation('sess-1', 'run-9'),
    'opencode:sess-1:run-9',
  );
  assert.ok(!bindingKeyForSession('sess-1').includes('openai:'));
  assert.ok(!bindingKeyForContinuation('s', 'c').includes('personal'));
});

test('LocalAuthBackend resolves from auth.json-shaped store without Function Control vault', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hhpe-local-auth-'));
  const authPath = path.join(root, 'auth.json');
  fs.writeFileSync(
    authPath,
    JSON.stringify({
      openai: {
        type: 'oauth',
        refresh: 'rt_local_only',
        access: 'at_local_access',
        expires: Date.now() + 3600_000,
      },
    }),
  );

  const backend = createLocalAuthBackend({ authPath });
  const resolved = await backend.resolve({
    provider_family: 'openai',
    capability: 'codex',
    binding_key: bindingKeyForSession('local-sess'),
  });

  assert.equal(resolved.access_credential.token, 'at_local_access');
  assert.equal(resolved.backend, 'local');
  assert.ok(!resolved.refresh_credential);
  assert.ok(!('refresh' in resolved));

  fs.rmSync(root, { recursive: true, force: true });
});

test('CuratedMarketAuthBackend resolve returns AccessCredential without refresh token', async () => {
  const fx = createHermeticFixture();
  await fx.seedAccounts();

  const backend = createCuratedMarketAuthBackend({
    functionControl: fx.fc,
    consumer_id: 'opencode',
  });

  const resolved = await backend.resolve({
    provider_family: 'openai',
    capability: 'codex',
    binding_key: bindingKeyForSession('s-a'),
    pin_account_id: 'openai:personal',
  });

  assert.equal(resolved.backend, 'curated-market');
  assert.equal(resolved.binding.account_id, 'openai:personal');
  assert.ok(resolved.authorization_lease.lease_id);
  assert.ok(resolved.access_credential.token);
  assert.ok(!resolved.refresh_credential);
  assert.ok(!JSON.stringify(resolved).includes('rt_personal_mock'));

  fx.cleanup();
});

test('CuratedMarketAuthBackend isolates concurrent session credentials', async () => {
  const fx = createHermeticFixture();
  await fx.seedAccounts();
  const backend = createCuratedMarketAuthBackend({
    functionControl: fx.fc,
    consumer_id: 'opencode',
  });

  const [a, b] = await Promise.all([
    backend.resolve({
      provider_family: 'openai',
      capability: 'codex',
      binding_key: bindingKeyForSession('session-A'),
      pin_account_id: 'openai:personal',
    }),
    backend.resolve({
      provider_family: 'openai',
      capability: 'codex',
      binding_key: bindingKeyForSession('session-B'),
      pin_account_id: 'openai:work',
    }),
  ]);

  assert.equal(a.binding.account_id, 'openai:personal');
  assert.equal(b.binding.account_id, 'openai:work');
  assert.notEqual(a.access_credential.token, b.access_credential.token);

  fx.cleanup();
});

test('registry-mode refresh goes through Function Control not local auth write', async () => {
  const fx = createHermeticFixture();
  await fx.seedAccounts({ personalExpiresAt: Date.now() - 1000 });

  const authWrites = [];
  const backend = createCuratedMarketAuthBackend({
    functionControl: fx.fc,
    consumer_id: 'opencode',
    onLocalAuthWrite: (entry) => authWrites.push(entry),
  });

  const resolved = await backend.resolve({
    provider_family: 'openai',
    capability: 'codex',
    binding_key: bindingKeyForSession('refresh-sess'),
    pin_account_id: 'openai:personal',
  });

  assert.match(resolved.access_credential.token, /^access_personal_/);
  assert.notEqual(resolved.access_credential.token, 'access_personal_initial');
  assert.equal(authWrites.length, 0);
  assert.ok(fx.refreshCalls.get('rt_personal_mock') >= 1);

  fx.cleanup();
});

test('report OpenAI usage_limit_reached as QUOTA_EXHAUSTED', async () => {
  const fx = createHermeticFixture();
  await fx.seedAccounts();
  const backend = createCuratedMarketAuthBackend({
    functionControl: fx.fc,
    consumer_id: 'opencode',
  });

  const resolved = await backend.resolve({
    provider_family: 'openai',
    capability: 'codex',
    binding_key: bindingKeyForSession('quota-sess'),
    pin_account_id: 'openai:personal',
  });

  const reported = await backend.report({
    lease_id: resolved.authorization_lease.lease_id,
    provider_family: 'openai',
    http_status: 429,
    body: JSON.stringify({ error: { code: 'usage_limit_reached' } }),
  });

  assert.equal(reported.class, OutcomeClass.QUOTA_EXHAUSTED);
  fx.cleanup();
});

test('report Cursor 429 as RATE_LIMITED not QUOTA_EXHAUSTED', async () => {
  const fx = createHermeticFixture();
  await fx.seedAccounts();
  const backend = createCuratedMarketAuthBackend({
    functionControl: fx.fc,
    consumer_id: 'opencode',
  });

  const resolved = await backend.resolve({
    provider_family: 'cursor',
    capability: 'agent',
    binding_key: bindingKeyForSession('cursor-rate'),
    pin_account_id: 'cursor:personal',
  });

  const reported = await backend.report({
    lease_id: resolved.authorization_lease.lease_id,
    provider_family: 'cursor',
    http_status: 429,
    body: 'resource_exhausted sounding',
  });

  assert.equal(reported.class, OutcomeClass.RATE_LIMITED);
  assert.notEqual(reported.class, OutcomeClass.QUOTA_EXHAUSTED);
  fx.cleanup();
});

test('Cursor resolve injects access credential without refresh leakage', async () => {
  const fx = createHermeticFixture();
  await fx.seedAccounts();
  const backend = createCuratedMarketAuthBackend({
    functionControl: fx.fc,
    consumer_id: 'opencode',
  });

  const resolved = await backend.resolve({
    provider_family: 'cursor',
    capability: 'agent',
    binding_key: bindingKeyForSession('cursor-sess'),
    pin_account_id: 'cursor:personal',
  });

  assert.equal(resolved.binding.account_id, 'cursor:personal');
  assert.equal(resolved.access_credential.token, 'access_cursor_personal_initial');
  assert.ok(!JSON.stringify(resolved).includes('rt_cursor_personal_mock'));
  fx.cleanup();
});

test('Cursor concurrent sessions keep distinct credentials', async () => {
  const fx = createHermeticFixture();
  await fx.seedAccounts();
  const backend = createCuratedMarketAuthBackend({
    functionControl: fx.fc,
    consumer_id: 'opencode',
  });

  const [a, b] = await Promise.all([
    backend.resolve({
      provider_family: 'cursor',
      capability: 'agent',
      binding_key: bindingKeyForSession('cursor-A'),
      pin_account_id: 'cursor:personal',
    }),
    backend.resolve({
      provider_family: 'cursor',
      capability: 'agent',
      binding_key: bindingKeyForSession('cursor-B'),
      pin_account_id: 'cursor:work',
    }),
  ]);

  assert.equal(a.binding.account_id, 'cursor:personal');
  assert.equal(b.binding.account_id, 'cursor:work');
  assert.notEqual(a.access_credential.token, b.access_credential.token);
  fx.cleanup();
});

test('required continuation cannot silently migrate accounts', async () => {
  const fx = createHermeticFixture();
  await fx.seedAccounts();
  const backend = createCuratedMarketAuthBackend({
    functionControl: fx.fc,
    consumer_id: 'opencode',
  });

  const key = bindingKeyForContinuation('sess-c', 'run-1');
  const first = await backend.resolve({
    provider_family: 'openai',
    capability: 'codex',
    binding_key: key,
    scope: 'continuation',
    affinity: 'required',
    pin_account_id: 'openai:personal',
  });
  assert.equal(first.binding.account_id, 'openai:personal');

  await backend.report({
    lease_id: first.authorization_lease.lease_id,
    provider_family: 'openai',
    http_status: 429,
    body: JSON.stringify({ error: { code: 'usage_limit_reached' } }),
  });

  await assert.rejects(
    () =>
      backend.resolve({
        provider_family: 'openai',
        capability: 'codex',
        binding_key: key,
        scope: 'continuation',
        affinity: 'required',
      }),
    (err) => err.code === 'CONTINUATION_BLOCKED',
  );

  fx.cleanup();
});

test('opencode auth backend modules do not import Behavior registry.mjs', () => {
  const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../lib/function-control/opencode');
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.mjs'))) {
    const src = fs.readFileSync(path.join(dir, file), 'utf8');
    assert.ok(!src.includes('lib/registry.mjs'), file);
  }
});

test('selectAuthBackend chooses local vs curated-market', async () => {
  const local = selectAuthBackend({ type: 'local', authPath: path.join(os.tmpdir(), 'missing-auth.json') });
  assert.equal(local.type, 'local');
  const cm = selectAuthBackend({
    type: 'curated-market',
    functionControl: { resolve: async () => ({}) },
    consumer_id: 'opencode',
  });
  assert.equal(cm.type, 'curated-market');
});
