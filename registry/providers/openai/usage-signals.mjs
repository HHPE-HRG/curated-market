/**
 * @param {object} input
 * @param {string} [input.body]
 * @param {Record<string, string>} [input.headers]
 */
export function extractUsageSignals(input) {
  const { body = '', headers = {} } = input;
  const lowerHeaders = Object.fromEntries(
    Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]),
  );

  let quota_exhausted = false;
  let quota_reset_at = null;

  if (/usage_limit_reached/i.test(body)) {
    quota_exhausted = true;
  }

  const resetHeader =
    lowerHeaders['x-codex-primary-reset-at'] ||
    lowerHeaders['x-openai-codex-primary-reset-at'];
  if (resetHeader) {
    const ms = Number(resetHeader);
    if (Number.isFinite(ms)) {
      quota_reset_at = new Date(ms).toISOString();
    } else {
      quota_reset_at = resetHeader;
    }
  }

  try {
    const parsed = JSON.parse(body);
    if (parsed?.error?.code === 'usage_limit_reached') {
      quota_exhausted = true;
      if (parsed.error.resets_at) {
        quota_reset_at = parsed.error.resets_at;
      }
    }
  } catch {
    /* non-json */
  }

  return {
    quota_exhausted,
    quota_reset_at,
    primary_used_percent: lowerHeaders['x-codex-primary-used-percent'] || null,
    credits_balance: lowerHeaders['x-codex-credits-balance'] || null,
  };
}
