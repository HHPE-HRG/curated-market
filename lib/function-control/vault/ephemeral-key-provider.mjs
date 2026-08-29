import { parseHexKey } from './key-provider.mjs';

/**
 * Hermetic / explicit dev key from environment. Never reads host secure stores.
 */
export function createEphemeralKeyProvider(env = process.env) {
  const hex = env.HHPE_FUNCTION_VAULT_KEY;
  if (!hex) {
    throw new Error('EphemeralKeyProvider requires HHPE_FUNCTION_VAULT_KEY');
  }
  const key = parseHexKey(hex);
  return {
    mode: 'ephemeral',
    degraded: false,
    async getMasterKey() {
      return key;
    },
    async ensureMasterKey() {
      /* key supplied externally */
    },
  };
}
