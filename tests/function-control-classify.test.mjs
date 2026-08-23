import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { classifyOpenAIResponse } from '../registry/providers/openai/classify-response.mjs';
import { OutcomeClass } from '../registry/providers/openai/outcomes.mjs';

test('usage_limit_reached maps to QUOTA_EXHAUSTED', () => {
  const result = classifyOpenAIResponse({
    http_status: 429,
    body: JSON.stringify({ error: { code: 'usage_limit_reached', resets_at: '2026-09-01T00:00:00Z' } }),
  });
  assert.equal(result.class, OutcomeClass.QUOTA_EXHAUSTED);
});

test('transient 429 without exhaustion maps to RATE_LIMITED', () => {
  const result = classifyOpenAIResponse({
    http_status: 429,
    headers: { 'retry-after': '30' },
    body: '{}',
  });
  assert.equal(result.class, OutcomeClass.RATE_LIMITED);
  assert.equal(result.retry_after_seconds, 30);
});

test('401 maps to AUTH_FAILED', () => {
  const result = classifyOpenAIResponse({ http_status: 401, body: 'unauthorized' });
  assert.equal(result.class, OutcomeClass.AUTH_FAILED);
});

test('TOKEN_EXPIRED is not conflated with quota exhaustion', () => {
  const quota = classifyOpenAIResponse({ http_status: 401, body: 'token expired' });
  assert.equal(quota.class, OutcomeClass.AUTH_FAILED);
  assert.notEqual(quota.class, OutcomeClass.QUOTA_EXHAUSTED);
});
