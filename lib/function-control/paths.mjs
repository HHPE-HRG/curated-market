import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/**
 * Git/install root for manifests and catalog reads.
 * Uses HHPE_HRG_HOME when it contains registry/manifests; otherwise the source checkout.
 *
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {string}
 */
export function resolveManifestRoot(env = process.env) {
  if (env.HHPE_HRG_HOME) {
    const installRoot = path.resolve(env.HHPE_HRG_HOME);
    const manifestMarker = path.join(installRoot, 'registry/manifests/function-accounts.yaml');
    if (fs.existsSync(manifestMarker)) {
      return installRoot;
    }
  }
  return REPO_ROOT;
}

/**
 * ADR-001 runtime home for Function Control state. Never defaults to the source checkout.
 *
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {string}
 */
export function resolveRuntimeHome(env = process.env) {
  if (env.HHPE_HRG_HOME) {
    return path.resolve(env.HHPE_HRG_HOME);
  }
  return path.join(os.homedir(), '.local', 'share', 'hhpe-hrg');
}

/** @deprecated Use resolveManifestRoot or resolveRuntimeHome explicitly. */
export function resolveHhpeHome(env = process.env) {
  return resolveRuntimeHome(env);
}

/**
 * Function Control runtime root — never store vault master keys under this tree in production default.
 *
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {string}
 */
export function functionControlRoot(env = process.env) {
  return path.join(resolveRuntimeHome(env), 'function-control');
}

/**
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {string}
 */
export function functionControlVaultDir(env = process.env) {
  return path.join(functionControlRoot(env), 'vault');
}

/**
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {string}
 */
export function functionControlStateDir(env = process.env) {
  return path.join(functionControlRoot(env), 'state');
}

/**
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {string}
 */
export function functionControlReportsDir(env = process.env) {
  return path.join(resolveRuntimeHome(env), 'reports', 'function-control');
}

/**
 * Degraded file-backed master key path (outside vault ciphertext directory).
 *
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {string}
 */
export function degradedVaultKeyPath(env = process.env) {
  if (env.HHPE_FUNCTION_VAULT_KEY_FILE) {
    return path.resolve(env.HHPE_FUNCTION_VAULT_KEY_FILE);
  }
  const configHome = env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
  return path.join(configHome, 'hhpe', 'function-vault.key');
}

/**
 * @param {string} dir
 */
export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
}
