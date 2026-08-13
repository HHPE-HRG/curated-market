---
name: context7-guidance
description: Verify current, version-specific official documentation before implementing against an external library, framework, SDK, API, or build tool.
---

# Context7 documentation grounding

When a task depends on a version-sensitive external interface, resolve the library with `ctx7 library` and fetch only the focused documentation needed with `ctx7 docs`. Record the resolved library and version context in the engineering evidence. Prefer official or package-maintained documentation.

Remain inactive for wholly internal, version-insensitive work. Do not fetch documentation automatically at session start and do not turn Context7 into a competing lifecycle owner.

Provenance: HHPE routing wrapper for Upstash-vended Context7 (`io.github.upstash/context7` from https://github.com/upstash/context7). Initiation: mcp_repository. Application transport: CLI (`ctx7` 0.5.4) + this skill preferred; MCP capability `context7/context7-mcp` available without always-on session load.
