import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

function tokenizeTask(task) {
  return (task || '')
    .toLowerCase()
    .match(/[a-z0-9][a-z0-9_-]{1,}/gi)?.slice(0, 80) ?? [];
}

function extractPluginBlocksFromIndex(indexText) {
  const lines = indexText.split('\n');
  const blocks = [];

  let current = null;
  let buf = [];

  const flush = () => {
    if (!current) return;
    blocks.push({ pluginName: current, text: buf.join('\n') });
  };

  for (const line of lines) {
    const m = /^##\s+(.+)\s*$/.exec(line);
    if (m) {
      flush();
      current = m[1].trim();
      buf = [];
      continue;
    }
    if (current) buf.push(line);
  }
  flush();
  return blocks;
}

export function rankPluginCandidatesFromIndexText({ indexText, task, top = 5 }) {
  const blocks = extractPluginBlocksFromIndexIndexText(indexText);
  const tokens = tokenizeTask(task).filter((t) => t.length > 2);

  const scored = blocks.map((b) => {
    const text = b.text.toLowerCase();
    let score = 0;
    for (const t of tokens) {
      const re = new RegExp(`\\b${t.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}\\b`, 'g');
      const matches = text.match(re);
      if (matches) score += matches.length;
    }
    return { pluginName: b.pluginName, score };
  });

  scored.sort((a, b) => (b.score - a.score) || a.pluginName.localeCompare(b.pluginName));
  return scored.slice(0, top);
}

function extractPluginBlocksFromIndexIndexText(indexText) {
  return extractPluginBlocksFromIndex(indexText);
}

function defaultDerivedIndexPath() {
  const baseDir = path.join(os.homedir(), '.cursor', 'hhpe-hrg-plugin-stack');
  return path.join(baseDir, 'derived', 'plugin-index.md');
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

if (process.argv[1] && import.meta.url) {
  const invoked = path.resolve(process.argv[1]) === path.resolve(path.join(path.dirname(new URL(import.meta.url).pathname)));
  if (invoked) {
    const args = parseCliArgs(process.argv.slice(2));
    const indexPath = args.indexPath || defaultDerivedIndexPath();
    const task = args.task || '';
    const top = args.top ? Number(args.top) : 5;
    if (!task) throw new Error('Usage: --task "<prompt>"');
    const indexText = fs.readFileSync(indexPath, 'utf8');
    const ranked = rankPluginCandidatesFromIndexText({ indexText, task, top });
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ ranked }, null, 2));
  }
}

