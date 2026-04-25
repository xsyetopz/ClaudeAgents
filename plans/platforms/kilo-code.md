# Kilo Code Platform Spec

Verified date: 2026-04-25.

## References

- https://kilo.ai/docs/
- https://kilo.ai/docs/customize/rules
- https://kilo.ai/docs/customize/workflows
- https://kilo.ai/docs/features/mcp

## Native Surfaces

| Surface   | Level   | Notes                                          |
| --------- | ------- | ---------------------------------------------- |
| rules     | native  | documented customization rules.                |
| agents    | partial | modes/personas require verification.           |
| skills    | partial | workflows/rules can carry skill-like behavior. |
| commands  | partial | workflow support.                              |
| hooks     | UNKNOWN | no deterministic claim.                        |
| MCP       | native  | documented MCP.                                |
| workflows | native  | documented workflows.                          |

## Adapter Plan

- Render rules.
- Render workflows.
- Render MCP guidance only if user enables it.
- Keep unsupported hook surfaces explicit.

## Validation

- fixture render
- docs evidence check
- uninstall smoke
