# OpenCode Project Policy

- OpenCode is sole personalization runtime.
- Use project-local agents and skills.
- Inherit operator-selected authenticated model.
- Preserve ToolSpec runtime evidence.
- Do not use direct Cursor, direct Codex, or global-home OpenCode personalization.
- Do not read secrets or silently fall back across authentication methods or providers.
- Invoke skills only when relevant.
- Verify evidence before claiming completion.
- Prior-session / agent transcripts are **not** in the git tree. Project-scoped Glob/Grep will not find them. For transcript search use the absolute OpenCode project metadata path (requires `external_directory` approval):
  `~/.cache/opencode/projects/Users-maxholden-src-curated-market/agent-transcripts`
  (symlink to Cursor transcripts; recreate with `node scripts/ensure-t3-opencode-bindings.mjs` if missing).
