import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { functionControlStateDir, ensureDir } from './paths.mjs';

function now() {
  return new Date().toISOString();
}

function statePath(env) {
  return path.join(functionControlStateDir(env), 'bindings.json');
}

function readState(env) {
  const file = statePath(env);
  if (!fs.existsSync(file)) {
    return { schema_version: 1, bindings: [] };
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeState(env, data) {
  ensureDir(functionControlStateDir(env));
  const file = statePath(env);
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(tmp, file);
}

/**
 * @param {NodeJS.ProcessEnv} [env]
 */
export function createBindingStore(env = process.env) {
  return {
    getActive(bindingKey) {
      const state = readState(env);
      return (state.bindings || []).find((b) => b.binding_key === bindingKey && b.active);
    },
    /**
     * @param {object} binding
     */
    upsert(binding) {
      const state = readState(env);
      state.bindings = state.bindings || [];
      const idx = state.bindings.findIndex((b) => b.binding_key === binding.binding_key);
      const record = {
        ...binding,
        active: true,
        bound_at: binding.bound_at || now(),
      };
      if (idx >= 0) {
        state.bindings[idx] = record;
      } else {
        state.bindings.push(record);
      }
      writeState(env, state);
      return record;
    },
    deactivate(bindingKey) {
      const state = readState(env);
      for (const b of state.bindings || []) {
        if (b.binding_key === bindingKey) {
          b.active = false;
          b.deactivated_at = now();
        }
      }
      writeState(env, state);
    },
    rebind(bindingKey, accountId) {
      const existing = this.getActive(bindingKey);
      if (!existing) {
        throw new Error(`No active binding for ${bindingKey}`);
      }
      return this.upsert({
        ...existing,
        account_id: accountId,
        bound_at: now(),
      });
    },
  };
}

export function newBindingKeySuffix() {
  return crypto.randomBytes(4).toString('hex');
}
