# OpenCode Platform Spec

Verified date: 2026-04-25.

## References

- https://opencode.ai/docs/
- https://opencode.ai/docs/agents/
- https://opencode.ai/docs/skills/
- https://opencode.ai/docs/config/

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

## Adapter Plan

- Render agents.
- Render skills.
- Render config/permissions.
- Render workflow commands where native path exists.
- Use prompt-only fallback only when deterministic surface absent.

## Validation

- `bun test` in opencode package when adapter code changes
- typecheck generated plugin
- temp-home install/uninstall smoke
