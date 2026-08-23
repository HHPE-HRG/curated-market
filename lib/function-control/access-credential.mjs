import crypto from 'node:crypto';
import { refreshOpenAIAccess, classifyRefreshError } from '../../registry/providers/openai/refresh.mjs';
import { singleflightRefresh } from './refresh-coordinator.mjs';

const REFRESH_SKEW_MS = 60_000;

/**
 * @param {object} deps
 */
export function createAccessCredentialService(deps) {
  const { vault, accountStore, refreshFn = refreshOpenAIAccess } = deps;

  return {
    /**
     * @param {string} accountId
     * @param {{ fetchFn?: typeof fetch }} [options]
     */
    async ensureAccessCredential(accountId, options = {}) {
      const secret = await vault.getSecret(accountId);
      if (!secret?.refresh_credential) {
        throw Object.assign(new Error(`No vault credentials for ${accountId}`), {
          code: 'CREDENTIAL_NOT_REGISTERED',
        });
      }

      const expiresAt = secret.access_expires_at || 0;
      const needsRefresh = !secret.access_credential || expiresAt - Date.now() < REFRESH_SKEW_MS;

      let refreshToken = secret.refresh_credential;
      let accessToken = secret.access_credential;
      let providerExpiresAt = secret.access_expires_at;

      if (needsRefresh) {
        const refreshed = await singleflightRefresh(accountId, async () => {
          try {
            const result = await refreshFn(refreshToken, { fetchFn: options.fetchFn });
            const entry = {
              refresh_credential: result.refresh_token,
              access_credential: result.access_token,
              access_expires_at: Date.now() + (result.expires_in || 3600) * 1000,
            };
            await vault.setSecret(accountId, entry);
            accountStore.patchAccount(accountId, {
              access_expires_at: new Date(entry.access_expires_at).toISOString(),
            });
            return entry;
          } catch (err) {
            const classified = classifyRefreshError(err);
            accountStore.applyOutcome(accountId, classified);
            throw err;
          }
        });
        refreshToken = refreshed.refresh_credential;
        accessToken = refreshed.access_credential;
        providerExpiresAt = refreshed.access_expires_at;
      }

      return {
        credential_id: `cred_${crypto.randomBytes(6).toString('hex')}`,
        account_id: accountId,
        kind: 'bearer',
        token: accessToken,
        provider_expires_at: new Date(providerExpiresAt).toISOString(),
        issued_at: new Date().toISOString(),
      };
    },
  };
}
