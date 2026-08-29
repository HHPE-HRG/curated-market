import { createLocalAuthBackend } from './local-auth-backend.mjs';
import { createCuratedMarketAuthBackend } from './curated-market-auth-backend.mjs';
import { createFunctionControl } from '../resolve.mjs';

/**
 * Select AuthBackend from config.
 *
 * @param {object} config
 * @param {'local'|'curated-market'} config.type
 * @param {string} [config.authPath]
 * @param {string} [config.consumer_id]
 * @param {object} [config.functionControl]
 * @param {NodeJS.ProcessEnv} [config.env]
 */
export function selectAuthBackend(config) {
  if (!config || !config.type) {
    throw new Error('auth_backend.type required');
  }
  if (config.type === 'local') {
    return createLocalAuthBackend({ authPath: config.authPath });
  }
  if (config.type === 'curated-market') {
    const functionControl = config.functionControl || createFunctionControl(config.env);
    return createCuratedMarketAuthBackend({
      functionControl,
      consumer_id: config.consumer_id || 'opencode',
      onLocalAuthWrite: config.onLocalAuthWrite,
    });
  }
  throw new Error(`Unknown auth_backend.type: ${config.type}`);
}
