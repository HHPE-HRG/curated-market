import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function exists(filePath) {
  try {
    fs.lstatSync(filePath);
    return true;
  } catch {
    return false;
  }
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function writeText(filePath, text) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, text, 'utf8');
}

function readJson(filePath) {
  return JSON.parse(readText(filePath));
}

function stableStringify(value) {
  return JSON.stringify(value);
}

function parseFrontmatter(markdown) {
  if (!markdown.startsWith('---')) return { frontmatter: null, fields: {} };
  const end = markdown.indexOf('\n---', 3);
  if (end === -1) return { frontmatter: null, fields: {} };
  const frontmatterRaw = markdown.slice(3, end).trim();
  const fields = {};

  for (const line of frontmatterRaw.split('\n')) {
    const m = /^([A-Za-z0-9_-]+):\s*(.*)\s*$/.exec(line);
    if (!m) continue;
    const key = m[1];
    let raw = m[2] ?? '';
    if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
      raw = raw.slice(1, -1);
    }
    if (raw === 'true') fields[key] = true;
    else if (raw === 'false') fields[key] = false;
    else fields[key] = raw;
  }

  return { frontmatter: frontmatterRaw, fields };
}

function parseRuleMdcDescription(mdcText) {
  const { fields } = parseFrontmatter(mdcText);
  const description = typeof fields.description === 'string' ? fields.description : null;
  const alwaysApply = fields.alwaysApply === true;
  return { description, alwaysApply };
}

function parseSkillFrontmatter(SKILLText) {
  const { fields } = parseFrontmatter(SKILLText);
  const name = typeof fields.name === 'string' ? fields.name : null;
  const description = typeof fields.description === 'string' ? fields.description : null;
  return { name, description };
}

function parseNamedDescriptionFrontmatter(markdown) {
  const { fields } = parseFrontmatter(markdown);
  const name = typeof fields.name === 'string' ? fields.name : null;
  const description = typeof fields.description === 'string' ? fields.description : null;
  return { name, description };
}

function extractSelectionBullets(markdown, headerLabel) {
  const headerLineRe = new RegExp(`^${headerLabel}:\\s*$`, 'im');
  const lines = markdown.split('\n');
  const startIdx = lines.findIndex((l) => headerLineRe.test(l.trim()));
  if (startIdx === -1) return [];

  const bullets = [];
  for (let i = startIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) break;
    if (/^#{1,3}\s+/.test(line)) break;
    if (/^(Use when|Do not use when):\s*$/i.test(line.trim())) break;

    const m = /^[-*]\s+(.*)$/.exec(line.trim());
    if (!m) break;
    bullets.push(m[1].trim());
  }

  return bullets;
}

function detectPluginRootCandidates(pluginSearchRoots, maxPluginRoots) {
  const roots = new Set();

  const shouldSkipDir = (dirName) => {
    if (dirName === 'node_modules') return true;
    if (dirName === '.git') return true;
    return false;
  };

  const visit = (dirPath, depth) => {
    if (maxPluginRoots && roots.size >= maxPluginRoots) return;
    if (depth > 10) return;
    let entries;
    try {
      entries = fs.readdirSync(dirPath, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (shouldSkipDir(entry.name)) continue;

        const childPath = path.join(dirPath, entry.name);

        if (entry.name === '.cursor-plugin') {
          const pluginJsonPath = path.join(childPath, 'plugin.json');
          if (exists(pluginJsonPath)) {
            roots.add(path.dirname(childPath));
            continue;
          }
        }

        visit(childPath, depth + 1);
      } else if (entry.isFile() && entry.name === 'plugin.yaml') {
        roots.add(path.dirname(path.join(dirPath, entry.name)));
      }
    }
  };

  for (const searchRoot of pluginSearchRoots) {
    visit(searchRoot, 0);
    if (maxPluginRoots && roots.size >= maxPluginRoots) break;
  }

  return [...roots].sort();
}

function findFilesRecursive(dirPath, filePredicate, maxDepth = 6) {
  const results = [];
  const visit = (d, depth) => {
    if (depth > maxDepth) return;
    let entries;
    try {
      entries = fs.readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) visit(p, depth + 1);
      else if (e.isFile() && filePredicate(p, e)) results.push(p);
    }
  };
  visit(dirPath, 0);
  return results.sort();
}

