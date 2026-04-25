# Cline Platform Spec

Verified date: 2026-04-25.

## References

- https://docs.cline.bot/
- https://docs.cline.bot/customization/cline-rules
- https://docs.cline.bot/customization/workflows
- https://docs.cline.bot/features/hooks/hook-reference
- https://docs.cline.bot/customization/clineignore

## Native Surfaces

| Surface   | Level   | Notes                                          |
| --------- | ------- | ---------------------------------------------- |
| rules     | native  | Cline rules files.                             |
| agents    | partial | modes/personas require exact mapping.          |
| skills    | partial | workflows/rules can carry skill-like behavior. |
| commands  | partial | workflow-triggered behavior.                   |
| hooks     | native  | hook reference exists.                         |
| MCP       | native  | Cline supports MCP.                            |
| workflows | native  | documented workflows.                          |

## Adapter Plan

- Render rules.
- Render workflows.
- Render hooks if deterministic and safe.
- Render `.clineignore` defaults for context economy.

## Validation

- fixture install
- hook config parse
- uninstall smoke
