# Augment Platform Spec

Verified date: 2026-04-25.

## References

- https://docs.augmentcode.com/
- https://docs.augmentcode.com/setup-augment/guidelines
- https://docs.augmentcode.com/context-services/overview
- https://docs.augmentcode.com/cli/rules
- https://docs.augmentcode.com/cli/skills

## Native Surfaces

| Surface   | Level   | Notes                                                |
| --------- | ------- | ---------------------------------------------------- |
| rules     | native  | guidelines/rules.                                    |
| agents    | UNKNOWN | verify before claim.                                 |
| skills    | partial | CLI skills documented; exact format must be checked. |
| commands  | UNKNOWN | verify before claim.                                 |
| hooks     | UNKNOWN | verify before claim.                                 |
| MCP       | native  | context services/MCP-like integrations.              |
| workflows | partial | likely rules/skills only.                            |

## Adapter Plan

- Render guidelines/rules first.
- Render skills only after exact current format verified.
- Treat as partial adapter until deterministic surfaces are proven.

## Validation

- rules fixture test
- docs evidence test
- CLI smoke if available
