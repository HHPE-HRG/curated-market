# Strict verification analysis

## Result

`FAIL — unrelated topology/application checks`; this does not identify a registry defect. Redis and Workroom required checks pass. The wrapper cannot be called green because topology coverage still fails and the XLOTYL agent-platform required check has two failing tests.

## Evidence

| Command | Directory | Result | Classification |
|---|---|---|---|
| `npm run agent:verify:strict` | wrapper root | FAIL | topology ownership gaps plus required-check evidence state |
| `cd infrastructure/workflow-protocol && bun run build && bun run test` | wrapper root | PASS | required Redis-backed check |
| `cd infrastructure/workroom && bun run build && bun run test` | wrapper root | PASS | Workroom lifecycle fix verified; 28 suites / 175 tests |
| `cd infrastructure/xlotyl/services/agent-platform-service/server && bun run build && bun run test` | wrapper root | FAIL | two application tests, no registry import path |
| `git diff --check` | wrapper root | PASS | repository hygiene |

The initial aggregate evidence command was invalid because it chained directory changes without returning to the wrapper root and ended with `git diff --check`; it is not treated as evidence. Required checks were recorded individually afterward.

## Remaining failures

1. `odysseus_webhook_route.test.ts`: the route bridge returns 200 when the mocked downstream forward rejects; the test expects a 502. The route's `runWebhookReceiver` does not translate rejected `onValidated` work into an error response. This is an agent-platform application defect.
2. `oma_route_parity.test.ts`: mounted `POST /api/ai/workflows/evaluate` has no OMA coverage or governed exception. This is a route-coverage defect.
3. Topology coverage reports unowned paths under `infrastructure/workflow-drivers/astgrep-research/**` and `infrastructure/workflow-protocol/**`. These are wrapper ownership metadata gaps.

No failure was caused by the HHPE registry binding. The canonical binding focused tests pass with and without registry mode.
