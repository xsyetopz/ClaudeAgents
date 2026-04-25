# Codex CLI Platform Spec

Verified date: 2026-04-25.

## References

- https://developers.openai.com/codex/
- https://developers.openai.com/codex/config-reference
- https://developers.openai.com/codex/hooks
- https://developers.openai.com/codex/skills
- https://developers.openai.com/codex/subagents

## Native Surfaces

| Surface   | Level   | Notes                                  |
| --------- | ------- | -------------------------------------- |
| rules     | native  | `AGENTS.md` and config.                |
| agents    | native  | custom agent definitions.              |
| skills    | native  | plugin skills.                         |
| commands  | native  | slash/custom command surfaces.         |
| hooks     | native  | JSON hook definitions.                 |
| MCP       | native  | config-managed servers.                |
| workflows | partial | render as commands plus skills/agents. |

## Adapter Plan

- Render tiny `AGENTS.md`.
- Render managed config from source.
- Render plugin skills.
- Render custom agents.
- Render hooks backed by runner.
- Keep model/profile logic explicit and sourced.

## Validation

- managed config parse test
- plugin cache install smoke
- hook execution smoke
- temp-home uninstall smoke
