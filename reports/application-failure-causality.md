# Application failure causality

The remaining full-suite failures were reproduced outside the registry resolver path. Registry validation and runtime-binding tests pass; the Workroom and Redis checks pass. Remaining failures are:

- agent-platform Odysseus webhook error translation test;
- OMA route parity coverage for `POST /api/ai/workflows/evaluate`;
- Core Dev Services publication tests requiring broader Kafka/Stoneforge support;
- a missing built `infrastructure/core/dist/comms/index.js` import in a full Core Dev Services test.

These are classified as application/topology or build-artifact failures, not HHPE registry defects. They remain outside this migration scope.

The continuation run additionally observed workflow-protocol TypeScript test
compile errors for the concurrent durable-lifecycle API changes (`claimToken`,
lease options, and guarded transition signatures). The registry validation and
runtime binding gates passed before that integration stage. The concurrent
workflow changes remain user-owned and were not staged, edited, or incorporated.
