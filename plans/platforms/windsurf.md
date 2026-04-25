# Windsurf Editor Platform Spec

Verified date: 2026-04-25.

## References

- https://windsurf.com/
- https://docs.windsurf.com/
- https://docs.windsurf.com/windsurf/cascade/memories
- https://docs.windsurf.com/windsurf/cascade/mcp
- https://docs.windsurf.com/windsurf/cascade/workflows
- https://docs.windsurf.com/windsurf/cascade/hooks

## Classification

Windsurf is a code editor with Cascade agent surfaces and extension/plugin integration. v4 treats it as `windsurf-editor`, not as a standalone CLI harness target.

Windsurf plugin/extension behavior is a separate adapter concern. The first v4 adapter renders editor-visible rules, memories, workflows, MCP config, and hook config only where documented.

## Native Surfaces

| Surface   | Level   | Notes                                                               |
| --------- | ------- | ------------------------------------------------------------------- |
| rules     | native  | rules/memories style surfaces.                                      |
| agents    | partial | Cascade is agentic, but custom agent definitions need verification. |
| skills    | partial | workflows/rules likely mapping.                                     |
| commands  | partial | verify exact current support.                                       |
| hooks     | native  | Cascade hooks are documented.                                       |
| MCP       | native  | documented MCP.                                                     |
| workflows | native  | workflow docs exist.                                                |

## Adapter Plan

- Render memories/rules/workflows where documented.
- Render hook config only for documented Cascade events.
- Keep plugin/extension adapter separate from editor adapter until source evidence exists.
- Mark any custom-agent or skill-like claim as `partial` until exact artifact format is verified.

## Validation

- fixture render
- path verification
- hook JSON/schema parse
- uninstall smoke
