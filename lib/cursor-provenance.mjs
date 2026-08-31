import path from 'node:path';

/** True when candidate is base or a path under base (separator-bounded). */
function underRoot(base, candidate) {
  if (!base) return false;
  const root = path.resolve(base);
  const resolved = path.resolve(candidate);
  return resolved === root || resolved.startsWith(root + path.sep);
}

export function classifyCursorSkillLink({name, target, bindings, registryRoots, poolRoot, inactive = new Set()}) {
  const real = String(target || '');
  const bound = (bindings || []).some(b => b.cursor_visible_name === name || (b.target || '').endsWith('/' + name));
  if ((inactive instanceof Set) && (inactive.has(name) || inactive.has(`superpowers/${name}`))) {
    return 'explicitly unsupported or retired';
  }
  if (bound && registryRoots.some(root => underRoot(root, real))) return 'registry-owned projection';
  if (/\/\.cursor\/plugins\/cache\//.test(real) && !bound) return 'native Cursor realization';
  if (poolRoot && underRoot(poolRoot, real)) return 'unmanaged-foreign';
  return 'unmanaged-foreign';
}
