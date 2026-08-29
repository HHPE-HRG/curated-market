import test from 'node:test';
import assert from 'node:assert/strict';
import { createHermeticFixture } from './fixtures/function-control/two-account-fixture.mjs';
import { OutcomeClass } from '../registry/providers/openai/outcomes.mjs';

test('unauthorized pin_account_id fails explicitly', async () => {
  const fx = createHermeticFixture();
  await fx.seedAccounts();

  await assert.rejects(
    () => fx.fc.resolve({
      consumer_id: 'unknown-consumer',
      provider_family: 'openai',
      capability: 'codex',
      binding_key: 'test:unauth-pin',
      pin_account_id: 'openai:personal',
    }),
    (err) => err.code === 'CONSUMER_NOT_AUTHORIZED',
  );

  fx.cleanup();
});

test('concurrent pinned bindings isolate credentials and refresh state', async () => {
  const fx = createHermeticFixture();
  await fx.seedAccounts();

  const [a, b] = await Promise.all([
    fx.fc.resolve({
      consumer_id: 'test-consumer',
      provider_family: 'openai',
      capability: 'codex',
      binding_key: 'test:session-a',
      pin_account_id: 'openai:personal',
    }),
    fx.fc.resolve({
      consumer_id: 'test-consumer',
      provider_family: 'openai',
      capability: 'codex',
      binding_key: 'test:session-b',
      pin_account_id: 'openai:work',
    }),
  ]);

  assert.equal(a.binding.account_id, 'openai:personal');
  assert.equal(b.binding.account_id, 'openai:work');
  assert.notEqual(a.access_credential.token, b.access_credential.token);
  assert.notEqual(a.authorization_lease.lease_id, b.authorization_lease.lease_id);

  fx.cleanup();
});

test('ordered policy selects personal then work after exhaustion', async () => {
  const fx = createHermeticFixture();
  await fx.seedAccounts();

  const c = await fx.fc.resolve({
    consumer_id: 'test-consumer',
    provider_family: 'openai',
    capability: 'codex',
    binding_key: 'test:session-c',
  });
  assert.equal(c.binding.account_id, 'openai:personal');

  await fx.fc.report(c.authorization_lease.lease_id, {
    class: OutcomeClass.QUOTA_EXHAUSTED,
    reset_at: new Date(Date.now() + 3600_000).toISOString(),
  });

  const d = await fx.fc.resolve({
    consumer_id: 'test-consumer',
    provider_family: 'openai',
    capability: 'codex',
    binding_key: 'test:session-d',
  });
  assert.equal(d.binding.account_id, 'openai:work');

  fx.cleanup();
});

test('RATE_LIMITED does not spill to secondary account', async () => {
  const fx = createHermeticFixture();
  await fx.seedAccounts();

  const first = await fx.fc.resolve({
    consumer_id: 'test-consumer',
    provider_family: 'openai',
    capability: 'codex',
    binding_key: 'test:rate-1',
  });
  assert.equal(first.binding.account_id, 'openai:personal');

  await fx.fc.report(first.authorization_lease.lease_id, {
    class: OutcomeClass.RATE_LIMITED,
    retry_after_seconds: 30,
  });

  await assert.rejects(
    () => fx.fc.resolve({
      consumer_id: 'test-consumer',
      provider_family: 'openai',
      capability: 'codex',
      binding_key: 'test:rate-2',
    }),
    (err) => err.code === 'RETRY_AFTER',
  );

  const personal = fx.fc.accountStore.getAccount('openai:personal');
  assert.ok(personal.cooldown_until);

  fx.cleanup();
});

test('required continuation blocked after exhaustion; new session selects work', async () => {
  const fx = createHermeticFixture();
  await fx.seedAccounts();

  const session = await fx.fc.resolve({
    consumer_id: 'test-consumer',
    provider_family: 'openai',
    capability: 'codex',
    binding_key: 'test:session-a',
    pin_account_id: 'openai:personal',
  });

  const continuation = await fx.fc.resolve({
    consumer_id: 'test-consumer',
    provider_family: 'openai',
    capability: 'codex',
    binding_key: 'test:session-a:run-1',
    scope: 'continuation',
    affinity: 'required',
    pin_account_id: 'openai:personal',
  });
  assert.equal(continuation.binding.account_id, 'openai:personal');

  await fx.fc.report(session.authorization_lease.lease_id, {
    class: OutcomeClass.QUOTA_EXHAUSTED,
    reset_at: new Date(Date.now() + 3600_000).toISOString(),
  });

  await assert.rejects(
    () => fx.fc.resolve({
      consumer_id: 'test-consumer',
      provider_family: 'openai',
      capability: 'codex',
      binding_key: 'test:session-a:run-1',
      scope: 'continuation',
      affinity: 'required',
    }),
    (err) => err.code === 'CONTINUATION_BLOCKED',
  );

  const contBinding = fx.fc.bindingStore.getActive('test:session-a:run-1');
  assert.equal(contBinding.account_id, 'openai:personal');

  const newSession = await fx.fc.resolve({
    consumer_id: 'test-consumer',
    provider_family: 'openai',
    capability: 'codex',
    binding_key: 'test:session-new',
  });
  assert.equal(newSession.binding.account_id, 'openai:work');

  fx.cleanup();
});

