import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {generatePluginDescriptionIndex} from '../scripts/plugin-description-index.mjs';

function defaultPaths() {
  const home = os.homedir();
  const baseDir = path.join(home, '.cursor', 'hhpe-hrg-plugin-stack');
  const derivedDir = path.join(baseDir, 'derived');
  const outputIndexPath = path.join(derivedDir, 'plugin-index.md');
  const fingerprintPath = path.join(derivedDir, '.fingerprint');
  const stateDir = path.join(baseDir, 'state');
  return { outputIndexPath, fingerprintPath, stateDir };
}

async function main() {
  const { outputIndexPath, fingerprintPath } = defaultPaths();
  fs.mkdirSync(path.dirname(outputIndexPath), { recursive: true });

  const home = os.homedir();
  const pluginSearchRoots = [
    path.join(home, '.cursor', 'plugins', 'local'),
    path.join(home, '.cursor', 'plugins', 'cache'),
  ].filter((p) => fs.existsSync(p));

  try {
    await generatePluginDescriptionIndex({
      pluginSearchRoots,
      outputIndexPath,
      fingerprintPath,
    });
  } catch {
    // Best-effort index refresh; routing can still proceed via agent reads.
  }

  // Hook protocol: return JSON on stdout.
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({}));
}

await main();

