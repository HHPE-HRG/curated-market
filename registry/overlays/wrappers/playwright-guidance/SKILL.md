---
name: playwright-guidance
description: Use Playwright CLI for browser and UI acceptance testing when the repository or task contains browser-facing behavior.
---

# Playwright browser acceptance

Use the registered `playwright-cli` runtime (0.1.17) for browser navigation, interaction, assertions, screenshots, traces, storage state, and request mocking. Keep browser acceptance after unit and integration evidence, then report the runtime artifact and close the browser cleanly.

Remain inactive for non-UI work. Use disposable fixtures, bounded browser sessions, and no production credentials. The official CLI skill bundle may be installed into a host-native project skill directory; this wrapper records the central runtime and activation policy without copying that bundle into the registry.

Provenance: HHPE routing wrapper for Microsoft Playwright browser acceptance. Framework: https://github.com/microsoft/playwright. MCP package: playwright-mcp (`io.github.microsoft/playwright-mcp`). Initiation: mcp_repository for MCP; application transport: CLI (`playwright-cli` 0.1.17) + this skill preferred.