test('lease renewal does not change account binding', async () => {
  const fx = createHermeticFixture();
  await fx.seedAccounts();

  const first = await fx.fc.resolve({
    consumer_id: 'test-consumer',
    provider_family: 'openai',
    capability: 'codex',
    binding_key: 'test:lease-binding',
    pin_account_id: 'openai:personal',
  });

  const second = await fx.fc.resolve({
    consumer_id: 'test-consumer',
    provider_family: 'openai',
    capability: 'codex',
    binding_key: 'test:lease-binding',
    pin_account_id: 'openai:personal',
  });

  assert.equal(first.binding.account_id, second.binding.account_id);
  assert.notEqual(first.authorization_lease.lease_id, second.authorization_lease.lease_id);

  fx.cleanup();
});

test('access refresh does not change binding account', async () => {
  const fx = createHermeticFixture();
  await fx.seedAccounts();

  await fx.fc.vault.setSecret('openai:personal', {
    refresh_credential: 'rt_personal_mock',
    access_credential: 'stale',
    access_expires_at: Date.now() + 1000,
  });

  const first = await fx.fc.resolve({
    consumer_id: 'test-consumer',
    provider_family: 'openai',
    capability: 'codex',
    binding_key: 'test:refresh-binding',
    pin_account_id: 'openai:personal',
  });

  const second = await fx.fc.resolve({
    consumer_id: 'test-consumer',
    provider_family: 'openai',
    capability: 'codex',
    binding_key: 'test:refresh-binding',
    pin_account_id: 'openai:personal',
  });

  assert.equal(first.binding.account_id, 'openai:personal');
  assert.equal(second.binding.account_id, 'openai:personal');
  assert.notEqual(first.access_credential.token, 'stale');

  fx.cleanup();
});

test('per-account refresh singleflight under concurrency', async () => {
  const fx = createHermeticFixture();
  await fx.seedAccounts();

  await fx.fc.vault.setSecret('openai:personal', {
    refresh_credential: 'rt_personal_mock',
    access_credential: 'stale_personal',
    access_expires_at: Date.now() + 500,
  });
  await fx.fc.vault.setSecret('openai:work', {
    refresh_credential: 'rt_work_mock',
    access_credential: 'stale_work',
    access_expires_at: Date.now() + 500,
  });

  const personalResolves = Array.from({ length: 50 }, () =>
    fx.fc.resolve({
      consumer_id: 'test-consumer',
      provider_family: 'openai',
      capability: 'codex',
      binding_key: `test:sf-personal-${Math.random()}`,
      pin_account_id: 'openai:personal',
    }),
  );
  const workResolves = Array.from({ length: 50 }, () =>
    fx.fc.resolve({
      consumer_id: 'test-consumer',
      provider_family: 'openai',
      capability: 'codex',
      binding_key: `test:sf-work-${Math.random()}`,
      pin_account_id: 'openai:work',
    }),
  );

  await Promise.all([...personalResolves, ...workResolves]);

  assert.equal(fx.refreshCalls.get('rt_personal_mock'), 1);
  assert.equal(fx.refreshCalls.get('rt_work_mock'), 1);

  fx.cleanup();
});

test('explicit rebind revokes old lease and issues new account credential', async () => {
  const fx = createHermeticFixture();
  await fx.seedAccounts();

  const first = await fx.fc.resolve({
    consumer_id: 'test-consumer',
    provider_family: 'openai',
    capability: 'codex',
    binding_key: 'test:rebind',
    pin_account_id: 'openai:personal',
  });

  const rebound = await fx.fc.rebind({
    binding_key: 'test:rebind',
    new_account_id: 'openai:work',
    force_restart: true,
  });

  assert.equal(rebound.binding.account_id, 'openai:work');
  assert.notEqual(rebound.authorization_lease.lease_id, first.authorization_lease.lease_id);
  const oldLease = fx.fc.leaseManager.get(first.authorization_lease.lease_id);
  assert.equal(oldLease.revoked, true);

  fx.cleanup();
});
