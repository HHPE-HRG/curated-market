# Codex Adapter Projection Portability Design

**Status:** Proposed for written-spec review  
**Date:** 2026-08-20  
**Architectural authority:** [ADR-026: HHPE plane authority model](../../decisions/ADR-026-hhpe-plane-authority-model.md)

## Purpose

Make the checked-in HHPE Codex adapter projection reproducible and portable without changing canonical wrapper identity, installing plugins, or creating a generalized provider-projection framework.

The repository already intends seven HHPE overlay wrappers to appear in the Codex `hhpe-registry` plugin:

- `ast-grep`;
- `registry-health`;
- `stack-router`;
- `serena-guidance`;
- `context7-guidance`;
- `playwright-guidance`; and
- `session-start`.

The approved direction is:

```text
canonical HHPE overlay wrapper
  -> deterministic Codex-specific generation
  -> checked-in regular files under the Codex adapter
  -> parity verification against the canonical wrapper
```

## Current evidence and defect

Canonical HHPE-authored wrappers live under [`registry/overlays/wrappers`](../../../registry/overlays/wrappers). The Codex plugin projection lives under [`registry/adapters/codex/marketplace/plugins/hhpe-registry/skills`](../../../registry/adapters/codex/marketplace/plugins/hhpe-registry/skills).

[`scripts/sync-adapters.mjs`](../../../scripts/sync-adapters.mjs) currently removes and recursively copies only `ast-grep`, `registry-health`, and `stack-router` from canonical overlays into the Codex plugin. Those generated entries are regular files.

The four later wrappers were added to the same plugin projection and to the seven-wrapper parity test, but their checked-in `SKILL.md` entries are Git symlinks whose payloads point into `/home/hold3n/.local/share/hhpe-hrg`. They therefore depend on one historical Linux user's installation root. A clean checkout in another location, a Git worktree, and the inspected macOS host cannot resolve them.

The commit that introduced Serena, Context7, Playwright, and session-start simultaneously expanded the parity expectation from three wrappers to seven. No repository record identifies those four entries as intentionally runtime-linked or exempt from generator ownership. Existing Codex documentation also states that the HHPE-owned wrapper plugin is deterministically generated because Codex materialization does not reliably preserve symlinked skill content.

The defect is an inconsistency among generator scope, checked-in projection state, and parity expectations. It is not a ToolSpec defect.

## Authority classification

### Supply

Curated Market Supply owns canonical HHPE wrapper identity and source content under `registry/overlays/wrappers`. The wrapper is the source being projected; the adapter copy does not become a second source authority.

### Compatibility/Capability Realization

Compatibility owns the rule that selected canonical wrappers are represented inside the Codex plugin and the binding between canonical capability identity and Codex's plugin layout. Generator ownership is a concrete Codex realization concern.

### Execution

Execution performs generation and reads the resulting filesystem objects. Actual file existence, file type, and byte content are execution facts for a checkout.

### Observability/Evidence

Parity and regeneration checks establish whether a specific checked-in projection matches its canonical sources. Passing evidence does not transfer canonical authority from overlays to generated files.

## Canonical sources and generated outputs

Each generated projection has exactly one canonical source directory:

| Wrapper | Canonical source | Generated Codex projection |
| --- | --- | --- |
| `ast-grep` | `registry/overlays/wrappers/ast-grep` | `registry/adapters/codex/marketplace/plugins/hhpe-registry/skills/ast-grep` |
| `registry-health` | `registry/overlays/wrappers/registry-health` | `registry/adapters/codex/marketplace/plugins/hhpe-registry/skills/registry-health` |
| `stack-router` | `registry/overlays/wrappers/stack-router` | `registry/adapters/codex/marketplace/plugins/hhpe-registry/skills/stack-router` |
| `serena-guidance` | `registry/overlays/wrappers/serena-guidance` | `registry/adapters/codex/marketplace/plugins/hhpe-registry/skills/serena-guidance` |
| `context7-guidance` | `registry/overlays/wrappers/context7-guidance` | `registry/adapters/codex/marketplace/plugins/hhpe-registry/skills/context7-guidance` |
| `playwright-guidance` | `registry/overlays/wrappers/playwright-guidance` | `registry/adapters/codex/marketplace/plugins/hhpe-registry/skills/playwright-guidance` |
| `session-start` | `registry/overlays/wrappers/session-start` | `registry/adapters/codex/marketplace/plugins/hhpe-registry/skills/session-start` |

All seven are generator-owned. The ownership set is explicit, closed, and review-governed for this migration. Directory discovery must not expand generator scope merely because another wrapper appears under `registry/overlays/wrappers`. Adding another generator-owned projection requires an intentional reviewed change to the ownership set and its source-to-output mapping.

Generator ownership covers each complete wrapper directory recursively, not only `SKILL.md`. Supporting files and subdirectories remain package-relative inside the generated wrapper exactly as they are under the canonical overlay.

## Physical representation

