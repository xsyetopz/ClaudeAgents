# Token Economy

v4 must treat token economy as a product requirement.

## Current Failure Signal

Observed RTK data:

- Global savings: `12.3%` over `5825` commands.
- Project savings during research: near `23%`.
- Parse failures above `1000`.
- Common failures: `python3 -`, `make lint/check/test`, complex `rg` pipes, `cat`, `nl -ba`, bare `--ultra-compact`.

Expected: validation-heavy sessions should exceed `70%`; supported high-output commands should usually exceed `80%`.

## Root Causes

- Agents think in raw shell.
- Rewrite logic does not normalize common command shapes.
- Prompt reminders are weaker than command routing.
- Long generated docs and broad searches waste context.
- Subagents can multiply context if not assigned narrow packets.
- Tool output budgets are advisory unless enforced.

## v4 Requirements

- Replace RTK reminders with command verbs:
  - `search`
  - `read`
  - `list`
  - `tree`
  - `diff`
  - `status`
  - `test`
  - `build`
  - `lint`
  - `logs`
- Runner chooses compact native command.
- Runner rejects unbounded file dumps.
- Runner summarizes by default, full output only by explicit mode.
- Harness records input/output tokens per command where platform exposes enough data.
- Generated/vendor/build dirs are ignored by default.
- Docs and skills use progressive disclosure.

## Budget Rules

- Always-on prompt: under one screen.
- Skill descriptions: short routing summaries only.
- Skill body: procedure only.
- References: loaded by need, not preloaded.
- Platform docs: source links and capability facts, not tutorial sprawl.
- Validation output: failures first, success summary only.
