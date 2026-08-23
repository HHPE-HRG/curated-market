#!/usr/bin/env node
import { importAuthJsonAccount } from './import-auth.mjs';

const from = process.argv.includes('--from') ? process.argv[process.argv.indexOf('--from') + 1] : null;
const account = process.argv.includes('--account') ? process.argv[process.argv.indexOf('--account') + 1] : null;

if (!from || !account) {
  console.error('usage: import-cli.mjs --from <auth.json> --account <account_id>');
  process.exit(1);
}

importAuthJsonAccount(from, account).then((r) => {
  console.log(JSON.stringify(r, null, 2));
}).catch((err) => {
  console.error(`ERROR: ${err.message}`);
  process.exit(1);
});
