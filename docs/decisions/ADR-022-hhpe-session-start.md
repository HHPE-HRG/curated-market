# ADR-022: HHPE session-start hydration

Status: Accepted

## Source

HHPE-authored overlay capability `hhpe-hrg/session-start`.

## Revision

Overlay tracked by registry Git. Canonical identity: `hhpe-hrg/session-start`.

## Purpose

Hydrate engineering sessions with repository, worktree, CE, task, tool, protection, and blocker state without planning or modifying files.

## Responsibility boundary

State hydration only. Must not brainstorm, plan, implement, debug, preselect many specialists, modify files, or replace CE or native discovery.

## Activation policy

Ordinary serious sessions: Caveman, then session-start, then the user task. Listed in `final-stack.yaml` `startup_layers`.

## Host exposure

Skill symlinks and registry references for Cursor, Codex, Claude, Antigravity, OpenCode, and HHPE.

## Dependencies

Repository Git metadata; CE artifacts when present; HHPE task adapters; optional Serena/Context7/Playwright/ast-grep health probes.

## Validation

Required output fields present; read-only contract; capability-check `session-start`; disposable dirty-repo fixture does not modify files.

## Rollback

Remove overlay capability and exposures.

## Known limitations

Task-state completeness depends on HHPE adapters and project artifacts available in the current repository.
