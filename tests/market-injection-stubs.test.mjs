/**
 * Agent context: Injection stubs for Market MCP and output ingest. Intended:
 * frozen operations + no-op output. Observed: lookers must not treat output
 * as `$` input.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {MARKET_MCP_OPERATIONS, marketMcpContract} from '../lib/market-mcp-contract.mjs';
import {discoverSkillOutput} from '../lib/skill-output-hook.mjs';

test('Market MCP contract lists persist retrieve list and is frozen', () => {
  assert.deepEqual([...MARKET_MCP_OPERATIONS].sort(), ['list', 'persist', 'retrieve']);
  assert.ok(Object.isFrozen(MARKET_MCP_OPERATIONS));
  assert.equal(marketMcpContract.transport, 'unimplemented');
});

test('output hook is a documented no-op and does not scan a drop folder', () => {
  assert.deepEqual(discoverSkillOutput(), []);
});
