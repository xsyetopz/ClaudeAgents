# Session and Subagent Model

Subagents are powerful but expensive. v4 uses them only when they reduce total uncertainty or isolate risk.

## Session Types

- primary interactive session
- planning session
- source-dive session
- implementation session
- validation session
- review session
- child/subagent session

## Fanout Rules

- Spawn for disjoint evidence or implementation ownership.
- Pass narrow packets, not whole repo state.
- Assign explicit files/subsystems.
- Require final evidence summary.
- Close agents when no longer needed.

## Context Costs

Each subagent may create:

- duplicated instructions
- duplicated repo map
- duplicated source snippets
- separate tool output
- merge/synthesis overhead

v4 should use source-dive files as reusable evidence cache to avoid repeated broad exploration.

## Platform Notes

- Codex has configurable multi-agent depth/thread limits.
- Claude Code has subagents and task-style tools in the sourcemap.
- Kilo Code uses modes and task tools.
- OpenCode has agents and skills; exact fanout behavior belongs to adapter validation.

## Acceptance

Subagent use is valid only when expected savings or correctness gain exceeds added context cost.

