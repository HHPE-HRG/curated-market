# ADR-018: Serena semantic code intelligence

Status: Accepted

## Source

Upstream repository: `https://github.com/oraios/serena`

## Revision

Pinned commit `6018bf461644dbf405d9ed1d3c3cde2ca07bb8b0`; package tree `baa862570b5fba087f789cbbf657f73dd1680e1c`; runtime `serena-agent` 1.5.3 via `uv`; license MIT.

## Purpose

Provide primary semantic code intelligence: symbol, reference, and implementation lookup; semantic navigation; safe rename/refactor; language-server-backed project understanding; project onboarding and health validation.

## Responsibility boundary

CE owns the lifecycle. Serena is a task-triggered specialist. Tool boundary: Serena for symbols/rename; ast-grep for syntax-tree patterns; ripgrep for literal text; compilers/tests for correctness. HHPE wrapper `hhpe-hrg/serena-guidance` routes without renaming Serena.

## Activation policy

Globally available; selected only when semantic intelligence is useful. Session-start checks activation/health when installed and does not begin semantic investigation unnecessarily. Users need not name Serena in ordinary prompts.

## Host exposure

Registry references plus host skill symlinks for `hhpe-hrg/serena-guidance`. Runtime on `PATH` via `~/.local/bin/serena`.

## Dependencies

`serena-agent` 1.5.3; language tooling for project languages; complementary `hhpe-hrg/ast-grep`.

## Validation

Pinned source integrity, `serena --version`, isolated project configuration fixture, and capability-check `serena`.

## Rollback

Remove runtime tool and wrapper exposures; retain pinned source for reproducibility. Do not edit the upstream checkout.

## Known limitations

Language-server coverage varies by language and installed tooling. Failed activation is reported as a tool limitation.
