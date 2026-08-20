# Tool Manifest Consumer Migration

Date: 2026-08-20

## Scope semantics

`no matches` means no matches within the recorded search boundary. It does not mean all consumers are known. Local repository migration and external rollout are independent decisions.

## Repository consumers

Search boundary: this Curated Market checkout, excluding `.git/**` and `registry/packages/**`.

Search:

```sh
rg -n --hidden --glob '!registry/packages/**' --glob '!.git/**' 'tools\.yaml|binary_paths|source_binary_paths|health_check|noninteractive_path|status.?present' .
```

- `lib/registry.mjs`: validates declared binary paths and uses `source_binary_paths` as an external-target allowlist for managed symlinks.
- `lib/capability-checks.mjs`: discovers the first declared binary path, then uses hard-coded Linux paths in Serena, Context7, and Playwright checks.
- `tests/capability-expansion.test.mjs`: treats declared paths as current runtime truth.
- `tests/registry.test.mjs`: tests ambient AST Grep execution and registry validation.
- `registry/adapters/hhpe-hrg/worker-contract.json`: names this manifest, requires version agreement, and prohibits host absolute paths.
- `scripts/generate-manifests.mjs`: destructive incomplete writer containing only AST Grep and historical Linux state.
- `registry/manifests/migration-state.yaml`: records exact managed AST Grep link/source ownership state.
- Wrapper and architecture documents: non-runtime references inspected during migration.

Every local runtime consumer above has a migration task before portable v2 becomes canonical. No local consumer may lose a required field before its reader or ownership behavior is migrated.

## External roots inspected

Search boundary for each root: complete local checkout excluding `.git/**`.

Search:

```sh
rg -n --hidden --glob '!.git/**' 'registry/manifests/tools\.yaml|binary_paths|source_binary_paths|tool versions match tools\.yaml' <root>
```

- `/Users/maxholden/src/t3code`: no matches within inspected boundary.
- `/Users/maxholden/T2-SQUARED`: no matches within inspected boundary.
- `/Users/maxholden/OrchestrationVM/T2-SQUARED`: no matches within inspected boundary.

## Environment discovery

Environment-variable-name search boundary:

```sh
env | cut -d= -f1 | rg '^(HHPE|XLOTYL|WORKER|CONTAINER|REGISTRY)'
```

Result: no matching variable names. Values were not printed.

## Documented but unavailable integrations

- XLOTYL/Core Dev Services implementation: not located through inspected roots; referenced by `reports/hhpe-runtime-binding.md`.
- Remote worker endpoint/transport: unavailable for inspection; referenced by `reports/remote-worker-parity.md`.

These integrations remain unknown. Local migration does not authorize publication or deployment to them.

## Compatibility decision

- Preserve manifest path, `tool_id`, `capability_id`, `version`, and `source` for initial migration.
- Migrate local readers before removing `binary_paths`, `source_binary_paths`, `platform`, `noninteractive_path`, `status`, and root `generated_at`.
- Preserve existing report-envelope fields initially as derived projections.
- Unknown readers must reject an unsupported schema; they must not infer absence from missing host fields.

## Gates

```yaml
local-repository-migration: allowed
external-rollout: unknown
```

Local migration is allowed because every discovered local consumer has an explicit migration or compatibility task. External rollout remains unknown because documented integrations were unavailable for inspection.
