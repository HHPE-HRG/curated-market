# ADR-021: Playwright UI acceptance

Status: Accepted

## Source

npm package `@playwright/cli`

## Revision

Pinned runtime `@playwright/cli@0.1.17`. HHPE wrapper `hhpe-hrg/playwright-guidance`. Official CLI skill bundle (`name: playwright-cli`) remains host-generated via `playwright-cli install --skills` and is not duplicated into the immutable registry Git tree.

## Purpose

Provide browser acceptance capability for web UIs, dashboards, control planes, docs apps, auth flows, and webviews after unit/integration evidence.

## Responsibility boundary

CE owns the lifecycle. Playwright owns browser interaction and UI evidence only. Verification sequence: implementation → unit → integration → browser acceptance with trace/screenshot evidence → CE review → CE completion.

## Activation policy

Task-triggered for browser-facing work. Inactive for non-UI work. No automatic browser launch at session-start.

## Host exposure

Central CLI on PATH; HHPE guidance skill exposed to hosts; official skill installed into host/project skill directories on demand.

## Dependencies

`@playwright/cli@0.1.17`; browser runtimes/daemon when executing acceptance fixtures.

## Validation

CLI version and `--skills` interface; temporary workspace skill install; browser launch/interaction/close when browsers present. Missing browsers → `PASS_WITH_DOCUMENTED_HOST_LIMITATION`.

## Rollback

Remove runtime and wrapper exposure without changing upstream package sources.

## Known limitations

Browser binaries and daemon availability are host-dependent.
