---
name: ast-grep
description: Use structural AST search and carefully previewed rewrites when text search or symbol tooling is insufficient.
---

# ast-grep

Use `rg` for literal or regular-expression text, an LSP for symbol navigation and semantic references, and `ast-grep` when syntax structure is the actual constraint.

Before searching, confirm `ast-grep --version`; if missing, report the registered runtime requirement instead of downloading a binary. Always specify `--lang`, begin on the narrowest directory, and test the pattern on a fixture or representative file. Use `ast-grep run --pattern '<pattern>' --lang <language> <path>` for one-off searches and repository YAML rules for reusable constraints.

For rewrites, first print or inspect matches, then preview the rewrite without `--update-all`. Review the exact diff before applying. Never run a bulk rewrite across generated, vendored, or unknown-language trees. After applying, run the repository formatter plus the narrowest parser/compiler/tests that cover the changed files. If syntax is unsupported or ambiguous, stop and report the language, pattern, and smallest failing example.

Runtime provenance is recorded in `registry/manifests/tools.yaml`. Extended rule syntax is in `references/rule_reference.md`.
