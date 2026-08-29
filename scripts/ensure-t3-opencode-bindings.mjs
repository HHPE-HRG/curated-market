#!/usr/bin/env node
/**
 * Ensure OpenCode project metadata paths used by the Cursor provider exist on this host.
 *
 * Fixes T3-bound OpenCode Glob/Grep failures caused by a missing
 * `<opencode-cache>/projects/<slug>/agent-transcripts` directory.
 */
import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const home = os.homedir();
const env = { ...process.env, HOME: home };

function slugify(workspaceRoot) {
  return path
    .resolve(workspaceRoot)
    .replace(/[^a-zA-Z0-9]/g, "-")
    .split("-")
    .filter(Boolean)
    .join("-");
}

function openCodeCacheRoot() {
  if (env.XDG_CACHE_HOME) {
    return path.join(env.XDG_CACHE_HOME, "opencode");
  }
  return path.join(home, ".cache", "opencode");
}

function openCodeProjectDir(workspaceRoot) {
  const projectsRoot = path.join(openCodeCacheRoot(), "projects");
  const slug = slugify(workspaceRoot);
  let dir = path.join(projectsRoot, slug);
  if (dir.length > 92) {
    const hash = createHash("sha256").update(dir).digest("hex").slice(0, 7);
    dir = `${dir.slice(0, Math.min(84, dir.length))}-${hash}`;
  }
  return dir;
}

function candidateTranscriptDirs(workspaceRoot) {
  const slugs = [slugify(workspaceRoot), slugify(home)];
  return [...new Set(slugs.map((slug) => path.join(home, ".cursor", "projects", slug, "agent-transcripts")))];
}

function whichRipgrep() {
  const pathValue = env.PATH ?? "";
  for (const dir of pathValue.split(path.delimiter)) {
    if (!dir) continue;
    const candidate = path.join(dir, "rg");
    try {
      fs.accessSync(candidate, fs.constants.X_OK);
      return candidate;
    } catch {
      continue;
    }
  }
  return null;
}

function ensureDir(target, mode) {
  fs.mkdirSync(target, { recursive: true, mode });
}

function ensureSymlink(target, linkPath) {
  try {
    const stat = fs.lstatSync(linkPath);
    if (stat.isSymbolicLink() && fs.readlinkSync(linkPath) === target) {
      return "unchanged";
    }
    fs.rmSync(linkPath, { recursive: true, force: true });
  } catch {
    /* missing */
  }
  fs.symlinkSync(target, linkPath);
  return "linked";
}

function main() {
  const projectDir = openCodeProjectDir(repoRoot);
  ensureDir(projectDir, 0o700);
  ensureDir(path.join(projectDir, "terminals"), 0o700);

  const agentTranscriptsDir = path.join(projectDir, "agent-transcripts");
  const source = candidateTranscriptDirs(repoRoot).find((candidate) => {
    try {
      fs.accessSync(candidate);
      return true;
    } catch {
      return false;
    }
  });

  let transcriptAction;
  if (source) {
    transcriptAction = ensureSymlink(source, agentTranscriptsDir);
  } else {
    ensureDir(agentTranscriptsDir, 0o700);
    transcriptAction = "created-empty";
  }

  const binDir = path.join(openCodeCacheRoot(), "bin");
  ensureDir(binDir, 0o755);
  const bundledRipgrep = path.join(binDir, "rg");
  let ripgrepAction = "missing-host-rg";
  const hostRipgrep = whichRipgrep();
  if (hostRipgrep) {
    try {
      fs.accessSync(bundledRipgrep);
      ripgrepAction = "unchanged";
    } catch {
      fs.symlinkSync(hostRipgrep, bundledRipgrep);
      ripgrepAction = "linked";
    }
  }

  console.log(
    JSON.stringify(
      {
        repoRoot,
        projectDir,
        agentTranscriptsDir,
        transcriptSource: source ?? null,
        transcriptAction,
        bundledRipgrep,
        ripgrepAction,
        hostRipgrep,
      },
      null,
      2,
    ),
  );
}

main();
