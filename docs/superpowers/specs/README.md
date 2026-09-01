# Living product specs (curated-market)

After the 2026-08-31 peel there are **exactly two** living product contracts for this repo:

| Spec | Branch | One-line |
| --- | --- | --- |
| [`2026-08-31-agent-agnostic-main-design.md`](./2026-08-31-agent-agnostic-main-design.md) | `main` | Any agent / any model-provider path through the registry — same portable contract; no privileged personalization runtime |
| [`2026-08-20-opencode-only-design.md`](./2026-08-20-opencode-only-design.md) | `feat/opencode_only` | OpenCode is the sole project personalization runtime; Cursor/OpenAI are providers inside OpenCode |

## Do not conflate

| Topic | Belongs to |
| --- | --- |
| Cursor as **host** (skills, plugins, `cursor-plugin-routing`) | Agent-agnostic `main` |
| Cursor as **OpenCode model provider** (`cursor-opencode-provider`) | OpenCode-only line |
| Default `npm run validate` | `main` |
| `npm run validate:opencode` | `feat/opencode_only` |

## Historical / supporting designs

- Peel migration: [`2026-08-31-agent-agnostic-main-opencode-only-peel-design.md`](./2026-08-31-agent-agnostic-main-opencode-only-peel-design.md)
- Cursor host realization boundary, ToolSpec, Codex adapter portability, native plugin validation — supporting designs; they do not replace the two living product contracts above.
