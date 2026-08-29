/**
 * Extract retry/capacity signals Cursor actually exposes.
 * No durable subscription-quota signal is known for Cursor as of
 * cursor-opencode-provider@0.6.3 — quota_exhausted remains false.
 *
 * @param {object} input
 * @param {string} [input.body]
 * @param {Record<string, string>} [input.headers]
 * @param {number} [input.retry_after_ms]
 */
export function extractCursorUsageSignals(input) {
  const { body = '', headers = {}, retry_after_ms } = input;
  const lowerHeaders = Object.fromEntries(
    Object.entries(headers || {}).map(([k, v]) => [k.toLowerCase(), v]),
  );

  let retry_after_seconds = null;
  const retryAfterHeader = lowerHeaders['retry-after'];
  if (retryAfterHeader !== undefined && retryAfterHeader !== null && retryAfterHeader !== '') {
    const seconds = Number(retryAfterHeader);
    if (Number.isFinite(seconds)) {
      retry_after_seconds = seconds;
    }
  } else if (typeof retry_after_ms === 'number' && Number.isFinite(retry_after_ms)) {
    retry_after_seconds = Math.ceil(retry_after_ms / 1000);
  }

  return {
    quota_exhausted: false,
    quota_reset_at: null,
    retry_after_seconds,
    /** Sanitized provider hint only — never raw credentials. */
    capacity_hint: /resource[_ ]?exhausted|capacity|overloaded|rate.?limit/i.test(body)
      ? 'capacity_or_rate'
      : null,
  };
}
