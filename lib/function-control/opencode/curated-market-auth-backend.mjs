import { classifyOpenAIResponse } from '../../../registry/providers/openai/classify-response.mjs';
import { classifyCursorResponse } from '../../../registry/providers/cursor/classify-response.mjs';
import { OutcomeClass } from '../../../registry/providers/outcomes.mjs';

/**
 * OpenCode consumer of Curated Market Function Control.
 * Refresh credentials never leave Function Control.
 *
 * @param {object} options
 * @param {ReturnType<import('../resolve.mjs').createFunctionControl>} options.functionControl
 * @param {string} [options.consumer_id]
 * @param {(entry: unknown) => void} [options.onLocalAuthWrite] Test hook — must never be called in registry mode.
 */
export function createCuratedMarketAuthBackend(options) {
  const {
    functionControl,
    consumer_id = 'opencode',
    onLocalAuthWrite,
  } = options;

  if (!functionControl) {
    throw new Error('functionControl required');
  }

  return {
    type: 'curated-market',
    /**
     * @param {object} input
     */
    async resolve(input) {
      const result = await functionControl.resolve({
        consumer_id,
        provider_family: input.provider_family,
        capability: input.capability,
        binding_key: input.binding_key,
        scope: input.scope || 'session',
        affinity: input.affinity || 'preferred',
        pin_account_id: input.pin_account_id,
        fetchFn: input.fetchFn,
      });

      // Projection for OpenCode — strip any refresh material defensively.
      const access = { ...result.access_credential };
      delete access.refresh_credential;
      delete access.refresh;

      return {
        backend: 'curated-market',
        binding: result.binding,
        authorization_lease: result.authorization_lease,
        access_credential: access,
      };
    },

    /**
     * Classify provider response via Curated Market provider-family modules,
     * then report into Function Control.
     *
     * @param {object} input
     */
    async report(input) {
      const family = input.provider_family;
      let classified;
      if (family === 'cursor') {
        classified = classifyCursorResponse({
          http_status: input.http_status,
          grpc_status: input.grpc_status,
          transport_code: input.transport_code,
          body: input.body,
          headers: input.headers,
          retry_after_ms: input.retry_after_ms,
        });
      } else if (family === 'openai') {
        classified = classifyOpenAIResponse({
          http_status: input.http_status,
          body: input.body,
          headers: input.headers,
        });
      } else {
        classified = { class: OutcomeClass.UNKNOWN, retryable: false };
      }

      const outcome = {
        class: classified.class,
        reset_at: classified.reset_at,
        retry_after_seconds: classified.retry_after_seconds,
      };

      if (input.lease_id) {
        await functionControl.report(input.lease_id, outcome);
      }

      return {
        class: classified.class,
        retryable: classified.retryable,
        applied: Boolean(input.lease_id),
        backend: 'curated-market',
      };
    },

    /**
     * @param {object} input
     */
    async release(input) {
      return functionControl.release(input);
    },

    /** Test/diagnostics: registry mode must not write local auth.json. */
    _notifyLocalAuthWrite(entry) {
      if (typeof onLocalAuthWrite === 'function') {
        onLocalAuthWrite(entry);
      }
    },
  };
}
