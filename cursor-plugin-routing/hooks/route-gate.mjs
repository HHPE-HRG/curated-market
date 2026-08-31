import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {isRoutingComplete, sessionIdFromHookPayload} from '../scripts/plugin-description-index.mjs';

function defaultPaths() {
  const home = os.homedir();
  const baseDir = path.join(home, '.cursor', 'hhpe-hrg-plugin-stack');
  const derivedDir = path.join(baseDir, 'derived');
  const stateDir = path.join(baseDir, 'state');
  return {
    fingerprintPath: path.join(derivedDir, '.fingerprint'),
    routingCompleteFlagPath: path.join(stateDir, 'routing-complete.json'),
  };
}

function shouldGateShellCommand(command) {
  if (!command || typeof command !== 'string') return false;

  const exemptPatterns = [
    'route-gate.mjs',
    'session-start.mjs',
    'plugin-description-index.mjs',
    'mark-routing-complete.mjs',
  ];
  if (exemptPatterns.some((p) => command.includes(p))) return false;

  const mutationPatterns = [
    // git workflows
    /\bgit\s+(commit|push|merge|rebase)\b/i,
    // destructive local ops
    /\brm\s+-rf\b/i,
    // network / deployment-ish ops
    /\bcurl\s/i,
    /\bwget\s/i,
    /\bscp\s/i,
    /\bssh\s/i,
    /\bkubectl\s+(apply|delete)\b/i,
    /\bterraform\s+(apply|destroy)\b/i,
    /\bdocker\s+run\b/i,
  ];

  return mutationPatterns.some((re) => re.test(command));
}

export async function evaluateRouteGate({command, payload, stateDir, fingerprintPath, disableGate} = {}) {
  if (disableGate || process.env.CURSOR_PLUGIN_ROUTING_DISABLE_GATE === '1') {
    return {permission: 'allow', reason: 'operator-bypass'};
  }
  if (!shouldGateShellCommand(command)) return {permission: 'allow', reason: 'not-gated'};
  const sessionId = sessionIdFromHookPayload(payload || {});
  if (!sessionId) return {permission: 'deny', reason: 'missing-session'};
  try {
    const ok = await isRoutingComplete({
      stateDir,
      sessionId,
      currentFingerprintPath: fingerprintPath,
    });
    return ok
      ? {permission: 'allow', reason: 'complete'}
      : {permission: 'deny', reason: 'incomplete-or-stale'};
  } catch {
    return {permission: 'deny', reason: 'unavailable-enforcement-dependency'};
  }
}

async function main() {
  const input = fs.readFileSync(0, 'utf8').trim();
  const data = input ? JSON.parse(input) : {};
  const {fingerprintPath} = defaultPaths();
  const stateDir = path.dirname(defaultPaths().routingCompleteFlagPath);
  const result = await evaluateRouteGate({
    command: data.command || '',
    payload: data,
    stateDir,
    fingerprintPath,
  });
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({
    permission: result.permission,
    ...(result.permission === 'deny' ? {
      user_message:
        'Blocked until plugin routing completes (select installed plugins/skills/MCP before state-changing commands).',
      agent_message:
        'Run the `plugin-routing` skill. After documenting `## Plugin and capability use` in the plan, record routing completion via:\n\n`node ${CURSOR_PLUGIN_ROOT}/scripts/mark-routing-complete.mjs --context <session>`\n\nThen retry the original command.',
    } : {}),
  }));
}

const invoked = process.argv[1]
  && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (invoked) {
  await main();
}
