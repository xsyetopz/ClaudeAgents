# Windsurf Platform Spec

Verified date: 2026-04-25.

## References

- https://docs.windsurf.com/
- https://docs.windsurf.com/windsurf/cascade/memories
- https://docs.windsurf.com/windsurf/cascade/mcp
- https://docs.windsurf.com/windsurf/cascade/workflows

## Native Surfaces

| Surface   | Level   | Notes                                  |
| --------- | ------- | -------------------------------------- |
| rules     | native  | rules/memories style surfaces.         |
| agents    | partial | exact non-IDE mode needs verification. |
| skills    | partial | workflows/rules likely mapping.        |
| commands  | partial | verify exact current support.          |
| hooks     | UNKNOWN | no deterministic claim.                |
| MCP       | native  | documented MCP.                        |
| workflows | native  | workflow docs exist.                   |

## Adapter Plan

- Render memories/rules/workflows where documented.
- Treat as non-IDE target per project decision.
- Avoid hook claims until verified.

## Validation

- fixture render
- path verification
- uninstall smoke
