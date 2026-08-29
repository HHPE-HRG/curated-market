import fs from 'node:fs';
import path from 'node:path';
import { resolveManifestRoot } from './paths.mjs';

function readManifest(env = process.env) {
  const manifestPath = path.join(resolveManifestRoot(env), 'registry/manifests/function-consumers.yaml');
  return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
}

/**
 * @param {NodeJS.ProcessEnv} [env]
 */
export function createConsumerRegistry(env = process.env) {
  const consumers = readManifest(env).consumers || [];
  return {
    get(consumerId) {
      return consumers.find((c) => c.consumer_id === consumerId);
    },
    isAuthorized(consumerId, accountId, providerFamily) {
      const consumer = this.get(consumerId);
      if (!consumer) {
        return { ok: false, reason: 'consumer_not_registered' };
      }
      if (!consumer.allowed_provider_families.includes(providerFamily)) {
        return { ok: false, reason: 'provider_family_denied' };
      }
      if (consumer.denied_account_ids?.includes(accountId)) {
        return { ok: false, reason: 'account_denied' };
      }
      if (consumer.allowed_account_ids && !consumer.allowed_account_ids.includes(accountId)) {
        return { ok: false, reason: 'account_not_in_allowlist' };
      }
      return { ok: true };
    },
  };
}