Generated Codex projection entries are checked-in regular files and directories.

This representation is required for the current migration because it:

- follows the already implemented representation for the first three wrappers;
- gives a clean checkout a complete Codex adapter without a setup hook;
- survives arbitrary repository roots and Git worktrees;
- is independent of usernames and home directories;
- behaves consistently on Linux and macOS;
- avoids relying on Codex plugin materialization following symlinks outside the plugin tree; and
- remains inspectable and reviewable in Git.

Repository-relative symlinks are not selected. Although less location-dependent than absolute links, current Codex/plugin evidence does not prove that such links are preserved during plugin materialization. Locally generated links are also not selected because current policy checks the adapter projection into Git and provides no mandatory per-checkout generation lifecycle.

This choice is scoped to these seven HHPE-owned Codex wrapper projections. It is not a universal representation rule for adapters, providers, upstream packages, or generated state.

## Generator contract

`scripts/sync-adapters.mjs` remains the narrow Codex-specific generator for the seven named HHPE wrappers.

For every owned wrapper, generation must:

1. resolve source and destination relative to the selected repository root;
2. reject a missing canonical source rather than silently omit it;
3. reconcile only that wrapper's owned destination so output exactly represents the current canonical tree;
4. recursively copy the complete source directory as regular files/directories;
5. preserve file contents and relative supporting-file layout;
6. avoid embedding repository root, home directory, username, platform path, or generation time in output;
7. leave unrelated plugin metadata and non-owned adapter content untouched; and
8. perform no plugin installation, activation, registration, removal, or host configuration.

Repeated generation from unchanged sources must produce byte-equivalent output and no Git diff.

Generation is reconciliation, not append-only copying. A file removed from a canonical owned wrapper must not survive as stale generated output. Deletion authority is limited to the seven explicitly owned destination directories. The generator must not recursively clean the enclosing plugin, plugin metadata, neighboring skills, or any non-owned adapter content.

Generator-owned regular-file modes must preserve the canonical source's Git-relevant executable bit. Generation must not invent executable permission for a non-executable canonical file. Other platform-specific permission bits are not projection semantics and must not cause nondeterministic checked-in output; directories receive only the access permissions needed to represent and traverse the tree. The implementation plan must make this mode handling explicit in generation and parity tests.

The generator's authority stops at producing these checked-in adapter directories. It is not authoritative for canonical wrapper content, exposure activation, native plugin installation, or provider-wide realization policy.

## Checked-in generated-state policy

Generated output remains checked in because the repository currently treats the Codex marketplace adapter as consumable checkout content. Generation is the write mechanism; reviewed Git state is the publication and approval mechanism.

Generated artifacts are identified without modifying canonical skill content:

- their path is within the Codex `hhpe-registry` adapter projection;
- the generator's explicit seven-wrapper ownership list names them;
- this specification documents their canonical source mapping; and
- parity requires byte equivalence to the corresponding canonical overlay tree.

No generated banner is inserted into `SKILL.md`, because that would make the projection differ from its canonical wrapper. No additional ownership database or generic generated-artifact manifest is required.

Historical absolute symlinks are invalid generated state. Conversion to regular files changes projection representation, not canonical wrapper content or identity.

## Provenance and data flow

```text
registry/overlays/wrappers/<name>
  canonical HHPE-authored source
        |
        | scripts/sync-adapters.mjs
        v
registry/adapters/codex/marketplace/plugins/hhpe-registry/skills/<name>
  generated, checked-in Codex projection
        |
        | parity/regeneration check
        v
evidence: complete tree matches canonical source
```

The projection consumes canonical content. Editing a generated copy directly does not change the canonical wrapper and must be detected as stale or divergent generated state.

## Reproducibility and stale-state prevention

Two complementary checks are required:

1. **Tree parity:** every canonical file under each owned wrapper has a corresponding regular generated file with identical content, and the generated wrapper has no unexplained extra entries.
2. **Regeneration check:** a check mode or equivalent test strategy generates all seven projections into isolated temporary output and compares that result with checked-in output without modifying canonical repository state.

CI and static local verification must be capable of using that isolated temporary output. They must not rewrite the checked-in adapter merely to determine whether it is current. Exact command naming and whether the existing script receives an optional output/root parameter are implementation-plan decisions, provided the check remains non-destructive.

A source change without regenerated output fails parity. A direct generated-output change without matching canonical source also fails parity. A file-type change to a symlink fails even if reading through that link happens to yield matching bytes on one host.

## Clean-checkout and portability requirements

A clean checkout must be able to read every projected wrapper without relying on:

- `/home/hold3n`;
- the current user's home directory;
- a prior Curated Market installation;
- the checkout's absolute path;
- another worktree;
- plugin installation state; or
- generation having run after checkout.

Tests must exercise projection comparison from a repository or fixture rooted at a noncanonical temporary path. Platform-independent path construction must be used. Generator mechanics and generated representation must not introduce checkout-specific, username-specific, home-specific, worktree-specific, or historical realization paths.

