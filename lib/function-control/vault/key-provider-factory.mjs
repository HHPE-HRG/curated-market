import os from 'node:os';
import { functionControlVaultDir } from '../paths.mjs';
import { createEphemeralKeyProvider } from './ephemeral-key-provider.mjs';
import { createFileKeyProvider } from './file-key-provider.mjs';
import { createKeychainKeyProvider } from './keychain-key-provider.mjs';

const FAIL_CLOSED_MESSAGE =
  'No supported secure vault key provider is available. Set HHPE_FUNCTION_VAULT_MODE=file-degraded for explicit degraded local key mode, or HHPE_FUNCTION_VAULT_KEY for ephemeral test/dev key.';

/**
 * Select vault KeyProvider from environment. Fails closed on Linux without explicit mode.
 *
 * @param {NodeJS.ProcessEnv} [env]
 * @param {{ platform?: string }} [overrides] Test-only platform override.
 * @returns {import('./key-provider.mjs').KeyProvider}
 */
export function createKeyProviderFromEnv(env = process.env, overrides = {}) {
  const platform = overrides.platform ?? os.platform();
  if (env.HHPE_FUNCTION_VAULT_KEY) {
    return createEphemeralKeyProvider(env);
  }
  if (env.HHPE_FUNCTION_VAULT_MODE === 'file-degraded') {
    return createFileKeyProvider(env);
  }
  if (platform === 'darwin') {
    return createKeychainKeyProvider(env);
  }
  throw new Error(FAIL_CLOSED_MESSAGE);
}

/**
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {boolean}
 */
export function vaultKeyWouldLiveBesideCiphertext(env = process.env) {
  const vaultDir = functionControlVaultDir(env);
  if (env.HHPE_FUNCTION_VAULT_KEY) {
    return false;
  }
  if (env.HHPE_FUNCTION_VAULT_MODE === 'file-degraded') {
    return false;
  }
  if (os.platform() === 'darwin') {
    return false;
  }
  return false;
}

export { FAIL_CLOSED_MESSAGE };
