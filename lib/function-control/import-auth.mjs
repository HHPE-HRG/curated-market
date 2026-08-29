import fs from 'node:fs';
import { createFunctionControl } from './resolve.mjs';

/**
 * @param {string} authJsonPath
 * @param {string} accountId
 * @param {NodeJS.ProcessEnv} [env]
 */
export async function importAuthJsonAccount(authJsonPath, accountId, env = process.env) {
  const raw = JSON.parse(fs.readFileSync(authJsonPath, 'utf8'));
  const provider = accountId.split(':')[0];
  const entry = raw[provider];
  if (!entry || entry.type !== 'oauth') {
    throw new Error(`No oauth entry for provider ${provider} in auth.json`);
  }
  const fc = createFunctionControl(env);
  await fc.registerAccountSecret(accountId, {
    refresh_credential: entry.refresh,
    access_credential: entry.access,
    access_expires_at: entry.expires || Date.now() + 3600_000,
  });
  return { account_id: accountId, imported: true };
}
