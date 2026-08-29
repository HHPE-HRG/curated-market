import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { functionControlStateDir, ensureDir } from './paths.mjs';

const DEFAULT_LEASE_TTL_MS = 15 * 60 * 1000;

function now() {
  return new Date().toISOString();
}

function statePath(env) {
  return path.join(functionControlStateDir(env), 'authorization-leases.json');
}

function readState(env) {
  const file = statePath(env);
  if (!fs.existsSync(file)) {
    return { schema_version: 1, leases: [] };
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeState(env, data) {
  ensureDir(functionControlStateDir(env));
  const file = statePath(env);
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(tmp, file);
}

/**
 * @param {NodeJS.ProcessEnv} [env]
 */
export function createLeaseManager(env = process.env) {
  return {
  /**
   * @param {object} input
   */
    grant(input) {
      const state = readState(env);
      state.leases = state.leases || [];
      const lease = {
        lease_id: `authz_${crypto.randomBytes(8).toString('hex')}`,
        binding_key: input.binding_key,
        account_id: input.account_id,
        consumer_id: input.consumer_id,
        granted_at: now(),
        expires_at: input.expires_at || new Date(Date.now() + DEFAULT_LEASE_TTL_MS).toISOString(),
        revoked: false,
      };
      state.leases.push(lease);
      writeState(env, state);
      return lease;
    },
    get(leaseId) {
      const state = readState(env);
      return (state.leases || []).find((l) => l.lease_id === leaseId);
    },
    getActiveForBinding(bindingKey) {
      const state = readState(env);
      const active = (state.leases || []).filter(
        (l) => l.binding_key === bindingKey && !l.revoked && new Date(l.expires_at).getTime() > Date.now(),
      );
      return active.sort((a, b) => new Date(b.granted_at).getTime() - new Date(a.granted_at).getTime())[0];
    },
    revoke(leaseId, reason = 'revoked') {
      const state = readState(env);
      for (const lease of state.leases || []) {
        if (lease.lease_id === leaseId) {
          lease.revoked = true;
          lease.revoke_reason = reason;
        }
      }
      writeState(env, state);
    },
    revokeAllForBinding(bindingKey, reason = 'rebind') {
      const state = readState(env);
      for (const lease of state.leases || []) {
        if (lease.binding_key === bindingKey && !lease.revoked) {
          lease.revoked = true;
          lease.revoke_reason = reason;
        }
      }
      writeState(env, state);
    },
    isValid(lease) {
      if (!lease || lease.revoked) {
        return false;
      }
      return new Date(lease.expires_at).getTime() > Date.now();
    },
  };
}
