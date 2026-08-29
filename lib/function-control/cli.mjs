#!/usr/bin/env node
import { createFunctionControl } from './resolve.mjs';
import { OutcomeClass } from '../../registry/providers/openai/outcomes.mjs';

const [command, ...args] = process.argv.slice(2);
const fc = createFunctionControl();

function arg(name) {
  const idx = args.indexOf(name);
  return idx >= 0 ? args[idx + 1] : undefined;
}

async function main() {
  if (command === 'resolve') {
    const result = await fc.resolve({
      consumer_id: arg('--consumer') || 'test-consumer',
      provider_family: arg('--provider') || 'openai',
      capability: arg('--capability') || 'codex',
      binding_key: arg('--binding-key'),
      scope: arg('--scope') || 'session',
      affinity: arg('--affinity') || 'preferred',
      pin_account_id: arg('--pin-account'),
    });
    console.log(JSON.stringify({
      binding: result.binding,
      authorization_lease: result.authorization_lease,
      access_credential: {
        ...result.access_credential,
        token: `${result.access_credential.token.slice(0, 12)}…`,
      },
      route_decision: result.route_decision,
    }, null, 2));
    return;
  }
  if (command === 'report') {
    const outcome = {
      class: arg('--class') || OutcomeClass.QUOTA_EXHAUSTED,
      reset_at: arg('--reset-at'),
      retry_after_seconds: Number(arg('--retry-after') || 0) || undefined,
    };
    const result = await fc.report(arg('--lease'), outcome);
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  if (command === 'release') {
    const result = await fc.release({
      binding_key: arg('--binding-key'),
      lease_id: arg('--lease'),
    });
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  if (command === 'status') {
    const accounts = fc.accountStore.listAccounts().map((a) => ({
      account_id: a.account_id,
      health: a.health,
      quota_state: a.quota_state,
      quota_reset_at: a.quota_reset_at,
      cooldown_until: a.cooldown_until,
      priority: a.priority,
      active_lease_count: a.active_lease_count,
    }));
    console.log(JSON.stringify({ accounts }, null, 2));
    return;
  }
  console.error('usage: cli.mjs resolve|report|release|status [options]');
  process.exitCode = 1;
}

main().catch((err) => {
  console.error(`ERROR: ${err.message}`);
  if (err.code) {
    console.error(JSON.stringify({ code: err.code, wait_until: err.wait_until }, null, 2));
  }
  process.exitCode = 1;
});
