import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  refreshCursorAccess,
  classifyCursorRefreshError,
  classifyCursorResponse,
  extractCursorUsageSignals,
  cursorContinuationPolicy,
  OutcomeClass,
} from '../registry/providers/cursor/index.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CURSOR_DIR = path.join(ROOT, 'registry/providers/cursor');

function mockResponse(status, body, headers = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: String(status),
    headers: {
      get(name) {
        const key = Object.keys(headers).find((k) => k.toLowerCase() === name.toLowerCase());
        return key ? headers[key] : null;
      },
    },
    async text() {
      return typeof body === 'string' ? body : JSON.stringify(body);
    },
    async json() {
      return typeof body === 'string' ? JSON.parse(body) : body;
    },
  };
}

test('refresh returns access and rotated refresh credentials', async () => {
  const calls = [];
  const fetchFn = async (url, init) => {
    calls.push({ url, init });
    return mockResponse(200, {
      accessToken: 'eyJaccess.new',
      refreshToken: 'rt_rotated_new',
    });
  };

  const result = await refreshCursorAccess('rt_original', { fetchFn });
  assert.equal(result.access_token, 'eyJaccess.new');
  assert.equal(result.refresh_token, 'rt_rotated_new');
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /\/auth\/token$/);
  assert.equal(JSON.parse(calls[0].init.body).refreshToken, 'rt_original');
});

test('refresh requires rotated refresh token in Cursor response', async () => {
  const fetchFn = async () => mockResponse(200, { accessToken: 'eyJaccess.only' });
  await assert.rejects(
    () => refreshCursorAccess('rt_original', { fetchFn }),
    (err) => /missing tokens|refreshToken/i.test(err.message),
  );
});

test('refresh auth failure classifies as AUTH_FAILED', async () => {
  const fetchFn = async () => mockResponse(401, { error: 'invalid' });
  await assert.rejects(() => refreshCursorAccess('rt_bad', { fetchFn }), (err) => {
    const classified = classifyCursorRefreshError(err);
    assert.equal(classified.class, OutcomeClass.AUTH_FAILED);
    assert.equal(classified.retryable, false);
    assert.ok(!JSON.stringify(classified).includes('rt_bad'));
    return true;
  });
});

test('HTTP 401 and 403 classify as AUTH_FAILED', () => {
  assert.equal(classifyCursorResponse({ http_status: 401 }).class, OutcomeClass.AUTH_FAILED);
  assert.equal(classifyCursorResponse({ http_status: 403 }).class, OutcomeClass.AUTH_FAILED);
});

test('gRPC unauthenticated and permission_denied classify as AUTH_FAILED', () => {
  assert.equal(
    classifyCursorResponse({ grpc_status: 'unauthenticated' }).class,
    OutcomeClass.AUTH_FAILED,
  );
  assert.equal(
    classifyCursorResponse({ grpc_status: 'permission_denied' }).class,
    OutcomeClass.AUTH_FAILED,
  );
  assert.equal(classifyCursorResponse({ grpc_status: 16 }).class, OutcomeClass.AUTH_FAILED);
  assert.equal(classifyCursorResponse({ grpc_status: 7 }).class, OutcomeClass.AUTH_FAILED);
});

test('HTTP 429 is RATE_LIMITED and never QUOTA_EXHAUSTED', () => {
  const result = classifyCursorResponse({
    http_status: 429,
    headers: { 'retry-after': '45' },
    body: 'resource_exhausted sounding text',
  });
  assert.equal(result.class, OutcomeClass.RATE_LIMITED);
  assert.notEqual(result.class, OutcomeClass.QUOTA_EXHAUSTED);
  assert.equal(result.retryable, true);
  assert.equal(result.retry_after_seconds, 45);
});

test('gRPC resource_exhausted is transient RATE_LIMITED not QUOTA_EXHAUSTED', () => {
  const result = classifyCursorResponse({ grpc_status: 'resource_exhausted' });
  assert.equal(result.class, OutcomeClass.RATE_LIMITED);
  assert.notEqual(result.class, OutcomeClass.QUOTA_EXHAUSTED);
  assert.equal(result.retryable, true);
});

