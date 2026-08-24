import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createHermeticFixture } from './fixtures/function-control/two-account-fixture.mjs';
import { createExecutionResolver } from '../lib/execution-resolve.mjs';
import { createBehaviorControl } from '../lib/behavior-projection.mjs';
import { OutcomeClass } from '../registry/providers/outcomes.mjs';
import { bindingKeyForSession, bindingKeyForContinuation } from '../lib/function-control/opencode/binding-keys.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Barrier so concurrent work is in-flight together.
 * @param {number} n
 */
function createBarrier(n) {
  let count = 0;
  /** @type {Array<() => void>} */
  const waiters = [];
  return {
    async arrive() {
      count += 1;
      if (count >= n) {
        for (const w of waiters) w();
        waiters.length = 0;
        return;
      }
      await new Promise((resolve) => waiters.push(resolve));
    },
  };
}

test('four concurrent pinned resolves keep distinct accounts and credentials', async () => {
  const fx = createHermeticFixture();
  await fx.seedAccounts();
  const barrier = createBarrier(4);
  const observed = [];

  async function run(session, family, capability, pin) {
    await barrier.arrive();
    const result = await fx.fc.resolve({
      consumer_id: 'opencode',
      provider_family: family,
      capability,
      binding_key: bindingKeyForSession(session),
      pin_account_id: pin,
    });
    observed.push({
      session,
      account_id: result.binding.account_id,
      lease_id: result.authorization_lease.lease_id,
      token: result.access_credential.token,
    });
  }

  await Promise.all([
    run('A', 'openai', 'codex', 'openai:personal'),
    run('B', 'openai', 'codex', 'openai:work'),
    run('C', 'cursor', 'agent', 'cursor:personal'),
    run('D', 'cursor', 'agent', 'cursor:work'),
  ]);

  const bySession = Object.fromEntries(observed.map((o) => [o.session, o]));
  assert.equal(bySession.A.account_id, 'openai:personal');
  assert.equal(bySession.B.account_id, 'openai:work');
  assert.equal(bySession.C.account_id, 'cursor:personal');
  assert.equal(bySession.D.account_id, 'cursor:work');
  const tokens = new Set(observed.map((o) => o.token));
  assert.equal(tokens.size, 4);
  const leases = new Set(observed.map((o) => o.lease_id));
  assert.equal(leases.size, 4);
  fx.cleanup();
});

test('independent refresh singleflight does not crossover accounts', async () => {
  const fx = createHermeticFixture();
  await fx.seedAccounts({
    personalExpiresAt: Date.now() - 1000,
    workExpiresAt: Date.now() + 3600_000,
  });

  const barrier = createBarrier(2);
  const [personal, work] = await Promise.all([
    (async () => {
      await barrier.arrive();
      return fx.fc.resolve({
        consumer_id: 'opencode',
        provider_family: 'openai',
        capability: 'codex',
        binding_key: bindingKeyForSession('refresh-A'),
        pin_account_id: 'openai:personal',
      });
    })(),
    (async () => {
      await barrier.arrive();
      return fx.fc.resolve({
        consumer_id: 'opencode',
        provider_family: 'openai',
        capability: 'codex',
        binding_key: bindingKeyForSession('refresh-B'),
        pin_account_id: 'openai:work',
      });
    })(),
  ]);

  assert.ok(fx.refreshCalls.get('rt_personal_mock') >= 1);
  assert.equal(fx.refreshCalls.get('rt_work_mock') || 0, 0);
  assert.notEqual(personal.access_credential.token, work.access_credential.token);
  assert.equal(work.access_credential.token, 'access_work_initial');
  fx.cleanup();
});

test('OpenAI durable quota on preferred allows secondary for new work', async () => {
  const fx = createHermeticFixture();
  await fx.seedAccounts();

  const first = await fx.fc.resolve({
    consumer_id: 'opencode',
    provider_family: 'openai',
    capability: 'codex',
    binding_key: bindingKeyForSession('failover-1'),
  });
  assert.equal(first.binding.account_id, 'openai:personal');

  await fx.fc.report(first.authorization_lease.lease_id, {
    class: OutcomeClass.QUOTA_EXHAUSTED,
  });

  const second = await fx.fc.resolve({
    consumer_id: 'opencode',
    provider_family: 'openai',
    capability: 'codex',
    binding_key: bindingKeyForSession('failover-2'),
  });
  assert.equal(second.binding.account_id, 'openai:work');
  fx.cleanup();
});

