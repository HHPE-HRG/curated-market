# ADR-024: Task-language lifecycle routing

Status: Accepted

## Source

HHPE-authored routing policy in `registry/manifests/final-stack.yaml` (`task_language_lifecycle_routing`, `natural_language_routing_fixtures`).

## Revision

Policy revision tied to the registry Git commit that introduces this ADR; no upstream package revision.

## Purpose

Map natural task language to the Compound Engineering lifecycle without requiring users to name CE skills or slash-invoke Superpowers bootstrap.

## Responsibility boundary

Compound Engineering owns the durable lifecycle. HHPE owns the routing projection and validation fixtures. Native host discovery selects capabilities. Specialists attach only after lifecycle ownership is resolved.

## Activation policy

Routing is semantic and considers the complete task. Exact-word switches are forbidden. Examples: architecture/design language routes to investigation-then-planning; root-cause-and-repair language routes to debugging; safe-to-merge language routes to review.

## Host exposure

Projected through `final-stack.yaml` and host adapters. No separate HHPE command dialect replaces upstream skill identities.

## Dependencies

Compound Engineering package; retained Superpowers supporting skills; specialist capabilities registered in the same lock.

## Validation

Natural-language routing fixtures in `final-stack.yaml` must resolve to the expected primary lifecycle and specialist set without naming those skills in the prompt. `hhpe-registry-capability-check routing` asserts fixture integrity.

## Rollback

Remove `task_language_lifecycle_routing` and `natural_language_routing_fixtures` from `final-stack.yaml` and revert this ADR. CE remains lifecycle owner via `lifecycle_owner`.

## Known limitations

Hosts differ in how native discovery surfaces skills. Fixture validation proves policy projection, not every host's online ranking model.
