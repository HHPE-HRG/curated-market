/**
 * Ordered failover routing — Milestone 1.
 * Durable unavailable → failover allowed for new unpinned work.
 * Transient cooldown → retry same account; no spill.
 */

/**
 * @typedef {import('./types.mjs').RouteDecision} RouteDecision
 */

/**
 * @param {object} input
 * @param {import('./account-store.mjs').createAccountStore extends (...args: any) => infer R ? R : never} accountStore
 * @returns {RouteDecision}
 */
export function selectAccountForNewWork(input, accountStore) {
  const {
    provider_family,
    capability,
    candidates,
    pin_account_id,
  } = input;

  let pool = candidates.filter(
    (a) =>
      a.provider_family === provider_family &&
      a.capabilities.includes(capability) &&
      a.status === 'active',
  );

  if (pin_account_id) {
    const pinned = pool.find((a) => a.account_id === pin_account_id);
    if (!pinned) {
      throw Object.assign(new Error(`Account ${pin_account_id} not registered for provider`), {
        code: 'ACCOUNT_NOT_FOUND',
      });
    }
    if (!accountStore.isEligibleForNewWork(pin_account_id)) {
      if (accountStore.isTemporarilyUndispatchable(pin_account_id)) {
        const account = accountStore.getAccount(pin_account_id);
        return {
          selected_account_id: undefined,
          wait_until: account?.cooldown_until,
          retry_same_account: true,
          failover_allowed: false,
          reason: 'pinned_account_temporarily_unavailable',
        };
      }
      throw Object.assign(new Error(`Account ${pin_account_id} is not eligible`), {
        code: 'ACCOUNT_UNAVAILABLE',
      });
    }
    return {
      selected_account_id: pin_account_id,
      retry_same_account: false,
      failover_allowed: false,
      reason: 'pinned',
    };
  }

  const sorted = [...pool].sort((a, b) => a.priority - b.priority);

  for (const account of sorted) {
    if (accountStore.isDurableUnavailable(account.account_id)) {
      continue;
    }
    if (accountStore.isTemporarilyUndispatchable(account.account_id)) {
      const state = accountStore.getAccount(account.account_id);
      return {
        selected_account_id: undefined,
        wait_until: state?.cooldown_until,
        retry_same_account: true,
        failover_allowed: false,
        reason: 'priority_account_temporarily_unavailable',
      };
    }
    if (accountStore.isEligibleForNewWork(account.account_id)) {
      return {
        selected_account_id: account.account_id,
        retry_same_account: false,
        failover_allowed: true,
        reason: 'ordered_priority',
      };
    }
  }

  throw Object.assign(new Error('No eligible accounts for provider family'), {
    code: 'NO_ELIGIBLE_ACCOUNT',
  });
}

/**
 * @param {object} binding
 * @param {import('./account-store.mjs').createAccountStore extends (...args: any) => infer R ? R : never} accountStore
 * @returns {RouteDecision | { blocked: true, class: string }}
 */
export function evaluateExistingBinding(binding, accountStore) {
  const accountId = binding.account_id;
  if (binding.affinity === 'required') {
    if (accountStore.isDurableUnavailable(accountId)) {
      return { blocked: true, class: 'CONTINUATION_BLOCKED', account_id: accountId };
    }
    if (accountStore.isTemporarilyUndispatchable(accountId)) {
      const account = accountStore.getAccount(accountId);
      return {
        selected_account_id: accountId,
        wait_until: account?.cooldown_until,
        retry_same_account: true,
        failover_allowed: false,
        reason: 'required_binding_transient_wait',
      };
    }
    return {
      selected_account_id: accountId,
      retry_same_account: false,
      failover_allowed: false,
      reason: 'required_binding',
    };
  }

  if (accountStore.isEligibleForNewWork(accountId)) {
    return {
      selected_account_id: accountId,
      retry_same_account: false,
      failover_allowed: true,
      reason: 'preferred_binding',
    };
  }

  if (!accountStore.isDurableUnavailable(accountId) && accountStore.isTemporarilyUndispatchable(accountId)) {
    const account = accountStore.getAccount(accountId);
    return {
      selected_account_id: accountId,
      wait_until: account?.cooldown_until,
      retry_same_account: true,
      failover_allowed: false,
      reason: 'preferred_binding_transient',
    };
  }

  if (accountStore.isDurableUnavailable(accountId)) {
    return {
      selected_account_id: accountId,
      retry_same_account: false,
      failover_allowed: false,
      reason: 'preferred_binding_exhausted_sticky',
    };
  }

  return {
    selected_account_id: undefined,
    retry_same_account: false,
    failover_allowed: true,
    reason: 'preferred_binding_failover_eligible',
  };
}