export async function generatePluginDescriptionIndex({
  pluginSearchRoots,
  outputIndexPath,
  fingerprintPath,
  maxPluginRoots = null,
}) {
  const warnings = [];
  if (!Array.isArray(pluginSearchRoots) || pluginSearchRoots.length === 0) {
    throw new Error('pluginSearchRoots must be a non-empty array');
  }

  const pluginRoots = detectPluginRootCandidates(pluginSearchRoots, maxPluginRoots ?? undefined);
  const plugins = [];

  for (const pluginRoot of pluginRoots) {
    const pluginJsonPath = path.join(pluginRoot, '.cursor-plugin', 'plugin.json');
    const hasPluginJson = exists(pluginJsonPath);

    let pluginName = path.basename(pluginRoot);
    let pluginDescription = null;
    let pluginVersion = null;
    let skillsDir = null;
    let rulesDir = null;
    let hooksJsonPath = null;
    let mcpJsonPath = null;
    let agentsDir = null;
    let commandsDir = null;

    if (hasPluginJson) {
      let pluginJson;
      try {
        pluginJson = readJson(pluginJsonPath);
      } catch (e) {
        warnings.push(`Malformed plugin.json at ${pluginJsonPath}: ${e?.message || 'parse error'}`);
        continue;
      }

      if (typeof pluginJson.name === 'string' && pluginJson.name.trim()) pluginName = pluginJson.name;
      if (typeof pluginJson.description === 'string') pluginDescription = pluginJson.description;
      else warnings.push(`Missing or invalid plugin description for ${pluginName} (${pluginJsonPath})`);
      if (typeof pluginJson.version === 'string') pluginVersion = pluginJson.version;

      if (typeof pluginJson.skills === 'string') skillsDir = path.join(pluginRoot, pluginJson.skills);
      if (typeof pluginJson.rules === 'string') rulesDir = path.join(pluginRoot, pluginJson.rules);
      if (typeof pluginJson.hooks === 'string') hooksJsonPath = path.join(pluginRoot, pluginJson.hooks);
      if (typeof pluginJson.mcpServers === 'string') mcpJsonPath = path.join(pluginRoot, pluginJson.mcpServers);
      if (typeof pluginJson.agents === 'string') agentsDir = path.join(pluginRoot, pluginJson.agents);
      if (typeof pluginJson.commands === 'string') commandsDir = path.join(pluginRoot, pluginJson.commands);
    } else {
      // Best-effort YAML manifest parse (no dependency).
      const pluginYamlPath = path.join(pluginRoot, 'plugin.yaml');
      if (!exists(pluginYamlPath)) {
        warnings.push(`Missing plugin manifest for candidate root ${pluginRoot}`);
        continue;
      }
      const yaml = readText(pluginYamlPath);
      const nameMatch = /^name:\s*(.+)\s*$/m.exec(yaml);
      const descMatch = /^description:\s*(.+)\s*$/m.exec(yaml);
      const versionMatch = /^version:\s*(.+)\s*$/m.exec(yaml);
      if (nameMatch) pluginName = nameMatch[1].trim();
      if (descMatch) pluginDescription = descMatch[1].trim();
      else warnings.push(`Missing plugin description in plugin.yaml for ${pluginName} (${pluginYamlPath})`);
      if (versionMatch) pluginVersion = versionMatch[1].trim();
    }

    const skills = [];
    const rules = [];
    const hooks = [];
    const mcpServers = [];
    const agents = [];
    const commands = [];

    const resolvedSkillsDir = skillsDir && exists(skillsDir) ? skillsDir : path.join(pluginRoot, 'skills');
    if (exists(resolvedSkillsDir)) {
      const skillFiles = findFilesRecursive(
        resolvedSkillsDir,
        (filePath, entry) => entry.isFile && entry.name === 'SKILL.md',
        5
      );
      for (const skillFile of skillFiles) {
        const text = readText(skillFile);
        const { name, description } = parseSkillFrontmatter(text);
        const finalName = name || path.basename(path.dirname(skillFile));
        if (!name) warnings.push(`Missing skill name frontmatter in ${skillFile}`);
        if (!description) warnings.push(`Missing skill description frontmatter in ${skillFile}`);
        const useWhen = extractSelectionBullets(text, 'Use when');
        const doNotUseWhen = extractSelectionBullets(text, 'Do not use when');
        skills.push({ name: finalName, description: description || '', useWhen, doNotUseWhen });
      }
    }

    const resolvedRulesDirCandidates = [
      rulesDir,
      path.join(pluginRoot, '.cursor', 'rules'),
      path.join(pluginRoot, 'rules'),
    ].filter(Boolean);
    const resolvedRulesDir = resolvedRulesDirCandidates.find((d) => d && exists(d)) ?? null;
    if (resolvedRulesDir) {
      const ruleFiles = findFilesRecursive(
        resolvedRulesDir,
        (filePath, entry) => entry.isFile && filePath.endsWith('.mdc'),
        4
      );
      for (const ruleFile of ruleFiles) {
        const text = readText(ruleFile);
        const { description, alwaysApply } = parseRuleMdcDescription(text);
        if (!description) warnings.push(`Missing rule description frontmatter in ${ruleFile}`);
        rules.push({
          name: path.basename(ruleFile, '.mdc'),
          description: description || '',
          alwaysApply: Boolean(alwaysApply),
        });
      }
    }

    if (hooksJsonPath && exists(hooksJsonPath)) {
      try {
        const hooksJson = readJson(hooksJsonPath);
        if (hooksJson?.hooks && typeof hooksJson.hooks === 'object') {
          for (const eventName of Object.keys(hooksJson.hooks).sort()) hooks.push({ eventName });
        }
      } catch (e) {
        warnings.push(`Malformed hooks.json for ${pluginName} (${hooksJsonPath}): ${e?.message || 'parse error'}`);
      }
    }

    const resolvedMcpJson = (mcpJsonPath && exists(mcpJsonPath)) ? mcpJsonPath : exists(path.join(pluginRoot, 'mcp.json')) ? path.join(pluginRoot, 'mcp.json') : null;
    if (resolvedMcpJson) {
      try {
        const mcp = readJson(resolvedMcpJson);
        const map = mcp?.mcpServers && typeof mcp.mcpServers === 'object' ? mcp.mcpServers : null;
        if (map) {
          for (const serverKey of Object.keys(map).sort()) {
            const server = map[serverKey] || {};
            const url = typeof server.url === 'string' ? server.url : '';
            mcpServers.push({ serverKey, url });
          }
        }
      } catch (e) {
        warnings.push(`Malformed MCP config for ${pluginName} (${resolvedMcpJson}): ${e?.message || 'parse error'}`);
      }
    }

    const resolvedAgentsDirCandidates = [
      agentsDir,
      path.join(pluginRoot, 'agents'),
      path.join(pluginRoot, '.agents'),
    ].filter(Boolean);
    const resolvedAgentsDir = resolvedAgentsDirCandidates.find((d) => d && exists(d)) ?? null;
    if (resolvedAgentsDir) {
      const agentFiles = findFilesRecursive(
        resolvedAgentsDir,
        (filePath, entry) => entry.isFile && filePath.endsWith('.md'),
        4
      );
      for (const agentFile of agentFiles) {
        const text = readText(agentFile);
        if (!text.startsWith('---')) continue;
        const { name, description } = parseNamedDescriptionFrontmatter(text);
        if (!name || !description) continue;
        agents.push({ name, description });
      }
    }

    const resolvedCommandsDirCandidates = [
      commandsDir,
      path.join(pluginRoot, 'commands'),
    ].filter(Boolean);
    const resolvedCommandsDir = resolvedCommandsDirCandidates.find((d) => d && exists(d)) ?? null;
    if (resolvedCommandsDir) {
      const commandFiles = findFilesRecursive(
        resolvedCommandsDir,
        (filePath, entry) =>
          entry.isFile && (filePath.endsWith('.md') || filePath.endsWith('.txt')),
        4
      );
      for (const commandFile of commandFiles) {
        const text = readText(commandFile);
        if (!text.startsWith('---')) continue;
        const { name, description } = parseNamedDescriptionFrontmatter(text);
        if (!name || !description) continue;
        commands.push({ name, description });
      }
    }

    plugins.push({
      pluginName,
      pluginDescription: pluginDescription ?? '',
      pluginVersion,
      skills: skills.sort((a, b) => a.name.localeCompare(b.name)),
      rules: rules.sort((a, b) => a.name.localeCompare(b.name)),
      hooks: hooks.sort((a, b) => a.eventName.localeCompare(b.eventName)),
      mcpServers: mcpServers.sort((a, b) => a.serverKey.localeCompare(b.serverKey)),
      agents: agents.sort((a, b) => a.name.localeCompare(b.name)),
      commands: commands.sort((a, b) => a.name.localeCompare(b.name)),
      // For deterministic output, include a stable relative path if possible.
      sourceRoot: pluginRoot,
    });
  }

  plugins.sort((a, b) => a.pluginName.localeCompare(b.pluginName));

  const fingerprintSource = stableStringify(
    plugins.map((p) => ({
      pluginName: p.pluginName,
      pluginDescription: p.pluginDescription,
      pluginVersion: p.pluginVersion,
      skills: p.skills,
      rules: p.rules,
      hooks: p.hooks,
      mcpServers: p.mcpServers,
      agents: p.agents,
      commands: p.commands,
    }))
  );
  const fingerprint = sha256(fingerprintSource);

  const previousFingerprint = exists(fingerprintPath) ? readText(fingerprintPath).trim() : null;
  if (previousFingerprint === fingerprint && exists(outputIndexPath)) {
    return {
      fingerprint,
      indexPath: outputIndexPath,
      warnings,
      pluginsIndexed: plugins.length,
    };
  }

  const indexText = [
    '# Installed Plugin Index',
    '',
    '> Derived from installed plugin metadata. Non-authoritative.',
    '',
    ...plugins.flatMap((p) => {
      const lines = [];
      lines.push(`## ${p.pluginName}`);
      lines.push('');
      lines.push('Purpose:');
      lines.push(p.pluginDescription || '(missing)');
      lines.push('');
      if (p.pluginVersion) {
        lines.push(`Version: ${p.pluginVersion}`);
        lines.push('');
      }
      lines.push('Components:');
      if (p.skills.length) {
        lines.push('Skills:');
        for (const s of p.skills) {
          let line = `- ${s.name}: ${s.description}`;
          if (s.useWhen?.length) line += ` (Use when: ${s.useWhen.join('; ')})`;
          if (s.doNotUseWhen?.length) line += ` (Do not use when: ${s.doNotUseWhen.join('; ')})`;
          lines.push(line);
        }
      }
      if (p.mcpServers.length) {
        lines.push('MCP:');
        for (const m of p.mcpServers) lines.push(`- ${m.serverKey}${m.url ? `: ${m.url}` : ''}`);
      }
      if (p.rules.length) {
        lines.push('Rules:');
        for (const r of p.rules) lines.push(`- ${r.name}: ${r.description}${r.alwaysApply ? ' (alwaysApply)' : ''}`);
      }
      if (p.hooks.length) {
        lines.push('Hooks:');
        for (const h of p.hooks) lines.push(`- ${h.eventName}`);
      }
      if (p.agents.length) {
        lines.push('Agents:');
        for (const a of p.agents) lines.push(`- ${a.name}: ${a.description}`);
      }
      if (p.commands.length) {
        lines.push('Commands:');
        for (const c of p.commands) lines.push(`- ${c.name}: ${c.description}`);
      }
      lines.push('');
      return lines;
    }),
  ].join('\n');

  writeText(outputIndexPath, `${indexText}\n`);
  writeText(fingerprintPath, `${fingerprint}\n`);

  return {
    fingerprint,
    indexPath: outputIndexPath,
    warnings,
    pluginsIndexed: plugins.length,
  };
}

