# OpenCode Platform Spec

Verified date: 2026-04-25.

## References

- https://opencode.ai/docs/
- https://opencode.ai/docs/agents/
- https://opencode.ai/docs/skills/
- https://opencode.ai/docs/config/
- https://github.com/anomalyco/opencode

## Source Notes

- `packages/opencode/src/config/config.ts` loads and merges config layers.
- `packages/opencode/src/config/agent.ts` loads agents/modes.
- `packages/opencode/src/config/skills.ts` loads skills from multiple compatible roots.
- `packages/opencode/src/config/plugin.ts` resolves plugins.
- `packages/opencode/src/config/permission.ts` defines permission schema.
- `packages/opencode/src/config/mcp.ts` defines MCP config.

## Native Surfaces

| Surface   | Level   | Notes                                          |
| --------- | ------- | ---------------------------------------------- |
| rules     | native  | config/instruction surfaces.                   |
| agents    | native  | agent definitions.                             |
| skills    | native  | skill folders discovered from supported paths. |
| commands  | partial | render through templates/plugin code.          |
| hooks     | partial | use permissions/plugins where supported.       |
| MCP       | native  | config-managed.                                |
| workflows | partial | render as skills/commands.                     |

## Context and Token Controls

- OpenCode config includes native compaction and tool-output truncation concepts.
- Plugin loading may execute package-manager behavior; v4 must avoid implicit package installs.
- Skills may be discovered from `.opencode`, `.claude`, and `.agents` paths; name collisions must be handled.

## Adapter Plan

- Render agents.
- Render skills.
- Render config/permissions.
- Render workflow commands where native path exists.
- Use prompt-only fallback only when deterministic surface absent.
- Render permissions that allow the harness runner while keeping raw shell gated.
- Prefer local plugin files over package plugins unless user enables package install.

## Validation

- `bun test` in opencode package when adapter code changes
- typecheck generated plugin
- temp-home install/uninstall smoke
- config precedence fixture
- skill collision fixture
- permission gate fixture
