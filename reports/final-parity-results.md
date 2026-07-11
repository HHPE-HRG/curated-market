# Final parity results

## Passed

- Registry integrity and package preservation: pass.
- Existing package parity suite: 8/8 pass.
- ast-grep 0.43.0 fixture: pass.
- Workflow-protocol Redis integration: 11/11 isolated and 49/49 full suite pass.
- Workroom: 28 suites / 175 tests pass after deterministic session teardown.
- HHPE runtime binding focused tests: 2/2 pass.
- CE precedence and reduced Superpowers projection: pass in manifest/resolver tests.

## Not yet passable

- Claude authenticated session, Cursor GUI session, and Antigravity IDE GUI session.
- OpenCode model-backed execution parity after its bounded Test A timeout.
- Container and remote worker execution parity.
- Strict wrapper verification because of unrelated topology gaps and two agent-platform application tests.
- Full cross-host implicit prompt-routing tests require live host sessions and are not inferred from symlink validity.

## Interactive-host continuation

OpenCode native loader and restart persistence now pass in an isolated HOME;
its model-backed Test A run selected/loaded `ce-plan` but timed out at 75
seconds. Claude is blocked by `/login`; Cursor and Antigravity require a real
interactive UI. See `reports/interactive-host-acceptance.md` and
`reports/interactive-hosts/`.

The full Core Dev Services suite currently reports six unrelated failures: one missing built `infrastructure/core/dist/comms/index.js` import, one server publication assertion, and five Stoneforge prompt publication assertions. These are application/build-topology failures outside the registry resolver.
