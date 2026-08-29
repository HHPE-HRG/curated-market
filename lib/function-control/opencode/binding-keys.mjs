/**
 * OpenCode binding-key realization — framework identity for Function Control.
 * Keys are deterministic and must never encode physical account IDs.
 */

/**
 * @param {string} sessionId
 * @returns {string}
 */
export function bindingKeyForSession(sessionId) {
  if (!sessionId || typeof sessionId !== 'string') {
    throw new Error('sessionId required');
  }
  return `opencode:${sessionId}`;
}

/**
 * @param {string} sessionId
 * @param {string} continuationId
 * @returns {string}
 */
export function bindingKeyForContinuation(sessionId, continuationId) {
  if (!sessionId || !continuationId) {
    throw new Error('sessionId and continuationId required');
  }
  return `opencode:${sessionId}:${continuationId}`;
}
