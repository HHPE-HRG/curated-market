# HHPE runtime binding

XLOTYL Core Dev Services now reads `packages.lock.yaml`, `capabilities.yaml`, `exposures.yaml`, and `final-stack.yaml` from `HHPE_HRG_HOME`. The resolver projects metadata only: `canonicalId`, upstream name, package revision, intact package root, source path, host eligibility, worker eligibility, and declared dependencies. It does not copy upstream skill content.

Stack startup sets:

```text
HHPE_HRG_HOME=${HHPE_HRG_HOME:-$HOME/.local/share/hhpe-hrg}
HHPE_HRG_RUNTIME_BINDING=registry
```

Focused binding tests pass. On this machine the projection resolves five packages, 52 active executable/skill capabilities, 27 CE capabilities, and five retained Superpowers support capabilities. CE orchestration plugins remain XLOTYL task-graph adapters; the source package and revision come from the canonical registry.

Worker catalogs carry role eligibility for lead, worker, sub-agent, container, and remote projections. Container/remote launch remains contract-driven through `registry/adapters/hhpe-hrg/worker-contract.json`; actual remote execution is still pending.
