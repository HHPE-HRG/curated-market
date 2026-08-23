import { createAccountStore } from './account-store.mjs';
import { createBindingStore } from './binding-store.mjs';
import { createLeaseManager } from './lease-manager.mjs';
import { createConsumerRegistry } from './consumer-registry.mjs';
import { createAccessCredentialService } from './access-credential.mjs';
import { createEncryptedVault } from './vault/encrypted-vault.mjs';
import { createKeyProviderFromEnv } from './vault/key-provider-factory.mjs';
import { selectAccountForNewWork, evaluateExistingBinding } from './policy/ordered-failover.mjs';
import { OutcomeClass } from '../../registry/providers/openai/outcomes.mjs';

/**
 * @param {NodeJS.ProcessEnv} [env]
 * @param {object} [overrides]
 */
export function createFunctionControl(env = process.env, overrides = {}) {
  const keyProvider = overrides.keyProvider || createKeyProviderFromEnv(env, overrides);
  const vault = overrides.vault || createEncryptedVault(keyProvider, env);
  const accountStore = overrides.accountStore || createAccountStore(env);
  const bindingStore = overrides.bindingStore || createBindingStore(env);
  const leaseManager = overrides.leaseManager || createLeaseManager(env);
  const consumers = overrides.consumers || createConsumerRegistry(env);
  const accessCredentials = overrides.accessCredentials || createAccessCredentialService({
    vault,
    accountStore,
    refreshFn: overrides.refreshFn,
  });

  async function ensureVault() {
    await vault.ensureReady();
  }

  /**
   * @param {import('./types.mjs').ResolveRequest & { fetchFn?: typeof fetch }} request
   */
  async function resolve(request) {
    await ensureVault();
    const {
      consumer_id,
      provider_family,
      capability,
      binding_key,
      scope = 'session',
      affinity = 'preferred',
      pin_account_id,
      fetchFn,
    } = request;

    const consumer = consumers.get(consumer_id);
    if (!consumer) {
      throw Object.assign(new Error(`Consumer ${consumer_id} not registered`), {
        code: 'CONSUMER_NOT_AUTHORIZED',
      });
    }

    const candidates = accountStore.listAccounts();
    const existing = bindingStore.getActive(binding_key);

    let accountId;
    let routeDecision;

    if (existing) {
      const evaluation = evaluateExistingBinding(existing, accountStore);
      if (evaluation.blocked) {
        throw Object.assign(new Error('Continuation blocked for bound account'), {
          code: 'CONTINUATION_BLOCKED',
          class: OutcomeClass.CONTINUATION_BLOCKED,
          account_id: evaluation.account_id,
        });
      }
      routeDecision = evaluation;
      if (!evaluation.selected_account_id) {
        throw Object.assign(new Error('Account temporarily unavailable'), {
          code: 'RETRY_AFTER',
          wait_until: evaluation.wait_until,
          retry_same_account: evaluation.retry_same_account,
        });
      }
      accountId = evaluation.selected_account_id;
    } else {
      const selection = selectAccountForNewWork({
        provider_family,
        capability,
        candidates,
        pin_account_id,
      }, accountStore);
      routeDecision = selection;
      if (!selection.selected_account_id) {
        throw Object.assign(new Error('Account temporarily unavailable'), {
          code: 'RETRY_AFTER',
          wait_until: selection.wait_until,
          retry_same_account: selection.retry_same_account,
        });
      }
      accountId = selection.selected_account_id;
      const authz = consumers.isAuthorized(consumer_id, accountId, provider_family);
      if (!authz.ok) {
        throw Object.assign(new Error(`Consumer not authorized for account: ${authz.reason}`), {
          code: 'CONSUMER_NOT_AUTHORIZED',
        });
      }
      bindingStore.upsert({
        binding_key,
        account_id: accountId,
        provider_family,
        capability,
        consumer_id,
        scope,
        affinity,
      });
    }

    const authz = consumers.isAuthorized(consumer_id, accountId, provider_family);
    if (!authz.ok) {
      throw Object.assign(new Error(`Consumer not authorized for account: ${authz.reason}`), {
        code: 'CONSUMER_NOT_AUTHORIZED',
      });
    }

    const priorLease = leaseManager.getActiveForBinding(binding_key);
    if (priorLease) {
      leaseManager.revoke(priorLease.lease_id, 'renew');
    }

    const authorizationLease = leaseManager.grant({
      binding_key,
      account_id: accountId,
      consumer_id,
    });

    accountStore.incrementLeaseCount(accountId, 1);

    const accessCredential = await accessCredentials.ensureAccessCredential(accountId, { fetchFn });

    const binding = bindingStore.getActive(binding_key);

    return {
      binding,
      authorization_lease: authorizationLease,
      access_credential: accessCredential,
      route_decision: routeDecision,
    };
  }

  /**
   * @param {string} leaseId
   * @param {object} outcome
   */
  async function report(leaseId, outcome) {
    await ensureVault();
    const lease = leaseManager.get(leaseId);
    if (!lease) {
      throw Object.assign(new Error(`Unknown lease ${leaseId}`), { code: 'LEASE_NOT_FOUND' });
    }
    accountStore.applyOutcome(lease.account_id, outcome);
    return { account_id: lease.account_id, applied: outcome.class };
  }

  /**
   * @param {object} input
   */
  async function release(input) {
    await ensureVault();
    if (input.lease_id) {
      const lease = leaseManager.get(input.lease_id);
      if (lease && !lease.revoked) {
        leaseManager.revoke(input.lease_id, 'release');
        accountStore.incrementLeaseCount(lease.account_id, -1);
      }
    }
    if (input.binding_key) {
      bindingStore.deactivate(input.binding_key);
      leaseManager.revokeAllForBinding(input.binding_key, 'release');
    }
    return { released: true };
  }

  /**
   * @param {object} input
   */
  async function rebind(input) {
    await ensureVault();
    const binding = bindingStore.getActive(input.binding_key);
    if (!binding) {
      throw Object.assign(new Error('No active binding'), { code: 'BINDING_NOT_FOUND' });
    }
    if (binding.affinity === 'required' && !input.force_restart) {
      throw Object.assign(new Error('Required binding requires force_restart'), {
        code: 'REBIND_FORBIDDEN',
      });
    }

    const candidates = accountStore.listAccounts();
    let newAccountId = input.new_account_id;
    if (!newAccountId) {
      const selection = selectAccountForNewWork({
        provider_family: binding.provider_family,
        capability: binding.capability,
        candidates,
        pin_account_id: input.pin_account_id,
      }, accountStore);
      if (!selection.selected_account_id) {
        throw Object.assign(new Error('No eligible account for rebind'), { code: 'NO_ELIGIBLE_ACCOUNT' });
      }
      newAccountId = selection.selected_account_id;
    }

    const authz = consumers.isAuthorized(binding.consumer_id, newAccountId, binding.provider_family);
    if (!authz.ok) {
      throw Object.assign(new Error(`Consumer not authorized: ${authz.reason}`), {
        code: 'CONSUMER_NOT_AUTHORIZED',
      });
    }

    leaseManager.revokeAllForBinding(input.binding_key, 'rebind');
    accountStore.incrementLeaseCount(binding.account_id, -1);
    bindingStore.rebind(input.binding_key, newAccountId);

    const authorizationLease = leaseManager.grant({
      binding_key: input.binding_key,
      account_id: newAccountId,
      consumer_id: binding.consumer_id,
    });
    accountStore.incrementLeaseCount(newAccountId, 1);

    const accessCredential = await accessCredentials.ensureAccessCredential(newAccountId, {
      fetchFn: input.fetchFn,
    });

    return {
      binding: bindingStore.getActive(input.binding_key),
      authorization_lease: authorizationLease,
      access_credential: accessCredential,
    };
  }

  /**
   * @param {string} accountId
   * @param {object} secret
   */
  async function registerAccountSecret(accountId, secret) {
    await ensureVault();
    await vault.setSecret(accountId, secret);
    accountStore.patchAccount(accountId, {
      access_expires_at: secret.access_expires_at
        ? new Date(secret.access_expires_at).toISOString()
        : null,
    });
  }

  return {
    vault,
    accountStore,
    bindingStore,
    leaseManager,
    resolve,
    report,
    release,
    rebind,
    registerAccountSecret,
  };
}
