import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { degradedVaultKeyPath } from '../paths.mjs';

/**
 * Explicit degraded mode — master key outside function-control/vault/.
 * Production operators must set HHPE_FUNCTION_VAULT_MODE=file-degraded.
 */
export function createFileKeyProvider(env = process.env) {
  const keyPath = degradedVaultKeyPath(env);
  return {
    mode: 'file-degraded',
    degraded: true,
    keyPath,
    async ensureMasterKey() {
      if (fs.existsSync(keyPath)) {
        return;
      }
      fs.mkdirSync(path.dirname(keyPath), { recursive: true, mode: 0o700 });
      const key = crypto.randomBytes(32);
      fs.writeFileSync(keyPath, key, { mode: 0o600 });
    },
    async getMasterKey() {
      if (!fs.existsSync(keyPath)) {
        throw new Error(`Degraded vault key missing at ${keyPath}; run ensureMasterKey or create key file`);
      }
      const raw = fs.readFileSync(keyPath);
      if (raw.length !== 32) {
        throw new Error(`Degraded vault key at ${keyPath} must be exactly 32 bytes`);
      }
      return Uint8Array.from(raw);
    },
  };
}