test('HTTP 5xx and gRPC unavailable/internal map to PROVIDER_UNAVAILABLE', () => {
  assert.equal(classifyCursorResponse({ http_status: 503 }).class, OutcomeClass.PROVIDER_UNAVAILABLE);
  assert.equal(classifyCursorResponse({ grpc_status: 'unavailable' }).class, OutcomeClass.PROVIDER_UNAVAILABLE);
  assert.equal(classifyCursorResponse({ grpc_status: 'internal' }).class, OutcomeClass.PROVIDER_UNAVAILABLE);
  assert.equal(classifyCursorResponse({ grpc_status: 14 }).class, OutcomeClass.PROVIDER_UNAVAILABLE);
  assert.equal(classifyCursorResponse({ grpc_status: 13 }).class, OutcomeClass.PROVIDER_UNAVAILABLE);
});

test('transport resets map to TRANSPORT_FAILURE', () => {
  assert.equal(
    classifyCursorResponse({ transport_code: 'ECONNRESET' }).class,
    OutcomeClass.TRANSPORT_FAILURE,
  );
  assert.equal(
    classifyCursorResponse({ transport_code: 'ERR_HTTP2_SESSION_ERROR' }).class,
    OutcomeClass.TRANSPORT_FAILURE,
  );
});

test('usage signals extract Retry-After without inventing quota exhaustion', () => {
  const signals = extractCursorUsageSignals({
    headers: { 'Retry-After': '12' },
    body: 'temporary capacity',
  });
  assert.equal(signals.retry_after_seconds, 12);
  assert.equal(signals.quota_exhausted, false);
  assert.equal(signals.quota_reset_at, null);
});

test('continuation policy requires account affinity for active Run continuation', () => {
  const policy = cursorContinuationPolicy();
  assert.equal(policy.account_sensitive, true);
  assert.equal(policy.binding_affinity_default, 'preferred');
  assert.equal(policy.binding_affinity_for_active_continuation, 'required');
  assert.equal(policy.migration_strategy, 'explicit_restart');
  assert.equal(policy.silent_account_migration_allowed, false);
});

test('classification surfaces never echo bearer or refresh credentials', () => {
  const secret = 'rt_super_secret_should_not_leak';
  const result = classifyCursorResponse({
    http_status: 401,
    body: `Bearer ${secret} rejected`,
  });
  const serialized = JSON.stringify(result);
  assert.ok(!serialized.includes(secret));
  assert.ok(!/Bearer\s+rt_/i.test(serialized));
  assert.match(serialized, /\[redacted/i);
});

test('cursor provider modules stay pure of Function Control and Behavior planes', () => {
  for (const file of fs.readdirSync(CURSOR_DIR).filter((f) => f.endsWith('.mjs'))) {
    const src = fs.readFileSync(path.join(CURSOR_DIR, file), 'utf8');
    assert.ok(!src.includes('function-control/'), `${file} imports function-control`);
    assert.ok(!src.includes('lib/registry.mjs'), `${file} imports registry.mjs`);
    assert.ok(!/from ['\"].*registry\.mjs['\"]/.test(src), `${file} imports registry.mjs`);
  }
});

test('cursor does not invent durable QUOTA_EXHAUSTED from ambiguous capacity wording', () => {
  for (const input of [
    { http_status: 429, body: 'quota exceeded' },
    { http_status: 429, body: 'usage limit' },
    { grpc_status: 'resource_exhausted', body: 'quota' },
    { grpc_status: 8 },
  ]) {
    const result = classifyCursorResponse(input);
    assert.notEqual(result.class, OutcomeClass.QUOTA_EXHAUSTED, JSON.stringify(input));
    assert.equal(result.class, OutcomeClass.RATE_LIMITED);
  }
});