Portability checks must distinguish generated-path leakage from intentional canonical content. A canonical wrapper may legitimately document an example absolute path. Such source-authored bytes remain valid when copied unchanged. Verification therefore detects paths introduced by generator metadata, symlink targets, or output that differs from the corresponding canonical source; it must not use a blanket string rejection that fails merely because the canonical wrapper intentionally contains an example path.

## Parity semantics

Parity means structural and content equivalence between one canonical wrapper tree and its one generated Codex projection:

- canonical and generated relative path sets match;
- every source directory is represented as a directory;
- every source file is represented as a regular file, with the canonical Git-relevant executable bit;
- bytes match for every regular file;
- supporting nested files and directories are included;
- generated destination contains no stale or unexpected files absent from canonical source; and
- no generator-owned output entry is a symlink.

Representation is part of parity. A symlink that resolves to bytes identical to a canonical regular file is not equivalent to the approved regular-file representation.

Parity does not prove:

- that the Codex plugin is installed;
- that Codex loaded the plugin;
- behavioral equivalence across providers;
- runtime tool readiness; or
- current-host activation.

Those are separate realization or evidence questions.

## Failure handling

Generation and verification fail closed when:

- an owned canonical source is missing;
- an owned destination cannot be replaced safely;
- copied output differs from canonical source;
- an owned output contains a symlink;
- an unexpected extra file remains in an owned destination;
- generator mechanics introduce checkout-specific or realization-specific path material absent from canonical source; or
- regeneration changes output when sources are unchanged.

Failure reports identify wrapper and relative path. They do not repair plugin installation or host state.

## Verification requirements

A future implementation must prove:

- the ownership set is exactly the approved seven wrappers;
- all seven are generated from the documented canonical directories;
- supporting files and nested directories are copied;
- generated entries are regular files/directories;
- generated relative path sets, file contents, nested supporting files, and Git-relevant executable bits match canonical sources;
- generator-owned output has no stale, unexpected, or symlink entries;
- historical absolute symlinks are absent;
- generator mechanics introduce no home, checkout, worktree, username, or historical realization paths beyond intentional canonical source content;
- generation is deterministic and idempotent;
- a clean checkout contains readable complete projection;
- arbitrary checkout roots, Linux path semantics, and macOS path semantics do not change output;
- parity detects canonical-source drift and direct generated-output drift;
- generation leaves unrelated plugin files untouched; and
- generation performs no installation, activation, provisioning, or removal.

## Migration surface

Likely implementation files are:

- `scripts/sync-adapters.mjs`;
- `tests/registry.test.mjs` or a focused adapter-generation test;
- the four currently symlinked generated `SKILL.md` entries under the Codex adapter;
- any supporting files added by recursive generation;
- `docs/host-adapters.md`; and
- optionally `package.json` if a repository-native regeneration/check command is added.

The implementation plan must decide the smallest safe test seam for isolated generation. It must not broaden generator authority while doing so.

## Explicit non-goals

This design does not authorize:

- ToolSpec or ToolRealizationObservation changes;
- native plugin installation or activation;
- exposure lifecycle changes;
- adapter relocation;
- canonical wrapper relocation or identity changes;
- a generic provider projection framework;
- a projection daemon or runtime service;
- runtime-generated host symlink farms;
- a universal generated-state schema;
- changes to Cursor, Claude, OpenCode, or other provider adapters;
- modification of upstream package contents; or
- replacement of unrelated repository symlinks.

## Acceptance criteria

The design is satisfied when a future implementation can establish all of the following:

1. The seven named canonical wrapper trees are the sole sources for the seven Codex plugin projections.
2. The checked-in projections are complete regular-file copies and contain no host-specific absolute paths.
3. One narrow Codex generator reproduces all seven projections deterministically.
4. Non-destructive verification detects stale or manually divergent generated output.
5. A clean checkout in an arbitrary location can read and compare every projection on Linux and macOS.
6. Generated output is clearly identifiable by path, explicit generator ownership, documented source mapping, and parity without modifying canonical skill bytes.
7. Generator execution has no plugin or host-configuration side effects.
8. No generalized Compatibility infrastructure is introduced.

Canonical overlays remain source-content authority. The generator remains the write mechanism for these seven projection trees. Reviewed checked-in generated state remains publication and approval state. A clean checkout already contains the readable complete projection, while plugin installation and activation remain outside generator authority.

## Deferred implementation decisions

The implementation plan may select, based on the smallest testable change:

- whether isolated generation uses an optional root, optional output directory, or a pure comparison helper;
- exact command names for regeneration and non-destructive checking;
- whether focused tests remain in `tests/registry.test.mjs` or move to a dedicated adapter-generation test file; and
- exact diagnostic wording.

These decisions may not alter canonical-source ownership, the seven-wrapper set, checked-in regular-file representation, or non-destructive parity requirements.
