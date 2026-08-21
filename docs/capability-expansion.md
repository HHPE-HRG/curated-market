# Capability expansion operations

The registry now contains the complete pinned Serena and Trail of Bits source packages. `registry/manifests/tools.yaml` is the initial repository-local storage for portable approved tool identity, version, source coordinate, discovery policy, and probe policy. It does not assert installation or health on the current host. Each execution context realizes the applicable ToolSpec independently; capability checks may retain a structured observation in existing reports, but retention is not required for every check.

Context7 service/network/authentication readiness remains distinct from local CLI presence. Playwright generated material and browser/daemon readiness remain distinct from local CLI presence. Physical ownership of Compatibility implementation remains unresolved. Context7 and Playwright are task-triggered; they are not fetched or started during session hydration. Beads is deliberately inactive because HHPE owns the live task graph.

## Routing

Compound Engineering remains the lifecycle owner. Caveman and Ponytail provide the configured behavioral layers. `hhpe-hrg/session-start` hydrates repository state read-only. Native host discovery chooses the narrowest applicable specialist: Serena for symbols, ast-grep for syntax trees, Context7 for current external documentation, Playwright for browser acceptance, and Trail of Bits specialists for their defined engineering/security concerns.

Upstream skill names and source paths remain unchanged. HHPE wrappers are explicitly named and contain routing guidance only.

## Focused checks

```sh
ROOT="${HHPE_HRG_HOME:-$HOME/.local/share/hhpe-hrg}"
export PATH="$ROOT/bin:$PATH"
hhpe-registry-capability-check static
hhpe-registry-capability-check serena
hhpe-registry-capability-check context7
hhpe-registry-capability-check specialists
hhpe-registry-capability-check playwright
hhpe-registry-capability-check session-start
hhpe-registry-capability-check routing
hhpe-registry-capability-check all
```

The Context7 check may report `PASS_WITH_DOCUMENTED_HOST_LIMITATION` when the documentation service requires network authentication. Playwright may report the same classification when browser binaries or its daemon are unavailable. Neither condition changes package or manifest integrity.

Reports are written below `reports/capability-checks/`. They contain command output needed for diagnosis, but no credentials or session cookies.


## Session kickoff and lifecycle routing

Ordinary sessions start with Caveman, then `hhpe-hrg/session-start`, then a natural-language task. See `docs/operations.md`, ADR-024, and ADR-025. `final-stack.yaml` records task-language lifecycle routing and natural-language fixtures validated by `hhpe-registry-capability-check routing`.
