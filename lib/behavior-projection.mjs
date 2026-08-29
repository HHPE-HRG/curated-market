/**
 * Bounded Behavior Control projection for execution composition.
 * Read-only; does not mutate catalogs or grant Function account access.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const DEFAULT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * @param {string} root
 * @param {string} name
 */
function readManifest(root, name) {
  const file = path.join(root, 'registry/manifests', name);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

/**
 * @param {object} input
 * @returns {string}
 */
function digestProjection(input) {
  const canonical = JSON.stringify(input);
  return `bb_${crypto.createHash('sha256').update(canonical).digest('hex').slice(0, 24)}`;
}

/**
 * Resolve a bounded BehaviorProjection from catalog manifests.
 *
 * @param {object} options
 * @param {string} [options.manifestRoot]
 * @param {string} [options.profile_id]
 * @param {string[]} [options.capability_ids]
 * @param {boolean} [options.include_startup_layers]
 * @param {boolean} [options.include_policy_slice]
 * @param {{ provider_family: string, capability: string }} [options.requires_function]
 */
export function resolveBehaviorProjection(options = {}) {
  const root = options.manifestRoot || DEFAULT_ROOT;
  const capabilityIds = [...new Set(options.capability_ids || [])].sort();
  if (capabilityIds.length === 0) {
    const err = new Error('capability_ids required for Behavior projection');
    err.code = 'BEHAVIOR_CAPABILITY_UNRESOLVED';
    throw err;
  }

  const capabilities = readManifest(root, 'capabilities.yaml').capabilities;
  const packages = readManifest(root, 'packages.lock.yaml').packages;
  const finalStack = fs.existsSync(path.join(root, 'registry/manifests/final-stack.yaml'))
    ? readManifest(root, 'final-stack.yaml')
    : null;

  const byId = new Map(capabilities.map((c) => [c.capability_id, c]));
  const pkgById = new Map(packages.map((p) => [p.package_id, p]));

  const skills = [];
  const plugins = [];
  for (const id of capabilityIds) {
    const cap = byId.get(id);
    if (!cap) {
      const err = new Error(`Behavior capability unresolved: ${id}`);
      err.code = 'BEHAVIOR_CAPABILITY_UNRESOLVED';
      err.capability_id = id;
      throw err;
    }
    const pkg = pkgById.get(cap.package_id);
    const resolvedPath = pkg
      ? path.join(root, pkg.package_root, cap.source_path)
      : undefined;
    const entry = {
      capability_id: cap.capability_id,
      package_id: cap.package_id,
      type: cap.type,
      commit: pkg?.revision?.value,
      resolved_path: resolvedPath,
    };
    if (cap.type === 'skill') skills.push(entry);
    else plugins.push(entry);
  }

  /** @type {object} */
  const projection = {
    projection_id: `bp_${crypto.randomBytes(6).toString('hex')}`,
    profile_id: options.profile_id || 'default',
    skills,
    plugins,
    provenance: {
      manifests: [
        'registry/manifests/capabilities.yaml',
        'registry/manifests/packages.lock.yaml',
      ],
      package_lock_digest: digestProjection(
        packages.map((p) => ({ id: p.package_id, rev: p.revision?.value })),
      ),
    },
  };

  if (options.requires_function) {
    projection.requires_function = {
      provider_family: options.requires_function.provider_family,
      capability: options.requires_function.capability,
    };
  }

  if (options.include_startup_layers && finalStack) {
    projection.startup_layers = [...(finalStack.startup_layers || [])];
    projection.provenance.manifests.push('registry/manifests/final-stack.yaml');
  }

  if (options.include_policy_slice && finalStack) {
    projection.policy_projection = {
      lifecycle_owner: finalStack.lifecycle_owner,
      specialists_are_task_triggered: finalStack.specialists_are_task_triggered,
      session_start: finalStack.session_start,
    };
    if (!projection.provenance.manifests.includes('registry/manifests/final-stack.yaml')) {
      projection.provenance.manifests.push('registry/manifests/final-stack.yaml');
    }
  }

  // Stable digest over catalog-bound fields (exclude ephemeral projection_id).
  const digestBody = {
    profile_id: projection.profile_id,
    skills: skills.map((s) => ({
      capability_id: s.capability_id,
      package_id: s.package_id,
      commit: s.commit,
    })),
    plugins: plugins.map((p) => ({
      capability_id: p.capability_id,
      package_id: p.package_id,
      commit: p.commit,
    })),
    startup_layers: projection.startup_layers || null,
    policy_projection: projection.policy_projection || null,
    requires_function: projection.requires_function || null,
    package_lock_digest: projection.provenance.package_lock_digest,
  };
  projection.behavior_bundle_id = digestProjection(digestBody);

  return projection;
}

/**
 * @param {{ manifestRoot?: string }} [options]
 */
export function createBehaviorControl(options = {}) {
  const manifestRoot = options.manifestRoot || DEFAULT_ROOT;
  return {
    /**
     * @param {object} request
     */
    resolve(request = {}) {
      return resolveBehaviorProjection({
        manifestRoot,
        profile_id: request.profile_id,
        capability_ids: request.capability_ids,
        include_startup_layers: request.include_startup_layers ?? true,
        include_policy_slice: request.include_policy_slice ?? true,
        requires_function: request.requires_function,
      });
    },
  };
}
