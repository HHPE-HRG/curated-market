# Workroom hang analysis

The hang was a deterministic test lifecycle leak, not a registry or Redis hang. `RestartResumeParity.test.ts` created three simulated runtime sessions. `SimulatedRuntimeBackend` launches detached `node -e setTimeout(() => {}, 120000);` children; the test had no teardown, so Jest assertions passed but the process retained open children.

Before the fix, the bounded reproduction was:

```text
timeout 35s npm test -- --runTestsByPath tests/operator/RestartResumeParity.test.ts --detectOpenHandles
```

The assertions passed, the process timed out, and the child process tree contained three `node -e setTimeout` children with the Jest process as parent. The fix adds `afterEach` cleanup that lists and terminates every session, restores mocks, and removes the temporary repository. The isolated test now exits cleanly; the full Workroom build/test passes 28 suites and 175 tests. No timeout was increased. The unrelated untracked integration test was not modified.
