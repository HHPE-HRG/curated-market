import { OutcomeClass } from '../outcomes.mjs';

/** Evidence: cursor-opencode-provider@0.6.3 dist/shared.js + dist/auth.js */
export const CURSOR_API_HOST = 'api2.cursor.sh';
export const DEFAULT_CURSOR_REFRESH_URL = `https://${CURSOR_API_HOST}/auth/token`;

/** Shared with classify-response transport mapping (errors.js TRANSIENT_NETWORK_CODES). */
export const CURSOR_TRANSPORT_CODES = new Set([
  'ECONNABORTED',
  'ECONNREFUSED',
  'ECONNRESET',
  'EHOSTUNREACH',
  'ENETDOWN',
  'ENETRESET',
  'ENETUNREACH',
  'ENOTFOUND',
  'EPIPE',
  'ERR_HTTP2_GOAWAY_SESSION',
  'ERR_HTTP2_SESSION_ERROR',
  'ERR_HTTP2_STREAM_CANCEL',
  'ERR_HTTP2_STREAM_ERROR',
  'ETIMEDOUT',
]);

/**
 * Decode JWT exp to remaining lifetime seconds when the access token is JWT-shaped.
 *
 * @param {string} jwt
 * @returns {number | undefined}
 */
export function expiresInFromJwt(jwt) {
  try {
    const segment = jwt.split('.')[1];
    if (!segment) {
      return undefined;
    }
    const payload = JSON.parse(Buffer.from(segment, 'base64url').toString('utf8'));
    if (!payload || typeof payload.exp !== 'number' || !Number.isFinite(payload.exp)) {
      return undefined;
    }
    const seconds = Math.floor(payload.exp - Date.now() / 1000);
    return seconds > 0 ? seconds : 0;
  } catch {
    return undefined;
  }
}

/**
 * Refresh Cursor OAuth access via POST /auth/token.
 * Request/response field names match cursor-opencode-provider@0.6.3 refreshAccessToken.
 *
 * @param {string} refreshToken
 * @param {{ fetchFn?: typeof fetch, refreshUrl?: string }} [options]
 */
export async function refreshCursorAccess(refreshToken, options = {}) {
  const fetchFn = options.fetchFn || fetch;
  const url = options.refreshUrl || DEFAULT_CURSOR_REFRESH_URL;
  let res;
  try {
    res = await fetchFn(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
  } catch (cause) {
    const err = new Error('Cursor token refresh request failed');
    err.cause = cause;
    err.code = cause && typeof cause === 'object' && 'code' in cause ? cause.code : undefined;
    throw err;
  }

  if (!res.ok) {
    const text = await res.text();
    const err = new Error(`Cursor token refresh failed: ${res.status}`);
    err.status = res.status;
    err.body = text;
    throw err;
  }

  let body;
  try {
    body = await res.json();
  } catch (cause) {
    const err = new Error('Cursor token refresh returned malformed JSON');
    err.cause = cause;
    throw err;
  }

  if (typeof body.accessToken !== 'string' || typeof body.refreshToken !== 'string') {
    throw new Error('Cursor refresh response missing tokens');
  }

  return {
    access_token: body.accessToken,
    refresh_token: body.refreshToken,
    expires_in: expiresInFromJwt(body.accessToken),
  };
}

/**
 * @param {Error & { status?: number, body?: string, code?: string }} error
 */
export function classifyCursorRefreshError(error) {
  const status = error.status;
  if (status === 401 || status === 403) {
    return { class: OutcomeClass.AUTH_FAILED, retryable: false, provider_code: `http_${status}` };
  }
  if (status === 429) {
    return { class: OutcomeClass.RATE_LIMITED, retryable: true, retry_after_seconds: 30 };
  }
  if (status && status >= 500) {
    return { class: OutcomeClass.PROVIDER_UNAVAILABLE, retryable: true };
  }
  if (error.code && CURSOR_TRANSPORT_CODES.has(error.code)) {
    return {
      class: OutcomeClass.TRANSPORT_FAILURE,
      retryable: true,
      provider_code: error.code,
    };
  }
  // Protocol / missing-token / malformed JSON — not a transport retry signal.
  return { class: OutcomeClass.UNKNOWN, retryable: false };
}
