/**
 * Cursor provider-family continuation / account-affinity policy.
 *
 * Evidence (cursor-opencode-provider@0.6.3):
 * - Held-open Run stream with conversation_id + conversation checkpoints
 * - Agent URL memo keyed by token hash (account/token-specific region routing)
 * - Replay of conversation_state / checkpoints across turns
 *
 * This module describes policy only — it does not store Run IDs or framework state.
 *
 * @returns {{
 *   account_sensitive: true,
 *   binding_affinity_default: 'preferred',
 *   binding_affinity_for_active_continuation: 'required',
 *   migration_strategy: 'explicit_restart',
 *   silent_account_migration_allowed: false,
 *   evidence_notes: string[],
 * }}
 */
export function cursorContinuationPolicy() {
  return {
    account_sensitive: true,
    binding_affinity_default: 'preferred',
    binding_affinity_for_active_continuation: 'required',
    migration_strategy: 'explicit_restart',
    silent_account_migration_allowed: false,
    evidence_notes: [
      'Held-open AgentService/Run stream binds conversation_id and checkpoints to the authenticated account.',
      'Agent URL resolution is memoized per access-token hash; region routing is account/token-specific.',
      'Cross-turn history is prior conversation_state/checkpoint bytes — not portable across accounts.',
    ],
  };
}
