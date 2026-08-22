import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {markRoutingComplete} from './plugin-description-index.mjs';

function defaultPaths() {
  const home = os.homedir();
  const baseDir = path.join(home, '.cursor', 'hhpe-hrg-plugin-stack');
  const derivedDir = path.join(baseDir, 'derived');
  const fingerprintPath = path.join(derivedDir, '.fingerprint');
  const stateDir = path.join(baseDir, 'state');
  const routingCompleteFlagPath = path.join(stateDir, 'routing-complete.json');
  return { fingerprintPath, routingCompleteFlagPath, stateDir };
}

function parseCliArgs(argv) {
  const args = {};
  const rest = [...argv];
  while (rest.length) {
    const token = rest.shift();
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = rest[0];
    if (next && !next.startsWith('--')) args[key] = rest.shift();
    else args[key] = true;
  }
  return args;
}

async function main() {
  const args = parseCliArgs(process.argv.slice(2));
  const sessionId = typeof args.context === 'string' && args.context ? args.context : null;
  if (!sessionId) {
    process.stderr.write('mark-routing-complete: --context <sessionId> is required\n');
    process.exitCode = 1;
    return;
  }

  const { fingerprintPath, routingCompleteFlagPath, stateDir } = defaultPaths();
  fs.mkdirSync(stateDir, { recursive: true });

  await markRoutingComplete({ fingerprintPath, routingCompleteFlagPath, stateDir, sessionId });

  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ ok: true, session_id: sessionId }));
}

await main();