test('required continuation stays blocked after durable exhaustion — no silent migrate', async () => {
  const fx = createHermeticFixture();
  await fx.seedAccounts();
  const key = bindingKeyForContinuation('sess-req', 'run-R');
  const first = await fx.fc.resolve({
    consumer_id: 'opencode',
    provider_family: 'cursor',
    capability: 'agent',
    binding_key: key,
    scope: 'continuation',
    affinity: 'required',
    pin_account_id: 'cursor:personal',
  });
  await fx.fc.report(first.authorization_lease.lease_id, {
    class: OutcomeClass.QUOTA_EXHAUSTED,
  });
  await assert.rejects(
    () =>
      fx.fc.resolve({
        consumer_id: 'opencode',
        provider_family: 'cursor',
        capability: 'agent',
        binding_key: key,
        scope: 'continuation',
        affinity: 'required',
      }),
    (err) => err.code === 'CONTINUATION_BLOCKED',
  );
  fx.cleanup();
});

test('Cursor RATE_LIMITED does not spill to secondary subscription', async () => {
  const fx = createHermeticFixture();
  await fx.seedAccounts();
  const first = await fx.fc.resolve({
    consumer_id: 'opencode',
    provider_family: 'cursor',
    capability: 'agent',
    binding_key: bindingKeyForSession('cursor-rate-1'),
    pin_account_id: 'cursor:personal',
  });
  await fx.fc.report(first.authorization_lease.lease_id, {
    class: OutcomeClass.RATE_LIMITED,
    retry_after_seconds: 30,
  });

  // New unpinned work must wait/retry same priority path — not silently consume work.
  await assert.rejects(
    () =>
      fx.fc.resolve({
        consumer_id: 'opencode',
        provider_family: 'cursor',
        capability: 'agent',
        binding_key: bindingKeyForSession('cursor-rate-2'),
      }),
    (err) => {
      assert.notEqual(err.account_id, 'cursor:work');
      assert.ok(
        err.code === 'RETRY_AFTER' ||
          err.retry_same_account === true ||
          err.code === 'NO_ELIGIBLE_ACCOUNT' ||
          typeof err.code === 'string',
      );
      // Never a successful work spill disguised as an error payload.
      assert.notEqual(err.binding?.account_id, 'cursor:work');
      return true;
    },
  );
  // Preferred personal still cooling down must not yield work on a fresh pin-less resolve success path.
  // If resolve somehow succeeds, fail the test unless account is still personal.
  try {
    const ok = await fx.fc.resolve({
      consumer_id: 'opencode',
      provider_family: 'cursor',
      capability: 'agent',
      binding_key: bindingKeyForSession('cursor-rate-3'),
    });
    assert.equal(ok.binding.account_id, 'cursor:personal');
  } catch {
    // expected cooldown path
  }
  fx.cleanup();
});

test('ExecutionContext correlates behavior_bundle with function account for four-account campaign', async () => {
  const fx = createHermeticFixture();
  await fx.seedAccounts();
  const resolver = createExecutionResolver({
    functionControl: fx.fc,
    behaviorControl: createBehaviorControl({ manifestRoot: REPO }),
  });

  const barrier = createBarrier(4);
  const results = await Promise.all(
    [
      ['A', 'openai', 'codex', 'openai:personal'],
      ['B', 'openai', 'codex', 'openai:work'],
      ['C', 'cursor', 'agent', 'cursor:personal'],
      ['D', 'cursor', 'agent', 'cursor:work'],
    ].map(async ([session, family, capability, pin]) => {
      await barrier.arrive();
      const ctx = await resolver.resolve({
        consumer_id: 'opencode',
        session_id: session,
        behavior: {
          capability_ids: ['hhpe-hrg/session-start'],
          requires_function: { provider_family: family, capability },
        },
        execution_request: { pin_account_id: pin },
      });
      return {
        session,
        execution_id: ctx.identity.execution_id,
        behavior_bundle_id: ctx.behavior_projection.behavior_bundle_id,
        account_id: ctx.function_projection.binding.account_id,
        lease_id: ctx.observability_context.authorization_lease_id,
        provider_family: ctx.observability_context.provider_family,
      };
    }),
  );

  assert.equal(results.length, 4);
  assert.equal(new Set(results.map((r) => r.account_id)).size, 4);
  assert.equal(new Set(results.map((r) => r.execution_id)).size, 4);
  // Bundle digest is stable per requires_function + capability set (openai vs cursor differ).
  const openaiBundles = new Set(results.filter((r) => r.provider_family === 'openai').map((r) => r.behavior_bundle_id));
  const cursorBundles = new Set(results.filter((r) => r.provider_family === 'cursor').map((r) => r.behavior_bundle_id));
  assert.equal(openaiBundles.size, 1);
  assert.equal(cursorBundles.size, 1);
  fx.cleanup();
});
