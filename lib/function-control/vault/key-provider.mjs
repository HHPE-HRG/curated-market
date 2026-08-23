/**
 * @typedef {Object} KeyProvider
 * @property {() => Promise<Uint8Array>} getMasterKey
 * @property {() => Promise<void>} [ensureMasterKey]
 * @property {string} mode
 * @property {boolean} degraded
 */

/**
 * @param {unknown} value
 * @returns {Uint8Array}
 */
export function parseHexKey(value) {
  if (typeof value !== 'string' || !/^[0-9a-fA-F]+$/.test(value) || value.length !== 64) {
    throw new Error('HHPE_FUNCTION_VAULT_KEY must be 64 hex characters (32 bytes)');
  }
  return Uint8Array.from(Buffer.from(value, 'hex'));
}

/**
 * @param {Uint8Array} key
 * @returns {string}
 */
export function keyFingerprint(key) {
  return Buffer.from(key).toString('hex').slice(0, 16);
}

export {};
