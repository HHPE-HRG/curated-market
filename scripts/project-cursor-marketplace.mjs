#!/usr/bin/env node
import {projectCursorMarketplace, validateCursorMarketplace} from '../lib/cursor-marketplace.mjs';

const cmd = process.argv[2] || 'project';
if (cmd === 'validate') {
  const result = validateCursorMarketplace();
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.status === 'PASS' ? 0 : 1);
}

const projected = projectCursorMarketplace();
const result = validateCursorMarketplace();
console.log(JSON.stringify({projected, validate: result}, null, 2));
process.exit(result.status === 'PASS' ? 0 : 1);
