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
  return { fingerprintPath, routingCompleteFlagPath };
}

async function main() {
  const { fingerprintPath, routingCompleteFlagPath } = defaultPaths();
  fs.mkdirSync(path.dirname(routingCompleteFlagPath), { recursive: true });

  await markRoutingComplete({ fingerprintPath, routingCompleteFlagPath });

  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ ok: true }));
}

await main();

