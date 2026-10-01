/**
 * Agent context: Future Caveman-like Market MCP. Intended: persist/retrieve/list
 * use Market identity only. Observed: hosts kept private live trees. This
 * module is a contract, not an HTTP server.
 */
export const MARKET_MCP_OPERATIONS = Object.freeze(['list', 'persist', 'retrieve']);

export const marketMcpContract = Object.freeze({
  operations: MARKET_MCP_OPERATIONS,
  identity: 'capability_id plus SKILL.md name',
  transport: 'unimplemented',
});
