# Interactive host acceptance — 2026-07-11

## Outcome

**Partially complete.** The installed host acceptance phase produced
one authenticated-session blocker, two GUI-only blockers, and a bounded
OpenCode loader pass with a model-backed execution timeout. No registry defect
was observed and no existing installation was retired.

## Installed-host acceptance

| Host | CE lifecycle | Supporting Superpowers | ast-grep | Identity | Restart | Result |
|---|---|---|---|---|---|---|
| Claude Code 2.1.207 | blocked before load | unverified | unverified | unverified in session | unverified | BLOCKED_BY_EXTERNAL_AUTH |
| Cursor 3.9.16 | unavailable | unavailable | unavailable | unavailable | unavailable | BLOCKED_BY_UNAVAILABLE_INTERACTIVE_UI |
| Antigravity IDE 2.0.10 | unavailable | unavailable | unavailable | unavailable | unavailable | BLOCKED_BY_UNAVAILABLE_INTERACTIVE_UI |
| OpenCode 1.17.1 | loader pass; run timed out | loader catalog pass | runtime pass; agent rewrite not run | PASS | PASS | PASS_WITH_DOCUMENTED_HOST_LIMITATION |

## OpenCode evidence

Two fresh `opencode debug skill --pure` processes with an isolated temporary
HOME discovered the canonical project links for `ce-plan`, `ce-debug`,
`test-driven-development`, `systematic-debugging`, and `ast-grep`. Both
returned the same six-entry catalog and hash. Canonical supporting files were
read successfully. A model-backed Test A run loaded `ce-plan` and its
package-relative planning reference, but exceeded the 75-second bound while
continuing exploration/planning. The process was terminated by the bound; no
fixture source files changed.

With the normal HOME, OpenCode reported duplicate flat names from pre-existing
`~/.agents/skills` entries. Those entries are user-owned and were not changed.
This is a host catalog collision to resolve during a future authorized
OpenCode cutover, not a package-preservation failure.

## Claude, Cursor, and Antigravity evidence

Claude Code returned `Not logged in; Please run /login` before a noninteractive
session could load plugins. Cursor has no installed `cursor-agent` or other
safe headless Agent entry point; its `~/.cursor/skills-cursor` directory is an
internal catalog and was not modified. The installed Antigravity executable
launches the IDE, and no distinct Antigravity CLI or headless discovery API was
found. These results require a real authenticated or interactive UI session
for Tests A–F.

## Cutover

No host cutover occurred. Existing native plugins, skills, hooks, and user
catalogs remain intact because per-host parity is incomplete. The disposable
fixture and all temporary project links were removed after evidence capture.