export async function markRoutingComplete({
  fingerprintPath,
  routingCompleteFlagPath,
}) {
  const currentFingerprint = exists(fingerprintPath) ? readText(fingerprintPath).trim() : null;
  if (!currentFingerprint) throw new Error(`Missing fingerprint at ${fingerprintPath}`);

  const payload = { fingerprint: currentFingerprint };
  writeText(routingCompleteFlagPath, `${JSON.stringify(payload)}\n`);
}

export async function isRoutingComplete({
  routingCompleteFlagPath,
  routingFingerprintPath,
  currentFingerprintPath,
}) {
  if (!exists(routingCompleteFlagPath)) return false;

  let routingFlag;
  try {
    routingFlag = JSON.parse(readText(routingCompleteFlagPath));
  } catch {
    routingFlag = { fingerprint: readText(routingCompleteFlagPath).trim() };
  }

  const currentFingerprint = exists(currentFingerprintPath) ? readText(currentFingerprintPath).trim() : null;
  if (!currentFingerprint) return false;

  const routingFingerprint = typeof routingFlag?.fingerprint === 'string' ? routingFlag.fingerprint : null;
  if (!routingFingerprint) return false;

  // routingFingerprintPath is accepted for interface compatibility; routing flag owns the value.
  return routingFingerprint === currentFingerprint;
}

function parseCliArgs(argv) {
  const args = {};
  const rest = [...argv];
  while (rest.length) {
    const token = rest.shift();
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = rest[0];
    if (next && !next.startsWith('--')) args[key] = rest.shift();
    else args[key] = true;
  }
  return args;
}

if (process.argv[1] && import.meta.url) {
  const invoked = path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
  if (invoked) {
    const args = parseCliArgs(process.argv.slice(2));
    const mode = args.mode || 'index';
    if (mode === 'index') {
      const pluginSearchRoots = (args.plugins ? args.plugins.split(',') : []).filter(Boolean);
      const outputIndexPath = args.outputIndexPath;
      const fingerprintPath = args.fingerprintPath;
      if (!pluginSearchRoots.length || !outputIndexPath || !fingerprintPath) {
        throw new Error('Usage: --mode index --plugins <root1,root2> --outputIndexPath <path> --fingerprintPath <path>');
      }
      generatePluginDescriptionIndex({
        pluginSearchRoots,
        outputIndexPath,
        fingerprintPath,
      }).then((r) => {
        // eslint-disable-next-line no-console
        console.log(JSON.stringify(r, null, 2));
      });
    }
  }
}

