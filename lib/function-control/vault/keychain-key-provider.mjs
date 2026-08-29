import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const SERVICE = 'hhpe-curated-market-function-control';
const ACCOUNT = 'vault-master-key';

/**
 * macOS Keychain-backed master key (production default on darwin).
 */
export function createKeychainKeyProvider(env = process.env) {
  return {
    mode: 'keychain',
    degraded: false,
    async ensureMasterKey() {
      const find = spawnSync('security', [
        'find-generic-password',
        '-s',
        SERVICE,
        '-a',
        ACCOUNT,
        '-w',
      ], { encoding: 'utf8' });
      if (find.status === 0 && find.stdout.trim()) {
        return;
      }
      const key = crypto.randomBytes(32);
      const hex = Buffer.from(key).toString('hex');
      const add = spawnSync('security', [
        'add-generic-password',
        '-U',
        '-s',
        SERVICE,
        '-a',
        ACCOUNT,
        '-w',
        hex,
      ], { encoding: 'utf8' });
      if (add.status !== 0) {
        throw new Error(`Keychain vault key creation failed: ${(add.stderr || add.stdout).trim()}`);
      }
    },
    async getMasterKey() {
      const find = spawnSync('security', [
        'find-generic-password',
        '-s',
        SERVICE,
        '-a',
        ACCOUNT,
        '-w',
      ], { encoding: 'utf8' });
      if (find.status !== 0 || !find.stdout.trim()) {
        throw new Error(`Keychain vault key not found for service ${SERVICE}`);
      }
      const hex = find.stdout.trim();
      if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
        throw new Error('Keychain returned invalid vault key length');
      }
      return Uint8Array.from(Buffer.from(hex, 'hex'));
    },
  };
}
