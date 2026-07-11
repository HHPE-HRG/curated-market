# Strict verification boundaries

The HHPE acceptance result is intentionally split from whole-platform topology health.

| Layer | Command | Result |
|---|---|---|
| Registry integrity | `bin/hhpe-registry-validate` | PASS |
| Runtime binding | `npm run agent:verify:runtime` | PASS |
| Required integrations | `npm run agent:verify:integrations` | PASS |
| Host parity | `reports/host-support-matrix.md` | PARTIAL; installed IDE sessions are not headless-testable |
| Full application topology | `npm run agent:verify:strict` | FAIL; unrelated topology/application failures |

The strict wrapper remains useful for platform health, but its failure is not an HHPE registry failure when registry, runtime, and required integration layers pass independently.
