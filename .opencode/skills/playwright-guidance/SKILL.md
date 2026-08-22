---
name: playwright-guidance
description: Use Playwright CLI for browser and UI acceptance testing when the repository or task contains browser-facing behavior.
---

# Playwright browser acceptance

Use the registered `playwright-cli` runtime (0.1.17) for browser navigation, interaction, assertions, screenshots, traces, storage state, and request mocking. Keep browser acceptance after unit and integration evidence, then report the runtime artifact and close the browser cleanly.

Remain inactive for non-UI work. Use disposable fixtures, bounded browser sessions, and no production credentials. The official CLI skill bundle may be installed into a host-native project skill directory; this wrapper records the central runtime and activation policy without copying that bundle into the registry.

Provenance: HHPE routing wrapper for `@playwright/cli` 0.1.17.
