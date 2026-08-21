# Operations

## Registry commands

```sh
export PATH="${HHPE_HRG_HOME:-$HOME/.local/share/hhpe-hrg}/bin:$PATH"
hhpe-registry-discover
hhpe-registry-status
hhpe-registry-validate
hhpe-registry-validate-host --host codex --context <id>
hhpe-registry-sync                 # dry run
hhpe-registry-sync --apply         # additive links only
hhpe-registry-diff
hhpe-registry-update --check
hhpe-registry-rollback             # dry run
hhpe-registry-rollback --apply
hhpe-registry-capability-check all
```

Run discovery, then validation, then sync without `--apply`. Resolve every `COLLISION`. Apply is additive: it creates only absent individual links and records each one in `migration-state.yaml`. Re-run validation and start a new host session. Never run upstream installers during registry deployment.

`hhpe-registry-validate` and `npm run validate` validate checked-in repository declarations only. They do not inspect native-plugin installation. Use `hhpe-registry-validate-host --host codex --context <id>` when an applicable active Codex exposure must be realized. Add `--require-planned-target <plugin@marketplace>` only for an explicitly selected pre-activation target. A designated host runs static validation and host validation as separate gates. Host failure reports `host-realization`; it is not `FAIL_STATIC_INTEGRITY`. Validation never installs or activates a plugin.

Backups belong under `backups/<timestamp>` and must be recorded as `backup_only`. The current additive phase has not modified host config files, so no config backup is required yet.

## Normal session

```text
/caveman:caveman
```

Then:

```text
Run session-start, establish the current repository and work state, then pursue
the task using the existing HHPE hierarchy and native skill discovery.

Task:
[Desired result.]

Constraints:
[Hard boundaries.]

Done when:
[Observable acceptance criteria.]

Autonomy:
[How far the agent should proceed.]
```

Ponytail stays automatically active. Do not routinely invoke `/using-superpowers`, `/ce-plan`, `/ce-work`, or specialist slash names. Describe the work; native discovery selects Compound Engineering and the narrowest specialists.

## Continuing current work

```text
Run session-start and continue from the current authoritative CE artifact.

Objective:
[Next result.]

Preserve unrelated changes and do not create a competing plan. Resolve the
current unit, update its evidence and documentation, and continue only when
dependencies and verification allow it.
```

## New repository

```text
Initialize this repository under the existing HHPE hierarchy.

Establish CE as the durable lifecycle, onboard semantic code intelligence,
identify the language and toolchain, create only the minimum necessary project
instructions, and verify native discovery and required tools.

Then investigate this objective and create the appropriate initial CE artifact:

[Objective]

Do not begin implementation until architecture, constraints, and acceptance
criteria are sufficiently clear.
```

## Full autonomy

```text
Operate autonomously through investigation, implementation, review, and
verification. Stop only for credentials, destructive ambiguity, unavailable
external infrastructure, or a decision that materially changes product scope.
```

## Plan only

```text
Investigate and produce the authoritative plan. Do not modify implementation
files until approval.
```

## Review only

```text
Inspect and report findings. Do not modify files.
```

## Bounded unit

```text
Complete only this implementation unit. Do not broaden scope or begin adjacent
units.
```

## Specialist verification

```sh
hhpe-registry-capability-check serena
hhpe-registry-capability-check context7
hhpe-registry-capability-check specialists
hhpe-registry-capability-check playwright
hhpe-registry-capability-check session-start
hhpe-registry-capability-check routing
```

## Hierarchy reminder

```text
Compound Engineering → durable engineering lifecycle
Native host discovery → lifecycle and specialist selection
Ponytail → automatic simplicity layer
Caveman → explicit communication layer
Specialists → task-triggered only
HHPE HRG → package governance, exposure, precedence, provenance, validation, updates, rollback
```
