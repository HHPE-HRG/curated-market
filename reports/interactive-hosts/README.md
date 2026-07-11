# Interactive host acceptance evidence

Date: 2026-07-11

The disposable fixture was created at `/tmp/hhpe-host-acceptance-ddqM0H` and
was isolated from production repositories. No credentials or conversation
transcripts are stored here.

Evidence files:

- `claude-2.1.207.yaml`
- `cursor-3.9.16.yaml`
- `antigravity-ide-2.0.10.yaml`
- `opencode-1.17.1.yaml`

The OpenCode loader was tested twice with a temporary HOME containing no
pre-existing skills. The project `.opencode/skills` links resolved to the
canonical package trees and produced the same six-entry catalog on both
starts. The shared user HOME also contains older pre-existing skills with the
same flat names; OpenCode correctly reported those as duplicate names when
the fixture links were present. Those user-owned entries were not modified.

Claude was stopped by its authentication gate before skill loading. Cursor and
Antigravity are GUI-only for the installed surfaces; no supported headless
agent/discovery command was found. These are host-validation limitations, not
registry integrity failures.
