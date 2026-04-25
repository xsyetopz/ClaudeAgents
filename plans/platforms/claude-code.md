# Claude Code Platform Spec

Verified date: 2026-04-25.

## References

- https://docs.claude.com/en/docs/claude-code/overview
- https://docs.claude.com/en/docs/claude-code/memory
- https://docs.claude.com/en/docs/claude-code/hooks
- https://docs.claude.com/en/docs/claude-code/sub-agents
- https://docs.claude.com/en/docs/agents-and-tools/agent-skills/overview

## Native Surfaces

| Surface      | Level   | Notes                                 |
| ------------ | ------- | ------------------------------------- |
| rules/memory | native  | `CLAUDE.md` hierarchy and imports.    |
| agents       | native  | subagents with isolated context.      |
| skills       | native  | progressive-disclosure skill folders. |
| commands     | native  | slash commands.                       |
| hooks        | native  | pre/post/session style enforcement.   |
| MCP          | native  | configured through Claude Code.       |
| workflows    | partial | render as commands plus skills.       |

## Adapter Plan

- Render minimal `CLAUDE.md`.
- Render agents for role-isolated work.
- Render skills as native skill folders.
- Render slash commands for workflows.
- Install self-contained hooks.
- Use runner for command filtering.

## Validation

- temp `HOME` plugin install smoke
- hook self-contained import test
- skill discovery smoke where possible
- uninstall removes managed files and v3 residue
