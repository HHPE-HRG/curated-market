# ADR-021: Playwright UI acceptance

Status: Accepted

## Source

Runtime source: npm package `@playwright/cli` version 0.1.17. The HHPE wrapper is `hhpe-hrg/playwright-guidance`; the official CLI skill bundle remains host-generated and is not copied into the immutable registry.

## Decision

Provision Playwright CLI centrally and activate it only for browser-facing repositories and tasks. The verification sequence is implementation, unit tests, integration tests, Playwright acceptance evidence, then CE review and completion.

## Ownership and activation

CE owns the lifecycle. Playwright owns browser interaction and UI evidence only. Use disposable fixtures, bounded processes, screenshots/traces as useful, and no production credentials.

## Validation and rollback

Validate the CLI version, workspace skill installation in a temporary project, browser launch/interaction/close when browser dependencies are present, and trace or screenshot output. Rollback removes the runtime and wrapper exposure without changing packages.

## Limitation

Browser binaries may be unavailable in restricted environments. That is a tool-runtime limitation, not a registry-source defect.
