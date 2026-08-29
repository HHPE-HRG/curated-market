import fs from 'node:fs';

/**
 * Stock OpenCode-compatible auth: reads auth.json-shaped store.
 * Returns access projection only — never promotes refresh to consumers.
 *
 * @param {{ authPath: string }} options
 */
export function createLocalAuthBackend(options) {
  const { authPath } = options;

  return {
    type: 'local',
    /**
     * @param {object} input
     */
    async resolve(input) {
      if (!fs.existsSync(authPath)) {
        throw Object.assign(new Error(`Local auth file missing: ${authPath}`), {
          code: 'LOCAL_AUTH_MISSING',
        });
      }
      const store = JSON.parse(fs.readFileSync(authPath, 'utf8'));
      const entry = store[input.provider_family];
      if (!entry) {
        throw Object.assign(new Error(`No local auth for ${input.provider_family}`), {
          code: 'LOCAL_AUTH_PROVIDER_MISSING',
        });
      }
      const token = entry.type === 'oauth' ? entry.access : entry.key;
      if (!token) {
        throw Object.assign(new Error(`Local auth entry missing credential for ${input.provider_family}`), {
          code: 'LOCAL_AUTH_CREDENTIAL_MISSING',
        });
      }
      return {
        backend: 'local',
        binding: {
          binding_key: input.binding_key,
          account_id: entry.accountId || `${input.provider_family}:local`,
          provider_family: input.provider_family,
          capability: input.capability,
          affinity: input.affinity || 'preferred',
          scope: input.scope || 'session',
        },
        authorization_lease: {
          lease_id: `local_${input.binding_key}`,
          account_id: entry.accountId || `${input.provider_family}:local`,
        },
        access_credential: {
          credential_id: `local_cred_${input.provider_family}`,
          account_id: entry.accountId || `${input.provider_family}:local`,
          kind: 'bearer',
          token,
          provider_expires_at: entry.expires
            ? new Date(entry.expires).toISOString()
            : undefined,
        },
      };
    },
    async report() {
      return { class: 'UNKNOWN', applied: false, backend: 'local' };
    },
    async release() {
      return { released: true, backend: 'local' };
    },
  };
}
