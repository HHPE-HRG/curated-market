import { OutcomeClass } from './outcomes.mjs';
import { extractUsageSignals } from './usage-signals.mjs';

/**
 * @param {object} input
 * @param {number} [input.http_status]
 * @param {string} [input.body]
 * @param {Record<string, string>} [input.headers]
 */
export function classifyOpenAIResponse(input) {
  const { http_status, body = '', headers = {} } = input;
  const signals = extractUsageSignals({ body, headers });

  if (signals.quota_exhausted) {
    return {
      class: OutcomeClass.QUOTA_EXHAUSTED,
      retryable: false,
      reset_at: signals.quota_reset_at,
      provider_code: 'usage_limit_reached',
    };
  }

  if (http_status === 401) {
    return { class: OutcomeClass.AUTH_FAILED, retryable: false };
  }

  if (http_status === 429) {
    const retryAfter = Number(headers['retry-after'] || headers['Retry-After'] || 30);
    return {
      class: OutcomeClass.RATE_LIMITED,
      retryable: true,
      retry_after_seconds: Number.isFinite(retryAfter) ? retryAfter : 30,
    };
  }

  if (http_status && http_status >= 500) {
    return { class: OutcomeClass.PROVIDER_UNAVAILABLE, retryable: true };
  }

  if (http_status === 0 || http_status === undefined) {
    return { class: OutcomeClass.TRANSPORT_FAILURE, retryable: true };
  }

  if (http_status >= 200 && http_status < 300) {
    return { class: OutcomeClass.SUCCESS, retryable: false };
  }

  return { class: OutcomeClass.UNKNOWN, retryable: false };
}
