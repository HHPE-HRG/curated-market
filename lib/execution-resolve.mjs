/**
 * Read-only Execution Resolver — composes Behavior + Function projections.
 * Owns no durable authority/state.
 */

import crypto from 'node:crypto';
import { createBehaviorControl } from './behavior-projection.mjs';
import { createFunctionControl } from './function-control/index.mjs';
import { bindingKeyForSession, bindingKeyForContinuation } from './function-control/opencode/binding-keys.mjs';

/**
 * Strip secrets for logs/status serialization.
 *
 * @param {object} ctx
 */
export function serializeExecutionContext(ctx) {
  const clone = structuredClone(ctx);
  const cred = clone?.function_projection?.access_credential;
  if (cred && typeof cred === 'object' && 'token' in cred) {
    cred.token = '[REDACTED]';
  }
  if (clone?.runtime?.access_credential?.token) {
    clone.runtime.access_credential.token = '[REDACTED]';
  }
  return clone;
}

/**
 * @param {object} [options]
 * @param {ReturnType<typeof createFunctionControl>} [options.functionControl]
 * @param {ReturnType<typeof createBehaviorControl>} [options.behaviorControl]
 * @param {(parts: object) => void} [options.validateComposition]
 * @param {NodeJS.ProcessEnv} [options.env]
 */
export function createExecutionResolver(options = {}) {
  const functionControl = options.functionControl || createFunctionControl(options.env);
  const behaviorControl = options.behaviorControl || createBehaviorControl();
  const validateComposition = options.validateComposition;

  /**
   * @param {object} request
   */
  async function resolve(request) {
    const executionId = request.execution_id || `exec_${crypto.randomBytes(8).toString('hex')}`;
    const consumerId = request.consumer_id;
    if (!consumerId) {
      const err = new Error('consumer_id required');
      err.code = 'EXECUTION_RESOLVE_INVALID';
      throw err;
    }

    const behaviorReq = request.behavior || {};
    // Behavior artifacts must never supply physical account pins.
    const ignoredBehaviorPin = behaviorReq.pin_account_id;
    void ignoredBehaviorPin;

    let behaviorProjection;
    try {
      behaviorProjection = behaviorControl.resolve({
        profile_id: behaviorReq.profile_id,
        capability_ids: behaviorReq.capability_ids,
        include_startup_layers: behaviorReq.include_startup_layers ?? true,
        include_policy_slice: behaviorReq.include_policy_slice ?? true,
        requires_function: behaviorReq.requires_function,
      });
    } catch (err) {
      err.code = err.code || 'BEHAVIOR_RESOLVE_FAILED';
      throw err;
    }

    const requiresFunction =
      behaviorProjection.requires_function ||
      request.execution_request?.function_requirement ||
      null;

    /** @type {object | undefined} */
    let functionProjection;
    let leaseId;

    if (requiresFunction) {
      const sessionId = request.session_id || executionId;
      const continuationId = request.continuation_id;
      const bindingKey = continuationId
        ? bindingKeyForContinuation(sessionId, continuationId)
        : bindingKeyForSession(sessionId);

      // Only higher-authority execution_request may request a pin.
      const pinAccountId = request.execution_request?.pin_account_id;

      try {
        const fn = await functionControl.resolve({
          consumer_id: consumerId,
          provider_family: requiresFunction.provider_family,
          capability: requiresFunction.capability,
          binding_key: bindingKey,
          scope: request.scope || (continuationId ? 'continuation' : 'session'),
          affinity: request.affinity || (continuationId ? 'required' : 'preferred'),
          pin_account_id: pinAccountId,
        });

        // Strip any accidental refresh material.
        const access = { ...fn.access_credential };
        delete access.refresh_credential;
        delete access.refresh;
        delete access.refresh_token;
        delete access.refreshToken;

        functionProjection = {
          binding: fn.binding,
          authorization_lease: fn.authorization_lease,
          access_credential: access,
          route_decision: undefined,
        };
        leaseId = fn.authorization_lease?.lease_id;
      } catch (err) {
        if (!err.code) err.code = 'FUNCTION_RESOLVE_FAILED';
        throw err;
      }
    }

    const parts = {
      identity: {
        execution_id: executionId,
        consumer_id: consumerId,
        session_id: request.session_id,
        continuation_id: request.continuation_id,
      },
      behavior_projection: behaviorProjection,
      function_projection: functionProjection,
      capability_projection: {
        capability_bundle_id: behaviorProjection.behavior_bundle_id,
        skills: behaviorProjection.skills,
        plugins: behaviorProjection.plugins,
      },
      policy_projection: behaviorProjection.policy_projection,
    };

    try {
      if (typeof validateComposition === 'function') {
        validateComposition(parts);
      }
    } catch (err) {
      if (leaseId) {
        await functionControl.release({ lease_id: leaseId });
      }
      if (!err.code) err.code = 'EXECUTION_COMPOSITION_FAILED';
      throw err;
    }

    const observability = {
      execution_id: executionId,
      consumer_id: consumerId,
      session_id: request.session_id,
      continuation_id: request.continuation_id,
      binding_key: functionProjection?.binding?.binding_key,
      behavior_bundle_id: behaviorProjection.behavior_bundle_id,
      capability_bundle_id: parts.capability_projection.capability_bundle_id,
      provider_family: functionProjection?.binding?.provider_family || requiresFunction?.provider_family,
      account_id: functionProjection?.binding?.account_id,
      authorization_lease_id: functionProjection?.authorization_lease?.lease_id,
      trace_id: request.trace_id,
    };

    return {
      identity: parts.identity,
      behavior_projection: behaviorProjection,
      function_projection: functionProjection,
      capability_projection: parts.capability_projection,
      policy_projection: parts.policy_projection,
      observability_context: observability,
      // In-memory runtime seam for secret-bearing credential; prefer this over logging ctx.
      runtime: functionProjection
        ? { access_credential: functionProjection.access_credential }
        : undefined,
    };
  }

  return { resolve, serializeExecutionContext };
}
