import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { createFunctionControl, clearRefreshSingleflight } from '../../../lib/function-control/index.mjs';
import { OutcomeClass } from '../../../registry/providers/openai/outcomes.mjs';

/**
 * @param {NodeJS.ProcessEnv} [extraEnv]
 */
export function createHermeticFixture(extraEnv = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hhpe-fc-fixture-'));
  const key = crypto.randomBytes(32);
  const env = {
    HHPE_HRG_HOME: root,
    HHPE_FUNCTION_VAULT_KEY: key.toString('hex'),
    ...extraEnv,
  };

  const refreshCalls = new Map();

  const refreshFn = async (refreshToken) => {
    const count = refreshCalls.get(refreshToken) || 0;
    refreshCalls.set(refreshToken, count + 1);
    const account = refreshToken.includes('personal') ? 'personal' : 'work';
    return {
      access_token: `access_${account}_${count + 1}`,
      refresh_token: refreshToken,
      expires_in: 3600,
    };
  };

  const fc = createFunctionControl(env, { refreshFn });

  async function seedAccounts() {
    await fc.registerAccountSecret('openai:personal', {
      refresh_credential: 'rt_personal_mock',
      access_credential: 'access_personal_initial',
      access_expires_at: Date.now() + 3600_000,
    });
    await fc.registerAccountSecret('openai:work', {
      refresh_credential: 'rt_work_mock',
      access_credential: 'access_work_initial',
      access_expires_at: Date.now() + 3600_000,
    });
  }

  function cleanup() {
    clearRefreshSingleflight();
    fs.rmSync(root, { recursive: true, force: true });
  }

  return { root, env, fc, refreshCalls, refreshFn, seedAccounts, cleanup };
}
