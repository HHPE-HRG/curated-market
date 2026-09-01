# Curated-market operator policy (agent-agnostic)

- This checkout is the shared curated-market registry. OpenAI, Anthropic, and Cursor agents use the same portable contract.
- Do not require a single agent personalization runtime for registry validation.
- OpenCode project personalization (selector, `opencode.json`, `.opencode/`, `validate:opencode`) lives on `feat/opencode_only` — see `docs/superpowers/specs/2026-08-31-agent-agnostic-main-opencode-only-peel-design.md`.
- Preserve ToolSpec runtime evidence.
- Do not read secrets or silently fall back across authentication methods or providers.
- Invoke skills only when relevant.
- Verify evidence before claiming completion.
