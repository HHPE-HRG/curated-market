/** Normalized Function Control outcome vocabulary (provider-family agnostic). */

export const OutcomeClass = {
  SUCCESS: 'SUCCESS',
  QUOTA_EXHAUSTED: 'QUOTA_EXHAUSTED',
  RATE_LIMITED: 'RATE_LIMITED',
  AUTH_FAILED: 'AUTH_FAILED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  PROVIDER_UNAVAILABLE: 'PROVIDER_UNAVAILABLE',
  TRANSPORT_FAILURE: 'TRANSPORT_FAILURE',
  CONTINUATION_BLOCKED: 'CONTINUATION_BLOCKED',
  UNKNOWN: 'UNKNOWN',
};

/** @type {ReadonlySet<string>} */
export const DURABLE_UNAVAILABLE_OUTCOMES = new Set([
  OutcomeClass.QUOTA_EXHAUSTED,
  OutcomeClass.AUTH_FAILED,
]);

/** @type {ReadonlySet<string>} */
export const TRANSIENT_OUTCOMES = new Set([
  OutcomeClass.RATE_LIMITED,
  OutcomeClass.PROVIDER_UNAVAILABLE,
  OutcomeClass.TRANSPORT_FAILURE,
]);

/**
 * @param {string} className
 * @returns {boolean}
 */
export function isDurableUnavailable(className) {
  return DURABLE_UNAVAILABLE_OUTCOMES.has(className);
}

/**
 * @param {string} className
 * @returns {boolean}
 */
export function isTransientDispatchFailure(className) {
  return TRANSIENT_OUTCOMES.has(className);
}
