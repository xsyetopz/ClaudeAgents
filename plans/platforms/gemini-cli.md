# Gemini CLI Platform Spec

Verified date: 2026-04-25.

## References

- https://github.com/google-gemini/gemini-cli
- https://github.com/google-gemini/gemini-cli/tree/main/docs
- https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/gemini-md.md
- https://github.com/google-gemini/gemini-cli/blob/main/docs/extensions/reference.md

## Native Surfaces

| Surface   | Level   | Notes                                                 |
| --------- | ------- | ----------------------------------------------------- |
| rules     | native  | `GEMINI.md` memory/instruction files.                 |
| agents    | partial | verify exact current support before implementation.   |
| skills    | partial | extension/skill support requires source verification. |
| commands  | native  | command extension surfaces.                           |
| hooks     | partial | extension hook support requires verification.         |
| MCP       | native  | extension/config surfaces.                            |
| workflows | partial | render through commands/extensions.                   |

## Adapter Plan

- Render `GEMINI.md` with tiny core.
- Render extension package only for verified surfaces.
- Render commands/workflows where supported.
- Do not claim hooks or agents until source docs are verified.

## Validation

- extension manifest parse
- temp-home install fixture
- command discovery smoke if CLI present
- uninstall smoke
