import { OutcomeClass } from './outcomes.mjs';

const DEFAULT_REFRESH_URL = 'https://auth.openai.com/oauth/token';

/**
 * @param {string} refreshToken
 * @param {{ fetchFn?: typeof fetch, refreshUrl?: string }} [options]
 */
export async function refreshOpenAIAccess(refreshToken, options = {}) {
  const fetchFn = options.fetchFn || fetch;
  const res = await fetchFn(options.refreshUrl || DEFAULT_REFRESH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken, grant_type: 'refresh_token' }),
  });
  if (!res.ok) {
    const text = await res.text();
    const err = new Error(`OpenAI refresh failed: ${res.status} ${text}`);
    err.status = res.status;
    err.body = text;
    throw err;
  }
  const body = await res.json();
  if (!body.access_token) {
    throw new Error('OpenAI refresh response missing access_token');
  }
  return {
    access_token: body.access_token,
    refresh_token: body.refresh_token || refreshToken,
    expires_in: body.expires_in,
  };
}

/**
 * @param {Error & { status?: number, body?: string }} error
 */
export function classifyRefreshError(error) {
  const status = error.status;
  const body = error.body || error.message || '';
  if (status === 401 || /invalid_grant|revoked/i.test(body)) {
    return { class: OutcomeClass.AUTH_FAILED, retryable: false };
  }
  if (status === 429) {
    return { class: OutcomeClass.RATE_LIMITED, retryable: true, retry_after_seconds: 30 };
  }
  if (status && status >= 500) {
    return { class: OutcomeClass.PROVIDER_UNAVAILABLE, retryable: true };
  }
  return { class: OutcomeClass.TRANSPORT_FAILURE, retryable: true };
}
