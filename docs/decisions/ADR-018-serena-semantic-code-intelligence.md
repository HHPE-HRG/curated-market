# ADR-018: Serena semantic code intelligence

Status: Accepted

## Source

Upstream repository: `https://github.com/oraios/serena`; pinned commit `6018bf461644dbf405d9ed1d3c3cde2ca07bb8b0`; package tree `baa862570b5fba087f789cbbf657f73dd1680e1c`; license MIT.

## Decision

Register the complete Serena checkout as immutable source and provision `serena-agent` 1.5.3 through the user-scoped `uv` toolchain. The HHPE wrapper `hhpe-hrg/serena-guidance` routes semantic symbol, reference, implementation, and safe-refactor work to the runtime. Serena complements ast-grep, ripgrep, and compiler/test validation.

## Ownership and activation

CE owns the lifecycle. Serena is a task-triggered specialist and is health-checked during session hydration when installed; it does not plan or orchestrate work.

## Validation and rollback

Validate the pinned source tree, executable version, project activation/health, and a disposable multi-file symbol fixture. Rollback removes the runtime tool and wrapper exposure while retaining the pinned source for reproducibility; no upstream checkout is edited.

## Limitation

Language-server support varies by project language and installed language tooling. A failed project activation is reported as a tool limitation, not silently replaced by text editing.
