# Agent-Agnostic Curated Market (main)

**Status:** Living product contract on `main`  
**Date:** 2026-08-31  
**Sibling:** OpenCode specialization — `docs/superpowers/specs/2026-08-20-opencode-only-design.md` on `feat/opencode_only`  
**Migration record:** `docs/superpowers/specs/2026-08-31-agent-agnostic-main-opencode-only-peel-design.md`

## One-line contract

**Any agent / any model-provider path that talks to curated-market through the registry sees the same portable contract.** No agent runtime is privileged on `main`.

## Product intent

| Axis | `main` (this spec) |
| --- | --- |
| Agents | OpenAI-family, Anthropic-family, Cursor, Claude Code, Codex, OpenCode-as-host, etc. — **equal peers** |
| Model providers | Registry + Function Control provider families (`openai`, `cursor`, …) as shared credential/provider knowledge — **not** a personalization monopoly |
| Personalization | **Not required.** Project personalization for a single runtime is out of scope here |
| Default gate | `npm run validate` / skills-ci static integrity |

## Invariants

1. Default validate **must not** require `specialization.yaml`, `opencode.json`, `.opencode/**`, or an OpenCode-sole `AGENTS.md` policy.
2. Canonical registry, ToolSpec, multi-host exposures, and peer host adapters remain.
3. Function Control **core** + `registry/providers/*` remain (shared credential plane).
4. Cursor **as host** (skills/plugins/`cursor-plugin-routing`) is a peer host on `main`.
5. Cursor **as OpenCode model provider** (`cursor-opencode-provider` project pin) is **not** a `main` requirement — that belongs to the OpenCode specialization line.
6. All agent runtimes that use registry APIs get the same portable contract; tests and docs must not encode a sole personalization runtime for `main`.

## Explicit non-goals (on main)

- OpenCode-only project personalization (`validate:opencode`, `.opencode/skills`, specialization selector).
- Treating one agent CLI as the only allowed operator environment.
- Deleting Codex / Cursor / Claude host adapters.

## Proof

- Peel acceptance: `HHPE_PEEL_ACCEPTANCE=1 node --test tests/agent-agnostic-main.peel-acceptance.test.mjs`
- Default: `env -u HHPE_HRG_HOME npm test` and `npm run validate`

## Relationship to OpenCode-only

```text
main  ── agent-agnostic registry / hosts / FC core / ToolSpec
          │
          └── feat/opencode_only ── MAY specialize personalization
                                    (OpenCode sole project runtime)
```

Operators who want OpenCode’s open-source seams (project agents, pinned providers, AuthBackend consumer wiring as specialization) check out **`feat/opencode_only`** and follow the sibling OpenCode-only design. That line does **not** redefine `main`.
