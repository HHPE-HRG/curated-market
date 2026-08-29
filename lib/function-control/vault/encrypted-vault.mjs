import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import {
  ensureDir,
  functionControlVaultDir,
} from '../paths.mjs';

const VAULT_FILE = 'secrets.enc';
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

/**
 * @typedef {Object} VaultSecretEntry
 * @property {string} refresh_credential
 * @property {string} [access_credential]
 * @property {number} [access_expires_at]
 */

/**
 * @param {import('./key-provider.mjs').KeyProvider} keyProvider
 * @param {NodeJS.ProcessEnv} [env]
 */
export function createEncryptedVault(keyProvider, env = process.env) {
  const vaultDir = functionControlVaultDir(env);
  const vaultPath = path.join(vaultDir, VAULT_FILE);
  ensureDir(vaultDir);

  async function readStore() {
    if (!fs.existsSync(vaultPath)) {
      return { version: 1, algorithm: ALGORITHM, entries: {} };
    }
    const raw = fs.readFileSync(vaultPath, 'utf8');
    return JSON.parse(raw);
  }

  async function writeStore(store) {
    const tmp = `${vaultPath}.tmp`;
    fs.writeFileSync(tmp, `${JSON.stringify(store)}\n`, { mode: 0o600 });
    fs.renameSync(tmp, vaultPath);
  }

  /**
   * @param {Record<string, unknown>} entries
   * @returns {Promise<Record<string, unknown>>}
   */
  async function decryptEntries(entries) {
    const key = await keyProvider.getMasterKey();
    const out = {};
    for (const [accountId, blob] of Object.entries(entries)) {
      if (!blob || typeof blob !== 'object') {
        continue;
      }
      const { iv, ciphertext, tag } = blob;
      if (typeof iv !== 'string' || typeof ciphertext !== 'string' || typeof tag !== 'string') {
        throw new Error(`Invalid vault entry format for ${accountId}`);
      }
      const decipher = crypto.createDecipheriv(
        ALGORITHM,
        Buffer.from(key),
        Buffer.from(iv, 'base64'),
      );
      decipher.setAuthTag(Buffer.from(tag, 'base64'));
      const plain = Buffer.concat([
        decipher.update(Buffer.from(ciphertext, 'base64')),
        decipher.final(),
      ]);
      out[accountId] = JSON.parse(plain.toString('utf8'));
    }
    return out;
  }

  /**
   * @param {Record<string, VaultSecretEntry>} plainEntries
   * @returns {Promise<Record<string, unknown>>}
   */
  async function encryptEntries(plainEntries) {
    const key = await keyProvider.getMasterKey();
    const encrypted = {};
    for (const [accountId, entry] of Object.entries(plainEntries)) {
      const iv = crypto.randomBytes(IV_LENGTH);
      const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(key), iv);
      const plain = Buffer.from(JSON.stringify(entry), 'utf8');
      const ciphertext = Buffer.concat([cipher.update(plain), cipher.final()]);
      const tag = cipher.getAuthTag();
      encrypted[accountId] = {
        iv: iv.toString('base64'),
        ciphertext: ciphertext.toString('base64'),
        tag: tag.toString('base64'),
      };
    }
    return encrypted;
  }

  return {
    vaultPath,
    keyProvider,
    async ensureReady() {
      if (keyProvider.ensureMasterKey) {
        await keyProvider.ensureMasterKey();
      }
      await keyProvider.getMasterKey();
      ensureDir(vaultDir);
    },
    /**
     * @param {string} accountId
     * @returns {Promise<VaultSecretEntry | undefined>}
     */
    async getSecret(accountId) {
      const store = await readStore();
      const plain = await decryptEntries(store.entries || {});
      return plain[accountId];
    },
    /**
     * @returns {Promise<Record<string, VaultSecretEntry>>}
     */
    async getAllSecrets() {
      const store = await readStore();
      return /** @type {Record<string, VaultSecretEntry>} */ (await decryptEntries(store.entries || {}));
    },
    /**
     * @param {string} accountId
     * @param {VaultSecretEntry} entry
     */
    async setSecret(accountId, entry) {
      const store = await readStore();
      const plain = await decryptEntries(store.entries || {});
      plain[accountId] = entry;
      store.entries = await encryptEntries(plain);
      await writeStore(store);
    },
    /**
     * @param {string} accountId
     */
    async deleteSecret(accountId) {
      const store = await readStore();
      const plain = await decryptEntries(store.entries || {});
      delete plain[accountId];
      store.entries = await encryptEntries(plain);
      await writeStore(store);
    },
  };
}
