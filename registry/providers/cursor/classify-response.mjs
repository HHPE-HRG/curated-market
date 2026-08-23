import { OutcomeClass } from '../outcomes.mjs';
import { extractCursorUsageSignals } from './usage-signals.mjs';

const TRANSPORT_CODES = new Set([
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
 * @param {number | string | undefined} status
 * @returns {string}
 */
function normalizeGrpcStatus(status) {
  return String(status ?? '').toLowerCase().replaceAll('-', '_');
}

/**
 * @param {number | string | undefined} status
 * @returns {boolean}
 */
function isAuthGrpc(status) {
  const n = normalizeGrpcStatus(status);
  return n === '7' || n === '16' || n === 'permission_denied' || n === 'unauthenticated';
}

/**
 * @param {number | string | undefined} status
 * @returns {boolean}
 */
function isCapacityGrpc(status) {
  const n = normalizeGrpcStatus(status);
  return n === '8' || n === 'resource_exhausted';
}

/**
 * @param {number | string | undefined} status
 * @returns {boolean}
 */
function isUnavailableGrpc(status) {
  const n = normalizeGrpcStatus(status);
  return n === '13' || n === '14' || n === 'internal' || n === 'unavailable';
}

/**
 * Strip credential-like substrings from provider evidence strings.
 *
 * @param {string} [text]
 * @returns {string | undefined}
 */
function sanitizeEvidence(text) {
  if (!text || typeof text !== 'string') {
    return undefined;
  }
  return text
    .replace(/Bearer\s+[^\s]+/gi, 'Bearer [redacted]')
    .replace(/\brt_[A-Za-z0-9_-]+\b/g, '[redacted_refresh]')
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[redacted_jwt]')
    .slice(0, 200);
}

/**
 * Normalize Cursor HTTP/gRPC/transport failures into Function Control outcomes.
 * Evidence: cursor-opencode-provider@0.6.3 dist/errors.js (cursorHttpError / cursorGrpcError).
 *
 * Important: HTTP 429 and gRPC resource_exhausted are transient capacity/rate —
 * NOT durable QUOTA_EXHAUSTED. No Cursor durable quota signal is encoded in M2A.
 *
 * @param {object} input
 * @param {number} [input.http_status]
 * @param {number|string} [input.grpc_status]
 * @param {string} [input.transport_code]
 * @param {string} [input.body]
 * @param {Record<string, string>} [input.headers]
 * @param {number} [input.retry_after_ms]
 */
export function classifyCursorResponse(input) {
  const {
    http_status,
    grpc_status,
    transport_code,
    body = '',
    headers = {},
    retry_after_ms,
  } = input;

  const signals = extractCursorUsageSignals({ body, headers, retry_after_ms });
  const evidence = sanitizeEvidence(body);

  if (transport_code && TRANSPORT_CODES.has(transport_code)) {
    return {
      class: OutcomeClass.TRANSPORT_FAILURE,
      retryable: true,
      provider_code: transport_code,
      evidence,
    };
  }

  if (http_status === 401 || http_status === 403) {
    return {
      class: OutcomeClass.AUTH_FAILED,
      retryable: false,
      provider_code: `http_${http_status}`,
      evidence,
    };
  }

  if (isAuthGrpc(grpc_status)) {
    return {
      class: OutcomeClass.AUTH_FAILED,
      retryable: false,
      provider_code: `grpc_${normalizeGrpcStatus(grpc_status)}`,
      evidence,
    };
  }

  if (http_status === 429 || isCapacityGrpc(grpc_status)) {
    return {
      class: OutcomeClass.RATE_LIMITED,
      retryable: true,
      retry_after_seconds: signals.retry_after_seconds ?? 30,
      provider_code: http_status === 429
        ? 'http_429'
        : `grpc_${normalizeGrpcStatus(grpc_status)}`,
      evidence,
    };
  }

  if ((http_status && http_status >= 500) || isUnavailableGrpc(grpc_status)) {
    return {
      class: OutcomeClass.PROVIDER_UNAVAILABLE,
      retryable: true,
      provider_code: http_status && http_status >= 500
        ? `http_${http_status}`
        : `grpc_${normalizeGrpcStatus(grpc_status)}`,
      evidence,
    };
  }

  if (http_status === 0 || (http_status === undefined && grpc_status === undefined && !transport_code)) {
    if (http_status === 0) {
      return { class: OutcomeClass.TRANSPORT_FAILURE, retryable: true, evidence };
    }
  }

  if (http_status !== undefined && http_status >= 200 && http_status < 300) {
    return { class: OutcomeClass.SUCCESS, retryable: false };
  }

  return { class: OutcomeClass.UNKNOWN, retryable: false, evidence };
}
