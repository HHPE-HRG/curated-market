# ADR-025: Standard session kickoff

Status: Accepted

## Source

HHPE-authored operations contract: Caveman invocation, `hhpe-hrg/session-start`, and the standard prompt forms in `docs/operations.md`.

## Revision

Policy revision tied to the registry Git commit that introduces this ADR.

## Purpose

Define the ordinary session startup so users describe outcomes, constraints, completion, and autonomy while native discovery selects CE and specialists.

## Responsibility boundary

Caveman owns communication compression and is started explicitly. Ponytail remains automatically active as the simplicity layer. `hhpe-hrg/session-start` owns read-only hydration. CE owns the engineering lifecycle after the task is stated. Specialists remain task-triggered.

## Activation policy

Supported ordinary startup:

1. `/caveman:caveman` (or host-equivalent Caveman start)
2. Run session-start
3. State objective, constraints, completion, and autonomy
4. Allow native discovery to select CE and supporting specialists

Do not require routine `/ponytail`, `/using-superpowers`, `/ce-plan`, `/ce-work`, or specialist slash names.

## Host exposure

Documented in `docs/operations.md` and exposed through host skill catalogs (`session-start`, Caveman, Ponytail). Kickoff forms are conventions, not mandatory parser schemas.

## Dependencies

`hhpe-hrg/session-start`, Caveman, Ponytail, Compound Engineering, `final-stack.yaml` routing policy.

## Validation

Session-start fixture remains read-only. Routing fixtures prove specialists attach without skill naming. Registry validation keeps Superpowers bootstrap disabled and CE as lifecycle owner.

## Rollback

Revert operations documentation and this ADR. Existing capabilities remain registered; only the documented kickoff contract changes.

## Known limitations

Some hosts require their own slash or menu path to start Caveman. That is a host UX difference, not a second lifecycle owner.
