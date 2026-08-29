/** Per-account refresh singleflight. */

const inflight = new Map();

/**
 * @param {string} accountId
 * @param {() => Promise<unknown>} fn
 */
export async function singleflightRefresh(accountId, fn) {
  const existing = inflight.get(accountId);
  if (existing) {
    return existing;
  }
  const promise = fn().finally(() => {
    inflight.delete(accountId);
  });
  inflight.set(accountId, promise);
  return promise;
}

/** Tests only. */
export function clearRefreshSingleflight() {
  inflight.clear();
}
