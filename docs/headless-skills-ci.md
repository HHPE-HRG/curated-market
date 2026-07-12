# Headless skills acceptance CI

The registry owns the headless acceptance harness. It tests all registered
capabilities statically, then uses bounded fresh processes for host canaries
and a four-case routing matrix: CE planning, TDD support, debugging support,
and ast-grep selection.

## Commands

From the registry root:

```bash
npm run skills:ci:static
npm run skills:ci:all -- --json
npm run skills:ci:all -- --host claude
npm run skills:ci:all -- --routing-only
npm run skills:ci:all -- --loader-only
npm run skills:ci:all -- --keep-fixtures
```

The equivalent executable is:

```bash
/home/hold3n/.local/share/hhpe-hrg/bin/hhpe-skills-ci --json
```

Host aliases in the wrapper repository (`npm run agent:verify:skills:*`) are
an authorized integration follow-up because the active workflow policy does
not permit root `package.json` or `scripts/` edits. The registry commands are
fully usable without that alias layer.

## Safety and evidence

Each run creates a temporary Git fixture under `/tmp/hhpe-skills-ci-*`, links
only an HHPE canary into the host-native project skill directory, bounds every
child process, and removes the fixture. Set `HHPE_KEEP_FAILED_FIXTURE=1` or
pass `--keep-fixtures` when debugging a failure.

Reports are written to `reports/skills-ci/`. Raw output is redacted for common
credential fields. No host cutover, uninstall, package mutation, or production
worktree access occurs.

Results use explicit classifications such as `PASS`,
`PASS_WITH_DOCUMENTED_HOST_LIMITATION`, `BLOCKED_BY_EXTERNAL_AUTH`,
`SUPPORTED_NOT_INSTALLED`, `BLOCKED_BY_UNAVAILABLE_MODEL`, and the `FAIL_*`
integrity/loader/routing classes.

## Host adapters

- Claude: `claude -p`, stream JSON, plan mode, eight-turn bound, no session persistence.
- Codex: `codex exec --json --ephemeral`, read-only sandbox, output schema.
- Cursor: `cursor-agent`; GUI `cursor` is not treated as a headless substitute.
- Antigravity: `agy -p --sandbox`; IDE equivalence is reported separately.
- OpenCode: native `debug skill` catalog plus bounded `opencode run`.
- HHPE: manifest-derived canary and routing checks.
