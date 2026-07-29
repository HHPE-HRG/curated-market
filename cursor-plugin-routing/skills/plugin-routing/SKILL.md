---
name: plugin-routing
description: Route the HHPE-HRG organization Cursor stack across installed plugins, skills, MCP tools, agents, rules, and hooks for planning, execution, and validation.
---

# HHPE-HRG plugin-stack routing

Use this skill when the agent is about to create/revise an implementation plan or begin multi-step execution.

## Routing inputs
1. The full user task/prompt.
2. The generated index at `~/.cursor/hhpe-hrg-plugin-stack/derived/plugin-index.md` (derived, non-authoritative).
3. Installed plugin metadata on disk (plugin manifests and component description files).

## Hierarchical discovery (Level 1 → Level 3)
### Level 1: plugin-level candidate selection
1. Decompose the task into:
   - domain/object(s) (e.g., “GitHub PRs”, “Linear issue”, “repository unit tests”, “CI checks”)
   - operation(s) (read vs modify vs validate; local vs remote; compilation vs browser vs MCP)
   - evidence/validation needs (unit tests, security checks, diff review, CI remediation, etc.)
2. Search the generated plugin index for those concepts.
3. Optional (deterministic): run the index ranker to get a short candidate list:

`node ${CURSOR_PLUGIN_ROOT}/scripts/rank-plugin-candidates.mjs --task "<task prompt>" --top 6`

4. Choose a small set of candidate plugin suites that could materially contribute to:
   - task understanding
   - planning
   - execution
   - validation

### Level 2: component-level selection (description-only reads)
For each candidate plugin suite:
1. Read only component description metadata (e.g., `SKILL.md` frontmatter and declared “Trigger”/“Use when”/“Do not use when” blocks when present; rule `.mdc` frontmatter; MCP `mcp.json` server keys; hook event names).
2. Select candidate components needed for:
   - Planning-time (plan drafting, decomposition, constraints, tool/evidence identification)
   - Execution-time (implementation workflow)
   - Validation-time (checks/evidence that prove correctness/safety)

Avoid redundant/overlapping ownership: prefer the smallest sufficient set of components.

### Level 3: full instruction loads only for selected components
1. Load the full selected skills/rules/hook logic only after you have decided the smallest sufficient set.
2. Do not load full instructions from candidate plugins that were not selected.

## When no plugin is required
If Cursor’s native repository tools and already-available built-in skills fully satisfy the task, select “no plugin components needed” and document that in the plan.

## Side-effect awareness and gating
Assume execution gating can block state-changing commands until routing completion is recorded.
After you have selected and documented planning/execution/validation components in the plan, run:

`node ${CURSOR_PLUGIN_ROOT}/scripts/mark-routing-complete.mjs`

## How to document routing decisions in the plan
In the plan, record a section exactly structured as:

## Plugin and capability use

### Planning
- Plugin or component
  - Why it is needed during plan development.

### Execution
- Plugin or component
  - Which implementation steps should invoke it.

### Validation
- Plugin or component
  - Which checks or evidence it provides.

## If metadata is insufficient
If a plugin’s description metadata is too vague to decide safely:
1. prefer no plugin for the uncertain part, or
2. select the smallest conservative component with the most explicit “do/use when” constraints.

