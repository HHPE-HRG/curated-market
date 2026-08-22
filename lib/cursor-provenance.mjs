export function classifyCursorSkillLink({name, target, bindings, registryRoots, poolRoot, inactive = new Set()}) {
  const real = String(target || '');
  const bound = (bindings || []).some(b => b.cursor_visible_name === name || (b.target || '').endsWith('/' + name));
  if ((inactive instanceof Set) && (inactive.has(name) || inactive.has(`superpowers/${name}`))) {
    return 'explicitly unsupported or retired';
  }
  if (bound && registryRoots.some(root => real.startsWith(root))) return 'registry-owned projection';
  if (/\/\.cursor\/plugins\/cache\//.test(real) && !bound) return 'native Cursor realization';
  if (poolRoot && real.startsWith(poolRoot)) return 'unmanaged-foreign';
  return 'unmanaged-foreign';
}
