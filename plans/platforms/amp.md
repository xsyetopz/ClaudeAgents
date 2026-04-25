# Amp Platform Spec

Verified date: 2026-04-25.

## References

- https://ampcode.com/manual
- https://ampcode.com/news/agent-skills

## Native Surfaces

| Surface   | Level   | Notes                                             |
| --------- | ------- | ------------------------------------------------- |
| rules     | native  | `AGENTS.md` hierarchy.                            |
| agents    | partial | subagent support exists; verify install format.   |
| skills    | native  | skill support documented.                         |
| commands  | partial | manual/toolbox behavior needs exact verification. |
| hooks     | UNKNOWN | no implementation claim yet.                      |
| MCP       | native  | toolboxes/MCP mentioned in docs.                  |
| workflows | partial | render as skills/threads guidance.                |

## Adapter Plan

- Render `AGENTS.md`.
- Render skills only after exact path/format verification.
- Avoid hook claims until official docs prove surface.
- Use Amp as model for short threads and handoff discipline.

## Validation

- fixture render
- source-doc evidence gate
- manual CLI smoke if installed
