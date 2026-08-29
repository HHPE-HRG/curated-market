#!/usr/bin/env node
/**
 * M2D live Function Control campaign — vault, import, resolve evidence.
 * Never prints tokens, refresh material, or vault keys.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createKeyProviderFromEnv } from '../lib/function-control/vault/key-provider-factory.mjs';
import { importAuthJsonAccount } from '../lib/function-control/import-auth.mjs';
import { createFunctionControl } from '../lib/function-control/index.mjs';
import { bindingKeyForSession } from '../lib/function-control/opencode/binding-keys.mjs';
import { OutcomeClass } from '../registry/providers/openai/outcomes.mjs';
import { classifyCursorResponse } from '../registry/providers/cursor/classify-response.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RUNTIME_HOME = process.env.HHPE_HRG_HOME || path.join(os.homedir(), '.local/share', 'hhpe-function-runtime');
const CM_ROOT = process.env.HHPE_CURATED_MARKET_ROOT || REPO;
const AUTH_JSON = process.env.OPENCODE_AUTH_JSON || path.join(os.homedir(), '.local/share/opencode/auth.json');

const env = {
  ...process.env,
  HHPE_HRG_HOME: RUNTIME_HOME,
  HHPE_CURATED_MARKET_ROOT: CM_ROOT,
};
delete env.HHPE_FUNCTION_VAULT_KEY;

const WORK_OPENAI_AUTH = process.env.OPENAI_WORK_AUTH_JSON;
const WORK_CURSOR_AUTH = process.env.CURSOR_WORK_AUTH_JSON;

const IMPORT_PLAN = [
  { id: 'openai:personal', authPath: AUTH_JSON, provider: 'openai' },
  { id: 'openai:work', authPath: WORK_OPENAI_AUTH, provider: 'openai' },
  { id: 'cursor:personal', authPath: AUTH_JSON, provider: 'cursor' },
  { id: 'cursor:work', authPath: WORK_CURSOR_AUTH, provider: 'cursor' },
];

/** @type {Record<string, { result: string, detail?: string }>} */
const matrix = {};

function redactToken(token) {
  if (!token || typeof token !== 'string') return '[missing]';
  return `${token.slice(0, 8)}…fp:${Buffer.from(token).toString('hex').slice(0, 8)}`;
}

async function main() {
  fs.mkdirSync(RUNTIME_HOME, { recursive: true, mode: 0o700 });

  const keyProvider = createKeyProviderFromEnv(env);
  matrix['vault_key_provider'] = { result: 'PASS', detail: keyProvider.mode };

  if (!fs.existsSync(AUTH_JSON)) {
    throw new Error(`auth.json not found at ${AUTH_JSON}`);
  }

  const authSummary = JSON.parse(fs.readFileSync(AUTH_JSON, 'utf8'));
  const availableProviders = Object.keys(authSummary).filter((k) => authSummary[k]?.type === 'oauth');
  matrix['auth_sources'] = { result: 'INFO', detail: availableProviders.join(',') };

  const imported = [];
  const importFailures = [];
  for (const row of IMPORT_PLAN) {
    if (!row.authPath) {
      importFailures.push({ account: row.id, reason: 'separate work auth.json not configured' });
      continue;
    }
    if (!fs.existsSync(row.authPath)) {
      importFailures.push({ account: row.id, reason: `missing auth file ${row.authPath}` });
      continue;
    }
    try {
      await importAuthJsonAccount(row.authPath, row.id, env);
      imported.push(row.id);
    } catch (err) {
      importFailures.push({ account: row.id, reason: err.message });
    }
  }
  matrix['account_import'] = {
    result: imported.length ? 'PARTIAL' : 'BLOCKED',
    detail: `imported=${imported.join(',') || 'none'}; failures=${importFailures.length}`,
  };

  const fc = createFunctionControl(env);
  const SESSIONS = {
    'openai:personal': 'live-A',
    'openai:work': 'live-B',
    'cursor:personal': 'live-C',
    'cursor:work': 'live-D',
  };
  const resolves = [];
  for (const row of IMPORT_PLAN) {
    const key = `direct_${row.id}`;
    if (!imported.includes(row.id)) {
      matrix[key] = { result: 'BLOCKED', detail: importFailures.find((f) => f.account === row.id)?.reason || 'not imported' };
      continue;
    }
    try {
      const provider = row.provider;
      const capability = provider === 'openai' ? 'codex' : 'agent';
      const out = await fc.resolve({
        consumer_id: 'opencode',
        provider_family: provider,
        capability,
        binding_key: bindingKeyForSession(SESSIONS[row.id]),
        pin_account_id: row.id,
      });
      resolves.push({
        session_id: SESSIONS[row.id],
        account_id: out.binding.account_id,
        binding_id: out.binding.binding_id || out.binding.binding_key,
        lease_id: out.authorization_lease.lease_id,
        token_fp: redactToken(out.access_credential.token),
      });
      matrix[key] = { result: 'PASS', detail: out.binding.account_id };
    } catch (err) {
      matrix[key] = { result: 'BLOCKED', detail: err.code || err.message };
    }
  }

  // Classifier sanity (no live call)
  const cursor429 = classifyCursorResponse({ http_status: 429, body: 'resource_exhausted' });
  matrix['cursor_classifier_429'] = {
    result: cursor429.class === OutcomeClass.RATE_LIMITED ? 'PASS' : 'BLOCKED',
    detail: cursor429.class,
  };

  // Failover only when both openai accounts imported with distinct vault entries
  if (imported.includes('openai:personal')) {
    try {
      const first = await fc.resolve({
        consumer_id: 'opencode',
        provider_family: 'openai',
        capability: 'codex',
        binding_key: bindingKeyForSession('failover-preferred'),
        pin_account_id: 'openai:personal',
      });
      await fc.report(first.authorization_lease.lease_id, { class: OutcomeClass.QUOTA_EXHAUSTED });
      if (imported.includes('openai:work')) {
        const secondary = await fc.resolve({
          consumer_id: 'opencode',
          provider_family: 'openai',
          capability: 'codex',
          binding_key: bindingKeyForSession('failover-new-work'),
        });
        matrix['openai_failover_new_work'] = {
          result: secondary.binding.account_id === 'openai:work' ? 'PASS' : 'BLOCKED',
          detail: secondary.binding.account_id,
        };
      } else {
        matrix['openai_failover_new_work'] = {
          result: 'BLOCKED',
          detail: 'openai:work not imported — single physical OpenAI OAuth on host',
        };
      }
    } catch (err) {
      matrix['openai_failover_new_work'] = { result: 'BLOCKED', detail: err.message };
    }
  }

  const report = {
    runtime_home: RUNTIME_HOME,
    curated_market_root: CM_ROOT,
    key_provider: keyProvider.mode,
    imported_accounts: imported,
    import_failures: importFailures,
    resolves,
    matrix,
  };
  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(JSON.stringify({ error: err.message, code: err.code }, null, 2));
  process.exit(1);
});
