---
name: session-start
description: Hydrate an engineering session with repository, lifecycle, task, tool, and protection state without planning or modifying files.
---

# HHPE HRG session start

Run this capability at session start for a serious engineering session. It is state hydration only; do not create a plan, brainstorm, implement, debug, invoke a competing lifecycle, or modify files.

Report exactly these fields, concisely:

```text
Repository:
Branch:
Working tree:
CE state:
Current unit:
Task state:
Serena:
Required tools:
Protected paths:
Concurrent changes:
Blockers:
Recommended next action:
```

Inspect the repository root, active worktree and branch, dirty/staged/unstaged/untracked state, applicable `AGENTS.md` and project instructions, the active Compound Engineering artifact and implementation unit, and the authoritative HHPE task state. Check Serena activation and health when installed. Check `ast-grep`, Context7, Playwright when relevant, compilers, and repository tooling. Identify protected paths and concurrent changes. If an optional tool is unavailable, report it as a blocker or limitation rather than installing or modifying state.

HHPE owns this capability and its namespace. It does not replace Compound Engineering, Ponytail, Caveman, or the authoritative task graph.
