import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

import {
  createKeyProviderFromEnv,
  FAIL_CLOSED_MESSAGE,
  createEncryptedVault,
  createEphemeralKeyProvider,
  createFileKeyProvider,
  functionControlVaultDir,
  degradedVaultKeyPath,
} from '../lib/function-control/index.mjs';

test('registry.mjs does not import function-control', () => {
  const src = fs.readFileSync(new URL('../lib/registry.mjs', import.meta.url), 'utf8');
  assert.ok(!src.includes('function-control'));
});

test('function-control index does not import registry.mjs', () => {
  const src = fs.readFileSync(new URL('../lib/function-control/index.mjs', import.meta.url), 'utf8');
  assert.ok(!src.includes('registry.mjs'));
});

test('linux without secure provider fails closed', () => {
  assert.throws(
    () => createKeyProviderFromEnv({}, { platform: 'linux' }),
    (err) => err.message === FAIL_CLOSED_MESSAGE,
  );
});

test('ephemeral key provider works without host secure store', () => {
  const key = crypto.randomBytes(32);
  const env = { HHPE_FUNCTION_VAULT_KEY: key.toString('hex') };
  const provider = createKeyProviderFromEnv(env, { platform: 'linux' });
  assert.equal(provider.mode, 'ephemeral');
  assert.equal(provider.degraded, false);
});

test('explicit file-degraded mode permitted on linux', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hhpe-fc-degraded-'));
  const keyFile = path.join(root, 'vault.key');
  const env = {
    HHPE_FUNCTION_VAULT_MODE: 'file-degraded',
    HHPE_FUNCTION_VAULT_KEY_FILE: keyFile,
    XDG_CONFIG_HOME: root,
  };
  const provider = createFileKeyProvider(env);
  assert.equal(provider.mode, 'file-degraded');
  assert.equal(provider.degraded, true);
  assert.notEqual(provider.keyPath, functionControlVaultDir(env));
  fs.rmSync(root, { recursive: true, force: true });
});

test('degraded key path is outside function-control vault directory', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hhpe-fc-path-'));
  const env = {
    HHPE_HRG_HOME: root,
    HHPE_FUNCTION_VAULT_MODE: 'file-degraded',
    XDG_CONFIG_HOME: path.join(root, 'config'),
  };
  const keyPath = degradedVaultKeyPath(env);
  const vaultDir = functionControlVaultDir(env);
  assert.ok(!keyPath.startsWith(vaultDir + path.sep) && keyPath !== vaultDir);
  fs.rmSync(root, { recursive: true, force: true });
});

test('encrypted vault isolates two account secrets', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hhpe-fc-enc-'));
  const key = crypto.randomBytes(32);
  const env = {
    HHPE_HRG_HOME: root,
    HHPE_FUNCTION_VAULT_KEY: key.toString('hex'),
  };
  const keyProvider = createEphemeralKeyProvider(env);
  const vault = createEncryptedVault(keyProvider, env);
  await vault.ensureReady();

  await vault.setSecret('openai:personal', {
    refresh_credential: 'rt_personal_mock',
    access_credential: 'access_personal',
    access_expires_at: Date.now() + 3600000,
  });
  await vault.setSecret('openai:work', {
    refresh_credential: 'rt_work_mock',
    access_credential: 'access_work',
    access_expires_at: Date.now() + 3600000,
  });

  const personal = await vault.getSecret('openai:personal');
  const work = await vault.getSecret('openai:work');
  assert.equal(personal.refresh_credential, 'rt_personal_mock');
  assert.equal(work.refresh_credential, 'rt_work_mock');

  await vault.setSecret('openai:personal', {
    refresh_credential: 'rt_personal_rotated',
    access_credential: 'access_personal_new',
    access_expires_at: Date.now() + 7200000,
  });
  const workAfter = await vault.getSecret('openai:work');
  assert.equal(workAfter.refresh_credential, 'rt_work_mock');

  const vaultPath = path.join(functionControlVaultDir(env), 'secrets.enc');
  assert.ok(fs.existsSync(vaultPath));
  const adjacentKey = path.join(functionControlVaultDir(env), '.vault-key');
  assert.equal(fs.existsSync(adjacentKey), false);

  const raw = fs.readFileSync(vaultPath, 'utf8');
  assert.ok(!raw.includes('rt_personal_mock'));
  assert.ok(!raw.includes('rt_work_mock'));

  fs.rmSync(root, { recursive: true, force: true });
});

test('default keychain mode does not create adjacent vault key file', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hhpe-fc-kc-'));
  const env = { HHPE_HRG_HOME: root };
  if (process.platform === 'darwin') {
    const provider = createKeyProviderFromEnv(env, { platform: 'darwin' });
    assert.equal(provider.mode, 'keychain');
    const vault = createEncryptedVault(provider, env);
    await vault.ensureReady();
    await vault.setSecret('openai:personal', { refresh_credential: 'rt_test' });
    assert.equal(fs.existsSync(path.join(functionControlVaultDir(env), '.vault-key')), false);
  }
  fs.rmSync(root, { recursive: true, force: true });
});
