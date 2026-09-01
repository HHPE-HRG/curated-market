# Curated-market operator policy (agent-agnostic)

- This checkout follows the **agent-agnostic** living spec: `docs/superpowers/specs/2026-08-31-agent-agnostic-main-design.md`.
- OpenAI, Anthropic, Cursor, and other agents use the same portable registry contract. No single personalization runtime is required for validate.
- OpenCode-only project personalization is a **separate** living spec on `feat/opencode_only`: `docs/superpowers/specs/2026-08-20-opencode-only-design.md` (index: `docs/superpowers/specs/README.md`).
- Preserve ToolSpec runtime evidence.
- Do not read secrets or silently fall back across authentication methods or providers.
- Invoke skills only when relevant.
- Verify evidence before claiming completion.
