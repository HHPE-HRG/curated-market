/**
 * @typedef {'session' | 'continuation'} BindingScope
 */

/**
 * @typedef {'preferred' | 'required'} BindingAffinity
 */

/**
 * @typedef {'active' | 'disabled' | 'revoked'} AccountStatus
 */

/**
 * @typedef {'healthy' | 'degraded' | 'auth_failed' | 'exhausted'} AccountHealth
 */

/**
 * @typedef {'unknown' | 'available' | 'exhausted'} QuotaState
 */

/**
 * @typedef {Object} AccountBinding
 * @property {string} binding_key
 * @property {string} account_id
 * @property {string} provider_family
 * @property {string} capability
 * @property {string} consumer_id
 * @property {BindingScope} scope
 * @property {BindingAffinity} affinity
 * @property {boolean} active
 * @property {string} bound_at
 * @property {string} [expires_at]
 */

/**
 * @typedef {Object} AuthorizationLease
 * @property {string} lease_id
 * @property {string} binding_key
 * @property {string} account_id
 * @property {string} consumer_id
 * @property {string} granted_at
 * @property {string} expires_at
 * @property {boolean} revoked
 * @property {string} [revoke_reason]
 */

/**
 * @typedef {Object} AccessCredentialProjection
 * @property {string} credential_id
 * @property {string} account_id
 * @property {'bearer' | 'api_key'} kind
 * @property {string} token
 * @property {string} provider_expires_at
 * @property {string} issued_at
 */

/**
 * @typedef {Object} RouteDecision
 * @property {string} [selected_account_id]
 * @property {string} [wait_until]
 * @property {boolean} retry_same_account
 * @property {boolean} failover_allowed
 * @property {string} reason
 */

/**
 * @typedef {Object} ResolveRequest
 * @property {string} consumer_id
 * @property {string} provider_family
 * @property {string} capability
 * @property {string} binding_key
 * @property {BindingScope} [scope]
 * @property {BindingAffinity} [affinity]
 * @property {string} [pin_account_id]
 */

/**
 * @typedef {Object} ResolveResult
 * @property {AccountBinding} binding
 * @property {AuthorizationLease} authorization_lease
 * @property {AccessCredentialProjection} access_credential
 * @property {RouteDecision} [route_decision]
 */

export {};
