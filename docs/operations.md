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

## Cursor scoped projection (first slice)

Cursor realization uses explicit `--home` and `--project-root` roots. Prefer throwaway directories for dry-run and apply experiments; do not point apply at unmanaged ambient `~/.cursor` unless that is the intentional operator home.

```sh
# Dry run (no links created)
hhpe-registry-sync --host cursor --home <dir> --project-root <dir>

# Additive apply into the supplied roots only
hhpe-registry-sync --apply --host cursor --home <dir> --project-root <dir>
```

- `user-local` targets resolve under `--home` (for example `<dir>/.cursor/...`).
- `project` targets resolve under `--project-root` (for example `<dir>/.cursor/...`).
- Sync is additive and idempotent for registry-owned links. Existing foreign paths remain `COLLISION`; rollback refuses retarget of managed objects.
- `cloud-project` declarations validate and sync as `SKIP` (`cloud-project-not-implemented`). Cloud apply is not in this slice.
- MCP is deferred.
- Legacy skill-pool links are classified (for example `registry-owned projection` vs `unmanaged-foreign`); they are not adopted or rewritten by sync.

## Cursor session routing gate

Plugin routing completion is session-bound. After documenting `## Plugin and capability use`, record completion for the current session only:

```sh
node ${CURSOR_PLUGIN_ROOT}/scripts/mark-routing-complete.mjs --context <session>
```

State files are `~/.cursor/hhpe-hrg-plugin-stack/state/routing-complete.<urlencoded-session>.json`. A legacy global `routing-complete.json` does not authorize gated commands.

Hook policy for this slice:

- `sessionStart` is guidance (`failClosed` false): index generation may fail open.
- `beforeShellExecution` is must-hold (`failClosed` true): missing session id, missing/stale session state, or unreadable state denies gated shell commands.

Bypass (operator only): `CURSOR_PLUGIN_ROUTING_DISABLE_GATE=1`.

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
