# CLI UX Evidence

Olympi keeps the everyday workflow in Pi and keeps the CLI focused on
installation, administration, diagnostics, and CI checks.

## Current user path

- `olympi` prints short bootstrap/admin help.
- `olympi install --dry-run|--apply` registers project-local Pi resources.
- Normal work starts from Pi slash commands such as `/olympi-goal`,
  `/olympi-plan`, `/olympi-execute`, `/olympi-complete`, `/olympi-resume`,
  `/olympi-handoff`, `/olympi-context`, and `/olympi-feedback`.
- `olympi status`, `olympi doctor`, and `olympi report ...` inspect health and
  produce reports without becoming the workflow console.

## Admin and security surfaces

- `olympi package inspect|evaluate|risk` handles package intake and risk
  administration.
- `olympi safety check|hooks|sandbox|broker|trust` exposes security diagnostics
  and policy/trust checks.
- `olympi dev ...` and `olympi debug ...` are explicit developer, CI, and
  authoring surfaces shown in full help, not in default startup help.

## Evidence checks

The test suite verifies short default help, separated full help, package and
safety command behavior, project-local writes, Pi slash resource registration,
RTK routing, hook behavior, and deterministic CI verification/catalog output.
