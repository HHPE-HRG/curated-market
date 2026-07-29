import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {isRoutingComplete} from '../scripts/plugin-description-index.mjs';

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

async function main() {
  try {
    if (process.env.CURSOR_PLUGIN_ROUTING_DISABLE_GATE === '1') {
      // eslint-disable-next-line no-console
      console.log(JSON.stringify({ permission: 'allow' }));
      return;
    }

    const input = fs.readFileSync(0, 'utf8').trim();
    const data = input ? JSON.parse(input) : {};
    const command = data.command || '';

    if (!shouldGateShellCommand(command)) {
      // eslint-disable-next-line no-console
      console.log(JSON.stringify({ permission: 'allow' }));
      return;
    }

    const { fingerprintPath, routingCompleteFlagPath } = defaultPaths();
    const ok = await isRoutingComplete({
      routingCompleteFlagPath,
      routingFingerprintPath: path.join(path.dirname(routingCompleteFlagPath), 'routing-fingerprint.json'),
      currentFingerprintPath: fingerprintPath,
    });

    if (ok) {
      // eslint-disable-next-line no-console
      console.log(JSON.stringify({ permission: 'allow' }));
      return;
    }

    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify({
        permission: 'deny',
        user_message:
          'Blocked until plugin routing completes (select installed plugins/skills/MCP before state-changing commands).',
        agent_message:
          'Run the `plugin-routing` skill. After documenting `## Plugin and capability use` in the plan, record routing completion via:\n\n`node ${CURSOR_PLUGIN_ROOT}/scripts/mark-routing-complete.mjs`\n\nThen retry the original command.',
      })
    );
  } catch {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ permission: 'allow' }));
  }
}

await main();

