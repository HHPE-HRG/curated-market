# ADR-022: HHPE session-start hydration

Status: Accepted

## Source

HHPE-authored overlay capability `hhpe-hrg/session-start` in the canonical registry.

## Decision

Start serious sessions with Caveman followed by read-only HHPE state hydration. Report repository, branch, working tree, CE artifact/unit, authoritative task state, Serena and required-tool health, protected/concurrent paths, blockers, and the immediate next action. Do not create plans, modify files, or invoke a competing lifecycle.

## Ownership and activation

HHPE owns session hydration. CE, Ponytail, specialists, and retained Superpowers skills remain task-triggered or policy-configured after the user task is understood. Ponytail remains automatically active in its configured behavioral mode; it does not turn session-start into implementation.

## Validation and rollback

Run the disposable dirty-repository fixture and assert that the required fields are reported without file changes. Rollback removes the single HHPE overlay and its exposures.

## Limitation

The task-state section is only as complete as the authoritative HHPE task adapter and project artifacts available in the current repository.
