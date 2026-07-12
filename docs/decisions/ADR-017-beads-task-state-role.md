# ADR-017: Beads task-state role

Status: Accepted

## Source

Evaluation of Beads against HHPE/XLOTYL/Stoneforge/Workroom live task ownership. Beads is not installed.

## Revision

Decision revision: inactive. No pinned Beads package revision.

## Purpose

Prevent a second live task authority from competing with HHPE for readiness, claims, blockers, dependencies, and completion.

## Responsibility boundary

Compound Engineering owns durable requirements and implementation artifacts. HHPE owns worker dispatch, verification, and live task-state projection. Beads owns nothing in the current stack.

## Activation policy

Beads is inactive. Do not initialize it in normal repositories. Do not add Beads startup commands. `hhpe-hrg/session-start` reports HHPE task state only.

## Host exposure

Documented inactive in `final-stack.yaml` (`beads.active: false`). No host skill or executable exposure.

## Dependencies

None. Future optional evaluation must not replace HHPE claims or CE plans.

## Validation

Confirm no Beads executable is required by tools manifests or session-start. Registry tests assert `beads.active === false`.

## Rollback

If Beads is later installed under an explicit ownership ADR, remove the inactive markers and add package/exposure entries. No task data is migrated by this decision.

## Known limitations

Cross-session task visualization that some teams associate with Beads remains HHPE's responsibility today; a future import/export bridge is out of scope.
