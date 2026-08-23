import fs from 'node:fs';
import path from 'node:path';
import { functionControlStateDir, ensureDir, resolveManifestRoot } from './paths.mjs';

const MANIFEST_PATH = (env = process.env) =>
  path.join(resolveManifestRoot(env), 'registry/manifests/function-accounts.yaml');

/**
 * @typedef {Object} AccountRuntimeState
 * @property {string} account_id
 * @property {string} health
 * @property {string} quota_state
 * @property {string} [quota_reset_at]
 * @property {string} [cooldown_until]
 * @property {number} active_lease_count
 * @property {string} [access_expires_at]
 * @property {string} updated_at
 */

function now() {
  return new Date().toISOString();
}

function statePath(env) {
  return path.join(functionControlStateDir(env), 'accounts.json');
}

function readManifest(env = process.env) {
  const file = MANIFEST_PATH(env);
  if (!fs.existsSync(file)) {
    return { accounts: [] };
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function readRuntime(env) {
  const file = statePath(env);
  if (!fs.existsSync(file)) {
    return { schema_version: 1, accounts: {} };
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeRuntime(env, data) {
  ensureDir(functionControlStateDir(env));
  const file = statePath(env);
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(tmp, file);
}

/**
 * @param {NodeJS.ProcessEnv} [env]
 */
export function createAccountStore(env = process.env) {
  function mergedAccounts() {
    const manifest = readManifest(env);
    const runtime = readRuntime(env);
    return (manifest.accounts || []).map((meta) => {
      const state = runtime.accounts?.[meta.account_id] || {};
      return {
        ...meta,
        health: state.health || 'healthy',
        quota_state: state.quota_state || 'available',
        quota_reset_at: state.quota_reset_at || null,
        cooldown_until: state.cooldown_until || null,
        active_lease_count: state.active_lease_count || 0,
        access_expires_at: state.access_expires_at || null,
        updated_at: state.updated_at || null,
      };
    });
  }

  return {
    listAccounts() {
      return mergedAccounts();
    },
    getAccount(accountId) {
      return mergedAccounts().find((a) => a.account_id === accountId);
    },
    /**
     * @param {string} accountId
     * @param {Partial<AccountRuntimeState>} patch
     */
    patchAccount(accountId, patch) {
      const runtime = readRuntime(env);
      const prev = runtime.accounts?.[accountId] || {};
      runtime.accounts = runtime.accounts || {};
      runtime.accounts[accountId] = {
        ...prev,
        account_id: accountId,
        ...patch,
        updated_at: now(),
      };
      writeRuntime(env, runtime);
    },
    incrementLeaseCount(accountId, delta) {
      const account = this.getAccount(accountId);
      const count = (account?.active_lease_count || 0) + delta;
      this.patchAccount(accountId, { active_lease_count: Math.max(0, count) });
    },
    /**
     * Durable unavailable: exhausted quota past reset, auth_failed.
     * Transient: cooldown active → temporarily undispatchable (not durable spill).
     */
    isDurableUnavailable(accountId) {
      const account = this.getAccount(accountId);
      if (!account || account.status !== 'active') {
        return true;
      }
      if (account.health === 'auth_failed') {
        return true;
      }
      if (account.quota_state === 'exhausted') {
        if (!account.quota_reset_at) {
          return true;
        }
        return new Date(account.quota_reset_at).getTime() > Date.now();
      }
      return false;
    },
    isTemporarilyUndispatchable(accountId) {
      const account = this.getAccount(accountId);
      if (!account) {
        return true;
      }
      if (account.cooldown_until && new Date(account.cooldown_until).getTime() > Date.now()) {
        return true;
      }
      return false;
    },
    isEligibleForNewWork(accountId) {
      const account = this.getAccount(accountId);
      if (!account || account.status !== 'active') {
        return false;
      }
      if (this.isDurableUnavailable(accountId)) {
        return false;
      }
      if (this.isTemporarilyUndispatchable(accountId)) {
        return false;
      }
      return true;
    },
    applyOutcome(accountId, outcome) {
      const patch = {};
      if (outcome.class === 'QUOTA_EXHAUSTED') {
        patch.quota_state = 'exhausted';
        patch.health = 'exhausted';
        if (outcome.reset_at) {
          patch.quota_reset_at = outcome.reset_at;
        }
      } else if (outcome.class === 'AUTH_FAILED') {
        patch.health = 'auth_failed';
      } else if (outcome.class === 'RATE_LIMITED') {
        if (outcome.retry_after_seconds) {
          patch.cooldown_until = new Date(Date.now() + outcome.retry_after_seconds * 1000).toISOString();
        } else if (outcome.reset_at) {
          patch.cooldown_until = outcome.reset_at;
        }
      } else if (outcome.class === 'PROVIDER_UNAVAILABLE' || outcome.class === 'TRANSPORT_FAILURE') {
        const seconds = outcome.retry_after_seconds || 30;
        patch.cooldown_until = new Date(Date.now() + seconds * 1000).toISOString();
        patch.health = 'degraded';
      } else if (outcome.class === 'SUCCESS') {
        if (this.getAccount(accountId)?.health === 'degraded') {
          patch.health = 'healthy';
        }
      }
      if (Object.keys(patch).length) {
        this.patchAccount(accountId, patch);
      }
    },
  };
}
