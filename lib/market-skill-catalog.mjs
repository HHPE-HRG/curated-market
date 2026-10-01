/**
 * Agent context: Single Market `$` catalog. Intended function: list type:skill
 * capabilities, unique by SKILL.md `name`, displayName prefixed only when
 * availability_host !== any. Observed: T3 looked at ~/.codex/skills and
 * .system. Lookers must call listMarketSkills, never host home walks.
 */
import fs from 'node:fs';
import path from 'node:path';
import {availabilityHostOf, ROOT} from './registry.mjs';

const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;
const HOST_LABEL = Object.freeze({
  any: null,
  codex: 'Codex',
  cursor: 'cursor',
  claude: 'claude',
  t3: 't3',
  openhands: 'openhands',
});

function readJsonYaml(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function parseScalar(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseSkillFrontmatter(contents) {
  const match = FRONTMATTER_PATTERN.exec(contents);
  if (!match) return {kind: 'missing'};
  const lines = (match[1] ?? '').split(/\r?\n/);
  let name = '';
  let description = '';
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    const nameMatch = /^name:\s*(.*)$/.exec(line);
    if (nameMatch) {
      name = parseScalar(nameMatch[1] ?? '');
      continue;
    }
    const descriptionMatch = /^description:\s*(.*)$/.exec(line);
    if (descriptionMatch) {
      const rest = parseScalar(descriptionMatch[1] ?? '');
      if (rest === '>' || rest === '|' || rest === '>-' || rest === '|-') {
        const folded = [];
        while (index + 1 < lines.length && /^\s+\S/.test(lines[index + 1] ?? '')) {
          index += 1;
          folded.push((lines[index] ?? '').trim());
        }
        description = folded.join(' ');
      } else {
        description = rest;
      }
    }
  }
  return {kind: 'parsed', ...(name ? {name} : {}), ...(description ? {description} : {})};
}

/** Agent: `$` label only. Skill YAML name stays unprefixed. */
export function skillDisplayName(name, availabilityHost) {
  const host = availabilityHost == null || availabilityHost === '' ? 'any' : availabilityHost;
  const label = HOST_LABEL[host];
  if (!label) return name;
  return `${label}:${name}`;
}

function manifestDir(root) {
  return path.join(root, 'registry/manifests');
}

function packageRootFor(root, pkg) {
  return path.join(root, pkg.package_root);
}

/**
 * Market input catalog for every T3 provider. Unique by YAML `name`.
 * Does not walk ~/.codex/skills, .system, or skill-pool.
 */
export function listMarketSkills(options = {}) {
  const root = options.root ?? ROOT;
  const manifests = manifestDir(root);
  const packages = readJsonYaml(path.join(manifests, 'packages.lock.yaml')).packages || [];
  const capabilities = readJsonYaml(path.join(manifests, 'capabilities.yaml')).capabilities || [];
  const byName = new Map();
  for (const capability of capabilities) {
    if (capability.type !== 'skill') continue;
    const pkg = packages.find((item) => item.package_id === capability.package_id);
    if (!pkg) continue;
    const skillPath = path.join(packageRootFor(root, pkg), capability.source_path, 'SKILL.md');
    let contents;
    try {
      contents = fs.readFileSync(skillPath, 'utf8');
    } catch {
      continue;
    }
    const frontmatter = parseSkillFrontmatter(contents);
    const name =
      (frontmatter.kind === 'parsed' ? frontmatter.name : undefined) ||
      capability.display_name ||
      path.basename(capability.source_path);
    if (!name || byName.has(name)) continue;
    const description =
      frontmatter.kind === 'parsed' && frontmatter.description ? frontmatter.description : undefined;
    const shortDescription = description
      ? description.split(/(?<=\.)\s/)[0].slice(0, 160)
      : name;
    const host = availabilityHostOf(capability);
    byName.set(name, {
      name,
      path: skillPath,
      enabled: true,
      displayName: skillDisplayName(name, host),
      shortDescription,
      availabilityHost: host,
      capabilityId: capability.capability_id,
      ...(description ? {description} : {}),
    });
  }
  return [...byName.values()].sort((left, right) => left.name.localeCompare(right.name));
}

/** Agent: T3 `$` typeahead. Prefix/include on name and labeled displayName. */
export function matchMarketSkillQuery(skills, query) {
  const needle = String(query || '').trim().toLowerCase();
  if (!needle) return [...skills];
  return skills.filter((skill) => {
    const name = String(skill.name || '').toLowerCase();
    const display = String(skill.displayName || skill.name || '').toLowerCase();
    return name.includes(needle) || display.includes(needle);
  });
}
