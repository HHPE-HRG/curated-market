---
name: serena-guidance
description: Use Serena for symbol-aware navigation, references, implementations, semantic edits, and safe refactors when a language server is available.
---

# Serena semantic code intelligence

Use the registered Serena runtime (`serena-agent` 1.5.3; command `serena`) for symbols, references, implementations, semantic navigation, and safe renames. Activate or health-check the current project before relying on language-server results. Keep `rg` for literal text, `ast-grep` for syntax-tree patterns and codemods, and compilers/tests as the correctness authority.

Do not replace Serena operations with broad text substitution when symbol identity matters. Report the active project and runtime health when the result depends on language-server state.

Provenance: HHPE wrapper for `serena` from the pinned `serena` package; runtime entry `serena-runtime`.
